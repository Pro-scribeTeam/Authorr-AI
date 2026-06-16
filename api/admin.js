const { createClient } = require('@supabase/supabase-js');
const { requireAuth, sendError } = require('./_auth');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

module.exports = async function handler(req, res) {
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
      const { error } = await supabase.from('subscriptions').update({ plan, role, status, expires_at }).eq('user_id', user_id);
      if (error) throw error;
      return res.json({ success: true });
    }
    res.status(400).json({ error: 'Unknown action' });
  } catch (err) { sendError(res, err); }
};
