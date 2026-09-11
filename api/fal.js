const { requireAuth, sendError, applySecurityHeaders, deductCredits, checkFeature, creditExhaustedError } = require('./_auth');
const rateLimit = require('./_ratelimit');

module.exports = async function handler(req, res) {
  if (!applySecurityHeaders(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let authData;
  try { authData = await requireAuth(req); } catch (err) {
    return res.status(err.status || 500).json({ error: err.message, step: 'auth' });
  }
  const { user, subscription } = authData;
  if (!rateLimit.strict(req, res, user.id)) return;

  const { action, model, request_id, payload, narration_mode } = req.body;
  const headers = { 'Authorization': `Key ${process.env.FAL_API_KEY}`, 'Content-Type': 'application/json' };

  try {
    // ── Actions that incur costs ───────────────────────────────────────────
    if (action === 'direct' || action === 'submit') {
      const modelLower = (model || '').toLowerCase();

      // ── Feature gates (plan tier) ─────────────────────────────────────
      if (modelLower.includes('flux')) {
        const featureErr = checkFeature(subscription, 2);
        if (featureErr) return res.status(403).json(featureErr);
      }
      if (modelLower.includes('chatterbox')) {
        if (payload?.audio_url) {
          const featureErr = checkFeature(subscription, 2);
          if (featureErr) return res.status(403).json(featureErr);
        }
        if (narration_mode === 'multi_voice') {
          const featureErr = checkFeature(subscription, 3);
          if (featureErr) return res.status(403).json(featureErr);
        }
      }

      // ── Credit deduction ──────────────────────────────────────────────
      let creditCost = 0;
      if (modelLower.includes('chatterbox')) {
        const text = payload?.text || payload?.input?.text || '';
        creditCost = text.length; // 1 credit/char
      } else if (modelLower.includes('flux')) {
        creditCost = 3500; // flat rate for Flux Pro
      }
      if (creditCost > 0) {
        const credited = await deductCredits(user.id, creditCost);
        if (!credited) return res.status(402).json(creditExhaustedError(subscription));
      }
      const endpoint = action === 'direct'
        ? `https://fal.run/${model}`
        : `https://queue.fal.run/${model}`;
      const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok && creditCost > 0) await deductCredits(user.id, -creditCost).catch(() => {});
      return res.status(response.status).json(data);
    }

    // ── No-cost polling/fetch actions ─────────────────────────────────────
    if (action === 'status') {
      const { status_url } = req.body;
      const url = status_url || `https://queue.fal.run/${model}/requests/${request_id}/status`;
      const response = await fetch(url, { headers });
      return res.status(response.status).json(await response.json());
    }

    if (action === 'result') {
      const { response_url } = req.body;
      const url = response_url || `https://queue.fal.run/${model}/requests/${request_id}`;
      const response = await fetch(url, { headers });
      return res.status(response.status).json(await response.json());
    }

    if (action === 'fetch_audio') {
      const { url: audioUrl } = req.body;
      if (!audioUrl) return res.status(400).json({ error: 'Missing url' });
      const audioResp = await fetch(audioUrl, { headers: { 'Authorization': `Key ${process.env.FAL_API_KEY}` } });
      const audioBuffer = await audioResp.arrayBuffer();
      const contentType = audioResp.headers.get('content-type') || 'audio/wav';
      return res.json({ audio: Buffer.from(audioBuffer).toString('base64'), contentType });
    }

    if (action === 'fetch_image_noauth') {
      // Fetch a pre-signed CDN image URL — NO Authorization header (S3 rejects dual-auth)
      const { url: imgUrl } = req.body;
      if (!imgUrl) return res.status(400).json({ error: 'Missing url' });
      const imgResp = await fetch(imgUrl);
      if (!imgResp.ok) return res.status(imgResp.status).json({ error: `Image CDN fetch failed: ${imgResp.status}` });
      const imgBuffer = await imgResp.arrayBuffer();
      const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
      return res.json({ image: Buffer.from(imgBuffer).toString('base64'), contentType });
    }

    if (action === 'upload_audio') {
      const { audio_b64, filename = 'voice.wav', content_type = 'audio/wav' } = req.body;
      if (!audio_b64) return res.status(400).json({ error: 'Missing audio_b64' });
      const audioBuffer = Buffer.from(audio_b64, 'base64');
      const falKey = process.env.FAL_API_KEY;

      const initiateResp = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type, file_name: filename })
      });
      const { file_url, upload_url } = await initiateResp.json();
      if (!initiateResp.ok || !upload_url) return res.status(initiateResp.status).json({ error: 'Failed to initiate upload', file_url, upload_url });

      const putResp = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': content_type },
        body: audioBuffer
      });
      if (!putResp.ok) return res.status(putResp.status).json({ error: `Upload PUT failed: ${putResp.status}` });

      return res.json({ url: file_url });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    res.status(500).json({ error: err.message, step: 'fal_call', action });
  }
};
