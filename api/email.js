// api/email.js — Consolidated email marketing router
// Vercel rewrites /api/email-{route}?... → /api/email?route={route}&...
// Routes: subscribe, unsubscribe, open, click, webhook, subscribers, campaigns, send, ai, settings

const { requireAuth } = require('./_auth');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://authorr-ai.vercel.app';

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function isAdmin(req) {
  try {
    const { user } = await requireAuth(req);
    const { data } = await supabase.from('subscriptions').select('role').eq('user_id', user.id).maybeSingle();
    return data?.role === 'admin';
  } catch { return false; }
}

// ── 1x1 transparent GIF ──────────────────────────────────────────────────────

const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

// ── Unsubscribe page HTML ─────────────────────────────────────────────────────

const unsubHtml = (msg, color) => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe — Authorr AI</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e5e7eb;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}.card{background:#111;border:1px solid #1f2937;border-radius:16px;padding:48px;max-width:480px;text-align:center}h1{color:${color || '#10b981'};font-size:1.5rem;margin-bottom:12px}p{color:#9ca3af;line-height:1.6}a{color:#22d3ee;text-decoration:none}</style>
</head><body><div class="card"><h1>${msg}</h1><p>You can <a href="https://authorr-ai.vercel.app">return to Authorr AI</a>.</p></div></body></html>`;

// ── Send helpers ──────────────────────────────────────────────────────────────

async function rewriteLinks(html, campaignId) {
  const urls = [...new Set([...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]))];
  if (!urls.length) return html;
  const { data: links } = await supabase.from('email_links').insert(urls.map(u => ({ campaign_id: campaignId, original_url: u }))).select('token, original_url');
  if (!links) return html;
  const map = {};
  links.forEach(l => { map[l.original_url] = l.token; });
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
    const token = map[url];
    return token ? `href="${BASE_URL}/api/email-click?t=${token}&sid=__SEND_ID__"` : match;
  });
}

function addOpenPixel(html, sendId, campaignId) {
  const pixel = `<img src="${BASE_URL}/api/email-open?sid=${sendId}&cid=${campaignId}" width="1" height="1" style="display:none;border:0;" alt="">`;
  return html.includes('</body>') ? html.replace('</body>', pixel + '</body>') : html + pixel;
}

function unsubscribeUrl(token, campaignId) {
  return `${BASE_URL}/api/email-unsubscribe?token=${token}&cid=${campaignId}`;
}

function injectFooter(html, unsubUrl, address) {
  const footer = `<div style="margin-top:40px;padding:20px;text-align:center;font-family:sans-serif;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;"><p style="margin:0 0 8px;">${address}</p><p style="margin:0;"><a href="${unsubUrl}" style="color:#6b7280;">Unsubscribe</a> &middot; <a href="https://authorr-ai.vercel.app" style="color:#6b7280;">Visit Authorr AI</a></p></div>`;
  return html.includes('</body>') ? html.replace('</body>', footer + '</body>') : html + footer;
}

// ── AI helper ─────────────────────────────────────────────────────────────────

async function callOpenRouter(messages, json) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://authorr-ai.vercel.app',
      'X-Title': 'Authorr AI Email'
    },
    body: JSON.stringify({ model: 'openai/gpt-4o', messages, temperature: 0.8, response_format: json ? { type: 'json_object' } : undefined })
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Webhook signature verification ────────────────────────────────────────────

async function verifySignature(payload, headers, secret) {
  if (!secret) return true;
  const msgId = headers['webhook-id'];
  const msgTs = headers['webhook-timestamp'];
  const msgSig = headers['webhook-signature'];
  if (!msgId || !msgTs || !msgSig) return false;
  const toSign = `${msgId}.${msgTs}.${typeof payload === 'string' ? payload : JSON.stringify(payload)}`;
  const keyData = Buffer.from(secret.replace('whsec_', ''), 'base64');
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(toSign));
  const computed = 'v1,' + Buffer.from(sigBuffer).toString('base64');
  return msgSig.split(' ').some(s => s === computed);
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ════════════════════════════════════════════════════════════════════════════

async function handleSubscribe(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, first_name, last_name, tags = [], source = 'form' } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email required' });

  const { data: suppressed } = await supabase.from('email_suppression').select('email').eq('email', email.toLowerCase().trim()).maybeSingle();
  if (suppressed) return res.status(400).json({ error: 'This email cannot be subscribed.' });

  const { data, error } = await supabase.from('email_subscribers').upsert({
    email: email.toLowerCase().trim(), first_name: first_name || null, last_name: last_name || null,
    status: 'subscribed', tags, source,
    ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress,
    consent_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }, { onConflict: 'email' }).select('id, email').single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ success: true, subscriber_id: data.id });
}

async function handleUnsubscribe(req, res) {
  const { token, cid } = req.query;
  if (!token) return res.status(400).send(unsubHtml('Invalid unsubscribe link.', '#ef4444'));

  const { data: sub, error } = await supabase.from('email_subscribers').select('id, email, status').eq('unsubscribe_token', token).maybeSingle();
  if (error || !sub) return res.status(404).send(unsubHtml('Unsubscribe link not found or already processed.', '#f59e0b'));
  if (sub.status === 'unsubscribed') return res.send(unsubHtml('You are already unsubscribed.', '#f59e0b'));

  await supabase.from('email_subscribers').update({ status: 'unsubscribed', updated_at: new Date().toISOString() }).eq('id', sub.id);
  await supabase.from('email_suppression').upsert({ email: sub.email, reason: 'unsubscribe' }, { onConflict: 'email', ignoreDuplicates: true });

  if (cid) {
    await supabase.from('email_events').insert({ campaign_id: cid, subscriber_id: sub.id, event_type: 'unsubscribe', occurred_at: new Date().toISOString() });
    await supabase.rpc('increment_campaign_stat', { p_campaign_id: cid, p_field: 'unsubscribes' });
  }
  return res.send(unsubHtml('You have been unsubscribed.', '#10b981'));
}

async function handleOpen(req, res) {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', PIXEL.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.end(PIXEL);

  const { sid, cid } = req.query;
  if (!sid || !cid) return;
  try {
    const { data: send } = await supabase.from('email_campaign_sends').select('id, subscriber_id, campaign_id').eq('id', sid).maybeSingle();
    if (!send) return;
    const { error } = await supabase.from('email_events').insert({
      campaign_id: send.campaign_id, subscriber_id: send.subscriber_id, send_id: send.id,
      event_type: 'open', ip_address: req.headers['x-forwarded-for']?.split(',')[0] || null,
      user_agent: req.headers['user-agent'] || null, occurred_at: new Date().toISOString()
    });
    if (!error) {
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'opens' });
      const { count } = await supabase.from('email_events').select('id', { count: 'exact', head: true })
        .eq('campaign_id', send.campaign_id).eq('subscriber_id', send.subscriber_id).eq('event_type', 'open');
      if (count === 1) await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'unique_opens' });
    }
  } catch (e) { console.error('Open tracking error:', e.message); }
}

async function handleClick(req, res) {
  const { t: token, sid } = req.query;
  if (!token) return res.redirect(302, 'https://authorr-ai.vercel.app');

  const { data: link } = await supabase.from('email_links').select('id, original_url, campaign_id').eq('token', token).maybeSingle();
  if (!link) return res.redirect(302, 'https://authorr-ai.vercel.app');

  res.redirect(302, link.original_url);
  try {
    let subscriberId = null;
    if (sid) {
      const { data: send } = await supabase.from('email_campaign_sends').select('subscriber_id').eq('id', sid).maybeSingle();
      subscriberId = send?.subscriber_id || null;
    }
    await supabase.from('email_events').insert({
      campaign_id: link.campaign_id, subscriber_id: subscriberId, event_type: 'click',
      url: link.original_url, ip_address: req.headers['x-forwarded-for']?.split(',')[0] || null,
      user_agent: req.headers['user-agent'] || null, occurred_at: new Date().toISOString()
    });
    await supabase.rpc('increment_campaign_stat', { p_campaign_id: link.campaign_id, p_field: 'clicks' });
  } catch (e) { console.error('Click tracking error:', e.message); }
}

async function handleWebhook(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { data: settings } = await supabase.from('email_settings').select('webhook_secret').eq('id', 1).single();
  const secret = process.env.RESEND_WEBHOOK_SECRET || settings?.webhook_secret;
  const valid = await verifySignature(req.body, req.headers, secret).catch(() => true);
  if (!valid) return res.status(401).json({ error: 'Invalid signature' });

  const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { type, data } = event;
  const messageId = data?.email_id;
  if (!messageId) return res.json({ ok: true });

  const { data: send } = await supabase.from('email_campaign_sends').select('id, campaign_id, subscriber_id').eq('provider_message_id', messageId).maybeSingle();
  if (!send) return res.json({ ok: true });

  const eventBase = { campaign_id: send.campaign_id, subscriber_id: send.subscriber_id, send_id: send.id, raw_payload: data, occurred_at: new Date().toISOString() };

  switch (type) {
    case 'email.delivered':
      await supabase.from('email_campaign_sends').update({ status: 'delivered' }).eq('id', send.id);
      await supabase.from('email_events').insert({ ...eventBase, event_type: 'delivered' });
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'delivered' });
      break;
    case 'email.bounced': {
      const isHard = data.bounce?.type === 'HardBounce' || data.bounce?.subtype === 'Permanent';
      await supabase.from('email_campaign_sends').update({ status: 'bounced' }).eq('id', send.id);
      await supabase.from('email_events').insert({ ...eventBase, event_type: 'bounce', bounce_type: isHard ? 'hard' : 'soft' });
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'bounces' });
      if (isHard) {
        await supabase.from('email_subscribers').update({ status: 'bounced' }).eq('id', send.subscriber_id);
        const { data: sub } = await supabase.from('email_subscribers').select('email').eq('id', send.subscriber_id).single();
        if (sub) await supabase.from('email_suppression').upsert({ email: sub.email, reason: 'hard_bounce' }, { onConflict: 'email', ignoreDuplicates: true });
      }
      break;
    }
    case 'email.complained': {
      await supabase.from('email_campaign_sends').update({ status: 'complained' }).eq('id', send.id);
      await supabase.from('email_events').insert({ ...eventBase, event_type: 'complaint' });
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'complaints' });
      await supabase.from('email_subscribers').update({ status: 'complained' }).eq('id', send.subscriber_id);
      const { data: subC } = await supabase.from('email_subscribers').select('email').eq('id', send.subscriber_id).single();
      if (subC) await supabase.from('email_suppression').upsert({ email: subC.email, reason: 'complaint' }, { onConflict: 'email', ignoreDuplicates: true });
      break;
    }
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
}

async function handleSubscribers(req, res) {
  if (!await isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'POST' && req.query.action === 'sync') {
    const { data, error } = await supabase.rpc('sync_authorr_users_to_subscribers');
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ synced: data });
  }

  if (req.method === 'GET') {
    const { page = 1, limit = 50, search = '', status = '', tag = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = supabase.from('email_subscribers').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + parseInt(limit) - 1);
    if (status) query = query.eq('status', status);
    if (tag) query = query.contains('tags', [tag]);
    if (search) query = query.ilike('email', '%' + search + '%');
    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ subscribers: data, total: count, page: parseInt(page), limit: parseInt(limit) });
  }

  if (req.method === 'POST') {
    const { email, first_name, last_name, tags = [], source = 'manual' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });
    const { data, error } = await supabase.from('email_subscribers').upsert(
      { email: email.toLowerCase().trim(), first_name, last_name, tags, source, status: 'subscribed', updated_at: new Date().toISOString() },
      { onConflict: 'email' }
    ).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ subscriber: data });
  }

  if (req.method === 'PUT') {
    const { id, ...fields } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { data, error } = await supabase.from('email_subscribers').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ subscriber: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase.from('email_subscribers').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCampaigns(req, res) {
  if (!await isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      const { data: campaign, error } = await supabase.from('email_campaigns').select('*').eq('id', id).single();
      if (error) return res.status(404).json({ error: 'Not found' });
      const { data: links } = await supabase.from('email_links').select('original_url, click_count, unique_clicks').eq('campaign_id', id).order('click_count', { ascending: false }).limit(10);
      return res.json({ campaign, links: links || [] });
    }
    const { data, error } = await supabase.from('email_campaigns').select('id, name, subject, status, audience, audience_filter, stats, sent_at, scheduled_at, created_at').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ campaigns: data });
  }

  if (req.method === 'POST') {
    const { name, subject, preview_text, from_name, from_email, reply_to, html_body, text_body, audience = 'all', audience_filter, track_opens = true, track_clicks = true } = req.body;
    if (!name || !subject) return res.status(400).json({ error: 'name and subject required' });
    const { data: settings } = await supabase.from('email_settings').select('*').eq('id', 1).single();
    const { data, error } = await supabase.from('email_campaigns').insert({
      name, subject, preview_text,
      from_name: from_name || settings?.from_name || 'Authorr AI',
      from_email: from_email || settings?.from_email || 'hello@authorr.ai',
      reply_to: reply_to || settings?.reply_to || null,
      html_body: html_body || '', text_body, audience, audience_filter,
      track_opens, track_clicks, status: 'draft'
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ campaign: data });
  }

  if (req.method === 'PUT') {
    const { id, ...fields } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { data: existing } = await supabase.from('email_campaigns').select('status').eq('id', id).single();
    if (existing?.status === 'sent') return res.status(400).json({ error: 'Cannot edit a sent campaign' });
    const { data, error } = await supabase.from('email_campaigns').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ campaign: data });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { error } = await supabase.from('email_campaigns').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleSend(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!await isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  const { campaign_id, test_email } = req.body;
  if (!campaign_id) return res.status(400).json({ error: 'campaign_id required' });

  const { data: campaign, error: campErr } = await supabase.from('email_campaigns').select('*').eq('id', campaign_id).single();
  if (campErr || !campaign) return res.status(404).json({ error: 'Campaign not found' });
  if (campaign.status === 'sent') return res.status(400).json({ error: 'Campaign already sent' });

  const { data: settings } = await supabase.from('email_settings').select('*').eq('id', 1).single();
  const resendKey = process.env.RESEND_API_KEY || settings?.resend_api_key;
  if (!resendKey) return res.status(500).json({ error: 'Resend API key not configured in Settings' });

  if (test_email) {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${campaign.from_name} <${campaign.from_email}>`, to: [test_email], subject: `[TEST] ${campaign.subject}`, html: campaign.html_body, reply_to: campaign.reply_to || undefined })
    });
    const result = await resp.json();
    if (!resp.ok) return res.status(500).json({ error: result.message || 'Send failed', detail: result });
    return res.json({ success: true, test: true, resend_id: result.id });
  }

  let subsQuery = supabase.from('email_subscribers').select('id, email, first_name, unsubscribe_token').eq('status', 'subscribed');
  if (campaign.audience === 'tag' && campaign.audience_filter) subsQuery = subsQuery.contains('tags', [campaign.audience_filter]);
  else if (campaign.audience === 'plan' && campaign.audience_filter) subsQuery = subsQuery.eq('plan', campaign.audience_filter);

  const { data: subscribers, error: subErr } = await subsQuery;
  if (subErr) return res.status(500).json({ error: subErr.message });
  if (!subscribers?.length) return res.status(400).json({ error: 'No subscribers match this audience' });

  const { data: suppressed } = await supabase.from('email_suppression').select('email');
  const suppressedSet = new Set((suppressed || []).map(s => s.email));
  const eligible = subscribers.filter(s => !suppressedSet.has(s.email));
  if (!eligible.length) return res.status(400).json({ error: 'All subscribers are suppressed' });

  await supabase.from('email_campaigns').update({ status: 'sending' }).eq('id', campaign_id);

  const htmlWithLinks = await rewriteLinks(campaign.html_body, campaign_id);
  const physicalAddress = settings?.physical_address || '123 Main St, City, State 00000, USA';
  let sentCount = 0, failCount = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
    const batch = eligible.slice(i, i + BATCH_SIZE);
    const { data: sends } = await supabase.from('email_campaign_sends').insert(batch.map(s => ({ campaign_id, subscriber_id: s.id, status: 'queued' }))).select('id, subscriber_id');
    const sendMap = {};
    (sends || []).forEach(s => { sendMap[s.subscriber_id] = s.id; });

    const emailBatch = batch.map(sub => {
      const sendId = sendMap[sub.id] || 'unknown';
      const unsub = unsubscribeUrl(sub.unsubscribe_token, campaign_id);
      let html = htmlWithLinks.replace(/__SEND_ID__/g, sendId);
      if (campaign.track_opens) html = addOpenPixel(html, sendId, campaign_id);
      html = injectFooter(html, unsub, physicalAddress);
      html = html.replace(/\{\{first_name\}\}/gi, sub.first_name || 'there');
      return {
        from: `${campaign.from_name} <${campaign.from_email}>`, to: [sub.email],
        subject: campaign.subject.replace(/\{\{first_name\}\}/gi, sub.first_name || 'there'),
        html, reply_to: campaign.reply_to || undefined,
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
      };
    });

    const batchResp = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailBatch)
    });
    const batchResult = await batchResp.json();
    if (batchResp.ok && batchResult.data) {
      for (let j = 0; j < batch.length; j++) {
        const sendId = sendMap[batch[j].id];
        const msgId = batchResult.data[j]?.id;
        if (sendId && msgId) await supabase.from('email_campaign_sends').update({ status: 'sent', provider_message_id: msgId, sent_at: new Date().toISOString() }).eq('id', sendId);
      }
      sentCount += batch.length;
    } else {
      console.error('Batch send error:', batchResult);
      failCount += batch.length;
    }
    if (i + BATCH_SIZE < eligible.length) await new Promise(r => setTimeout(r, 200));
  }

  await supabase.from('email_campaigns').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', campaign_id);
  await supabase.rpc('increment_campaign_stat', { p_campaign_id: campaign_id, p_field: 'sent', p_amount: sentCount });
  return res.json({ success: true, sent: sentCount, failed: failCount, total: eligible.length });
}

async function handleAI(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!await isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  const { action, ...params } = req.body;

  if (action === 'subjects') {
    const { topic, audience = 'email subscribers', goal = 'engagement' } = params;
    if (!topic) return res.status(400).json({ error: 'topic required' });
    const content = await callOpenRouter([
      { role: 'system', content: 'You are an expert email marketer. Generate exactly 6 email subject line variants under 50 chars each. Styles: 1.Curiosity gap 2.Urgency 3.Personalization with {{first_name}} 4.Specific stat 5.Direct question 6.Bold claim. Return ONLY JSON: {"variants":["...","...","...","...","...","..."]}' },
      { role: 'user', content: `Topic: ${topic}\nAudience: ${audience}\nGoal: ${goal}` }
    ], true);
    try { const p = JSON.parse(content); return res.json({ variants: p.variants || [] }); }
    catch { return res.json({ variants: [content] }); }
  }

  if (action === 'compose') {
    const { topic, tone = 'professional', goal = 'drive engagement', key_points = '', audience = 'subscribers', brand = 'Authorr AI' } = params;
    if (!topic) return res.status(400).json({ error: 'topic required' });
    const content = await callOpenRouter([
      { role: 'system', content: 'You are an expert email copywriter. Write a marketing email as complete HTML with inline CSS only (Gmail/Outlook safe), max 600px, under 200 words body, include {{first_name}} greeting and CTA. Return ONLY JSON: {"subject":"...","preview_text":"...","html":"..."}' },
      { role: 'user', content: `Brand: ${brand}\nTopic: ${topic}\nTone: ${tone}\nGoal: ${goal}\nAudience: ${audience}\nKey points: ${key_points || 'none'}` }
    ], true);
    try { const p = JSON.parse(content); return res.json({ subject: p.subject || '', preview_text: p.preview_text || '', html: p.html || content }); }
    catch { return res.json({ html: content, subject: '', preview_text: '' }); }
  }

  if (action === 'spam_check') {
    const { subject, html_body } = params;
    if (!subject && !html_body) return res.status(400).json({ error: 'subject or html_body required' });
    const content = await callOpenRouter([
      { role: 'system', content: 'You are an email deliverability expert. Analyze for spam triggers. Return JSON: {"score":1-10,"grade":"A/B/C/D/F","issues":["..."],"suggestions":["..."],"summary":"one sentence"}' },
      { role: 'user', content: `Subject: ${subject || 'N/A'}\n\nBody:\n${(html_body || '').replace(/<[^>]+>/g, ' ').slice(0, 1500)}` }
    ], true);
    try { return res.json(JSON.parse(content)); }
    catch { return res.json({ score: 5, grade: 'C', issues: [], suggestions: [], summary: content }); }
  }

  if (action === 'improve_subject') {
    const { subject } = params;
    if (!subject) return res.status(400).json({ error: 'subject required' });
    const content = await callOpenRouter([
      { role: 'system', content: 'Rewrite this email subject line to be more compelling, under 50 chars. Return JSON: {"improved":"..."}' },
      { role: 'user', content: `Original: "${subject}"` }
    ], true);
    try { return res.json(JSON.parse(content)); }
    catch { return res.json({ improved: subject }); }
  }

  return res.status(400).json({ error: `Unknown action: ${action}` });
}

async function handleSettings(req, res) {
  if (!await isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'GET' && req.query.action === 'stats') {
    const [subsResult, campaignsResult] = await Promise.all([
      supabase.from('email_subscribers').select('status', { count: 'exact' }).eq('status', 'subscribed'),
      supabase.from('email_campaigns').select('id, stats, status')
    ]);
    const campaigns = campaignsResult.data || [];
    const sentCampaigns = campaigns.filter(c => c.status === 'sent');
    const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalOpens = sentCampaigns.reduce((sum, c) => sum + (c.stats?.opens || 0), 0);
    const totalClicks = sentCampaigns.reduce((sum, c) => sum + (c.stats?.clicks || 0), 0);
    return res.json({
      total_subscribers: subsResult.count || 0, total_campaigns: campaigns.length,
      campaigns_sent: sentCampaigns.length, total_sent: totalSent,
      avg_open_rate: totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0.0',
      avg_click_rate: totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0'
    });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('email_settings').select('*').eq('id', 1).single();
    if (error) return res.status(500).json({ error: error.message });
    if (data?.resend_api_key) data.resend_api_key = data.resend_api_key.slice(0, 8) + '••••••••';
    return res.json({ settings: data });
  }

  if (req.method === 'PUT') {
    const { from_name, from_email, reply_to, physical_address, resend_api_key, webhook_secret } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (from_name !== undefined) updates.from_name = from_name;
    if (from_email !== undefined) updates.from_email = from_email;
    if (reply_to !== undefined) updates.reply_to = reply_to;
    if (physical_address !== undefined) updates.physical_address = physical_address;
    if (resend_api_key && !resend_api_key.includes('••••')) updates.resend_api_key = resend_api_key;
    if (webhook_secret && !webhook_secret.includes('••••')) updates.webhook_secret = webhook_secret;
    const { data, error } = await supabase.from('email_settings').update(updates).eq('id', 1).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ settings: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ROUTER
// ════════════════════════════════════════════════════════════════════════════

module.exports = async function handler(req, res) {
  const route = req.query.route;
  switch (route) {
    case 'subscribe':   return handleSubscribe(req, res);
    case 'unsubscribe': return handleUnsubscribe(req, res);
    case 'open':        return handleOpen(req, res);
    case 'click':       return handleClick(req, res);
    case 'webhook':     return handleWebhook(req, res);
    case 'subscribers': return handleSubscribers(req, res);
    case 'campaigns':   return handleCampaigns(req, res);
    case 'send':        return handleSend(req, res);
    case 'ai':          return handleAI(req, res);
    case 'settings':    return handleSettings(req, res);
    default:
      return res.status(404).json({ error: `Unknown email route: ${route || '(none)'}` });
  }
};
