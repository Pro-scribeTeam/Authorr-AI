/**
 * Cloudflare Pages Function — AI generation proxy
 * Accessible at: /api/generate
 *
 * Required env vars (Cloudflare Pages → Settings → Variables):
 *   OPENROUTER_API_KEY        — OpenRouter key
 *   OPENAI_API_KEY            — OpenAI key (optional)
 *   SUPABASE_URL              — e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (server-side only)
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
}

async function getSubscription(supabaseUrl, serviceKey, userToken) {
    // Resolve user id from JWT
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': serviceKey }
    });
    if (!userRes.ok) return { error: 'Invalid or expired token', status: 401 };
    const user = await userRes.json().catch(() => null);
    if (!user?.id) return { error: 'Invalid token', status: 401 };

    // Fetch subscription row
    const subRes = await fetch(
        `${supabaseUrl}/rest/v1/subscriptions?user_id=eq.${user.id}&select=plan,role,status,expires_at,trial_ends_at,chapters_generated&limit=1`,
        { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    const rows = await subRes.json().catch(() => []);
    const sub = rows?.[0] || null;

    if (!sub || !['active', 'trial'].includes(sub.status)) {
        return { error: 'No active subscription', status: 403 };
    }
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
        return { error: 'Subscription expired', status: 403 };
    }
    // Trial expiry gate — admin bypasses
    if (sub.status === 'trial' && sub.role !== 'admin') {
        if (sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
            return { error: 'Your 7-day trial has ended. Please choose a plan to continue.', status: 403 };
        }
    }
    return { user, sub };
}

async function incrementChapters(supabaseUrl, serviceKey, userId) {
    await fetch(`${supabaseUrl}/rest/v1/rpc/increment_chapters_generated`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey
        },
        body: JSON.stringify({ user_id: userId })
    }).catch(() => {});
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const supabaseUrl = env.SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return json({ error: 'Supabase env vars not configured' }, 500);

    const authHeader = request.headers.get('Authorization') || '';
    const userToken = authHeader.replace('Bearer ', '').trim();
    if (!userToken) return json({ error: 'Missing authorization token' }, 401);

    const authResult = await getSubscription(supabaseUrl, serviceKey, userToken);
    if (authResult.error) return json({ error: authResult.error }, authResult.status);
    const { user, sub } = authResult;

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

    const { provider = 'openrouter', model, messages, temperature = 0.7, max_tokens = 3000, generation_type } = body;

    if (!messages || !Array.isArray(messages)) return json({ error: 'messages array required' }, 400);

    // Trial chapter gate — admin bypasses
    if (sub.status === 'trial' && sub.role !== 'admin') {
        if (generation_type === 'chapter' && sub.chapters_generated >= 3) {
            return json({ error: 'Trial chapter limit reached. You have used all 3 trial chapters. Please upgrade to continue writing.' }, 403);
        }
    }

    try {
        let upstreamRes;

        if (provider === 'openai') {
            const apiKey = env.OPENAI_API_KEY;
            if (!apiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);
            upstreamRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: model || 'gpt-4o-mini', messages, temperature, max_tokens })
            });
        } else {
            const apiKey = env.OPENROUTER_API_KEY;
            if (!apiKey) return json({ error: 'OPENROUTER_API_KEY not configured' }, 500);
            upstreamRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://authorr-ai.pages.dev',
                    'X-Title': 'Authorr AI'
                },
                body: JSON.stringify({ model: model || 'google/gemma-3-27b-it:free', messages, temperature, max_tokens })
            });
        }

        const data = await upstreamRes.json();
        if (!upstreamRes.ok) return json({ error: data }, upstreamRes.status);

        // Increment chapter counter atomically after successful chapter generation
        if (upstreamRes.ok && generation_type === 'chapter' && sub.status === 'trial' && sub.role !== 'admin') {
            await incrementChapters(supabaseUrl, serviceKey, user.id);
        }

        return json(data);
    } catch (err) {
        return json({ error: err.message }, 502);
    }
}
