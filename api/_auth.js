// Shared auth + security middleware for all /api/ functions
const { createClient } = require('@supabase/supabase-js');

// Plan tier order for feature gating
const PLAN_TIER = {
    free: 0, trial: 0, essentials: 1,
    starter: 2, author: 3, publisher: 4, studio: 5, admin_test: 99
};
const PLAN_LABELS = { 2: 'Author', 3: 'Author Lite', 4: 'Publisher', 5: 'Studio' };

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
    .select('plan, role, status, expires_at, trial_ends_at, chapters_generated, credits_used, period_end, admin_test_as, admin_test_trial_ends_at')
    .eq('user_id', user.id)
    .single();

  if (!subscription || !['active', 'trial'].includes(subscription.status)) {
    const e = new Error('No active subscription'); e.status = 403; throw e;
  }
  if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
    const e = new Error('Subscription expired'); e.status = 403; throw e;
  }

  // Admin simulation: override plan/status when admin_test_as is set
  const simulating      = subscription.role === 'admin' && !!subscription.admin_test_as;
  const bypassGates     = subscription.role === 'admin' && !simulating;
  const effectivePlan   = simulating ? subscription.admin_test_as : subscription.plan;
  const effectiveStatus = simulating
    ? (subscription.admin_test_as === 'trial' ? 'trial' : 'active')
    : subscription.status;
  const effectiveTrialEnds = simulating
    ? subscription.admin_test_trial_ends_at
    : subscription.trial_ends_at;

  // Email confirmation gate (admin bypass exempt)
  if (!bypassGates && !user.email_confirmed_at) {
    const e = new Error('Please confirm your email address before using Authorr AI. Check your inbox for a confirmation link.'); e.status = 403; e.code = 'EMAIL_UNCONFIRMED'; throw e;
  }

  // Trial expiry gate (real admin without simulation bypasses)
  if (!bypassGates && effectiveStatus === 'trial') {
    if (effectiveTrialEnds && new Date(effectiveTrialEnds) < new Date()) {
      const e = new Error('Your 7-day trial has ended. Please choose a plan to continue.'); e.status = 403; throw e;
    }
  }
  if (requiredRole && subscription.role !== requiredRole) {
    const e = new Error('Insufficient permissions'); e.status = 403; throw e;
  }

  return {
    user,
    subscription: {
      ...subscription,
      plan:          effectivePlan,
      status:        effectiveStatus,
      trial_ends_at: effectiveTrialEnds,
      simulating,
      bypassGates
    }
  };
}

function sendError(res, err) {
  const body = { error: err.message || 'Internal server error' };
  if (err.code) body.code = err.code;
  res.status(err.status || 500).json(body);
}

/**
 * Deduct credits via Supabase RPC.
 * Returns true on success, false if credit limit exceeded.
 * Admin without simulation active always returns true (DB handles bypass).
 */
async function deductCredits(userId, amount) {
  const { data, error } = await supabase.rpc('deduct_credits', { user_id: userId, amount });
  if (error) return false;
  return data === true;
}

/**
 * Returns an error object if `subscription` doesn't meet `requiredTier`, null if allowed.
 * Admin bypass (bypassGates) always returns null.
 */
function checkFeature(subscription, requiredTier) {
  if (subscription.bypassGates) return null;
  const tier = PLAN_TIER[subscription.plan] ?? 0;
  if (tier >= requiredTier) return null;
  return {
    error: `This feature requires the ${PLAN_LABELS[requiredTier] ?? 'a higher'} plan or above.`,
    code: 'PLAN_REQUIRED'
  };
}

/**
 * Returns the correct 402 error body for a credit-exhausted response.
 * Trial → subscribe path. Paid → buy-credits path.
 */
function creditExhaustedError(subscription) {
  const isTrial = subscription.status === 'trial';
  return {
    error: isTrial
      ? 'Trial credit limit reached. Please upgrade to continue.'
      : 'Monthly credit limit reached. Buy more credits to continue now, or wait for your next billing cycle.',
    code: 'CREDITS_EXHAUSTED',
    action: isTrial ? 'subscribe' : 'buy_credits'
  };
}

module.exports = { requireAuth, sendError, applySecurityHeaders, deductCredits, checkFeature, creditExhaustedError };
