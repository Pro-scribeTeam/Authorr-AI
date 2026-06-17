const { requireAuth, sendError } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }

  const { action, model, request_id, payload } = req.body;
  const headers = { 'Authorization': `Key ${process.env.FAL_API_KEY}`, 'Content-Type': 'application/json' };

  try {
    let url, method = 'GET', body;
    if (action === 'submit') {
      url = `https://queue.fal.run/${model}`; method = 'POST'; body = JSON.stringify({ input: payload });
    } else if (action === 'status') {
      url = `https://queue.fal.run/${model}/requests/${request_id}/status`;
    } else if (action === 'result') {
      url = `https://queue.fal.run/${model}/requests/${request_id}`;
    } else if (action === 'fetch_audio') {
      // Proxy CDN audio as base64 to avoid browser CORS restrictions
      const { url: audioUrl } = req.body;
      if (!audioUrl) return res.status(400).json({ error: 'Missing url' });
      const audioResp = await fetch(audioUrl, { headers: { 'Authorization': `Key ${process.env.FAL_API_KEY}` } });
      const audioBuffer = await audioResp.arrayBuffer();
      const contentType = audioResp.headers.get('content-type') || 'audio/wav';
      return res.json({ audio: Buffer.from(audioBuffer).toString('base64'), contentType });
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const response = await fetch(url, { method, headers, body });
    res.status(response.status).json(await response.json());
  } catch (err) { sendError(res, err); }
};
