const { createClient } = require('@supabase/supabase-js');
const { requireAuth, sendError, applySecurityHeaders } = require('./_auth');
const rateLimit = require('./_ratelimit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const VALID_PLANS = ['free', 'starter', 'author', 'publisher', 'studio'];
const VALID_ROLES = ['user', 'admin'];
const VALID_STATUSES = ['active', 'inactive', 'cancelled'];

module.exports = async function handler(req, res) {
  if (!applySecurityHeaders(req, res)) return;
  if (!rateLimit.auth(req, res)) return;
  try { await requireAuth(req, 'admin'); } catch (err) { return sendError(res, err); }

  const { action } = req.query;
  try {
    if (action === 'users') {
      const { data, error } = await supabase.from('subscriptions').select('user_id, plan, role, status, expires_at, created_at');
      if (error) throw error;
      return res.json(data);
    }
    if (action === 'update' && req.method === 'POST') {
      const { user_id, plan, role, status, expires_at } = req.body;
      // Validate inputs — prevent injection of unexpected values
      if (!user_id || typeof user_id !== 'string') return res.status(400).json({ error: 'Invalid user_id' });
      if (plan && !VALID_PLANS.includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
      if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
      if (status && !VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
      const { error } = await supabase.from('subscriptions').update({ plan, role, status, expires_at }).eq('user_id', user_id);
      if (error) throw error;
      return res.json({ success: true });
    }
    res.status(400).json({ error: 'Unknown action' });
  } catch (err) { sendError(res, err); }
};
