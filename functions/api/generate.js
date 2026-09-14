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

import { requireAuth, json, authError, CORS_HEADERS } from './_shared.js';

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

    const authResult = await requireAuth(request, env);
    if (authResult.error) return authError(authResult);
    const { user, sub } = authResult;

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

    const { provider = 'openrouter', model, messages, temperature = 0.7, max_tokens = 3000, generation_type } = body;

    if (!messages || !Array.isArray(messages)) return json({ error: 'messages array required' }, 400);

    // Trial chapter gate — real admin (bypassGates) is never blocked; simulating admin respects the gate
    if (sub.status === 'trial' && !sub.bypassGates) {
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
                body: JSON.stringify({ model: model || 'google/gemma-4-31b-it:free', messages, temperature, max_tokens })
            });
        }

        const data = await upstreamRes.json();
        if (!upstreamRes.ok) return json({ error: data }, upstreamRes.status);

        // Increment chapter counter after successful chapter generation (only for trial, not admin bypass)
        if (generation_type === 'chapter' && sub.status === 'trial' && !sub.bypassGates) {
            await incrementChapters(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, user.id);
        }

        return json(data);
    } catch (err) {
        return json({ error: err.message }, 502);
    }
}
