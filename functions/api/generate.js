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

// Non-Venice models first (Google/NVIDIA infra), then Venice as fallback.
// Venice hosts Llama/Hermes/Qwen free models and rate-limits them all together.
const FALLBACK_MODELS = [
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'nvidia/nemotron-3-super-120b-a12b:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.2-3b-instruct:free',
];

// Strip <think>...</think> reasoning blocks that some models leak into content
function stripThinking(text) {
    if (!text) return text;
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
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
        // OpenAI direct path
        if (provider === 'openai') {
            const apiKey = env.OPENAI_API_KEY;
            if (!apiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({ model: model || 'gpt-4o-mini', messages, temperature, max_tokens })
            });
            const data = await res.json();
            if (!res.ok) return json({ error: data }, res.status);
            if (generation_type === 'chapter' && sub.status === 'trial' && !sub.bypassGates) {
                await incrementChapters(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, user.id);
            }
            return json(data);
        }

        // OpenRouter path — try requested model first, then fallbacks
        const apiKey = env.OPENROUTER_API_KEY;
        if (!apiKey) return json({ error: 'OPENROUTER_API_KEY not configured' }, 500);

        const orHeaders = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://authorr-ai.pages.dev',
            'X-Title': 'Authorr AI'
        };

        const modelsToTry = model && !FALLBACK_MODELS.includes(model)
            ? [model, ...FALLBACK_MODELS]
            : [model || FALLBACK_MODELS[0], ...FALLBACK_MODELS.filter(m => m !== (model || FALLBACK_MODELS[0]))];

        if (env.OPENROUTER_PAID_FALLBACK) modelsToTry.push(env.OPENROUTER_PAID_FALLBACK);

        const attempts = [];
        for (const tryModel of modelsToTry) {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: orHeaders,
                body: JSON.stringify({ model: tryModel, messages, temperature, max_tokens })
            });
            const data = await res.json();
            attempts.push({ model: tryModel, status: res.status, error: data?.error || null });
            if (!res.ok || data?.error) continue;

            if (data?.choices?.[0]?.message?.content) {
                data.choices[0].message.content = stripThinking(data.choices[0].message.content);
            }
            if (generation_type === 'chapter' && sub.status === 'trial' && !sub.bypassGates) {
                await incrementChapters(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, user.id);
            }
            return json(data);
        }

        // All OpenRouter models failed — try OpenAI as final fallback
        if (env.OPENAI_API_KEY) {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.OPENAI_API_KEY}` },
                body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature, max_tokens })
            });
            const data = await res.json();
            if (res.ok) {
                if (generation_type === 'chapter' && sub.status === 'trial' && !sub.bypassGates) {
                    await incrementChapters(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, user.id);
                }
                return json(data);
            }
        }

        // Build meaningful error response
        const retryAfter = attempts.reduce((min, a) => {
            const secs = a?.error?.metadata?.retry_after_seconds;
            return secs && secs < min ? secs : min;
        }, Infinity);
        const statuses = attempts.map(a => a.status);
        let message = 'All AI models temporarily rate-limited. Please wait a moment.';
        let status = 429;
        if (statuses.includes(401) || statuses.includes(403)) {
            message = 'AI provider authentication failed — server API key is invalid or expired.';
            status = 502;
        } else if (statuses.every(s => s === 404 || s === 400)) {
            message = 'AI models unavailable — configured model IDs were rejected by the provider.';
            status = 502;
        }
        return json({ error: { message, retry_after: retryAfter < Infinity ? Math.ceil(retryAfter) + 2 : 30, attempts: attempts.map(a => `${a.model}: ${a.status}`) } }, status);

    } catch (err) {
        return json({ error: err.message }, 502);
    }
}
