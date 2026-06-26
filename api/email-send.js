// POST /api/email-send
// Sends a campaign to all matching subscribers via Resend
// Body: { campaign_id, test_email? }
const { requireAuth } = require('./_auth');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://authorr-ai.vercel.app';

async function isAdmin(req) {
  try {
    const { user } = await requireAuth(req);
    const { data } = await supabase.from('subscriptions').select('role').eq('user_id', user.id).maybeSingle();
    return data?.role === 'admin';
  } catch { return false; }
}

// Replace all hrefs with tracked redirect links
async function rewriteLinks(html, campaignId) {
  const linkMap = {};
  const rewritten = html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
    if (linkMap[url]) return `href="${linkMap[url]}"`;
    return match; // resolved below
  });

  // Collect unique URLs
  const urls = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]))];
  const insertRows = urls.map(u => ({ campaign_id: campaignId, original_url: u }));

  if (!insertRows.length) return html;

  const { data: links } = await supabase
    .from('email_links')
    .insert(insertRows)
    .select('token, original_url');

  if (!links) return html;
  links.forEach(l => { linkMap[l.original_url] = l.token; });

  return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
    const token = linkMap[url];
    return token
      ? `href="${BASE_URL}/api/email-click?t=${token}&sid=__SEND_ID__"`
      : match;
  });
}

// Add tracking pixel to HTML
function addOpenPixel(html, sendId, campaignId) {
  const pixel = `<img src="${BASE_URL}/api/email-open?sid=${sendId}&cid=${campaignId}" width="1" height="1" style="display:none;border:0;" alt="">`;
  return html.includes('</body>') ? html.replace('</body>', `${pixel}</body>`) : html + pixel;
}

// Build unsubscribe URL
function unsubscribeUrl(token, campaignId) {
  return `${BASE_URL}/api/email-unsubscribe?token=${token}&cid=${campaignId}`;
}

// Inject footer with unsubscribe + physical address
function injectFooter(html, unsubUrl, address) {
  const footer = `
<div style="margin-top:40px;padding:20px;text-align:center;font-family:sans-serif;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">
  <p style="margin:0 0 8px;">${address}</p>
  <p style="margin:0;"><a href="${unsubUrl}" style="color:#6b7280;">Unsubscribe</a> · <a href="https://authorr-ai.vercel.app" style="color:#6b7280;">Visit Authorr AI</a></p>
</div>`;
  return html.includes('</body>') ? html.replace('</body>', `${footer}</body>`) : html + footer;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!await isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  const { campaign_id, test_email } = req.body;
  if (!campaign_id) return res.status(400).json({ error: 'campaign_id required' });

  // Load campaign
  const { data: campaign, error: campErr } = await supabase
    .from('email_campaigns')
    .select('*')
    .eq('id', campaign_id)
    .single();

  if (campErr || !campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status === 'sent') return res.status(400).json({ error: 'Campaign already sent' });

  // Load settings (Resend key, physical address)
  const { data: settings } = await supabase.from('email_settings').select('*').eq('id', 1).single();
  const resendKey = process.env.RESEND_API_KEY || settings?.resend_api_key;
  if (!resendKey) return res.status(500).json({ error: 'Resend API key not configured in Settings' });

  // TEST send — just send to one address
  if (test_email) {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${campaign.from_name} <${campaign.from_email}>`,
        to: [test_email],
        subject: `[TEST] ${campaign.subject}`,
        html: campaign.html_body,
        reply_to: campaign.reply_to || undefined
      })
    });
    const result = await resp.json();
    if (!resp.ok) return res.status(500).json({ error: result.message || 'Send failed', detail: result });
    return res.json({ success: true, test: true, resend_id: result.id });
  }

  // REAL send — build recipient list
  let subsQuery = supabase
    .from('email_subscribers')
    .select('id, email, first_name, unsubscribe_token')
    .eq('status', 'subscribed');

  if (campaign.audience === 'tag' && campaign.audience_filter) {
    subsQuery = subsQuery.contains('tags', [campaign.audience_filter]);
  } else if (campaign.audience === 'plan' && campaign.audience_filter) {
    subsQuery = subsQuery.eq('plan', campaign.audience_filter);
  }

  const { data: subscribers, error: subErr } = await subsQuery;
  if (subErr) return res.status(500).json({ error: subErr.message });
  if (!subscribers?.length) return res.status(400).json({ error: 'No subscribers match this audience' });

  // Exclude suppressed emails
  const { data: suppressed } = await supabase
    .from('email_suppression')
    .select('email');
  const suppressedSet = new Set((suppressed || []).map(s => s.email));
  const eligible = subscribers.filter(s => !suppressedSet.has(s.email));

  if (!eligible.length) return res.status(400).json({ error: 'All subscribers are suppressed' });

  // Mark campaign as sending
  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaign_id);

  // Rewrite links for click tracking
  const htmlWithLinks = await rewriteLinks(campaign.html_body, campaign_id);
  const physicalAddress = settings?.physical_address || '123 Main St, City, State 00000, USA';

  let sentCount = 0;
  let failCount = 0;

  // Send in batches of 50 to stay within rate limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);

    // Create send records first to get IDs
    const sendRows = batch.map(s => ({
      campaign_id,
      subscriber_id: s.id,
      status: 'queued'
    }));

    const { data: sends } = await supabase
      .from('email_campaign_sends')
      .insert(sendRows)
      .select('id, subscriber_id');

    const sendMap = {};
    (sends || []).forEach(s => { sendMap[s.subscriber_id] = s.id; });

    // Build Resend batch payload
    const emailBatch = batch.map(sub => {
      const sendId = sendMap[sub.id] || 'unknown';
      const unsub = unsubscribeUrl(sub.unsubscribe_token, campaign_id);

      let html = htmlWithLinks.replace(/__SEND_ID__/g, sendId);
      if (campaign.track_opens) html = addOpenPixel(html, sendId, campaign_id);
      html = injectFooter(html, unsub, physicalAddress);
      // Basic merge tag: {{first_name}}
      html = html.replace(/\{\{first_name\}\}/gi, sub.first_name || 'there');

      return {
        from: `${campaign.from_name} <${campaign.from_email}>`,
        to: [sub.email],
        subject: campaign.subject.replace(/\{\{first_name\}\}/gi, sub.first_name || 'there'),
        html,
        reply_to: campaign.reply_to || undefined,
        headers: {
          'List-Unsubscribe': `<${unsub}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      };
    });

    const batchResp = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailBatch)
    });

    const batchResult = await batchResp.json();

    if (batchResp.ok && batchResult.data) {
      // Update send records with provider message IDs
      for (let j = 0; j < batch.length; j++) {
        const sub = batch[j];
        const sendId = sendMap[sub.id];
        const msgId = batchResult.data[j]?.id;
        if (sendId && msgId) {
          await supabase
            .from('email_campaign_sends')
            .update({ status: 'sent', provider_message_id: msgId, sent_at: new Date().toISOString() })
            .eq('id', sendId);
        }
      }
      sentCount += batch.length;
    } else {
      console.error('Batch send error:', batchResult);
      failCount += batch.length;
    }

    // Small delay between batches
    if (i + BATCH_SIZE < eligible.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Mark campaign as sent
  await supabase.from('email_campaigns').update({
    status: 'sent',
    sent_at: new Date().toISOString(),
    stats: supabase.rpc ? undefined : undefined // stats updated via webhook
  }).eq('id', campaign_id);

  await supabase.rpc('increment_campaign_stat', { p_campaign_id: campaign_id, p_field: 'sent', p_amount: sentCount });

  return res.json({
    success: true,
    sent: sentCount,
    failed: failCount,
    total: eligible.length
  });
};
