# VEIL — Cloud Deployment Runbook (Free Tier & Production)

This guide provides production-ready deployment instructions for VEIL across free-tier and low-cost container and PaaS hosting platforms (**Render**, **Railway**, **Fly.io**, or **Hugging Face Spaces**).

---

## 1. Architecture & Deployment Topology

VEIL consists of three decoupled components:
1. **Frontend**: React 19 + Vite SPA (static assets, deployable to Cloudflare Pages, Vercel, Netlify, or Render Static Sites).
2. **Backend API**: Node.js Express server with SQLite + Drizzle ORM (deployable to Render, Railway, or Fly.io).
3. **Model Service (Optional)**: Python 3.10+ FastAPI service running acoustic heuristics and the pretrained Wav2Vec2 audio classifier (deployable to Render Web Service, Railway, or Hugging Face Spaces).

```
                      +------------------------------------------+
                      |         Static Web Hosting (Vite)         |
                      |    (Render Static, Vercel, Netlify)      |
                      +------------------------------------------+
                                           | HTTPS
                                           v
                      +------------------------------------------+
                      |        Express API Server (Port 3001)    |
                      |           (Render, Railway, Fly.io)      |
                      |        SQLite Data Volume / Persistent    |
                      +------------------------------------------+
                                           | HTTP (Internal / Network)
                                           v
                      +------------------------------------------+
                      |      Python FastAPI Service (Port 5001)  |
                      |      (Render Web Service / HF Spaces)     |
                      |  *Audio analysis unavailable if it is down* |
                      +------------------------------------------+
```

---

## 2. When the Model Service Is Down (No Silent Fallback)

> [!NOTE]
> **No Paid Services Required**: VEIL uses no paid cloud APIs (no OpenAI, no Anthropic, no paid voice biometrics).

The Python model service is required for any audio analysis. If it is not deployed, or it spins down on a free tier:
- The API returns **no model result** for audio (`modelSignal.model_status` is `unreachable`) and **no score** unless other real input (transcript, caller claim) produced one.
- The UI shows "Model service unreachable". It never shows "Nominal" or a number made up locally.
- Payment holds, two-person approval, the ERP gate and the audit log do not depend on the model service and keep working.

---

## 3. Option A: Deploying on Render (Free Tier)

### Step 1: Deploy Python Model Service (Optional)
1. Fork or push this repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** -> **Web Service**.
3. Select your repository.
4. Configure:
   - **Name**: `veil-model-service`
   - **Root Directory**: `artifacts/model-service`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free
5. Click **Create Web Service**. Note the assigned URL (e.g., `https://veil-model-service.onrender.com`).

### Step 2: Deploy Backend API Server
1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select your repository.
3. Configure:
   - **Name**: `veil-api-server`
   - **Root Directory**: leave blank (repo root)
   - **Environment**: `Node`
   - **Build Command**: `npm install -g pnpm && pnpm install && pnpm --filter @workspace/api-server run build`
   - **Start Command**: `node artifacts/api-server/dist/index.mjs`
   - **Instance Type**: Free
4. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `3001`
   - `SESSION_SECRET`: `<generate-a-strong-random-32-char-string>`
   - `MODEL_SERVICE_URL`: `https://veil-model-service.onrender.com` (if blank, it defaults to `http://127.0.0.1:5001`)
   - `ERP_GATE_API_KEY`: `<generate-a-random-string-of-24-or-more-characters>`
5. Click **Create Web Service**. Note the assigned URL (e.g., `https://veil-api-server.onrender.com`).

### Step 3: Deploy Frontend SPA
1. In Render Dashboard, click **New +** -> **Static Site**.
2. Configure:
   - **Name**: `veil-defense-ui`
   - **Root Directory**: leave blank
   - **Build Command**: `npm install -g pnpm && pnpm install && pnpm --filter @workspace/vericall run build`
   - **Publish Directory**: `artifacts/vericall/dist/public`
3. Add Rewrite/Redirect rule for Single Page Application:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: `Rewrite`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://veil-api-server.onrender.com`

---

## 4. Option B: Deploying on Railway

Railway simplifies multi-service deployments via a single GitHub repository.

1. Create a **New Project** on [Railway](https://railway.app/).
2. Select **Deploy from GitHub repo**.
3. Add a service for the Express API:
   - **Build Command**: `npm install -g pnpm && pnpm install && pnpm --filter @workspace/api-server run build`
   - **Start Command**: `node artifacts/api-server/dist/index.mjs`
   - Set variables: `SESSION_SECRET`, `PORT=3001`.
   - Add a persistent volume mounted at `/app/artifacts/api-server/data` to persist the SQLite database across restarts.
4. Add a service for the Frontend:
   - **Build Command**: `npm install -g pnpm && pnpm install && pnpm --filter @workspace/vericall run build`
   - **Start Command**: `npx serve -s artifacts/vericall/dist/public -l $PORT`
5. (Optional) Add a service for the Python Model:
   - **Root Directory**: `artifacts/model-service`
   - **Start Command**: `python -m uvicorn app:app --host 0.0.0.0 --port $PORT`

---

## 5. Option C: Single-Server Docker Deployment (Self-Hosted)

For self-hosted Linux/Windows server deployments (Docker Compose):

```yaml
version: '3.8'

services:
  veil-api:
    build:
      context: .
      dockerfile: Dockerfile.api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - SESSION_SECRET=${SESSION_SECRET}   # set in a .env file next to docker-compose.yml, never in this file
      - ERP_GATE_API_KEY=${ERP_GATE_API_KEY}
      - MODEL_SERVICE_URL=http://veil-model:5001
    volumes:
      - veil-db:/app/artifacts/api-server/data

  veil-model:
    build:
      context: ./artifacts/model-service
      dockerfile: Dockerfile
    ports:
      - "5001:5001"

  veil-ui:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    depends_on:
      - veil-api

volumes:
  veil-db:
```

---

## 6. Pre-Flight Verification & Health Checks

Once deployed, verify your deployment in under 60 seconds:

```bash
# 1. API Health Check
curl https://<your-api-url>/api/health
# Expected: {"status":"healthy","uptime":...}

# 2. Automated Test Suite (can be executed against deployed URL)
npx pnpm test

# 3. ERP Clearance Gate Test
curl -H "x-api-key: <ERP_GATE_API_KEY>" \
  https://<your-api-url>/api/integrations/payments/req-001/status
# Expected: JSON object with id, status, allowedToDisburse
```

---

## 7. Security & Maintenance Checklist

- [x] **Rate Limiting**: Express limits `/api/auth/*` (60 req / 15 min) and `/api/detect/analyze` (120 req / 1 min).
- [x] **Brute Force Lockout**: 5 failed consecutive logins lock the account for 15 minutes.
- [x] **Helmet Headers**: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `DNS-Prefetch-Control: off`.
- [x] **RBAC Protected**: All Admin routes (`/api/vendors`, `/api/contacts`, `/api/audit`) reject non-admin tokens with `403 Forbidden`.
- [x] **Two-Person Rule**: Submitter self-approval is rejected on both UI and backend.
- [x] **SQLite Backups**: Simply back up `artifacts/api-server/data/veil_defense.sqlite` daily.
