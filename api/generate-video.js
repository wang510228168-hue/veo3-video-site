import { GoogleAuth } from 'google-auth-library';

/**
 * ENV in Vercel Project Settings:
 * - DEMO=true                # to enable instant sample video
 * - GCP_PROJECT_ID           # your GCP project id (for real mode)
 * - GCP_LOCATION=us-central1 # region (for real mode)
 * - GCP_SERVICE_ACCOUNT_JSON # JSON string with service account credentials (for real mode)
 */

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).send('Method Not Allowed');

  const { prompt, model, camera, style, imageDataUrl } = req.body || {};
  if (!prompt && !imageDataUrl) return res.status(400).send('Missing prompt or image');

  try {
    // DEMO: return a sample mp4 so the site works immediately
    if (process.env.DEMO === 'true') {
      return res.json({
        videoUrl: 'https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4'
      });
    }

    const PROJECT_ID = process.env.GCP_PROJECT_ID;
    const LOCATION   = process.env.GCP_LOCATION || 'us-central1';
    if (!PROJECT_ID) return res.status(500).send('Missing GCP_PROJECT_ID');

    // Select model id
    let MODEL_ID;
    const hasImage = !!imageDataUrl;
    if (hasImage) {
      MODEL_ID = 'veo-3.0-generate-preview';
    } else if (model === 'veo3-fast') {
      MODEL_ID = 'veo-3.0-fast-generate-001';
    } else {
      MODEL_ID = 'veo-3.0-generate-001';
    }

    // Auth
    const auth = new GoogleAuth({
      credentials: JSON.parse(process.env.GCP_SERVICE_ACCOUNT_JSON || '{}'),
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const token  = await client.getAccessToken();

    // Build instances
    const instances = [];
    const instance  = {};
    if (prompt) instance.prompt = prompt;
    if (hasImage) {
      const [meta, b64] = imageDataUrl.split(',');
      const mime = (meta.match(/data:(.*?);base64/) || [])[1] || 'image/png';
      instance.image = { bytesBase64Encoded: b64, mimeType: mime };
    }
    instances.push(instance);

    const parameters = { durationSeconds: 8, sampleCount: 1 };
    if (MODEL_ID.includes('preview')) parameters.generateAudio = true;

    const createUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning`;
    const createResp = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ instances, parameters })
    });

    if (!createResp.ok) {
      const txt = await createResp.text();
      return res.status(createResp.status).send(txt);
    }

    const createJson  = await createResp.json();
    const operationName = createJson.name;

    // Polling
    const pollUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:fetchPredictOperation`;
    let done = false, videoUrl = null;

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 4000));
      const pollResp = await fetch(pollUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operationName })
      });
      const pollJson = await pollResp.json();
      if (pollJson.done) {
        done = true;
        const vids = pollJson?.response?.videos || [];
        if (vids[0]?.bytesBase64Encoded) {
          videoUrl = `data:video/mp4;base64,${vids[0].bytesBase64Encoded}`;
        } else if (vids[0]?.gcsUri) {
          // Return GCS URI (you can sign it on your side if needed)
          videoUrl = vids[0].gcsUri;
        }
        break;
      }
    }

    if (!done || !videoUrl) return res.status(504).send('Generation timed out or video missing');
    return res.json({ videoUrl });
  } catch (e){
    console.error(e);
    return res.status(500).send(e?.message || 'Server error');
  }
}
