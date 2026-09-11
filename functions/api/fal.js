/**
 * Cloudflare Pages Function — Fal.ai proxy
 * Accessible at: /api/fal
 *
 * Actions (POST JSON body):
 *   { action: 'direct',  model, payload }                        — synchronous run
 *   { action: 'submit',  model, payload }                        — queue submit
 *   { action: 'status',  model, request_id, status_url }         — poll status (no cost)
 *   { action: 'result',  model, request_id, response_url }       — get result (no cost)
 *   { action: 'fetch_audio',  url }                              — proxy audio download (no cost)
 *   { action: 'fetch_image_noauth', url }                        — proxy CDN image (no cost)
 *   { action: 'upload_audio', audio_b64, filename, content_type }— upload to Fal storage (no cost)
 *
 * Credit costs:
 *   Chatterbox TTS  (model contains 'chatterbox') → 1 credit/character of input text
 *   Flux Pro image  (model contains 'flux')        → 3,500 credits flat
 *
 * Required env vars (Cloudflare Pages → Settings → Environment Variables):
 *   FAL_API_KEY               — from https://fal.ai/dashboard
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

    const falKey = env.FAL_API_KEY;
    if (!falKey) return json({ error: 'FAL_API_KEY not configured in Cloudflare environment.' }, 500);

    // All actions require authentication
    const authResult = await requireAuth(request, env);
    if (authResult.error) return authError(authResult);
    const { user, sub } = authResult;

    const falHeaders = { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' };

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

    const { action, model, request_id, payload, narration_mode } = body;

    try {
        // ── Actions that incur costs: direct + submit ─────────────────────────
        if (action === 'direct' || action === 'submit') {
            if (!model) return json({ error: 'model is required' }, 400);
            const modelLower = model.toLowerCase();

            // ── Feature gates (plan tier) ─────────────────────────────────────
            if (modelLower.includes('flux')) {
                // Cover generation requires Author plan (starter, tier 2)
                const featureErr = checkFeature(sub, 2);
                if (featureErr) return json(featureErr, 403);
            }
            if (modelLower.includes('chatterbox')) {
                // Using a reference/cloned voice requires Author plan (starter, tier 2)
                if (payload?.audio_url) {
                    const featureErr = checkFeature(sub, 2);
                    if (featureErr) return json(featureErr, 403);
                }
                // Multi-voice character narration requires Author Lite (author, tier 3)
                if (narration_mode === 'multi_voice') {
                    const featureErr = checkFeature(sub, 3);
                    if (featureErr) return json(featureErr, 403);
                }
            }

            // ── Credit deduction ──────────────────────────────────────────────
            let creditCost = 0;
            if (modelLower.includes('chatterbox')) {
                const text = payload?.text || payload?.input?.text || '';
                creditCost = text.length; // 1 credit/char
                if (!text) return json({ error: 'payload.text is required for Chatterbox TTS' }, 400);
            } else if (modelLower.includes('flux')) {
                creditCost = 3500; // flat rate for Flux Pro
            }

            if (creditCost > 0) {
                const credited = await deductCredits(env, user.id, creditCost);
                if (!credited) return json(creditExhaustedError(sub), 402);
            }

            const endpoint = action === 'direct'
                ? `https://fal.run/${model}`
                : `https://queue.fal.run/${model}`;
            const resp = await fetch(endpoint, {
                method: 'POST', headers: falHeaders, body: JSON.stringify(payload)
            });
            const data = await resp.json();

            // Refund on upstream failure
            if (!resp.ok && creditCost > 0) {
                await deductCredits(env, user.id, -creditCost).catch(() => {});
            }

            return json(data, resp.status);
        }

        // ── No-cost polling/fetch actions ─────────────────────────────────────
        if (action === 'status') {
            const { status_url } = body;
            const url = status_url || `https://queue.fal.run/${model}/requests/${request_id}/status`;
            const resp = await fetch(url, { headers: falHeaders });
            return json(await resp.json(), resp.status);
        }

        if (action === 'result') {
            const { response_url } = body;
            const url = response_url || `https://queue.fal.run/${model}/requests/${request_id}`;
            const resp = await fetch(url, { headers: falHeaders });
            return json(await resp.json(), resp.status);
        }

        if (action === 'fetch_audio') {
            const { url: audioUrl } = body;
            if (!audioUrl) return json({ error: 'Missing url' }, 400);
            const resp = await fetch(audioUrl, { headers: { 'Authorization': `Key ${falKey}` } });
            const buffer = await resp.arrayBuffer();
            const contentType = resp.headers.get('content-type') || 'audio/wav';
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i += 8192) {
                binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
            }
            return json({ audio: btoa(binary), contentType });
        }

        if (action === 'fetch_image_noauth') {
            const { url: imgUrl } = body;
            if (!imgUrl) return json({ error: 'Missing url' }, 400);
            const resp = await fetch(imgUrl);
            if (!resp.ok) return json({ error: `Image CDN fetch failed: ${resp.status}` }, resp.status);
            const buffer = await resp.arrayBuffer();
            const contentType = resp.headers.get('content-type') || 'image/jpeg';
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i += 8192) {
                binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
            }
            return json({ image: btoa(binary), contentType });
        }

        if (action === 'upload_audio') {
            const { audio_b64, filename = 'voice.wav', content_type = 'audio/wav' } = body;
            if (!audio_b64) return json({ error: 'Missing audio_b64' }, 400);

            const binaryStr = atob(audio_b64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

            const initiateResp = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
                method: 'POST',
                headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content_type, file_name: filename })
            });
            const { file_url, upload_url } = await initiateResp.json();
            if (!initiateResp.ok || !upload_url) return json({ error: 'Failed to initiate upload' }, initiateResp.status);

            const putResp = await fetch(upload_url, {
                method: 'PUT',
                headers: { 'Content-Type': content_type },
                body: bytes
            });
            if (!putResp.ok) return json({ error: `Upload PUT failed: ${putResp.status}` }, putResp.status);

            return json({ url: file_url });
        }

        return json({ error: 'Invalid action' }, 400);

    } catch (err) {
        return json({ error: err.message, step: 'fal_call', action }, 500);
    }
}
