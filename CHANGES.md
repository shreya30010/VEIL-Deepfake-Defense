# VEIL fixes - batch 1 (apply notes)

NOT RUN by the assistant (no network, no model, no installs): TypeScript check, build, pnpm test, live microphone, model service.
Only syntax checks, the .env loader and the resampler were executed. Run the checks in README section 8 before trusting this.

## Changed / added files
Issue 1 (Live Shield uses the model, never fakes "Nominal")
- artifacts/api-server/src/routes/detect.ts   model call + explicit model_status; score is null without a real input; MODEL_SERVICE_URL honoured; fixed shared-regex lastIndex bug
- artifacts/vericall/src/App.tsx              chunk dispatcher (stale-closure fix, in-flight guard, real error messages), "Nominal" badge only from a real model result
- artifacts/vericall/src/lib/audio.ts         one resample per 3.5 s chunk with box filter; startChunkRecording returns false when it cannot start
- artifacts/vericall/src/components/LiveCameraHUD.tsx   removed invented lip-sync / blink / "PASS" readouts
- lib/api-spec/openapi.yaml, lib/api-zod/..., lib/api-client-react/...   score is nullable
Issue 2: idle gauge "--"/grey; Overview and other pages no longer show a hardcoded 88
Issue 3: offline banner text, fake 'demo-token' login removed
Issue 5: artifacts/api-server/src/env.ts (new), index.ts, lib/auth.ts, routes/payments.ts, PaymentRequestsView.tsx, OnboardingModal.tsx, tests/veil_test_suite.mjs, .github/workflows/ci.yml, .env.example, .gitignore, README.md, DEPLOYMENT.md, DEMO_SCRIPT.md
  - SESSION_SECRET and ERP_GATE_API_KEY come only from .env; the API refuses to start without them
  - callback code: keyed hash (HMAC-SHA-256), 10 min, single use, 5 attempts
  - new login-protected route GET /api/payments/:id/clearance-check (the browser no longer holds the ERP key)
Issue 6: start.bat, scripts/start-all.ps1, scripts/check-services.ps1, scripts/freeze-requirements.ps1, package.json scripts (dev:all, check:services), README section 8

## NOT done yet
- Issue 4 (Evaluation page wording, per-format note, label fixes, codec-normalized script) and sources.txt
- requirements.txt (run scripts\freeze-requirements.ps1 in your Python environment)
- Dual Consensus column removal
- Issue 7 ranked bug list

## Existing .env
If you already have a .env, make sure SESSION_SECRET (32+ chars) and ERP_GATE_API_KEY are set. Otherwise delete it and run start.bat.
