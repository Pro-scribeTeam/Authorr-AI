// Shared auth + security middleware for all /api/ functions
const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGINS = [
  'https://authorr-ai.vercel.app',
  'https://www.authorr-ai.vercel.app'
];

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Apply security headers and handle CORS preflight.
 * Call at the top of every handler.
 * Returns false (and ends the request) if it's a preflight — caller should return.
 */
function applySecurityHeaders(req, res, { allowPublicOrigins = false } = {}) {
  const origin = req.headers.origin || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin);

  // CORS
  if (allowPublicOrigins) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }
  return true;
}

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

module.exports = { requireAuth, sendError, applySecurityHeaders };
