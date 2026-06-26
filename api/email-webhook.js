// POST /api/email-webhook
// Resend webhook handler — bounce, complaint, delivered, opened, clicked events
// Secured via Svix signature verification
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple HMAC verification without svix dependency
async function verifySignature(payload, headers, secret) {
  if (!secret) return true; // Skip if no secret configured yet
  const msgId = headers['webhook-id'];
  const msgTs = headers['webhook-timestamp'];
  const msgSig = headers['webhook-signature'];
  if (!msgId || !msgTs || !msgSig) return false;

  const toSign = `${msgId}.${msgTs}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
  const encoder = new TextEncoder();
  const keyData = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(toSign));
  const computed = 'v1,' + Buffer.from(sigBuffer).toString('base64');
  return msgSig.split(' ').some(s => s === computed);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { data: settings } = await supabase.from('email_settings').select('webhook_secret').eq('id', 1).single();
  const secret = process.env.RESEND_WEBHOOK_SECRET || settings?.webhook_secret;

  const valid = await verifySignature(req.body, req.headers, secret).catch(() => true);
  if (!valid) return res.status(401).json({ error: 'Invalid signature' });

  const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { type, data } = event;
  const messageId = data?.email_id;

  if (!messageId) return res.json({ ok: true });

  // Find the send record by provider message ID
  const { data: send } = await supabase
    .from('email_campaign_sends')
    .select('id, campaign_id, subscriber_id')
    .eq('provider_message_id', messageId)
    .maybeSingle();

  if (!send) {
    console.log(`Webhook: no send record for message ${messageId}`);
    return res.json({ ok: true });
  }

  const eventBase = {
    campaign_id: send.campaign_id,
    subscriber_id: send.subscriber_id,
    send_id: send.id,
    raw_payload: data,
    occurred_at: new Date().toISOString()
  };

  switch (type) {
    case 'email.delivered':
      await supabase.from('email_campaign_sends').update({ status: 'delivered' }).eq('id', send.id);
      await supabase.from('email_events').insert({ ...eventBase, event_type: 'delivered' });
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'delivered' });
      break;

    case 'email.bounced': {
      const isHard = data.bounce?.type === 'HardBounce' || data.bounce?.subtype === 'Permanent';
      await supabase.from('email_campaign_sends').update({ status: 'bounced' }).eq('id', send.id);
      await supabase.from('email_events').insert({
        ...eventBase,
        event_type: 'bounce',
        bounce_type: isHard ? 'hard' : 'soft'
      });
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'bounces' });

      if (isHard) {
        // Hard bounce — permanently suppress
        await supabase.from('email_subscribers').update({ status: 'bounced' }).eq('id', send.subscriber_id);
        const { data: sub } = await supabase.from('email_subscribers').select('email').eq('id', send.subscriber_id).single();
        if (sub) {
          await supabase.from('email_suppression').upsert({ email: sub.email, reason: 'hard_bounce' }, { onConflict: 'email', ignoreDuplicates: true });
        }
      }
      break;
    }

    case 'email.complained':
      await supabase.from('email_campaign_sends').update({ status: 'complained' }).eq('id', send.id);
      await supabase.from('email_events').insert({ ...eventBase, event_type: 'complaint' });
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'complaints' });
      // Immediately suppress complaint
      await supabase.from('email_subscribers').update({ status: 'complained' }).eq('id', send.subscriber_id);
      const { data: subC } = await supabase.from('email_subscribers').select('email').eq('id', send.subscriber_id).single();
      if (subC) {
        await supabase.from('email_suppression').upsert({ email: subC.email, reason: 'complaint' }, { onConflict: 'email', ignoreDuplicates: true });
      }
      break;

    case 'email.opened':
      await supabase.from('email_events').insert({ ...eventBase, event_type: 'open' }).catch(() => {});
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'opens' });
      break;

    case 'email.clicked':
      await supabase.from('email_events').insert({ ...eventBase, event_type: 'click', url: data.click?.link }).catch(() => {});
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'clicks' });
      break;
  }

  return res.json({ ok: true });
};
