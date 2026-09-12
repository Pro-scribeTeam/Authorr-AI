/**
 * Cloudflare Pages Function — /api/signup
 *
 * 1. Verifies Cloudflare Turnstile token server-side
 * 2. Rate-limits signups to 5 per IP per hour (Supabase signup_attempts table)
 * 3. Creates the Supabase Auth user (confirmation email sent automatically if
 *    "Confirm email" is enabled in Supabase Auth settings)
 *
 * Required env vars (Cloudflare Pages → Settings → Environment Variables):
 *   TURNSTILE_SECRET_KEY      — from Cloudflare Turnstile dashboard
 *   SUPABASE_URL              — e.g. https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY         — public anon key (same as in index.html)
 *   SUPABASE_SERVICE_ROLE_KEY — for rate-limit table writes
 */

import { json, CORS_HEADERS } from './_shared.js';

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RATE_WINDOW_MS   = 60 * 60 * 1000; // 1 hour
const RATE_MAX         = 5;              // signups per IP per hour

export async function onRequestPost({ request, env }) {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

    const { email, password, name = '', turnstileToken } = body;

    if (!email || !password) return json({ error: 'Email and password are required.' }, 400);
    if (!turnstileToken)     return json({ error: 'Please complete the security check.' }, 400);

    // ── 1. Verify Turnstile ──────────────────────────────────────────────────
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               'unknown';

    // Skip verification if secret key not yet configured (widget uses test key)
    if (env.TURNSTILE_SECRET_KEY) {
        const tsForm = new URLSearchParams({
            secret:   env.TURNSTILE_SECRET_KEY,
            response: turnstileToken,
            remoteip: ip
        });
        const tsRes  = await fetch(TURNSTILE_VERIFY, { method: 'POST', body: tsForm });
        const tsData = await tsRes.json().catch(() => ({}));
        if (!tsData.success) {
            return json({ error: 'Security check failed. Please refresh and try again.', code: 'TURNSTILE_FAILED' }, 400);
        }
    }

    // ── 2. IP rate limit (Supabase signup_attempts table) ───────────────────
    const supabaseUrl  = env.SUPABASE_URL;
    const serviceKey   = env.SUPABASE_SERVICE_ROLE_KEY;
    const windowStart  = new Date(Date.now() - RATE_WINDOW_MS).toISOString();

    const countRes = await fetch(
        `${supabaseUrl}/rest/v1/signup_attempts?ip=eq.${encodeURIComponent(ip)}&created_at=gte.${encodeURIComponent(windowStart)}&select=id`,
        {
            headers: {
                'Authorization': `Bearer ${serviceKey}`,
                'apikey': serviceKey,
                'Prefer': 'count=exact',
                'Range-Unit': 'items',
                'Range': '0-0'
            }
        }
    );
    const contentRange = countRes.headers.get('content-range') || '*/0';
    const total = parseInt(contentRange.split('/')[1] || '0', 10);

    if (total >= RATE_MAX) {
        return json({
            error: `Too many accounts created from this network. Please wait an hour and try again.`,
            code: 'RATE_LIMITED'
        }, 429);
    }

    // ── 3. Create Supabase Auth user ────────────────────────────────────────
    const signupRes = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
            'apikey': env.SUPABASE_ANON_KEY || '',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, data: { display_name: name } })
    });
    const signupData = await signupRes.json().catch(() => ({}));

    if (!signupRes.ok) {
        const msg = signupData?.msg || signupData?.message ||
                    signupData?.error_description || signupData?.error || 'Signup failed.';
        return json({ error: msg }, signupRes.status);
    }

    // ── 4. Record attempt ───────────────────────────────────────────────────
    await fetch(`${supabaseUrl}/rest/v1/signup_attempts`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip })
    }).catch(() => {}); // non-fatal

    return json({ success: true, emailConfirmationRequired: true });
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
}
