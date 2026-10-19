# VEIL Audio Anti-Spoofing & Deepfake Evaluation Suite

This directory contains benchmark test clips and evaluation tooling for the VEIL audio authenticity model (`Wav2Vec2-Acoustic-AntiSpoof-v1`).

## Directory Contents

- `real_01.wav` ... `real_10.wav`: Authentic human speech recordings with natural formant modulation, spontaneous vocal cord micro-tremor, and full frequency bandwidth extending to 16 kHz.
- `synthetic_01.wav` ... `synthetic_10.wav`: Synthetic voice-cloned / neural vocoder speech clips exhibiting characteristic high-frequency brick-wall roll-off above 7.4 kHz and mechanical amplitude envelope consistency.
- `evaluation_results.json`: Benchmark evaluation output containing overall accuracy, false positive rate (FPR), false negative rate (FNR), and clip-by-clip diagnostic metrics.
- `generate_and_eval.py`: Python evaluation runner script.

## Adding Your Own Clips

You can easily evaluate your own real voice recordings or synthetic TTS voice clones:
1. **Real voice clips**: Record your voice using any microphone, export as 16-bit PCM WAV (16 kHz mono recommended), and name the file `real_<name>.wav` (or any name without "synthetic").
2. **Synthetic clips**: Generate voice clips using any text-to-speech engine (e.g. ElevenLabs, Kokoro, Edge-TTS, Bark), save as WAV, and name the file `synthetic_<name>.wav`.
3. Run the evaluation script:
   ```powershell
   python evaluation/generate_and_eval.py
   ```
4. View the updated table in the **Evaluation** page in the VEIL web console (`/evaluation`).

## Notes on Sample Size & Limitations
Tested on 20 clips; results are indicative and provide an anti-spoofing baseline. VEIL explicitly positions the audio deepfake model as **one of several weighted signals**, giving higher decision weight to approved vendor directories and dual-custody authorization.
