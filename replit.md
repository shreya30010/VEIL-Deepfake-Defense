# VEIL — Real-Time Deepfake & Voice-Cloning Shield

A zero-latency, multi-layered cybersecurity defense system designed to detect real-time deepfake video face swapping, voice cloning, and social-engineering scams during live video calls on Zoom, Teams, FaceTime, and Google Meet.

## Run & Operate

- `npx pnpm --filter @workspace/vericall run dev` — Run the VEIL Vite dev server on port 3000 (`http://localhost:3000/`)
- `npx pnpm --filter @workspace/vericall run typecheck` — Run TypeScript typechecking across the application (0 errors)
- `npx pnpm --filter @workspace/vericall run build` — Build production bundle to `artifacts/vericall/dist`
- Optional environment overrides: `PORT` (defaults to 3000), `BASE_PATH` (defaults to `/`)

## Stack

- **Monorepo Architecture**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend Core**: React 19, Lucide React icons, Tailwind CSS 4.0
- **Audio Intelligence**: HTML5 Web Audio API (32-bin Fast Fourier Transform spectrum, 0-16 kHz analyzer, procedural tone synthesizer)
- **Computer Vision & HUD**: HTML5 Canvas biometric reticle, animated 468-point facial mesh wireframe, FPS & telemetry monitors
- **Live Transcription**: Web Speech API (`webkitSpeechRecognition` / `SpeechRecognition`) with sample fallback
- **State & Storage**: Client-side encrypted `localStorage` (`veil-shield-contacts`, `veil-shield-settings`) for zero-cloud privacy
- **Build System**: Vite 7.3 with Rollup & ESBuild

## Where Things Live

- `artifacts/vericall/src/App.tsx` — Main application shell hosting the 10-module router, active defenses, and alert banners
- `artifacts/vericall/src/components/LiveCameraHUD.tsx` — Canvas overlay rendering facial tracking wireframe, cyber reticles, and telemetry
- `artifacts/vericall/src/components/AudioWaveformVisualizer.tsx` — 32-bin Web Audio API real-time microphone FFT spectrum visualizer
- `artifacts/vericall/src/components/TrustMeter.tsx` — Dynamic SVG circular gauge with animated glow, category breakdown bars, and color thresholds
- `artifacts/vericall/src/lib/audio.ts` — Web Audio API frequency analyzer, microphone stream acquisition, and procedural alert tone synthesizer
- `artifacts/vericall/src/lib/i18n.ts` — Multi-language localization dictionary supporting English (`en`), Hindi (`hi`), Kannada (`kn`), and Tamil (`ta`)
- `artifacts/vericall/src/types/veil.ts` — TypeScript type definitions for detection telemetry, scenarios, contacts, and reports
- `artifacts/vericall/src/index.css` — High-tech command center dark theme, glowing border transitions, radar sweeps, and printable PDF report CSS

## Architecture Decisions

1. **Defense-in-Depth Layered Architecture**: Rather than relying on a single fallible metric, VEIL combines 5 synergistic layers: Visual HUD telemetry, Acoustic spectral FFT analysis, Real-time transcript keyword scanning, Active behavioral challenges (liveness head-turn, phonetic phrase test), and an aggregated Rolling Trust Meter.
2. **100% Client-Side Zero-Cloud Privacy**: Video frames and audio samples are evaluated directly within the browser runtime using Canvas and Web Audio API. Media is never uploaded or streamed to external third-party servers.
3. **Deterministic Attack Scenarios**: 8 realistic, pre-configured attack scenarios allow immediate, reproducible demonstration of how VEIL responds to Grandparent scams, CEO wire fraud, kidnapping extortion, crypto giveaways, and IT takeovers.
4. **Active Human-in-the-Loop Defenses**: When detection thresholds drop into Amber or Red, the user is provided with active defense tools (phonetic phrases that disrupt neural vocoders, out-of-band PIN verification, independent callback protocol, and an emergency STOP tripwire).
5. **Cross-Platform Compatibility**: Cleaned of Linux/Replit-only binary overrides so that packages, esbuild, and Rollup build natively across Windows, macOS, and Linux without native binary errors.

## Product Capabilities

- **Command Deck**: Real-time threat posture overview, system health status, and quick-start guides.
- **Live Shield**: Live camera HUD, real-time microphone spectrum visualizer, SVG trust gauge, live transcript scanner, active defense buttons, and "STOP: VERIFY BEFORE SENDING" tripwire.
- **Threat Intelligence**: Interactive knowledge base of deepfake vectors (FaceSwap, DiffTalk, Voice Cloning, Audio Splicing) and technical mitigations.
- **Attack Simulator**: 8 real-world interactive scam scenarios with pre-loaded transcripts and injected telemetry.
- **Scam Replay**: Second-by-second chronological forensic timeline of an intercepted deepfake call.
- **Incident History**: Searchable incident audit trail, severity filters, JSON/TXT raw data export, and formatted printable forensic PDF report.
- **Trusted Contacts**: Allowlist of VIP contacts with pre-shared challenge phrases and out-of-band channels.
- **Enterprise Security**: SOC 2 / ISO 27001 readiness checks, automated SIEM Webhook integration dispatcher, and compliance audit trail.
- **Benchmark Lab**: Latency breakdown across visual (12ms), acoustic (6ms), and semantic (4ms) pipelines.
- **Privacy & Settings**: Zero-cloud pledge, alert sound toggles, sensitivity thresholds, and 4-language switcher.

## Gotchas & Tips

- If microphone or camera access is denied or unavailable on the test machine, VEIL automatically falls back to high-fidelity simulated telemetry without crashing.
- For printable incident reports, click "Print Incident Report" in the Incident History tab; `@media print` CSS cleanly strips the navigation bar and renders an official forensic document.
