// GET /api/email-open?sid=SEND_ID&cid=CAMPAIGN_ID
// 1x1 tracking pixel — returns transparent GIF, logs open event
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

module.exports = async function handler(req, res) {
  // Always return pixel immediately — never block the email client
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', PIXEL.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.end(PIXEL);

  // Log async (fire and forget)
  const { sid, cid } = req.query;
  if (!sid || !cid) return;

  try {
    const { data: send } = await supabase
      .from('email_campaign_sends')
      .select('id, subscriber_id, campaign_id')
      .eq('id', sid)
      .maybeSingle();

    if (!send) return;

    // Insert unique open (ignore duplicate)
    const { error } = await supabase.from('email_events').insert({
      campaign_id: send.campaign_id,
      subscriber_id: send.subscriber_id,
      send_id: send.id,
      event_type: 'open',
      ip_address: req.headers['x-forwarded-for']?.split(',')[0] || null,
      user_agent: req.headers['user-agent'] || null,
      occurred_at: new Date().toISOString()
    });

    // Only increment unique_opens if this is the first open
    if (!error) {
      await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'opens' });
      // Check if first open for this subscriber
      const { count } = await supabase
        .from('email_events')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', send.campaign_id)
        .eq('subscriber_id', send.subscriber_id)
        .eq('event_type', 'open');
      if (count === 1) {
        await supabase.rpc('increment_campaign_stat', { p_campaign_id: send.campaign_id, p_field: 'unique_opens' });
      }
    }
  } catch (e) {
    console.error('Open tracking error:', e.message);
  }
};
