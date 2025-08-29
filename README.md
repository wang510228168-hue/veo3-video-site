# Veo‑3 Video Site — One‑Click Style (Vercel)

This project deploys a ready UI + serverless API to generate videos via **Google Vertex AI (Veo‑3)**.
Demo mode is enabled by default so you can test instantly.

## Quick Deploy
1. Create a new project in **Vercel** → “Import” → drag this folder or push it to a Git repo and select it.
2. Deploy with environment variable:
   - `DEMO=true`  (so it returns a sample video immediately)
3. Open your site URL → type a prompt → **Generate Video** → you will see a demo video.

## Real Veo‑3 (turn off demo)
Set the following **Environment Variables** in Vercel:
- `DEMO` → *(unset or false)*
- `GCP_PROJECT_ID` → your GCP project id
- `GCP_LOCATION`   → e.g. `us-central1`
- `GCP_SERVICE_ACCOUNT_JSON` → the full Service Account JSON as a single line

Then redeploy. The serverless function will call:
- `predictLongRunning` for Veo‑3
- `fetchPredictOperation` to poll the result
and return the video (either as Base64 or a GCS URI).

## Files
- `index.html` — UI (prompt, model selection, image upload, video player)
- `api/generate-video.js` — Serverless function (DEMO + real mode)
- `api/register.js` — optional endpoint to log emails (not used by default)
- `package.json` — deps
- `vercel.json` — function runtime
