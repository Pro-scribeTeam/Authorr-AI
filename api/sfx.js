const { requireAuth, sendError, applySecurityHeaders } = require('./_auth');
const rateLimit = require('./_ratelimit');

module.exports = async function handler(req, res) {
  if (!applySecurityHeaders(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  let user;
  try { ({ user } = await requireAuth(req)); } catch (err) { return sendError(res, err); }
  if (!rateLimit.ai(req, res, user.id)) return;

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
