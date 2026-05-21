/**
 * Cloudflare Pages Function — Freesound SFX proxy
 * Accessible at: /api/sfx
 *
 * Bypasses browser CORS restrictions by calling Freesound server-side.
 * Accepts all Freesound search/text params as query string.
 * The `token` param (API key) can come from the client or FREESOUND_TOKEN env var.
 */
export async function onRequest(context) {
    const { request, env } = context;

    // Only allow GET
    if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const params = new URLSearchParams(url.searchParams);

    // Use env var token if set (Cloudflare dashboard), else trust client-supplied token
    if (env.FREESOUND_TOKEN) {
        params.set('token', env.FREESOUND_TOKEN);
    }

    // Must have some auth
    if (!params.get('token') && !params.get('client_id')) {
        return new Response(JSON.stringify({ error: 'No Freesound API token provided' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const freesoundUrl = `https://freesound.org/apiv2/search/text/?${params.toString()}`;

    try {
        const res = await fetch(freesoundUrl, {
            headers: {
                'User-Agent': 'Authorr-AI/1.0 (authorr-ai.pages.dev)',
                'Accept': 'application/json'
            }
        });

        const body = await res.text();

        return new Response(body, {
            status: res.status,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300'
            }
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
