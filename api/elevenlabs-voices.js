const { requireAuth, sendError } = require('./_auth');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }
  res.json({ voices: [] }); // ElevenLabs not used — Chatterbox handles narration
};
