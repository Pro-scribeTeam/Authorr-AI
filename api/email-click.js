// GET /api/email-click?t=LINK_TOKEN&sid=SEND_ID
// Click redirect tracker — logs click then 302 to original URL
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  const { t: token, sid } = req.query;

  if (!token) return res.redirect(302, 'https://authorr-ai.vercel.app');

  const { data: link } = await supabase
    .from('email_links')
    .select('id, original_url, campaign_id')
    .eq('token', token)
    .maybeSingle();

  if (!link) return res.redirect(302, 'https://authorr-ai.vercel.app');

  // Redirect immediately
  res.redirect(302, link.original_url);

  // Log async
  try {
    let subscriberId = null;
    if (sid) {
      const { data: send } = await supabase
        .from('email_campaign_sends')
        .select('subscriber_id')
        .eq('id', sid)
        .maybeSingle();
      subscriberId = send?.subscriber_id || null;
    }

    await supabase.from('email_events').insert({
      campaign_id: link.campaign_id,
      subscriber_id: subscriberId,
      event_type: 'click',
      url: link.original_url,
      ip_address: req.headers['x-forwarded-for']?.split(',')[0] || null,
      user_agent: req.headers['user-agent'] || null,
      occurred_at: new Date().toISOString()
    });

    // Increment link click counters
    await supabase
      .from('email_links')
      .update({ click_count: supabase.rpc('increment', { row_id: link.id, column_name: 'click_count' }) })
      .eq('id', link.id);

    await supabase.rpc('increment_campaign_stat', { p_campaign_id: link.campaign_id, p_field: 'clicks' });
  } catch (e) {
    console.error('Click tracking error:', e.message);
  }
};
