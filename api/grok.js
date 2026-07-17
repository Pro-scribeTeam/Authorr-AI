const { requireAuth, sendError, applySecurityHeaders } = require('./_auth');
const rateLimit = require('./_ratelimit');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const XAI_BASE = 'https://api.x.ai/v1';

// Clean text before sending to Grok so symbols aren't read aloud
function preprocessText(text) {
  return text
    // Strip === title === style dividers, keeping the title text
    .replace(/={2,}\s*(.*?)\s*={2,}/g, '$1')
    // Strip standalone === or --- or *** divider lines
    .replace(/^[=\-*]{2,}\s*$/gm, '')
    // Strip markdown headers (# ## ###) keeping the heading text
    .replace(/^#{1,6}\s+/gm, '')
    // Strip bold/italic markers
    .replace(/\*{1,3}(.*?)\*{1,3}/g, '$1')
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1')
    // Replace trailing comma at the very end of the transcript with a period
    .replace(/,\s*$/, '.')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Collapse multiple spaces
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

module.exports = async function handler(req, res) {
  if (!applySecurityHeaders(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let user;
  try { ({ user } = await requireAuth(req)); } catch (err) { return sendError(res, err); }

  const { action } = req.body;

  // Voice cloning is expensive — strict limit (3/min per user)
  if (action === 'clone') {
    if (!rateLimit.strict(req, res, user.id)) return;
  } else {
    if (!rateLimit.ai(req, res, user.id)) return;
  }

  // Validate text length for TTS
  if (action === 'tts' && req.body.text && req.body.text.length > 100_000) {
    return res.status(400).json({ error: 'Text too long (max 100,000 characters)' });
  }

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'xAI API key not configured. Add XAI_API_KEY to environment.' });

  const authHeader = { 'Authorization': `Bearer ${apiKey}` };

  try {
    // ── List available voices ──────────────────────────────────────────────────
    if (action === 'voices') {
      const resp = await fetch(`${XAI_BASE}/tts/voices`, { headers: authHeader });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      const data = await resp.json();
      // Normalize xAI voice objects to the shape the frontend expects:
      // { id, name, language, gender, is_public }
      const voices = Array.isArray(data) ? data : (data.voices || data.data || []);
      const normalized = voices.map(v => ({
        id:        v.voice_id || v.id,
        name:      v.name,
        language:  v.language || 'en',
        gender:    v.gender   || null,
        is_public: true
      }));
      return res.json(normalized);
    }

    // ── Text-to-speech ─────────────────────────────────────────────────────────
    if (action === 'tts') {
      const { text, voice_id, language = 'en' } = req.body;
      if (!text)     return res.status(400).json({ error: 'Missing text' });
      if (!voice_id) return res.status(400).json({ error: 'Missing voice_id' });

      const cleanedText = preprocessText(text);
      const charCount = cleanedText.length;

      // Deduct credits (1 credit = 1 character)
      const { data: creditOk, error: creditErr } = await supabase.rpc('deduct_credits', {
        user_id: user.id,
        amount: charCount
      });
      if (creditErr) return res.status(500).json({ error: 'Credit check failed: ' + creditErr.message });
      if (!creditOk) return res.status(402).json({ error: 'Insufficient credits. Please upgrade your plan.', code: 'CREDITS_EXHAUSTED' });

      const resp = await fetch(`${XAI_BASE}/tts`, {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text:          cleanedText,
          voice_id,
          language,
          output_format: { codec: 'wav', sample_rate: 44100 }
        })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return res.status(resp.status).json({ error: errText });
      }

      const audioBuffer = await resp.arrayBuffer();
      const contentType = resp.headers.get('content-type') || 'audio/wav';
      return res.json({
        audio: Buffer.from(audioBuffer).toString('base64'),
        contentType
      });
    }

    // ── Voice cloning ──────────────────────────────────────────────────────────
    if (action === 'clone') {
      const { audio_b64, name, language = 'en', content_type = 'audio/webm' } = req.body;
      if (!audio_b64) return res.status(400).json({ error: 'Missing audio_b64' });
      if (!name)      return res.status(400).json({ error: 'Missing name' });

      const audioBuffer = Buffer.from(audio_b64, 'base64');
      const ext = content_type.includes('mp4') ? 'm4a' : content_type.includes('webm') ? 'webm' : 'wav';

      const form = new FormData();
      form.append('file', new Blob([audioBuffer], { type: content_type }), `recording.${ext}`);
      form.append('name', name);
      form.append('language', language);

      const cloneResp = await fetch(`${XAI_BASE}/custom-voices`, {
        method: 'POST',
        headers: authHeader,
        body: form
      });
      const cloneData = await cloneResp.json();
      if (!cloneResp.ok) {
        return res.status(cloneResp.status).json({ error: cloneData?.error || cloneData?.message || JSON.stringify(cloneData) });
      }
      // xAI returns { voice_id, name } — normalize to { id, name } for frontend
      return res.json({ id: cloneData.voice_id || cloneData.id, name: cloneData.name });
    }

    return res.status(400).json({ error: 'Invalid action. Use "tts", "voices", or "clone".' });
  } catch (err) {
    return sendError(res, err);
  }
};
