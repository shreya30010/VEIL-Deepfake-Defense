# VEIL — Real-Time Deepfake & Voice-Cloning Shield

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646cff.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Web Audio API](https://img.shields.io/badge/Web%20Audio%20API-32--bin%20FFT-green.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local%20%7C%20Zero--Cloud-brightgreen.svg)](#privacy--security-architecture)

> **VEIL** is a zero-latency, multi-layered cybersecurity shield designed to protect individuals, executives, and organizations from real-time deepfake video face swapping, voice cloning, and AI-amplified social engineering scams during live video calls on **Zoom**, **Microsoft Teams**, **Apple FaceTime**, and **Google Meet**.

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [The Problem: The AI Impersonation Epidemic](#the-problem-the-ai-impersonation-epidemic)
3. [The VEIL Defense Architecture](#the-veil-defense-architecture)
   - [Layer 1: Visual Biometric HUD](#layer-1-visual-biometric-hud)
   - [Layer 2: Real-Time Acoustic Spectral Analysis](#layer-2-real-time-acoustic-spectral-analysis)
   - [Layer 3: Live Semantic & Social Engineering Scanner](#layer-3-live-semantic--social-engineering-scanner)
   - [Layer 4: Active Defenses & Behavioral Challenges](#layer-4-active-defenses--behavioral-challenges)
   - [Layer 5: Rolling Trust Meter (0–100)](#layer-5-rolling-trust-meter-0100)
4. [Complete 10-Module Suite](#complete-10-module-suite)
5. [Attack Simulator: 8 Real-World Scenarios](#attack-simulator-8-real-world-scenarios)
6. [Multi-Language Localization](#multi-language-localization)
7. [Privacy & Security Architecture](#privacy--security-architecture)
8. [Getting Started & Local Development](#getting-started--local-development)
9. [Project Structure](#project-structure)
10. [Honest Claims & Ethical AI Guidelines](#honest-claims--ethical-ai-guidelines)

---

## Executive Summary

As generative diffusion models and neural vocoders approach sub-100ms inference times, bad actors can now clone an executive's voice from a 3-second audio snippet or project a loved one's face onto a live webcam stream. Traditional anti-fraud systems rely on post-call transaction disputes—**after the funds are already gone**.

**VEIL** flips the paradigm by acting as a real-time, in-call defensive layer that continuously interrogates the visual and acoustic integrity of the incoming stream, scans conversational transcripts for urgency-based extortion triggers, and provides interactive challenges to unmask synthetic impostors **before** any action is taken.

---

## The Problem: The AI Impersonation Epidemic

- **Grandparent Scams**: Cloned voices begging elderly relatives for bail money or emergency hospital funds.
- **CEO Wire Fraud**: Synthetic deepfake video of a CFO or CEO ordering urgent acquisition wire transfers.
- **Virtual Recruiter Credential Harvesting**: AI avatars conducting interviews to capture sensitive employee credentials.
- **Kidnapping & Extortion Audio**: Panicked, cloned voices staged to extort ransom payments from distressed parents.

---

## The VEIL Defense Architecture

VEIL applies a **Defense-in-Depth** model consisting of five synergistic layers:

```
+-------------------------------------------------------------------------+
|                              VEIL SHIELD                                |
+-------------------------------------------------------------------------+
       |                                                    |
[Incoming Video Stream]                             [Incoming Audio Stream]
       |                                                    |
       v                                                    v
+-----------------------+                           +---------------------+
| Layer 1: Visual HUD   |                           | Layer 2: Audio FFT  |
| - 468pt Mesh Reticle  |                           | - 32-bin Analyzer   |
| - Chin/Neck Artifacts |                           | - Vocoder Cutoff    |
| - Blink Periodicity   |                           | - Formant Jitter    |
+-----------------------+                           +---------------------+
       \                                                    /
        +-------------------------+------------------------+
                                  |
                                  v
                    +---------------------------+
                    | Layer 3: Semantic Scanner |
                    | - Web Speech API STT      |
                    | - Urgency & Wire Flags    |
                    | - Gift Card & Crypto Trap |
                    +---------------------------+
                                  |
                                  v
                    +---------------------------+
                    | Layer 4: Active Defenses  |
                    | - Turn Head Challenge     |
                    | - Phonetic Phrase Test    |
                    | - Out-of-Band PIN         |
                    | - Independent Callback    |
                    +---------------------------+
                                  |
                                  v
                    +---------------------------+
                    | Layer 5: Trust Meter      |
                    | - Rolling Composite Score |
                    | - Green / Amber / Red     |
                    | - "STOP: VERIFY" Tripwire |
                    +---------------------------+
```

### Layer 1: Visual Biometric HUD
- High-tech biometric canvas overlay rendering animated facial tracking wireframes and cyber reticles.
- Real-time telemetry monitoring FPS, pipeline jitter, and artifact confidence.
- Heuristic boundary analysis detecting chin/neck seams, unnatural ear-edge blending, and irregular blink periodicity common in 2D face-swapping pipelines.

### Layer 2: Real-Time Acoustic Spectral Analysis
- Real-time Web Audio API `AudioContext` and `AnalyserNode` performing 32-bin Fast Fourier Transform (FFT) frequency spectrum visualization (0 Hz to 16,000 Hz).
- Heuristic detection of vocoder high-frequency cutoffs (>8 kHz attenuation), robotic harmonic regularity, and unnatural respiration cadence.
- Audio synthesis engine providing distinct acoustic warning tones for caution, critical alarm, and successful verification.

### Layer 3: Live Semantic & Social Engineering Scanner
- Real-time live dictation using the browser's native `webkitSpeechRecognition` / `SpeechRecognition` API.
- Continuous NLP transcript analysis flagging coercion triggers: *wire transfer, bitcoin, gift cards, secrecy, arrest warrant, hospital emergency, password reset*.
- Automated categorization of detected risks with confidence ratings and timestamped audit logs.

### Layer 4: Active Defenses & Behavioral Challenges
Synthetic models struggle with unpredictability. VEIL gives users active tools to break the illusion:
1. **Liveness Head-Turn Test**: Prompts caller to turn head 90° or wave their hand across their face, disrupting 2D landmark tracking models.
2. **Randomized Phrase Test**: Employs phonetically dense phrases (e.g., *"The quick brown fox jumped over the azure sphinx under erratic moonlight"*) that trigger latency spikes and vocoder distortion in real-time voice synthesis engines.
3. **Out-of-Band (OOB) Verification**: Prompts sending an encrypted numeric PIN to the caller's pre-registered phone number via Signal, SMS, or WhatsApp.
4. **Independent Callback Protocol**: Guides the user through hanging up safely and initiating an outbound call on a verified, pre-established channel.

### Layer 5: Rolling Trust Meter (0–100)
- High-precision SVG circular gauge displaying a weighted composite score:
  - **80 – 100**: Green / Trusted (Low risk, natural biometric rhythm).
  - **50 – 79**: Amber / Caution (Anomalous acoustic or semantic triggers detected).
  - **00 – 49**: Red / Critical Risk (Multiple deepfake indicators or coercion triggers active).
- Categorical breakdown displaying individual contribution percentages across Visual, Acoustic, Semantic, and Network vectors.
- **"STOP: VERIFY BEFORE SENDING" Tripwire**: Immediate high-contrast emergency screen when wire transfer or extortion phrases are detected.

---

## Complete 10-Module Suite

| Module | Purpose | Key Features |
|---|---|---|
| **1. Overview** | Security Command Deck | Threat posture summary, real-time status banner, quick start workflows, attack category distribution. |
| **2. Live Shield** | Real-Time Video Call Monitor | Video HUD overlay, camera feed toggle, Web Audio 32-bin FFT visualizer, rolling Trust Meter, live transcript scanner, active defense trigger panel, and STOP tripwire. |
| **3. Threat Intelligence** | Attack Vector Encyclopedia | Interactive cards on Deepfake FaceSwap, DiffTalk, Neural TTS, Audio Splicing, and Prompt Injection with technical mechanics and defenses. |
| **4. Attack Simulator** | Deterministic Training Lab | 8 pre-built real-world attack scenarios with simulated audio clips, deceptive transcripts, and deepfake telemetry injection. |
| **5. Scam Replay** | Forensic Timeline Walkthrough | Second-by-second timeline breakdown of an intercepted attack showing exactly when each biometric and acoustic anomaly occurred. |
| **6. Incident History** | Audit Log & Reporting | Searchable incident logs, severity filtering, raw JSON/TXT export, and formatted printable forensic PDF report. |
| **7. Trusted Contacts** | Identity Allowlist | Local storage directory of VIP contacts with verified phone numbers, preferred OOB channels, and pre-shared challenge phrases. |
| **8. Enterprise Security** | Corporate Governance & SIEM | SOC 2 Type II / ISO 27001 readiness checks, automated SIEM Webhook dispatcher (Splunk, Datadog, Elastic), compliance posture gauges. |
| **9. Benchmark Lab** | Performance & Telemetry | Live latency breakdown (Visual 12ms, Acoustic 6ms, Semantic 4ms), false positive rate analysis, and pipeline throughput meters. |
| **10. Privacy & Settings** | Zero-Cloud Controls & i18n | Zero-cloud privacy guarantee pledge, alert tone volume toggles, detection sensitivity sliders, and 4-language switcher. |

---

## Attack Simulator: 8 Real-World Scenarios

1. **Grandparent in Distress Emergency**: Cloned voice of a grandchild claiming car crash arrest and begging for immediate cash bail.
2. **CEO Emergency Wire Transfer**: Deepfake video of CEO demanding an urgent $450,000 international acquisition deposit before market close.
3. **Virtual Recruiter Identity Harvesting**: AI avatar recruiter asking for passport scans and full background SSN information during an interview.
4. **Kidnapping Voice Clone Extortion**: Simulated hostage screams and cloned crying voice demanding immediate ransom payment via cryptocurrency.
5. **Crypto Giveaway Live Hijack**: Deepfake likeness of a prominent tech executive promoting a fraudulent 2x cryptocurrency deposit giveaway.
6. **Voice-Cloned Supplier Invoice Update**: Cloned voice of an accounting vendor requesting an urgent update to their payment ACH routing number.
7. **Romance Confidence Trap**: Synthetic video suitor requesting cryptocurrency investment assistance after weeks of building online rapport.
8. **Tech Support Screen Takeover**: Impersonated corporate IT engineer claiming malware infection and demanding remote AnyDesk screen access.

---

## Multi-Language Localization

VEIL includes full native UI localization across 4 major languages:
- **English (`en`)**: Default international cybersecurity interface.
- **हिन्दी (`hi`)**: Hindi command center localization for Indian enterprise and retail defense.
- **ಕನ್ನಡ (`kn`)**: Kannada localization for regional outreach and accessibility.
- **தமிழ் (`ta`)**: Tamil localization for South Indian security compliance.

All navigation items, alerts, threat descriptions, and action buttons dynamically re-render upon selecting a language in **Privacy & Settings** or the top navigation bar.

---

## Privacy & Security Architecture

- **100% Client-Side Processing**: Camera frames and microphone audio streams are processed strictly in browser memory via the HTML5 Canvas and Web Audio API.
- **Zero Cloud Video/Audio Streaming**: No media streams are uploaded, saved, or piped to external AI cloud servers.
- **Local Storage Persistence**: Contact allowlists and customized sensitivity settings are stored exclusively in your browser's encrypted `localStorage` (`veil-shield-contacts` and `veil-shield-settings`).
- **Zero Biometric Fingerprint Retention**: No facial biometric maps or voice embeddings are permanently recorded or indexed.

---

## Getting Started & Local Development

### Prerequisites
- [Node.js](https://nodejs.org/) v20.x or higher (Node v24 recommended)
- [pnpm](https://pnpm.io/) or `npm`
- Modern Chromium or WebKit browser with Webcam and Microphone permissions

### Installation & Run Commands

```bash
# Clone the repository
git clone https://github.com/your-username/VEIL-Deepfake-Defense.git
cd VEIL-Deepfake-Defense

# Install dependencies (works across Windows, macOS, and Linux)
npx pnpm install

# Start the Vite development server
npx pnpm --filter @workspace/vericall run dev
```

The application will start on **`http://localhost:3000/`**.

### Typechecking & Production Build

```bash
# Verify TypeScript integrity
npx pnpm --filter @workspace/vericall run typecheck

# Build optimized production bundle
npx pnpm --filter @workspace/vericall run build
```

---

## Project Structure

```
VEIL-Deepfake-Defense/
├── artifacts/
│   └── vericall/                        # Primary VEIL application package
│       ├── public/                      # Static assets and favicons
│       ├── src/
│       │   ├── components/
│       │   │   ├── AudioWaveformVisualizer.tsx  # 32-bin Web Audio FFT spectrum
│       │   │   ├── LiveCameraHUD.tsx            # Biometric facial mesh canvas HUD
│       │   │   └── TrustMeter.tsx               # Rolling SVG circular trust gauge
│       │   ├── lib/
│       │   │   ├── audio.ts             # Web Audio API analyzer & synthesizers
│       │   │   ├── i18n.ts              # en, hi, kn, ta language dictionaries
│       │   │   └── utils.ts             # Utility helpers & class mergers
│       │   ├── types/
│       │   │   └── veil.ts              # Data contracts, signals, scenarios
│       │   ├── App.tsx                  # 10-module command center router & state
│       │   ├── index.css                # Command center theme, radar sweeps, print styling
│       │   └── main.tsx                 # React DOM bootstrap
│       ├── index.html                   # HTML template with fonts and metadata
│       ├── package.json                 # Package scripts and dependencies
│       └── vite.config.ts               # Vite configuration (port 3000)
├── package.json                         # Workspace root package scripts
├── pnpm-workspace.yaml                  # pnpm monorepo workspace definition
├── README.md                            # Comprehensive project guide
└── replit.md                            # Replit environment runbook & architecture
```

---

## Honest Claims & Ethical AI Guidelines

VEIL is engineered with **uncompromising honesty** regarding AI security capabilities:

1. **Heuristic Client-Side Decision Support**: The visual and acoustic indicators presented in this hackathon release reflect real-time mathematical heuristics (Fourier frequency analysis, landmark tracking stability, vocabulary tripwires). They are designed for client-side decision support and do not claim to replace hardware-backed cryptographic identity tokens.
2. **Deterministic Attack Scenarios**: The 8 attack scenarios in the Attack Simulator provide deterministic behavioral demonstrations to train call participants on how to recognize, pause, and verify AI-generated impersonation attempts.
3. **Transparent Limitations**: No software can guarantee 100% deepfake detection across all compression codecs. Therefore, VEIL emphasizes **human-in-the-loop active defenses** (out-of-band verification and phonetic challenge tests) over blind reliance on automated scores.

---

## License

MIT License. Developed for cybersecurity hackathon presentation and anti-fraud research.
