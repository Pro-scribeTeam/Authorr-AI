/**
 * Cloudflare Pages Function — AI generation proxy
 * Accessible at: /api/generate
 *
 * Routes POST requests to OpenRouter or OpenAI server-side,
 * keeping API keys out of the browser.
 *
 * Required env vars (set in Cloudflare Pages → Settings → Variables):
 *   OPENROUTER_API_KEY  — OpenRouter key (for provider: 'openrouter')
 *   OPENAI_API_KEY      — OpenAI key (for provider: 'openai'), optional
 */
export async function onRequest(context) {
    const { request, env } = context;

    // CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { provider = 'openrouter', model, messages, temperature = 0.7, max_tokens = 3000 } = body;

    if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'messages array required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        let upstreamRes;

        if (provider === 'openai') {
            const apiKey = env.OPENAI_API_KEY;
            if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
            upstreamRes = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model || 'gpt-4o-mini',
                    messages,
                    temperature,
                    max_tokens
                })
            });
        } else {
            // Default: openrouter
            const apiKey = env.OPENROUTER_API_KEY;
            if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');
            upstreamRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://authorr-ai.pages.dev',
                    'X-Title': 'Authorr AI'
                },
                body: JSON.stringify({
                    model: model || 'google/gemma-3-27b-it:free',
                    messages,
                    temperature,
                    max_tokens
                })
            });
        }

        const data = await upstreamRes.json();

        if (!upstreamRes.ok) {
            return new Response(JSON.stringify({ error: data }), {
                status: upstreamRes.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 502,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}
