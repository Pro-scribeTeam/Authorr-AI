const { requireAuth, sendError } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }

  const { provider = 'openrouter', model, messages, temperature, max_tokens } = req.body;
  const url = provider === 'openrouter'
    ? 'https://openrouter.ai/api/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const authKey = provider === 'openrouter'
    ? process.env.OPENROUTER_API_KEY
    : process.env.OPENAI_API_KEY;

  const headers = { 'Authorization': `Bearer ${authKey}`, 'Content-Type': 'application/json' };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://authorr.ai';
    headers['X-Title'] = 'Authorr AI';
  }

  try {
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ model, messages, temperature, max_tokens }) });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) { sendError(res, err); }
};
