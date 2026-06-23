const { requireAuth, sendError } = require('./_auth');

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
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }

  const { action } = req.body;
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

    return res.status(400).json({ error: 'Invalid action. Use "tts" or "voices".' });
  } catch (err) {
    return sendError(res, err);
  }
};
