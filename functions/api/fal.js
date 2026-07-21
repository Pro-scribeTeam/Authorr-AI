/**
 * Cloudflare Pages Function — Fal.ai proxy
 * Accessible at: /api/fal
 *
 * Actions (POST JSON body):
 *   { action: 'direct',  model, payload }                        — synchronous run
 *   { action: 'submit',  model, payload }                        — queue submit
 *   { action: 'status',  model, request_id, status_url }         — poll status
 *   { action: 'result',  model, request_id, response_url }       — get result
 *   { action: 'fetch_audio',  url }                              — proxy audio download
 *   { action: 'fetch_image_noauth', url }                        — proxy CDN image (no auth)
 *   { action: 'upload_audio', audio_b64, filename, content_type }— upload to Fal storage
 *
 * Required env var (Cloudflare Pages → Settings → Environment Variables):
 *   FAL_API_KEY  — from https://fal.ai/dashboard
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

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    const falKey = env.FAL_API_KEY;
    if (!falKey) return json({ error: 'FAL_API_KEY not configured in Cloudflare environment.' }, 500);

    const falHeaders = { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' };

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

    const { action, model, request_id, payload } = body;

    try {
        if (action === 'direct') {
            const resp = await fetch(`https://fal.run/${model}`, {
                method: 'POST', headers: falHeaders, body: JSON.stringify(payload)
            });
            const data = await resp.json();
            return json(data, resp.status);

        } else if (action === 'submit') {
            const resp = await fetch(`https://queue.fal.run/${model}`, {
                method: 'POST', headers: falHeaders, body: JSON.stringify(payload)
            });
            const data = await resp.json();
            return json(data, resp.status);

        } else if (action === 'status') {
            const { status_url } = body;
            const url = status_url || `https://queue.fal.run/${model}/requests/${request_id}/status`;
            const resp = await fetch(url, { headers: falHeaders });
            const data = await resp.json();
            return json(data, resp.status);

        } else if (action === 'result') {
            const { response_url } = body;
            const url = response_url || `https://queue.fal.run/${model}/requests/${request_id}`;
            const resp = await fetch(url, { headers: falHeaders });
            const data = await resp.json();
            return json(data, resp.status);

        } else if (action === 'fetch_audio') {
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

        } else if (action === 'fetch_image_noauth') {
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

        } else if (action === 'upload_audio') {
            const { audio_b64, filename = 'voice.wav', content_type = 'audio/wav' } = body;
            if (!audio_b64) return json({ error: 'Missing audio_b64' }, 400);

            const binaryStr = atob(audio_b64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

            // Step 1: Get pre-signed upload URL
            const initiateResp = await fetch('https://rest.alpha.fal.ai/storage/upload/initiate', {
                method: 'POST',
                headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content_type, file_name: filename })
            });
            const { file_url, upload_url } = await initiateResp.json();
            if (!initiateResp.ok || !upload_url) return json({ error: 'Failed to initiate upload' }, initiateResp.status);

            // Step 2: PUT binary to pre-signed URL
            const putResp = await fetch(upload_url, {
                method: 'PUT',
                headers: { 'Content-Type': content_type },
                body: bytes
            });
            if (!putResp.ok) return json({ error: `Upload PUT failed: ${putResp.status}` }, putResp.status);

            return json({ url: file_url });

        } else {
            return json({ error: 'Invalid action' }, 400);
        }
    } catch (err) {
        return json({ error: err.message, step: 'fal_call', action }, 500);
    }
}
