const { requireAuth, sendError } = require('./_auth');

// Non-Venice models first (Google/NVIDIA infra), then Venice as fallback.
// Venice hosts Llama/Hermes/Qwen free models and rate-limits them all together.
const FALLBACK_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
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

  const attempts = [];
  for (const tryModel of modelsToTry) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers,
        body: JSON.stringify({ model: tryModel, messages, temperature, max_tokens })
      });
      const data = await response.json();
      attempts.push({ model: tryModel, status: response.status, error: data?.error || null });
      // If error, try next model
      if (!response.ok || data?.error) {
        continue;
      }
      // Strip any leaked <think> reasoning blocks from the response content
      if (data?.choices?.[0]?.message?.content) {
        data.choices[0].message.content = stripThinking(data.choices[0].message.content);
      }
      return res.json(data);
    } catch (err) {
      attempts.push({ model: tryModel, status: 0, error: err.message });
    }
  }

  // Find shortest retry_after from rate-limited models so client can auto-retry
  const retryAfter = attempts.reduce((min, a) => {
    const secs = a?.error?.metadata?.retry_after_seconds;
    return secs && secs < min ? secs : min;
  }, Infinity);

  return res.status(429).json({
    error: {
      message: 'All AI models temporarily rate-limited. Please wait a moment.',
      retry_after: retryAfter < Infinity ? Math.ceil(retryAfter) + 2 : 30
    }
  });
};
