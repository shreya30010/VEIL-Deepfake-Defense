import os
import math
import numpy as np
import soundfile as sf
import scipy.signal

REAL_SRC = r"C:\Users\Admin\OneDrive\Desktop\clg_projects\real_voice"
FAKE_SRC = r"C:\Users\Admin\OneDrive\Desktop\clg_projects\fake_voice"

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
EVAL_DIR = os.path.join(WORKSPACE_ROOT, "evaluation")
REAL_DST = os.path.join(EVAL_DIR, "real")
FAKE_DST = os.path.join(EVAL_DIR, "synthetic")
SOURCES_FILE = os.path.join(EVAL_DIR, "sources.txt")

os.makedirs(REAL_DST, exist_ok=True)
os.makedirs(FAKE_DST, exist_ok=True)

def convert_audio(src_path, dst_path):
    # Read audio with soundfile
    audio, sr = sf.read(src_path)
    
    # Convert stereo/multichannel to mono by averaging channels
    if audio.ndim > 1:
        audio = np.mean(audio, axis=1)
        
    # Resample to 16 kHz if necessary
    target_sr = 16000
    if sr != target_sr:
        gcd = math.gcd(target_sr, sr)
        up = target_sr // gcd
        down = sr // gcd
        audio = scipy.signal.resample_poly(audio, up, down)
        
    # Ensure float32 in range [-1.0, 1.0]
    audio = np.clip(audio, -1.0, 1.0)
    
    # Save as 16 kHz, mono, 16-bit PCM WAV
    sf.write(dst_path, audio, target_sr, subtype="PCM_16", format="WAV")

def process_all():
    real_files = sorted([f for f in os.listdir(REAL_SRC) if not f.startswith(".")])
    fake_files = sorted([f for f in os.listdir(FAKE_SRC) if not f.startswith(".")])
    
    print(f"==================================================")
    print(f"SOURCE FOLDERS AUDIT:")
    print(f"Real human recordings folder: {REAL_SRC}")
    print(f"Real files count: {len(real_files)}")
    print(f"AI synthetic clips folder: {FAKE_SRC}")
    print(f"Synthetic files count: {len(fake_files)}")
    print(f"Total benchmark corpus: {len(real_files) + len(fake_files)} files")
    print(f"==================================================")
    
    # Clear any previous WAVs in real and synthetic directories (do not touch archive_generated)
    for existing in os.listdir(REAL_DST):
        if existing.endswith(".wav"):
            os.remove(os.path.join(REAL_DST, existing))
    for existing in os.listdir(FAKE_DST):
        if existing.endswith(".wav"):
            os.remove(os.path.join(FAKE_DST, existing))
            
    sources_log = []
    sources_log.append("=" * 80)
    sources_log.append("VEIL EVALUATION DATASET — AUDIO SOURCES & PROVENANCE")
    sources_log.append("=" * 80)
    sources_log.append("Ground-truth labels defined strictly by user directory sorting.")
    sources_log.append("All clips converted to standard 16 kHz, mono, 16-bit PCM WAV.")
    sources_log.append("Audio content is unedited and untrimmed.")
    sources_log.append("")
    sources_log.append(f"REAL HUMAN RECORDINGS (Count: {len(real_files)})")
    sources_log.append("-" * 80)
    
    print("\nConverting Real Recordings:")
    for idx, fname in enumerate(real_files, start=1):
        src_path = os.path.join(REAL_SRC, fname)
        new_name = f"real_{idx:02d}.wav"
        dst_path = os.path.join(REAL_DST, new_name)
        convert_audio(src_path, dst_path)
        sources_log.append(f"{new_name} -> {fname}")
        print(f"  [REAL {idx:02d}/{len(real_files):02d}] {fname} -> {new_name}")
        
    sources_log.append("")
    sources_log.append(f"AI-GENERATED SYNTHETIC CLIPS (Count: {len(fake_files)})")
    sources_log.append("-" * 80)
    
    print("\nConverting AI-Generated Synthetic Clips:")
    for idx, fname in enumerate(fake_files, start=1):
        src_path = os.path.join(FAKE_SRC, fname)
        new_name = f"synthetic_{idx:02d}.wav"
        dst_path = os.path.join(FAKE_DST, new_name)
        convert_audio(src_path, dst_path)
        sources_log.append(f"{new_name} -> {fname}")
        print(f"  [SYNTHETIC {idx:02d}/{len(fake_files):02d}] {fname} -> {new_name}")
        
    with open(SOURCES_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(sources_log) + "\n")
        
    print(f"\nSuccessfully wrote mapping to {SOURCES_FILE}")
    print(f"All {len(real_files)} real and {len(fake_files)} synthetic clips prepared successfully.")

if __name__ == "__main__":
    process_all()
