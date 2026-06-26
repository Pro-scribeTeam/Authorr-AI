// GET /api/email-settings  — fetch platform email settings
// PUT /api/email-settings  — update settings
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
    const { data, error } = await supabase.from('email_settings').select('*').eq('id', 1).single();
    if (error) return res.status(500).json({ error: error.message });
    // Mask API key
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
    // Only update API key if a new full key is provided (not the masked version)
    if (resend_api_key && !resend_api_key.includes('••••')) updates.resend_api_key = resend_api_key;
    if (webhook_secret && !webhook_secret.includes('••••')) updates.webhook_secret = webhook_secret;

    const { data, error } = await supabase
      .from('email_settings')
      .update(updates)
      .eq('id', 1)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ settings: data });
  }

  // GET /api/email-settings?action=stats — dashboard overview stats
  if (req.method === 'GET' && req.query.action === 'stats') {
    const [subsResult, campaignsResult, eventsResult] = await Promise.all([
      supabase.from('email_subscribers').select('status', { count: 'exact' }).eq('status', 'subscribed'),
      supabase.from('email_campaigns').select('id, stats, status'),
      supabase.from('email_events').select('event_type').in('event_type', ['open', 'click'])
    ]);

    const totalSubscribers = subsResult.count || 0;
    const campaigns = campaignsResult.data || [];
    const sentCampaigns = campaigns.filter(c => c.status === 'sent');
    const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalOpens = sentCampaigns.reduce((sum, c) => sum + (c.stats?.opens || 0), 0);
    const totalClicks = sentCampaigns.reduce((sum, c) => sum + (c.stats?.clicks || 0), 0);

    return res.json({
      total_subscribers: totalSubscribers,
      total_campaigns: campaigns.length,
      campaigns_sent: sentCampaigns.length,
      total_sent: totalSent,
      avg_open_rate: totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0.0',
      avg_click_rate: totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
