const { requireAuth, sendError } = require('./_auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }

  const { query, page = 1, page_size = 10 } = req.query;
  const params = new URLSearchParams({
    query, page, page_size,
    token: process.env.FREESOUND_CLIENT_SECRET,
    fields: 'id,name,url,previews,duration,tags'
  });
  try {
    const response = await fetch(`https://freesound.org/apiv2/search/text/?${params}`);
    res.status(response.status).json(await response.json());
  } catch (err) { sendError(res, err); }
};
