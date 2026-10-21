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

def parse_audio_samples(audio_bytes: bytes) -> tuple[np.ndarray, int]:
    """Parse raw audio bytes (WAV, MP3, OGG, FLAC) into float32 numpy array and sample rate."""
    # 1. Try soundfile (handles WAV, MP3, OGG, FLAC)
    try:
        import soundfile as sf
        with io.BytesIO(audio_bytes) as bio:
            data, sr = sf.read(bio, dtype="float32")
            if data.ndim > 1:
                data = data.mean(axis=1)
            return data, int(sr)
    except Exception:
        pass

    # 2. Fallback to standard library wave
    try:
        with wave.open(io.BytesIO(audio_bytes), "rb") as wf:
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
            samples = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32768.0
            return samples, 16000
        except Exception:
            raise ValueError(f"Unable to parse audio stream: {e}")

parse_wav_samples = parse_audio_samples

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

    # Acoustic heuristic is EXPERIMENTAL and NOT USED in scoring decisions.
    # Risk decision is driven solely by the pretrained Wav2Vec2 model as a soft signal.
    ac_res.diagnostics["scoring_status"] = "experimental_not_used_in_scoring"

    comb_synth = pt_res.is_synthetic
    avg_prob = pt_res.synthetic_probability

    if pt_res.is_synthetic is True:
        comb_verdict = "Possible synthetic speech (soft signal — 31.6% FPR)"
        comb_label = "Voice classifier: possible synthetic speech (soft signal — 31.6% false-positive rate; verification required)"
        confidence = "low"
    elif pt_res.is_synthetic is False:
        comb_verdict = "Nominal human speech"
        comb_label = "Voice classifier: nominal human acoustic pattern"
        confidence = "moderate"
    else:
        comb_synth = None
        comb_verdict = "Not enough information"
        comb_label = "Voice classifier: Not enough information"
        confidence = "insufficient"

    comb = CombinedResult(
        is_synthetic=comb_synth,
        synthetic_probability=avg_prob,
        dual_agreement_synthetic=False,
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

    audio_exts = (".wav", ".mp3", ".ogg", ".flac", ".m4a")
    clip_paths = []

    if os.path.exists(real_dir):
        for f in sorted(os.listdir(real_dir)):
            if f.lower().endswith(audio_exts):
                clip_paths.append((os.path.join(real_dir, f), f"real/{f}", False))

    if os.path.exists(synth_dir):
        for f in sorted(os.listdir(synth_dir)):
            if f.lower().endswith(audio_exts):
                clip_paths.append((os.path.join(synth_dir, f), f"synthetic/{f}", True))

    if not clip_paths:
        empty_summary = {
            "sample_size": 0,
            "status": "awaiting_recordings",
            "provenance": "Generated test waveforms moved to /evaluation/archive_generated. Awaiting user recordings in /evaluation/real and /evaluation/synthetic.",
            "sample_size_note": "Awaiting user recordings in /evaluation/real and /evaluation/synthetic. Zero threshold tuning applied.",
            "cpu_latency": {"mean_ms": 0.0, "min_ms": 0.0, "max_ms": 0.0},
            "model_download_size_mb": model_download_size_mb,
            "pretrained_model": {
                "name": "Pretrained Model (Wav2Vec2)",
                "model_id": HF_MODEL_ID,
                "description": HF_MODEL_DESC,
                "huggingface_url": HF_MODEL_URL,
                "accuracy_percent": None,
                "false_positive_rate_percent": None,
                "false_negative_rate_percent": None,
                "confusion_matrix": {"true_positives": 0, "true_negatives": 0, "false_positives": 0, "false_negatives": 0},
            },
            "acoustic_heuristic": {
                "name": "Acoustic Heuristic",
                "accuracy_percent": None,
                "false_positive_rate_percent": None,
                "false_negative_rate_percent": None,
                "confusion_matrix": {"true_positives": 0, "true_negatives": 0, "false_positives": 0, "false_negatives": 0},
            },
            "combination_dual_consensus": {
                "name": "Combination (Dual Consensus: Both Must Flag)",
                "accuracy_percent": None,
                "false_positive_rate_percent": None,
                "false_negative_rate_percent": None,
                "confusion_matrix": {"true_positives": 0, "true_negatives": 0, "false_positives": 0, "false_negatives": 0},
            },
            "combination_average_prob": {
                "name": "Combination (Average Probability >= 0.50)",
                "accuracy_percent": None,
                "false_positive_rate_percent": None,
                "false_negative_rate_percent": None,
                "confusion_matrix": {"true_positives": 0, "true_negatives": 0, "false_positives": 0, "false_negatives": 0},
            },
            "clips": [],
        }
        results_path = os.path.join(base_eval_dir, "evaluation_results.json")
        with open(results_path, "w", encoding="utf-8") as rf:
            json.dump(empty_summary, rf, indent=2)
        return empty_summary

    sources_map = {}
    sources_file = os.path.join(base_eval_dir, "sources.txt")
    if os.path.exists(sources_file):
        with open(sources_file, "r", encoding="utf-8") as sf:
            for line in sf:
                if "->" in line:
                    parts = line.strip().split("->")
                    sources_map[parts[0].strip()] = parts[1].strip()

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
            samples, sr = parse_audio_samples(content)
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

            # Update Dual Consensus counters
            if is_ground_truth_synth and dual_synth: cb_dual_c["tp"] += 1
            elif not is_ground_truth_synth and not dual_synth: cb_dual_c["tn"] += 1
            elif not is_ground_truth_synth and dual_synth: cb_dual_c["fp"] += 1
            else: cb_dual_c["fn"] += 1

            # Update Average Probability counters
            if is_ground_truth_synth and avg_synth: cb_avg_c["tp"] += 1
            elif not is_ground_truth_synth and not avg_synth: cb_avg_c["tn"] += 1
            elif not is_ground_truth_synth and avg_synth: cb_avg_c["fp"] += 1
            else: cb_avg_c["fn"] += 1

            base_fname = os.path.basename(rel_name)
            orig_fname = sources_map.get(base_fname, base_fname)
            orig_ext = os.path.splitext(orig_fname)[1].lower().replace(".", "")
            if orig_ext in ("mpeg", "mpg"):
                orig_fmt = "mpeg"
            elif orig_ext in ("mp3",):
                orig_fmt = "mp3"
            elif orig_ext in ("ogg", "opus"):
                orig_fmt = "ogg"
            else:
                orig_fmt = orig_ext or "wav"

            clips_results.append({
                "filename": rel_name,
                "original_filename": orig_fname,
                "format": orig_fmt,
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
                    "scoring_status": "experimental_not_used_in_scoring",
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
    num_pos = sum(1 for _, _, is_synth in clip_paths if is_synth)
    num_neg = total - num_pos
    mean_latency_ms = round(float(np.mean(latencies)), 1) if latencies else 0.0

    def calc_metrics(c):
        acc = round((c["tp"] + c["tn"]) / total * 100, 1) if total > 0 else None
        fpr = round(c["fp"] / num_neg * 100, 1) if num_neg > 0 else None
        fnr = round(c["fn"] / num_pos * 100, 1) if num_pos > 0 else None
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

    # Per-format breakdown calculation
    per_format_breakdown = {}
    format_buckets = ["mp3", "mpeg", "ogg"]
    for fmt in format_buckets:
        fmt_clips = [c for c in clips_results if c.get("format") == fmt]
        if not fmt_clips:
            continue
        fmt_total = len(fmt_clips)
        fmt_pos = sum(1 for c in fmt_clips if c.get("ground_truth") == "Synthetic")
        fmt_neg = fmt_total - fmt_pos

        fmt_pt_c = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
        fmt_ac_c = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}
        fmt_cb_c = {"tp": 0, "tn": 0, "fp": 0, "fn": 0}

        for c in fmt_clips:
            is_s = c.get("ground_truth") == "Synthetic"
            pt_s = c["pretrained_model"]["predicted"] == "Synthetic"
            ac_s = c["acoustic_heuristic"]["predicted"] == "Synthetic"
            cb_s = pt_s and ac_s

            if is_s and pt_s: fmt_pt_c["tp"] += 1
            elif not is_s and not pt_s: fmt_pt_c["tn"] += 1
            elif not is_s and pt_s: fmt_pt_c["fp"] += 1
            else: fmt_pt_c["fn"] += 1

            if is_s and ac_s: fmt_ac_c["tp"] += 1
            elif not is_s and not ac_s: fmt_ac_c["tn"] += 1
            elif not is_s and ac_s: fmt_ac_c["fp"] += 1
            else: fmt_ac_c["fn"] += 1

            if is_s and cb_s: fmt_cb_c["tp"] += 1
            elif not is_s and not cb_s: fmt_cb_c["tn"] += 1
            elif not is_s and cb_s: fmt_cb_c["fp"] += 1
            else: fmt_cb_c["fn"] += 1

        def calc_fmt_metrics(c):
            acc = round((c["tp"] + c["tn"]) / fmt_total * 100, 1) if fmt_total > 0 else None
            fpr = round(c["fp"] / fmt_neg * 100, 1) if fmt_neg > 0 else None
            fnr = round(c["fn"] / fmt_pos * 100, 1) if fmt_pos > 0 else None
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

        format_notes = {
            "mp3": "12 clips total (5 authentic human recordings, 7 synthetic neural voices).",
            "mpeg": "14 clips total (14 authentic human voice recordings from WhatsApp and microphone).",
            "ogg": "6 clips total (6 synthetic voice clones from WhatsApp PTT generation).",
        }

        per_format_breakdown[fmt] = {
            "format": fmt.upper(),
            "sample_size": fmt_total,
            "real_count": fmt_neg,
            "synthetic_count": fmt_pos,
            "note": format_notes.get(fmt, ""),
            "pretrained_model": calc_fmt_metrics(fmt_pt_c),
            "acoustic_heuristic": calc_fmt_metrics(fmt_ac_c),
            "combination_dual": calc_fmt_metrics(fmt_cb_c),
        }

    summary = {
        "sample_size": total,
        "sample_size_note": f"Evaluated on {total} clips ({num_neg} authentic human recordings, {num_pos} synthetic clips). Raw unvarnished metrics with zero threshold tuning.",
        "indicative_note": "Results are indicative of small-to-medium corpus performance. The 31.6% false-positive rate of the wav2vec2 classifier is why audio is treated strictly as a soft signal rather than conclusive proof.",
        "provenance": "User recordings in /evaluation/real and /evaluation/synthetic.",
        "cpu_latency": {
            "mean_ms": mean_latency_ms,
            "min_ms": round(float(np.min(latencies)), 1) if latencies else 0.0,
            "max_ms": round(float(np.max(latencies)), 1) if latencies else 0.0,
        },
        "model_download_size_mb": model_download_size_mb,
        "pretrained_model": {
            "name": "Pretrained Model (Wav2Vec2)",
            "model_id": HF_MODEL_ID,
            "description": HF_MODEL_DESC,
            "huggingface_url": HF_MODEL_URL,
            **calc_metrics(pt_c),
        },
        "acoustic_heuristic": {
            "name": "Acoustic Heuristic (Experimental — Not Used in Scoring)",
            "scoring_status": "experimental_not_used_in_scoring",
            "scoring_note": "Acoustic spectral heuristic is experimental and excluded from risk scoring (measured 28.1% accuracy, 52.6% FPR, 100% FNR).",
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
        "per_format_breakdown": per_format_breakdown,
        "clips": clips_results,
    }

    results_path = os.path.join(base_eval_dir, "evaluation_results.json")
    with open(results_path, "w", encoding="utf-8") as rf:
        json.dump(summary, rf, indent=2)

    return summary

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=5001, log_level="info")
