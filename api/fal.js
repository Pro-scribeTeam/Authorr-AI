const { requireAuth, sendError, applySecurityHeaders } = require('./_auth');
const rateLimit = require('./_ratelimit');

module.exports = async function handler(req, res) {
  if (!applySecurityHeaders(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let user;
  try { ({ user } = await requireAuth(req)); } catch (err) {
    return res.status(err.status || 500).json({ error: err.message, step: 'auth' });
  }
  if (!rateLimit.strict(req, res, user.id)) return;

  const { action, model, request_id, payload } = req.body;
  const headers = { 'Authorization': `Key ${process.env.FAL_API_KEY}`, 'Content-Type': 'application/json' };

  try {
    let url, method = 'GET', body;
    if (action === 'direct') {
      // Synchronous endpoint — no queue, returns result immediately (~2s for short text)
      url = `https://fal.run/${model}`; method = 'POST'; body = JSON.stringify(payload);
    } else if (action === 'submit') {
      url = `https://queue.fal.run/${model}`; method = 'POST'; body = JSON.stringify(payload);
    } else if (action === 'status') {
      // Use status_url from submit response (Fal strips sub-paths in request URLs)
      const { status_url } = req.body;
      url = status_url || `https://queue.fal.run/${model}/requests/${request_id}/status`;
    } else if (action === 'result') {
      const { response_url } = req.body;
      url = response_url || `https://queue.fal.run/${model}/requests/${request_id}`;
    } else if (action === 'fetch_audio') {
      const { url: audioUrl } = req.body;
      if (!audioUrl) return res.status(400).json({ error: 'Missing url' });
      const audioResp = await fetch(audioUrl, { headers: { 'Authorization': `Key ${process.env.FAL_API_KEY}` } });
      const audioBuffer = await audioResp.arrayBuffer();
      const contentType = audioResp.headers.get('content-type') || 'audio/wav';
      return res.json({ audio: Buffer.from(audioBuffer).toString('base64'), contentType });
    } else if (action === 'fetch_image_noauth') {
      // Fetch a pre-signed CDN image URL — NO Authorization header (S3 rejects dual-auth)
      const { url: imgUrl } = req.body;
      if (!imgUrl) return res.status(400).json({ error: 'Missing url' });
      const imgResp = await fetch(imgUrl);
      if (!imgResp.ok) return res.status(imgResp.status).json({ error: `Image CDN fetch failed: ${imgResp.status}` });
      const imgBuffer = await imgResp.arrayBuffer();
      const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
      return res.json({ image: Buffer.from(imgBuffer).toString('base64'), contentType });
    } else if (action === 'upload_audio') {
      const { audio_b64, filename = 'voice.wav', content_type = 'audio/wav' } = req.body;
      if (!audio_b64) return res.status(400).json({ error: 'Missing audio_b64' });
      const audioBuffer = Buffer.from(audio_b64, 'base64');
      const falKey = process.env.FAL_API_KEY;

      // Step 1: Get a pre-signed upload URL from Fal.ai storage
      const initiateResp = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
        method: 'POST',
        headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type, file_name: filename })
      });
      const { file_url, upload_url } = await initiateResp.json();
      if (!initiateResp.ok || !upload_url) return res.status(initiateResp.status).json({ error: 'Failed to initiate upload', file_url, upload_url });

      // Step 2: PUT the audio binary to the pre-signed URL
      const putResp = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': content_type },
        body: audioBuffer
      });
      if (!putResp.ok) return res.status(putResp.status).json({ error: `Upload PUT failed: ${putResp.status}` });

      return res.json({ url: file_url });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const response = await fetch(url, { method, headers, body });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message, step: 'fal_call', action });
  }
};
