// Handles both /api/elevenlabs-tts (POST) and /api/elevenlabs-voices (GET via rewrite)
const { requireAuth, sendError } = require('./_auth');
module.exports = async function handler(req, res) {
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }
  // GET — voices list (stub; ElevenLabs not active)
  if (req.method === 'GET') return res.json({ voices: [] });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.status(501).json({ error: 'ElevenLabs not enabled — use Chatterbox narration.' });
};
