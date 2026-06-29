const { requireAuth, sendError, applySecurityHeaders } = require('./_auth');
const rateLimit = require('./_ratelimit');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (!applySecurityHeaders(req, res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try { ({ user } = await requireAuth(req)); } catch (err) { return sendError(res, err); }
  if (!rateLimit(req, res, { max: 60, windowMs: 60_000, keyFn: () => user.id })) return;

  // GET /api/plans — return credit status
  if (req.method === 'GET') {
    const { data, error } = await supabase.rpc('get_credit_status', { user_id: user.id });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  }

  // POST /api/plans — deduct credits
  if (req.method === 'POST') {
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 2_000_000 || !Number.isInteger(amount)) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    const { data, error } = await supabase.rpc('deduct_credits', { user_id: user.id, amount });
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(402).json({ error: 'Insufficient credits. Please upgrade your plan.' });
    return res.json({ success: true });
  }
};
