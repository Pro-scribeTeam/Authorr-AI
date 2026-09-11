const { requireAuth, sendError, applySecurityHeaders, deductCredits, checkFeature, creditExhaustedError } = require('./_auth');
const rateLimit = require('./_ratelimit');

module.exports = async function handler(req, res) {
  if (!applySecurityHeaders(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  let authData;
  try { authData = await requireAuth(req); } catch (err) { return sendError(res, err); }
  if (!rateLimit.strict(req, res, authData.user.id)) return;

  const { prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard', n = 1 } = req.body;
  try {
    // Cover generation requires Author plan (starter, tier 2)
    const featureErr = checkFeature(authData.subscription, 2);
    if (featureErr) return res.status(403).json(featureErr);

    // 5000 credits for HD, 2500 for standard
    const creditCost = (quality === 'hd') ? 5000 : 2500;
    const credited = await deductCredits(authData.user.id, creditCost);
    if (!credited) return res.status(402).json(creditExhaustedError(authData.subscription));

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, size, quality, n })
    });
    res.status(response.status).json(await response.json());
  } catch (err) { sendError(res, err); }
};
