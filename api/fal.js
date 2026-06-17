const { requireAuth, sendError } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }

  const { action, model, request_id, payload } = req.body;
  const headers = { 'Authorization': `Key ${process.env.FAL_API_KEY}`, 'Content-Type': 'application/json' };

  try {
    let url, method = 'GET', body;
    if (action === 'run') {
      // Direct synchronous call — proxy audio binary back to avoid CORS
      const falResp = await fetch(`https://fal.run/${model}`, {
        method: 'POST', headers, body: JSON.stringify(payload)
      });
      const data = await falResp.json();
      if (!falResp.ok || !data?.audio?.url) {
        return res.status(falResp.status || 500).json({ error: data?.detail || 'Fal.ai error' });
      }
      const audioResp = await fetch(data.audio.url);
      const audioBuffer = await audioResp.arrayBuffer();
      const contentType = audioResp.headers.get('content-type') || 'audio/wav';
      const base64 = Buffer.from(audioBuffer).toString('base64');
      return res.json({ audio: base64, contentType });
    }
    else if (action === 'submit') { url = `https://queue.fal.run/${model}`; method = 'POST'; body = JSON.stringify(payload); }
    else if (action === 'status') { url = `https://queue.fal.run/${model}/requests/${request_id}/status`; }
    else if (action === 'result') { url = `https://queue.fal.run/${model}/requests/${request_id}`; }
    else return res.status(400).json({ error: 'Invalid action' });

    const response = await fetch(url, { method, headers, body });
    res.status(response.status).json(await response.json());
  } catch (err) { sendError(res, err); }
};
