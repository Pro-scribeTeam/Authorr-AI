const { requireAuth, sendError } = require('./_auth');
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }
  res.status(501).json({ error: 'ElevenLabs not enabled — use Chatterbox narration.' });
};
