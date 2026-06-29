const { requireAuth, sendError, applySecurityHeaders } = require('./_auth');
const rateLimit = require('./_ratelimit');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Clean text before sending to Cartesia so symbols aren't read aloud
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
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Cartesia API key not configured. Add CARTESIA_API_KEY to environment.' });

  const headers = {
    'X-API-Key': apiKey,
    'Cartesia-Version': '2024-06-10',
    'Content-Type': 'application/json'
  };

  try {
    if (action === 'voices') {
      const resp = await fetch('https://api.cartesia.ai/voices', { headers });
      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
      return res.json(await resp.json());
    }

    if (action === 'tts') {
      const { text, voice_id, model_id = 'sonic-3.5' } = req.body;
      if (!text) return res.status(400).json({ error: 'Missing text' });
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

      const resp = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model_id,
          transcript: cleanedText,
          voice: { mode: 'id', id: voice_id },
          output_format: { container: 'wav', encoding: 'pcm_f32le', sample_rate: 44100 }
        })
      });

      if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });

      const audioBuffer = await resp.arrayBuffer();
      const contentType = resp.headers.get('content-type') || 'audio/wav';
      return res.json({
        audio: Buffer.from(audioBuffer).toString('base64'),
        contentType
      });
    }

    if (action === 'clone') {
      const { audio_b64, name, language = 'en', content_type = 'audio/webm' } = req.body;
      if (!audio_b64) return res.status(400).json({ error: 'Missing audio_b64' });
      if (!name) return res.status(400).json({ error: 'Missing name' });

      const audioBuffer = Buffer.from(audio_b64, 'base64');
      const ext = content_type.includes('mp4') ? 'm4a' : content_type.includes('webm') ? 'webm' : 'wav';

      const form = new FormData();
      form.append('clip', new Blob([audioBuffer], { type: content_type }), `recording.${ext}`);
      form.append('name', name);
      form.append('language', language);

      const cloneResp = await fetch('https://api.cartesia.ai/voices/clone', {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Cartesia-Version': '2024-06-10' },
        body: form
      });
      const cloneData = await cloneResp.json();
      if (!cloneResp.ok) return res.status(cloneResp.status).json({ error: cloneData?.error || cloneData?.message || JSON.stringify(cloneData) });
      return res.json({ id: cloneData.id, name: cloneData.name });
    }

    return res.status(400).json({ error: 'Invalid action. Use "tts", "voices", or "clone".' });
  } catch (err) {
    return sendError(res, err);
  }
};
