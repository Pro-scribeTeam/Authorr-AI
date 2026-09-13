/**
 * Vercel Serverless Function — /api/signup
 *
 * 1. Verifies Cloudflare Turnstile token server-side
 * 2. Rate-limits to 5 signups per IP per hour (in-memory; resets per cold start)
 * 3. Creates the Supabase Auth user (confirmation email sent if "Confirm email"
 *    is enabled in Supabase Auth settings)
 *
 * Required env vars (Vercel → Project → Settings → Environment Variables):
 *   TURNSTILE_SECRET_KEY  — from Cloudflare Turnstile dashboard
 *   SUPABASE_URL          — e.g. https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY     — public anon key (same as in index.html)
 */

const rateLimit = require('./_ratelimit');

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RATE_MAX         = 5;
const RATE_WINDOW_MS   = 60 * 60 * 1000; // 1 hour

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { email, password, name = '', turnstileToken } = req.body || {};

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });
    if (!turnstileToken)     return res.status(400).json({ error: 'Please complete the security check.' });

    // ── 1. Rate limit ────────────────────────────────────────────────────────
    const allowed = rateLimit(req, res, { max: RATE_MAX, windowMs: RATE_WINDOW_MS,
        message: 'Too many accounts created from this network. Please wait an hour and try again.' });
    if (!allowed) return; // rateLimit already sent 429

    // ── 2. Verify Turnstile ──────────────────────────────────────────────────
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
    // Skip verification if secret key not yet configured (widget uses test key)
    if (process.env.TURNSTILE_SECRET_KEY) {
        const tsForm = new URLSearchParams({
            secret:   process.env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
            remoteip: ip
        });
        const tsRes  = await fetch(TURNSTILE_VERIFY, { method: 'POST', body: tsForm });
        const tsData = await tsRes.json().catch(() => ({}));
        if (!tsData.success) {
            return res.status(400).json({ error: 'Security check failed. Please refresh and try again.', code: 'TURNSTILE_FAILED' });
        }
    }

    // ── 3. Create Supabase Auth user ─────────────────────────────────────────
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey     = process.env.SUPABASE_ANON_KEY;

    const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'apikey': anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, data: { display_name: name } })
    });
    const signupData = await signupRes.json().catch(() => ({}));

    if (!signupRes.ok) {
        const msg = signupData?.msg || signupData?.message ||
                    signupData?.error_description || signupData?.error || 'Signup failed.';
        return res.status(signupRes.status).json({ error: msg });
    }

    // Determine whether email confirmation is actually required by checking
    // whether Supabase returned an access_token (confirmation OFF = auto-session)
    // or not (confirmation ON = pending email click).
    const emailConfirmationRequired = !signupData?.access_token;

    return res.status(200).json({ success: true, emailConfirmationRequired });
};
