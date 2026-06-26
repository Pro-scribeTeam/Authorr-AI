// /api/email-campaigns — Admin campaign CRUD
// GET  ?id=xxx | list all
// POST { name, subject, ... }  — create
// PUT  { id, ...fields }       — update draft
// DELETE ?id=xxx
const { requireAuth } = require('./_auth');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function isAdmin(req) {
  try {
    const { user } = await requireAuth(req);
    const { data } = await supabase.from('subscriptions').select('role').eq('user_id', user.id).maybeSingle();
    return data?.role === 'admin';
  } catch { return false; }
}

module.exports = async function handler(req, res) {
  if (!await isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  if (req.method === 'GET') {
    const { id } = req.query;

    if (id) {
      // Get single campaign with stats and send count
      const { data: campaign, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', id)
        .single();
      if (error) return res.status(404).json({ error: 'Not found' });

      // Get top clicked links
      const { data: links } = await supabase
        .from('email_links')
        .select('original_url, click_count, unique_clicks')
        .eq('campaign_id', id)
        .order('click_count', { ascending: false })
        .limit(10);

      return res.json({ campaign, links: links || [] });
    }

    const { data, error } = await supabase
      .from('email_campaigns')
      .select('id, name, subject, status, audience, audience_filter, stats, sent_at, scheduled_at, created_at')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ campaigns: data });
  }

  if (req.method === 'POST') {
    const { name, subject, preview_text, from_name, from_email, reply_to,
            html_body, text_body, audience = 'all', audience_filter,
            track_opens = true, track_clicks = true } = req.body;

    if (!name || !subject) return res.status(400).json({ error: 'name and subject required' });

    // Pull from_name/from_email from settings if not provided
    const { data: settings } = await supabase.from('email_settings').select('*').eq('id', 1).single();

    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        name, subject, preview_text,
        from_name: from_name || settings?.from_name || 'Authorr AI',
        from_email: from_email || settings?.from_email || 'hello@authorr.ai',
        reply_to: reply_to || settings?.reply_to || null,
        html_body: html_body || '',
        text_body,
        audience, audience_filter,
        track_opens, track_clicks,
        status: 'draft'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ campaign: data });
  }

  if (req.method === 'PUT') {
    const { id, ...fields } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });

    // Prevent updating sent campaigns
    const { data: existing } = await supabase.from('email_campaigns').select('status').eq('id', id).single();
    if (existing?.status === 'sent') return res.status(400).json({ error: 'Cannot edit a sent campaign' });

    const { data, error } = await supabase
      .from('email_campaigns')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

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
};
