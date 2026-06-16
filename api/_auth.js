// Shared auth middleware for all /api/ functions
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAuth(req, requiredRole = null) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) { const e = new Error('Missing authorization token'); e.status = 401; throw e; }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) { const e = new Error('Invalid or expired token'); e.status = 401; throw e; }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, role, status, expires_at')
    .eq('user_id', user.id)
    .single();

  if (!subscription || subscription.status !== 'active') {
    const e = new Error('No active subscription'); e.status = 403; throw e;
  }
  if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
    const e = new Error('Subscription expired'); e.status = 403; throw e;
  }
  if (requiredRole && subscription.role !== requiredRole) {
    const e = new Error('Insufficient permissions'); e.status = 403; throw e;
  }

  return { user, subscription };
}

function sendError(res, err) {
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
}

module.exports = { requireAuth, sendError };
