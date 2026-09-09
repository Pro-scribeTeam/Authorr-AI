/**
 * Shared auth + credit helpers for Cloudflare Pages Functions.
 *
 * Usage:
 *   import { requireAuth, deductCredits, json, CORS_HEADERS } from './_shared.js';
 *
 *   const authResult = await requireAuth(request, env);
 *   if (authResult.error) return json({ error: authResult.error }, authResult.status);
 *   const { user, sub } = authResult;
 *
 *   const ok = await deductCredits(env, user.id, amount);
 *   if (!ok) return json({ error: 'Credit limit reached.', code: 'CREDITS_EXHAUSTED' }, 402);
 */

export const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

export function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}

/**
 * Resolve user + subscription from Bearer token.
 * Returns { user, sub } on success, or { error, status } on failure.
 * sub.simulating === true when admin is in test-as mode.
 * sub.bypassGates === true when admin has no simulation active (full bypass).
 */
export async function requireAuth(request, env) {
    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return { error: 'Server misconfigured', status: 500 };

    const authHeader = request.headers.get('Authorization') || '';
    const userToken  = authHeader.replace('Bearer ', '').trim();
    if (!userToken) return { error: 'Missing authorization token', status: 401 };

    // Resolve user from JWT
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': serviceKey }
    });
    if (!userRes.ok) return { error: 'Invalid or expired token', status: 401 };
    const user = await userRes.json().catch(() => null);
    if (!user?.id) return { error: 'Invalid token', status: 401 };

    // Fetch subscription (includes admin_test columns)
    const subRes = await fetch(
        `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${user.id}&select=plan,role,status,expires_at,trial_ends_at,chapters_generated,credits_used,period_end,admin_test_as,admin_test_trial_ends_at&limit=1`,
        { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    const rows = await subRes.json().catch(() => []);
    const sub  = rows?.[0] || null;

    if (!sub || !['active', 'trial'].includes(sub.status)) {
        return { error: 'No active subscription', status: 403 };
    }
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
        return { error: 'Subscription expired', status: 403 };
    }

    // Admin simulation: override plan/status if admin_test_as is set
    const simulating      = sub.role === 'admin' && !!sub.admin_test_as;
    const bypassGates     = sub.role === 'admin' && !simulating;
    const effectivePlan   = simulating ? sub.admin_test_as : sub.plan;
    const effectiveStatus = simulating
        ? (sub.admin_test_as === 'trial' ? 'trial' : 'active')
        : sub.status;
    const effectiveTrialEnds = simulating
        ? sub.admin_test_trial_ends_at
        : sub.trial_ends_at;

    // Trial expiry gate (real admin without simulation bypasses)
    if (!bypassGates && effectiveStatus === 'trial') {
        if (effectiveTrialEnds && new Date(effectiveTrialEnds) < new Date()) {
            return { error: 'Your 7-day trial has ended. Please choose a plan to continue.', status: 403 };
        }
    }

    return {
        user,
        sub: {
            ...sub,
            plan:          effectivePlan,
            status:        effectiveStatus,
            trial_ends_at: effectiveTrialEnds,
            simulating,
            bypassGates
        }
    };
}

/**
 * Deduct `amount` credits via Supabase RPC.
 * Returns true on success, false if limit exceeded.
 * Admin without simulation active always returns true (DB handles bypass).
 */
export async function deductCredits(env, userId, amount) {
    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey  = env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/deduct_credits`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey
        },
        body: JSON.stringify({ user_id: userId, amount })
    });
    if (!res.ok) return false;
    const result = await res.json().catch(() => false);
    return result === true;
}
