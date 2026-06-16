const { requireAuth, sendError } = require('./_auth');

// Free models tried in order — if one returns a provider error, next is attempted
const FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-120b:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { await requireAuth(req); } catch (err) { return sendError(res, err); }

  const { provider = 'openrouter', model, messages, temperature, max_tokens } = req.body;

  if (provider !== 'openrouter') {
    // Non-OpenRouter path (OpenAI direct)
    const headers = {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    };
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST', headers,
        body: JSON.stringify({ model, messages, temperature, max_tokens })
      });
      return res.status(response.status).json(await response.json());
    } catch (err) { return sendError(res, err); }
  }

  // OpenRouter path — try requested model first, then fallbacks
  const headers = {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://authorr.ai',
    'X-Title': 'Authorr AI'
  };

  const modelsToTry = model && !FALLBACK_MODELS.includes(model)
    ? [model, ...FALLBACK_MODELS]
    : [model || FALLBACK_MODELS[0], ...FALLBACK_MODELS.filter(m => m !== (model || FALLBACK_MODELS[0]))];

  let lastError = 'All models unavailable';
  for (const tryModel of modelsToTry) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers,
        body: JSON.stringify({ model: tryModel, messages, temperature, max_tokens })
      });
      const data = await response.json();
      // If provider error, try next model
      if (!response.ok || data?.error?.message?.toLowerCase().includes('provider')) {
        lastError = data?.error?.message || `HTTP ${response.status}`;
        continue;
      }
      return res.json(data);
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(502).json({ error: { message: `All AI models unavailable: ${lastError}` } });
};
