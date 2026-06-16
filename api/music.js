const { requireAuth, sendError } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }

  const { tags, limit = 10, offset = 0 } = req.query;
  const params = new URLSearchParams({
    client_id: process.env.JAMENDO_CLIENT_ID,
    format: 'json', limit, offset,
    include: 'musicinfo', audioformat: 'mp32',
    vocalinstrumental: 'instrumental',
    boost: 'popularity_total',
    ...(tags && { tags })
  });
  try {
    const response = await fetch(`https://api.jamendo.com/v3.0/tracks/?${params}`);
    res.status(response.status).json(await response.json());
  } catch (err) { sendError(res, err); }
};
