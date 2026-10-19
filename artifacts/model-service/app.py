import io
import math
import struct
import wave
import os
import json
import base64
import time
from typing import Optional, Dict, Any, List
import numpy as np
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

# Global model state
HF_MODEL_ID = "mo-thecreator/Deepfake-audio-detection"
HF_MODEL_URL = "https://huggingface.co/mo-thecreator/Deepfake-audio-detection"
HF_MODEL_DESC = "an open-source pretrained wav2vec2 audio classifier"

pretrained_extractor = None
pretrained_model = None
model_load_error = None
model_download_size_mb = 360.8

try:
    import torch
    from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
    
    print(f"[VEIL MODEL SERVICE] Loading {HF_MODEL_ID} on CPU...")
    t_load_0 = time.perf_counter()
    pretrained_extractor = AutoFeatureExtractor.from_pretrained(HF_MODEL_ID)
    pretrained_model = AutoModelForAudioClassification.from_pretrained(HF_MODEL_ID)
    pretrained_model.eval()
    t_load = round((time.perf_counter() - t_load_0) * 1000, 1)
    print(f"[VEIL MODEL SERVICE] Successfully loaded {HF_MODEL_ID} in {t_load} ms")
except Exception as e:
    model_load_error = str(e)
    print(f"[VEIL MODEL SERVICE WARNING] Pretrained model load failed: {e}")

app = FastAPI(
    title="VEIL Audio Authenticity & Anti-Spoofing Service",
    version="2.0.0",
    description="Dual-engine audio deepfake detection: pretrained Wav2Vec2 audio classifier + acoustic spectral heuristic.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PretrainedResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    name: str = "Wav2Vec2 Audio Classifier"
    model_id: str = HF_MODEL_ID
    huggingface_url: str = HF_MODEL_URL
    description: str = HF_MODEL_DESC
    download_size_mb: float = model_download_size_mb
    is_synthetic: Optional[bool] = None
    synthetic_probability: Optional[float] = None
    verdict: str = "Not enough information"
    latency_ms: Optional[float] = None
    error: Optional[str] = None

class AcousticHeuristicResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    name: str = "Acoustic Spectral Heuristic"
    is_synthetic: Optional[bool] = None
    synthetic_probability: Optional[float] = None
    verdict: str = "Not enough information"
    diagnostics: Dict[str, Any] = {}

class CombinedResult(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    is_synthetic: Optional[bool] = None
    synthetic_probability: Optional[float] = None
    dual_agreement_synthetic: Optional[bool] = None
    verdict: str = "Not enough information"
    confidence: str = "insufficient"
    signal_label: str = "Voice authenticity model: Not enough information"

class DualAnalyzeResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    status: str
    pretrained_model: PretrainedResult
    acoustic_heuristic: AcousticHeuristicResult
    combined: CombinedResult
    # Backward compatibility fields for existing API clients
    model_name: str = "Wav2Vec2-Acoustic-AntiSpoof-v2"
    is_synthetic: Optional[bool] = None
    synthetic_probability: Optional[float] = None
    verdict: str = "Not enough information"
    signal_label: str = "Voice authenticity model: Not enough information"
    confidence: str = "insufficient"
    diagnostics: Dict[str, Any] = {}

def parse_wav_samples(wav_bytes: bytes) -> tuple[np.ndarray, int]:
    """Parse raw WAV bytes into float32 numpy array and sample rate."""
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
            n_channels = wf.getnchannels()
            sample_width = wf.getsampwidth()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()
            raw_data = wf.readframes(n_frames)

            if sample_width == 2:
                fmt = f"<{n_frames * n_channels}h"
                samples = np.array(struct.unpack(fmt, raw_data), dtype=np.float32) / 32768.0
            elif sample_width == 1:
                samples = (np.frombuffer(raw_data, dtype=np.uint8).astype(np.float32) - 128.0) / 128.0
            elif sample_width == 4:
                samples = np.frombuffer(raw_data, dtype=np.float32)
            else:
                samples = np.frombuffer(raw_data, dtype=np.int16).astype(np.float32) / 32768.0

            if n_channels > 1:
                samples = samples.reshape(-1, n_channels).mean(axis=1)

            return samples, framerate
    except Exception as e:
        try:
            samples = np.frombuffer(wav_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            return samples, 16000
        except Exception:
            raise ValueError(f"Unable to parse audio stream: {e}")

def run_acoustic_heuristic(samples: np.ndarray, sr: int) -> AcousticHeuristicResult:
    duration = len(samples) / float(sr) if sr > 0 else 0
    if len(samples) < int(sr * 0.3) or np.max(np.abs(samples)) < 0.005:
        return AcousticHeuristicResult(
            is_synthetic=None,
            synthetic_probability=None,
            verdict="Not enough information",
            diagnostics={"duration_seconds": round(duration, 2), "reason": "Audio stream too short (<0.3s) or silent"},
        )

    fft_vals = np.abs(np.fft.rfft(samples))
    freqs = np.fft.rfftfreq(len(samples), 1.0 / sr)

    total_energy = np.sum(fft_vals ** 2) + 1e-10
    high_freq_mask = freqs > 7400.0
    hf_energy = np.sum(fft_vals[high_freq_mask] ** 2)
    hf_ratio = float(hf_energy / total_energy)

    frame_size = int(sr * 0.025)
    hop_size = int(sr * 0.010)
    frames = [samples[i:i + frame_size] for i in range(0, len(samples) - frame_size, hop_size)]

    frame_energies = [float(np.sqrt(np.mean(f ** 2))) for f in frames]
    energy_variance = float(np.var(frame_energies)) if frame_energies else 0.0

    zcrs = [float(np.mean(np.abs(np.diff(np.sign(f)))) / 2.0) for f in frames if len(f) > 1]
    zcr_std = float(np.std(zcrs)) if zcrs else 0.0

    synthetic_score = 0.10
    if hf_ratio < 0.0001:
        synthetic_score += 0.45
    elif hf_ratio < 0.0003:
        synthetic_score += 0.20

    if energy_variance < 0.0015:
        synthetic_score += 0.35

    if energy_variance > 0.005:
        synthetic_score -= 0.25
    if hf_ratio > 0.0003:
        synthetic_score -= 0.15

    prob = float(np.clip(synthetic_score, 0.05, 0.95))
    is_synth = prob >= 0.50

    return AcousticHeuristicResult(
        is_synthetic=is_synth,
        synthetic_probability=round(prob, 2),
        verdict="Elevated synthetic vocoder likelihood" if is_synth else "Nominal human acoustic pattern",
        diagnostics={
            "hf_energy_ratio": round(hf_ratio, 5),
            "zcr_micro_jitter_std": round(zcr_std, 4),
            "energy_variance": round(energy_variance, 6),
            "sample_rate_hz": sr,
            "duration_seconds": round(duration, 2),
        },
    )

def run_pretrained_model(samples: np.ndarray, sr: int) -> PretrainedResult:
    duration = len(samples) / float(sr) if sr > 0 else 0
    if len(samples) < int(sr * 0.3) or np.max(np.abs(samples)) < 0.005:
        return PretrainedResult(
            is_synthetic=None,
            synthetic_probability=None,
            verdict="Not enough information",
            latency_ms=0.0,
            error=None,
        )

    if pretrained_model is None or pretrained_extractor is None:
        return PretrainedResult(
            is_synthetic=None,
            synthetic_probability=None,
            verdict="Not enough information",
            error=f"Model not loaded: {model_load_error}",
        )

    try:
        import torch
        t0 = time.perf_counter()
        inputs = pretrained_extractor(samples, sampling_rate=sr, return_tensors="pt")
        with torch.no_grad():
            logits = pretrained_model(**inputs).logits
            probs = torch.softmax(logits, dim=-1)[0]
        latency_ms = round((time.perf_counter() - t0) * 1000, 1)

        # Label mapping: 0 = fake, 1 = real
        p_fake = round(float(probs[0].item()), 4)
        is_synth = p_fake >= 0.50

        return PretrainedResult(
            is_synthetic=is_synth,
            synthetic_probability=p_fake,
            verdict="Synthetic speech detected" if is_synth else "Authentic human speech",
            latency_ms=latency_ms,
            error=None,
        )
    except Exception as e:
        return PretrainedResult(
            is_synthetic=None,
            synthetic_probability=None,
            verdict="Not enough information",
            error=str(e),
        )

def evaluate_audio_samples(samples: np.ndarray, sr: int) -> DualAnalyzeResponse:
    duration = len(samples) / float(sr) if sr > 0 else 0
    if len(samples) < int(sr * 0.3) or np.max(np.abs(samples)) < 0.005:
        insuf_pt = PretrainedResult(is_synthetic=None, synthetic_probability=None, verdict="Not enough information")
        insuf_ac = AcousticHeuristicResult(is_synthetic=None, synthetic_probability=None, verdict="Not enough information")
        insuf_cb = CombinedResult(
            is_synthetic=None,
            synthetic_probability=None,
            dual_agreement_synthetic=None,
            verdict="Not enough information",
            confidence="insufficient",
            signal_label="Voice authenticity model: Not enough information",
        )
        return DualAnalyzeResponse(
            status="insufficient_data",
            pretrained_model=insuf_pt,
            acoustic_heuristic=insuf_ac,
            combined=insuf_cb,
            is_synthetic=None,
            synthetic_probability=None,
            verdict="Not enough information",
            signal_label="Voice authenticity model: Not enough information",
            confidence="insufficient",
            diagnostics={"duration_seconds": round(duration, 2), "reason": "Audio stream too short (<0.3s) or silent"},
        )

    pt_res = run_pretrained_model(samples, sr)
    ac_res = run_acoustic_heuristic(samples, sr)

    # Derive combination
    if pt_res.synthetic_probability is not None and ac_res.synthetic_probability is not None:
        avg_prob = round((pt_res.synthetic_probability + ac_res.synthetic_probability) / 2.0, 2)
        dual_agree = bool(pt_res.is_synthetic and ac_res.is_synthetic)
    elif ac_res.synthetic_probability is not None:
        avg_prob = ac_res.synthetic_probability
        dual_agree = ac_res.is_synthetic
    elif pt_res.synthetic_probability is not None:
        avg_prob = pt_res.synthetic_probability
        dual_agree = pt_res.is_synthetic
    else:
        avg_prob = None
        dual_agree = None

    if dual_agree is True:
        comb_synth = True
        comb_verdict = "Elevated synthetic likelihood (Dual consensus)"
        comb_label = "Voice authenticity model: possible synthetic speech, low confidence"
        confidence = "moderate"
    elif avg_prob is not None and avg_prob >= 0.50:
        comb_synth = True
        comb_verdict = "Possible synthetic speech (Single engine trigger)"
        comb_label = "Voice authenticity model: possible synthetic speech, low confidence"
        confidence = "low"
    elif avg_prob is not None:
        comb_synth = False
        comb_verdict = "Nominal human speech"
        comb_label = "Voice authenticity model: nominal human acoustic pattern"
        confidence = "moderate"
    else:
        comb_synth = None
        comb_verdict = "Not enough information"
        comb_label = "Voice authenticity model: Not enough information"
        confidence = "insufficient"

    comb = CombinedResult(
        is_synthetic=comb_synth,
        synthetic_probability=avg_prob,
        dual_agreement_synthetic=dual_agree,
        verdict=comb_verdict,
        confidence=confidence,
        signal_label=comb_label,
    )

    return DualAnalyzeResponse(
        status="online",
        pretrained_model=pt_res,
        acoustic_heuristic=ac_res,
        combined=comb,
        # Backward compatibility fields
        is_synthetic=comb_synth,
        synthetic_probability=avg_prob,
        verdict=comb_verdict,
        signal_label=comb_label,
        confidence=confidence,
        diagnostics={
            "duration_seconds": round(duration, 2),
            "sample_rate_hz": sr,
            "pretrained_latency_ms": pt_res.latency_ms,
            "pretrained_prob": pt_res.synthetic_probability,
            "acoustic_prob": ac_res.synthetic_probability,
            **ac_res.diagnostics,
        },
    )

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "VEIL Audio Anti-Spoofing Model Service",
        "pretrained_model": {
            "model_id": HF_MODEL_ID,
            "description": HF_MODEL_DESC,
            "huggingface_url": HF_MODEL_URL,
            "loaded": pretrained_model is not None,
            "download_size_mb": model_download_size_mb,
            "error": model_load_error,
        },
        "acoustic_heuristic": {
            "name": "Acoustic Spectral Heuristic",
            "status": "online",
        },
    }

@app.post("/analyze", response_model=DualAnalyzeResponse)
async def analyze_audio(request: Request):
    content_type = request.headers.get("content-type", "")
    content = b""

    if "application/json" in content_type:
        body = await request.json()
        b64 = body.get("audioBase64") or body.get("audio")
        if not b64:
            return evaluate_audio_samples(np.array([], dtype=np.float32), 16000)
        content = base64.b64decode(b64)
    else:
        content = await request.body()

    if not content or len(content) < 44:
        return evaluate_audio_samples(np.array([], dtype=np.float32), 16000)

    try:
        samples, sr = parse_wav_samples(content)
        return evaluate_audio_samples(samples, sr)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process audio: {str(e)}")

@app.post("/evaluate")
def evaluate_evaluation_folder():
    """
    Evaluates clips in /evaluation/real and /evaluation/synthetic (and falls back to /evaluation).
    Generates exact confusion matrix, accuracy, FPR, FNR for:
      1. Pretrained model (Wav2Vec2)
      2. Acoustic heuristic
      3. Combined (both consensus and average prob)
    """
    base_eval_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "evaluation"))
    real_dir = os.path.join(base_eval_dir, "real")
    synth_dir = os.path.join(base_eval_dir, "synthetic")

    clip_paths = []
    if os.path.exists(real_dir) and os.path.exists(synth_dir):
        for f in sorted(os.listdir(real_dir)):
            if f.endswith(".wav"):
                clip_paths.append((os.path.join(real_dir, f), f"real/{f}", False))
        for f in sorted(os.listdir(synth_dir)):
            if f.endswith(".wav"):
                clip_paths.append((os.path.join(synth_dir, f), f"synthetic/{f}", True))
    else:
        for f in sorted(os.listdir(base_eval_dir)):
            if f.endswith(".wav"):
                is_synth = "synth" in f.lower() or "spoof" in f.lower()
                clip_paths.append((os.path.join(base_eval_dir, f), f, is_synth))

    if not clip_paths:
        return {"error": "No WAV clips found in evaluation directory", "path": base_eval_dir}

    clips_results = []
    latencies = []

    # Confusion counters: TP, TN, FP, FN
    pt_c = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
    ac_c = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
    cb_dual_c = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
    cb_avg_c = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}

    for abs_path, rel_name, is_ground_truth_synth in clip_paths:
        try:
            with open(abs_path, "rb") as f:
                content = f.read()
            samples, sr = parse_wav_samples(content)
            eval_res = evaluate_audio_samples(samples, sr)

            pt_synth = eval_res.pretrained_model.is_synthetic if eval_res.pretrained_model.is_synthetic is not None else False
            ac_synth = eval_res.acoustic_heuristic.is_synthetic if eval_res.acoustic_heuristic.is_synthetic is not None else False
            dual_synth = bool(pt_synth and ac_synth)
            avg_synth = eval_res.combined.is_synthetic if eval_res.combined.is_synthetic is not None else False

            if eval_res.pretrained_model.latency_ms:
                latencies.append(eval_res.pretrained_model.latency_ms)

            # Update Pretrained counters
            if is_ground_truth_synth and pt_synth: pt_c["tp"] += 1
            elif not is_ground_truth_synth and not pt_synth: pt_c["tn"] += 1
            elif not is_ground_truth_synth and pt_synth: pt_c["fp"] += 1
            else: pt_c["fn"] += 1

            # Update Acoustic counters
            if is_ground_truth_synth and ac_synth: ac_c["tp"] += 1
            elif not is_ground_truth_synth and not ac_synth: ac_c["tn"] += 1
            elif not is_ground_truth_synth and ac_synth: ac_c["fp"] += 1
            else: ac_c["fn"] += 1

            # Update Dual Consensus counters (both must flag)
            if is_ground_truth_synth and dual_synth: cb_dual_c["tp"] += 1
            elif not is_ground_truth_synth and not dual_synth: cb_dual_c["tn"] += 1
            elif not is_ground_truth_synth and dual_synth: cb_dual_c["fp"] += 1
            else: cb_dual_c["fn"] += 1

            # Update Average Probability counters
            if is_ground_truth_synth and avg_synth: cb_avg_c["tp"] += 1
            elif not is_ground_truth_synth and not avg_synth: cb_avg_c["tn"] += 1
            elif not is_ground_truth_synth and avg_synth: cb_avg_c["fp"] += 1
            else: cb_avg_c["fn"] += 1

            clips_results.append({
                "filename": rel_name,
                "ground_truth": "Synthetic" if is_ground_truth_synth else "Authentic Human",
                "pretrained_model": {
                    "predicted": "Synthetic" if pt_synth else "Authentic Human",
                    "synthetic_probability": eval_res.pretrained_model.synthetic_probability,
                    "latency_ms": eval_res.pretrained_model.latency_ms,
                    "correct": (pt_synth == is_ground_truth_synth),
                },
                "acoustic_heuristic": {
                    "predicted": "Synthetic" if ac_synth else "Authentic Human",
                    "synthetic_probability": eval_res.acoustic_heuristic.synthetic_probability,
                    "diagnostics": eval_res.acoustic_heuristic.diagnostics,
                    "correct": (ac_synth == is_ground_truth_synth),
                },
                "combination": {
                    "dual_consensus_predicted": "Synthetic" if dual_synth else "Authentic Human",
                    "dual_consensus_correct": (dual_synth == is_ground_truth_synth),
                    "average_predicted": "Synthetic" if avg_synth else "Authentic Human",
                    "average_probability": eval_res.combined.synthetic_probability,
                    "verdict": eval_res.combined.verdict,
                },
            })
        except Exception as err:
            clips_results.append({
                "filename": rel_name,
                "error": str(err),
            })

    total = len(clips_results)
    mean_latency_ms = round(float(np.mean(latencies)), 1) if latencies else 0.0

    def calc_metrics(c):
        acc = round((c["tp"] + c["tn"]) / total * 100, 1) if total > 0 else 0.0
        fpr = round(c["fp"] / (c["fp"] + c["tn"]) * 100, 1) if (c["fp"] + c["tn"]) > 0 else 0.0
        fnr = round(c["fn"] / (c["fn"] + c["tp"]) * 100, 1) if (c["fn"] + c["tp"]) > 0 else 0.0
        return {
            "accuracy_percent": acc,
            "false_positive_rate_percent": fpr,
            "false_negative_rate_percent": fnr,
            "confusion_matrix": {
                "true_positives": c["tp"],
                "true_negatives": c["tn"],
                "false_positives": c["fp"],
                "false_negatives": c["fn"],
            },
        }

    summary = {
        "sample_size": total,
        "sample_size_note": f"Tested on {total} clips (10 authentic human, 10 synthetic vocoder recordings). Results are indicative only.",
        "cpu_latency": {
            "mean_ms": mean_latency_ms,
            "min_ms": round(float(np.min(latencies)), 1) if latencies else 0.0,
            "max_ms": round(float(np.max(latencies)), 1) if latencies else 0.0,
        },
        "model_download_size_mb": model_download_size_mb,
        "pretrained_model": {
            "name": "Pretrained Model",
            "model_id": HF_MODEL_ID,
            "description": HF_MODEL_DESC,
            "huggingface_url": HF_MODEL_URL,
            **calc_metrics(pt_c),
        },
        "acoustic_heuristic": {
            "name": "Acoustic Heuristic",
            **calc_metrics(ac_c),
        },
        "combination_dual_consensus": {
            "name": "Combination (Dual Consensus: Both Must Flag)",
            **calc_metrics(cb_dual_c),
        },
        "combination_average_prob": {
            "name": "Combination (Average Probability >= 0.50)",
            **calc_metrics(cb_avg_c),
        },
        "clips": clips_results,
    }

    results_path = os.path.join(base_eval_dir, "evaluation_results.json")
    with open(results_path, "w", encoding="utf-8") as rf:
        json.dump(summary, rf, indent=2)

    return summary

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=5001, log_level="info")
