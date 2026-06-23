const { requireAuth, sendError } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) {
    return res.status(err.status || 500).json({ error: err.message, step: 'auth' });
  }

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
    } else if (action === 'upload_audio') {
      const { audio_b64, filename = 'voice.wav', content_type = 'audio/wav' } = req.body;
      if (!audio_b64) return res.status(400).json({ error: 'Missing audio_b64' });
      const audioBuffer = Buffer.from(audio_b64, 'base64');
      const uploadResp = await fetch(
        `https://api.fal.ai/v1/serverless/files/file/local/${encodeURIComponent(filename)}`,
        { method: 'POST', headers: { 'Authorization': `Key ${process.env.FAL_API_KEY}`, 'Content-Type': content_type }, body: audioBuffer }
      );
      const uploadData = await uploadResp.json();
      if (!uploadResp.ok) return res.status(uploadResp.status).json(uploadData);
      return res.json({ url: uploadData.url });
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
