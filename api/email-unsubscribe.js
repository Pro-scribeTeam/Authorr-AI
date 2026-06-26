// GET /api/email-unsubscribe?token=xxx
// Public endpoint — one-click unsubscribe from email footer
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const HTML = (msg, color = '#10b981') => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe — Authorr AI</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e5e7eb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#111;border:1px solid #1f2937;border-radius:16px;padding:48px;max-width:480px;text-align:center}h1{color:${color};font-size:1.5rem;margin-bottom:12px}p{color:#9ca3af;line-height:1.6}a{color:#22d3ee;text-decoration:none}</style>
</head><body><div class="card"><h1>${msg}</h1><p>You can <a href="https://authorr-ai.vercel.app">return to Authorr AI</a>.</p></div></body></html>`;

module.exports = async function handler(req, res) {
  const { token, cid } = req.query; // cid = campaign_id (optional, for analytics)

  if (!token) {
    return res.status(400).send(HTML('Invalid unsubscribe link.', '#ef4444'));
  }

  const { data: sub, error } = await supabase
    .from('email_subscribers')
    .select('id, email, status')
    .eq('unsubscribe_token', token)
    .maybeSingle();

  if (error || !sub) {
    return res.status(404).send(HTML('Unsubscribe link not found or already processed.', '#f59e0b'));
  }

  if (sub.status === 'unsubscribed') {
    return res.send(HTML('You are already unsubscribed.', '#f59e0b'));
  }

  // Mark unsubscribed
  await supabase
    .from('email_subscribers')
    .update({ status: 'unsubscribed', updated_at: new Date().toISOString() })
    .eq('id', sub.id);

  // Add to suppression list
  await supabase.from('email_suppression').upsert({
    email: sub.email,
    reason: 'unsubscribe'
  }, { onConflict: 'email', ignoreDuplicates: true });

  // Log event
  if (cid) {
    await supabase.from('email_events').insert({
      campaign_id: cid,
      subscriber_id: sub.id,
      event_type: 'unsubscribe',
      occurred_at: new Date().toISOString()
    });
    await supabase.rpc('increment_campaign_stat', { p_campaign_id: cid, p_field: 'unsubscribes' });
  }

  return res.send(HTML('You have been unsubscribed.', '#10b981'));
};
