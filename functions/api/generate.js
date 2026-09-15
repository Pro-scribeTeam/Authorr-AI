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

import { requireAuth, kvAcquireSlot, kvReleaseSlot, json, authError, CORS_HEADERS } from './_shared.js';

// Non-Venice models first (Google/NVIDIA infra), then Llama as fallback.
// Removed: nvidia/nemotron-3-super-120b-a12b:free — reasoning model that leaks inline
//   planning text ("Let's draft...", "Word count target...") into chapter content.
// Removed: meta-llama/llama-3.2-3b-instruct:free — too small (3B params), produces
//   confused or truncated chapter content under the full chapter prompt.
// Tradeoff: 2 fewer 429-fallbacks during gemma outages. Llama 3.3-70B (Meta infra,
//   separate rate-limit pool) covers the gap without the quality regression risk.
const FALLBACK_MODELS = [
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'meta-llama/llama-3.3-70b-instruct:free',
];

// Strip <think>...</think> reasoning blocks that some models leak into content
function stripThinking(text) {
    if (!text) return text;
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

// Backstop: strip plain-text reasoning preambles from models (e.g. Nemotron) that
// output chain-of-thought inline without XML wrappers. Detects only unambiguous
// planning-language patterns at the very start of the response. The primary fix
// is the system prompt instruction; this is a secondary safety net.
// Conservative regex — prefers false negatives over accidentally stripping real prose.
const PLANNING_PREAMBLE_RE = /^(let['']?s\s+(plan|draft|write\s+the\s+chapter|think|outline)\b|we('ll|'ll|\s+need|\s+should)\s+(plan|draft|write|outline)\b|word\s+count\s+(target|goal|\:|\d)|i('ll|'ll)\s+(plan|draft|outline|structure\s+the\s+chapter)\b|chapter\s+(plan|outline|structure)\s*[:–—]|okay[,.]?\s+let['']?s\s+(plan|draft|write)\b|alright[,.]?\s+let['']?s\s+(plan|draft|write)\b|first[,.]?\s+let['']?s\s+(plan|draft|outline)\b)/i;

function stripReasoningPreamble(text) {
    if (!text) return text;
    const lines = text.split('\n');
    // If the first non-empty line doesn't look like planning, return as-is
    const firstLine = lines.find(l => l.trim().length > 0) || '';
    if (!PLANNING_PREAMBLE_RE.test(firstLine.trim())) return text;
    // Preamble detected — scan forward for the first line that looks like real prose:
    // a markdown chapter heading (#) or a paragraph > 60 chars that isn't planning-language
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith('#')) return lines.slice(i).join('\n').trim();
        if (line.length > 60 && !PLANNING_PREAMBLE_RE.test(line)) return lines.slice(i).join('\n').trim();
    }
    return text; // couldn't find prose start — return unchanged
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

    // Per-user concurrency cap: max 3 simultaneous /api/generate calls.
    // Prevents multi-tab abuse and reduces shared free-model 429s under concurrent load.
    // Admin bypass (bypassGates) skips the cap so testing is unaffected.
    const GEN_CAP = 3;
    const genSlot = sub.bypassGates ? { acquired: true } : await kvAcquireSlot(env.RATE_LIMIT_KV, user.id, 'gen', GEN_CAP, 180);
    if (!genSlot.acquired) {
        return json({
            error: 'You already have content generating. Please wait for it to finish before starting more.',
            code: 'GENERATE_CONCURRENCY_LIMIT',
            in_flight: genSlot.count
        }, 429);
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
                data.choices[0].message.content = stripReasoningPreamble(stripThinking(data.choices[0].message.content));
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
    } finally {
        await kvReleaseSlot(env.RATE_LIMIT_KV, user.id, 'gen');
    }
}
