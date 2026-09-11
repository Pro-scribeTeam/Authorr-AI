/**
 * Cloudflare Pages Function — DALL-E image generation proxy
 * Accessible at: /api/image
 *
 * POST JSON body:
 *   { prompt, model?, size?, quality?, n? }
 *
 * Credit costs:
 *   quality='hd'       → 5,000 credits
 *   quality='standard' → 2,500 credits
 *
 * Required env vars (Cloudflare Pages → Settings → Environment Variables):
 *   OPENAI_API_KEY            — OpenAI API key
 *   SUPABASE_URL              — e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (server-side only)
 */

import { requireAuth, deductCredits, checkFeature, creditExhaustedError, json, authError, CORS_HEADERS } from './_shared.js';

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) return json({ error: 'OPENAI_API_KEY not configured' }, 500);

    const authResult = await requireAuth(request, env);
    if (authResult.error) return authError(authResult);
    const { user, sub } = authResult;

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

    const { prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard', n = 1 } = body;
    if (!prompt) return json({ error: 'prompt is required' }, 400);

    // Cover generation requires Author plan (starter, tier 2)
    const featureErr = checkFeature(sub, 2);
    if (featureErr) return json(featureErr, 403);

    // Deduct credits BEFORE calling OpenAI
    const creditCost = (quality === 'hd') ? 5000 : 2500;
    const credited = await deductCredits(env, user.id, creditCost);
    if (!credited) return json(creditExhaustedError(sub), 402);

    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, size, quality, n })
        });
        const data = await response.json();

        if (!response.ok) {
            // Refund on upstream failure
            await deductCredits(env, user.id, -creditCost).catch(() => {});
            return json(data, response.status);
        }

        return json(data);
    } catch (err) {
        await deductCredits(env, user.id, -creditCost).catch(() => {});
        return json({ error: err.message }, 502);
    }
}
