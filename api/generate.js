const { requireAuth, sendError } = require('./_auth');

// Free models tried in order — reasoning models excluded (they leak chain-of-thought into output)
const FALLBACK_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'meta-llama/llama-3.2-3b-instruct:free',
];

// Strip <think>...</think> reasoning blocks that some models leak into content
function stripThinking(text) {
  if (!text) return text;
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

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
        body: JSON.stringify({
          model: tryModel, messages, temperature, max_tokens,
          include_reasoning: false  // suppress chain-of-thought from reasoning models
        })
      });
      const data = await response.json();
      // If provider error or timeout, try next model
      if (!response.ok || data?.error?.message?.toLowerCase().includes('provider')) {
        lastError = data?.error?.message || `HTTP ${response.status}`;
        continue;
      }
      // Strip any leaked <think> reasoning blocks from the response content
      if (data?.choices?.[0]?.message?.content) {
        data.choices[0].message.content = stripThinking(data.choices[0].message.content);
      }
      return res.json(data);
    } catch (err) {
      lastError = err.message;
    }
  }

  return res.status(502).json({ error: { message: `All AI models unavailable: ${lastError}` } });
};
