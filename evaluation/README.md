# VEIL Audio Evaluation Dataset & Benchmark

This directory is designed for evaluating deepfake voice-cloning detection models against real human speech and synthetic speech.

---

## 1. Directory Structure

```
evaluation/
├── real/                 # Place your authentic human voice recordings here (.wav, .mp3)
├── synthetic/            # Place your AI-generated voice clone clips here (.wav, .mp3)
├── archive_generated/    # Archived synthetic mathematical test waveforms (sine/noise)
├── evaluation_results.json # Output of the benchmark run (metrics, confusion matrix)
└── README.md             # This guide
```

---

## 2. Provenance of Historical Benchmark Files

- **Archived Test Files** (`archive_generated/`):
  - Previously, `real_01.wav` through `real_10.wav` and `synthetic_01.wav` through `synthetic_10.wav` were generated mathematically via NumPy scripts (`generate_and_eval.py`) using synthesized sine harmonics and noise.
  - **None of the previous clips were actual human voice recordings.**
  - All mathematically generated clips have been archived to `archive_generated/` so they are not misrepresented as real human speech.

---

## 3. Adding Your Own Recordings for Evaluation

You can evaluate any real speech and synthetic speech clips:

1. **Authentic Human Voice Clips**:
   - Record genuine human speech (e.g., via microphone, phone, or conference call).
   - Save or convert the files to `.wav` or `.mp3`.
   - Place them in the `evaluation/real/` directory.

2. **Synthetic / AI Voice Clones**:
   - Generate speech using any voice clone or TTS system (ElevenLabs, XTTS, Bark, OpenAI TTS, etc.).
   - Save or convert the files to `.wav` or `.mp3`.
   - Place them in the `evaluation/synthetic/` directory.

3. **Supported Formats**:
   - WAV (16-bit PCM, 16 kHz or 44.1 kHz, mono/stereo)
   - MP3 (standard bitrates, automatically converted during evaluation)

---

## 4. Running the Evaluation

To evaluate the acoustic heuristic and the pretrained Wav2Vec2 classifier on your clips:

```powershell
# From the repository root, with model-service running or via Python directly:
curl -X POST http://localhost:5001/evaluate
```
Or directly via the Python script:
```powershell
python artifacts/model-service/app.py
```
Or click **"Re-run Benchmark"** in the VEIL web console at `/evaluation`.

Results will be saved to `evaluation/evaluation_results.json` and rendered in the **Evaluation Lab** view.
