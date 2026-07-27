/**
 * Cloudflare Pages Function — Credit / plan status
 * Accessible at: /api/plans
 *
 * GET  /api/plans  — return credit status for authenticated user
 * POST /api/plans  — deduct credits for authenticated user
 *
 * Required env vars (Cloudflare Pages → Settings → Environment Variables):
 *   SUPABASE_URL              — e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (server-side only)
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}

async function getUser(token, supabaseUrl, serviceKey) {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': serviceKey
        }
    });
    if (!res.ok) return null;
    return res.json();
}

async function rpc(supabaseUrl, serviceKey, fn, params) {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey
        },
        body: JSON.stringify(params)
    });
    return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (!['GET', 'POST'].includes(request.method)) {
        return json({ error: 'Method not allowed' }, 405);
    }

    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
        return json({ error: 'Supabase env vars not configured' }, 500);
    }

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return json({ error: 'Missing authorization token' }, 401);

    const user = await getUser(token, supabaseUrl, serviceKey);
    if (!user || !user.id) return json({ error: 'Invalid or expired token' }, 401);

    if (request.method === 'GET') {
        const { ok, data } = await rpc(supabaseUrl, serviceKey, 'get_credit_status', { user_id: user.id });
        if (!ok) return json({ error: data?.message || 'Failed to fetch credit status' }, 500);
        return json(data);
    }

    if (request.method === 'POST') {
        let body;
        try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }
        const { amount } = body;
        if (!amount || typeof amount !== 'number' || amount < 1 || amount > 2_000_000 || !Number.isInteger(amount)) {
            return json({ error: 'Invalid amount' }, 400);
        }
        const { ok, status, data } = await rpc(supabaseUrl, serviceKey, 'deduct_credits', { user_id: user.id, amount });
        if (!ok) return json({ error: data?.message || 'Failed to deduct credits' }, 500);
        if (!data) return json({ error: 'Insufficient credits. Please upgrade your plan.' }, 402);
        return json({ success: true });
    }
}
