// POST /api/email-subscribe
// Public endpoint — anyone can subscribe (used by signup forms)
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, first_name, last_name, tags = [], source = 'form' } = req.body || {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Check suppression list first
  const { data: suppressed } = await supabase
    .from('email_suppression')
    .select('email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (suppressed) {
    return res.status(400).json({ error: 'This email cannot be subscribed.' });
  }

  const { data, error } = await supabase
    .from('email_subscribers')
    .upsert({
      email: email.toLowerCase().trim(),
      first_name: first_name || null,
      last_name: last_name || null,
      status: 'subscribed',
      tags,
      source,
      ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress,
      consent_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' })
    .select('id, email')
    .single();

  if (error) {
    console.error('Subscribe error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.json({ success: true, subscriber_id: data.id });
};
