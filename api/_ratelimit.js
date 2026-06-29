// Simple in-memory rate limiter
// Resets per Vercel function instance (good enough for abuse prevention)
const store = new Map();

function getKey(req, identifier = 'ip') {
  if (identifier === 'ip') {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  }
  return identifier;
}

/**
 * Check rate limit. Returns true if allowed, false if exceeded.
 * @param {string} key      - Unique key (IP, user ID, etc.)
 * @param {number} max      - Max requests allowed in window
 * @param {number} windowMs - Window in milliseconds
 */
function checkLimit(key, max, windowMs) {
  const now = Date.now();
  const entry = store.get(key) || { count: 0, reset: now + windowMs };

  if (now > entry.reset) {
    entry.count = 1;
    entry.reset = now + windowMs;
  } else {
    entry.count++;
  }

  store.set(key, entry);

  // Clean up old entries periodically
  if (store.size > 5000) {
    for (const [k, v] of store) {
      if (now > v.reset) store.delete(k);
    }
  }

  return entry.count <= max;
}

/**
 * Rate limit middleware — call at the top of a handler.
 * Returns true if request is allowed, sends 429 and returns false if blocked.
 *
 * Usage:
 *   if (!await rateLimit(req, res)) return;
 */
function rateLimit(req, res, options = {}) {
  const {
    max = 30,
    windowMs = 60_000,
    keyFn = (req) => getKey(req, 'ip'),
    message = 'Too many requests — please try again later.'
  } = options;

  const key = keyFn(req);
  const allowed = checkLimit(key, max, windowMs);

  if (!allowed) {
    res.status(429).json({ error: message });
    return false;
  }
  return true;
}

// Preset configs
rateLimit.ai = (req, res, userId) => rateLimit(req, res, {
  max: 20, windowMs: 60_000,
  keyFn: () => userId || getKey(req, 'ip'),
  message: 'AI generation limit reached — please wait a minute.'
});

rateLimit.auth = (req, res) => rateLimit(req, res, {
  max: 10, windowMs: 60_000,
  keyFn: () => getKey(req, 'ip'),
  message: 'Too many requests from this IP — please wait a minute.'
});

rateLimit.strict = (req, res, userId) => rateLimit(req, res, {
  max: 5, windowMs: 60_000,
  keyFn: () => userId || getKey(req, 'ip'),
  message: 'Rate limit exceeded.'
});

module.exports = rateLimit;
