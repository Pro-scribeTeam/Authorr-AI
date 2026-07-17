/**
 * Cloudflare Pages Function — xAI Grok TTS proxy
 * Accessible at: /api/grok
 *
 * Actions (POST JSON body):
 *   { action: 'voices' }                          — list available voices
 *   { action: 'tts', text, voice_id }             — generate audio
 *   { action: 'clone', audio_b64, name, language, content_type } — clone voice
 *
 * Required env var (Cloudflare Pages → Settings → Environment Variables):
 *   XAI_API_KEY  — xAI API key from https://console.x.ai/
 */

const XAI_BASE = 'https://api.x.ai/v1';

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

function preprocessText(text) {
    return text
        .replace(/={2,}\s*(.*?)\s*={2,}/g, '$1')
        .replace(/^[=\-*]{2,}\s*$/gm, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
        .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
        .replace(/,\s*$/, '.')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

export async function onRequest(context) {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    const apiKey = env.XAI_API_KEY;
    if (!apiKey) return json({ error: 'XAI_API_KEY not configured in Cloudflare environment.' }, 500);

    const authHeader = { 'Authorization': `Bearer ${apiKey}` };

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

    const { action } = body;

    // ── List voices ──────────────────────────────────────────────────────────
    if (action === 'voices') {
        const resp = await fetch(`${XAI_BASE}/tts/voices`, { headers: authHeader });
        if (!resp.ok) return json({ error: await resp.text() }, resp.status);
        const data = await resp.json();
        const voices = Array.isArray(data) ? data : (data.voices || data.data || []);
        const normalized = voices.map(v => ({
            id:        v.voice_id || v.id,
            name:      v.name,
            language:  v.language || 'en',
            gender:    v.gender   || null,
            is_public: true
        }));
        return json(normalized);
    }

    // ── Text-to-speech ───────────────────────────────────────────────────────
    if (action === 'tts') {
        const { text, voice_id, language = 'en' } = body;
        if (!text)     return json({ error: 'Missing text' }, 400);
        if (!voice_id) return json({ error: 'Missing voice_id' }, 400);
        if (text.length > 100_000) return json({ error: 'Text too long (max 100,000 characters)' }, 400);

        const cleanedText = preprocessText(text);

        const resp = await fetch(`${XAI_BASE}/tts`, {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: cleanedText,
                voice_id,
                language,
                output_format: { codec: 'wav', sample_rate: 44100 }
            })
        });

        if (!resp.ok) return json({ error: await resp.text() }, resp.status);

        const audioBuffer = await resp.arrayBuffer();
        const contentType = resp.headers.get('content-type') || 'audio/wav';
        // Chunk the conversion to avoid stack overflow on large audio buffers
        const bytes = new Uint8Array(audioBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        return json({ audio: btoa(binary), contentType });
    }

    // ── Voice cloning ────────────────────────────────────────────────────────
    if (action === 'clone') {
        const { audio_b64, name, language = 'en', content_type = 'audio/webm' } = body;
        if (!audio_b64) return json({ error: 'Missing audio_b64' }, 400);
        if (!name)      return json({ error: 'Missing name' }, 400);

        const binaryStr = atob(audio_b64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const ext = content_type.includes('mp4') ? 'm4a' : content_type.includes('webm') ? 'webm' : 'wav';
        const form = new FormData();
        form.append('file', new Blob([bytes], { type: content_type }), `recording.${ext}`);
        form.append('name', name);
        form.append('language', language);

        const cloneResp = await fetch(`${XAI_BASE}/custom-voices`, {
            method: 'POST',
            headers: authHeader,
            body: form
        });
        const cloneData = await cloneResp.json();
        if (!cloneResp.ok) {
            return json({ error: cloneData?.error || cloneData?.message || JSON.stringify(cloneData) }, cloneResp.status);
        }
        return json({ id: cloneData.voice_id || cloneData.id, name: cloneData.name });
    }

    return json({ error: 'Invalid action. Use "tts", "voices", or "clone".' }, 400);
}
