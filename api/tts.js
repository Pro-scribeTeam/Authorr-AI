const { requireAuth, sendError, applySecurityHeaders, deductCredits } = require('./_auth');
const rateLimit = require('./_ratelimit');

module.exports = async function handler(req, res) {
  if (!applySecurityHeaders(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let authData;
  try { authData = await requireAuth(req); } catch (err) { return sendError(res, err); }
  if (!rateLimit.ai(req, res, authData.user.id)) return;

  const { input, voice, model = 'tts-1-hd', speed = 1.0 } = req.body;
  try {
    // 2 credits per character for OpenAI TTS
    const creditCost = Math.ceil((input || '').length * 2);
    if (creditCost > 0) {
      const credited = await deductCredits(authData.user.id, creditCost);
      if (!credited) {
        const msg = authData.subscription.status === 'trial'
          ? 'Trial credit limit reached. Please upgrade to continue.'
          : 'Monthly credit limit reached. Credits reset at the start of your next billing period.';
        return res.status(402).json({ error: msg, code: 'CREDITS_EXHAUSTED' });
      }
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input, voice, speed, response_format: 'mp3' })
    });
    if (!response.ok) return res.status(response.status).json(await response.json());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(await response.arrayBuffer()));
  } catch (err) { sendError(res, err); }
};
