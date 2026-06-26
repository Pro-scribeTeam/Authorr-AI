// /api/email-subscribers — Admin CRUD for subscriber management
// GET  ?page=1&limit=50&search=&status=&tag=
// POST { email, first_name, last_name, tags, source }
// PUT  { id, ...fields }
// DELETE ?id=xxx
const { requireAuth, sendError } = require('./_auth');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function isAdmin(req) {
  try {
    const { user } = await requireAuth(req);
    const { data } = await supabase
      .from('subscriptions')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    return data?.role === 'admin';
  } catch { return false; }
}

module.exports = async function handler(req, res) {
  if (!await isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  // GET — list subscribers
  if (req.method === 'GET') {
    const { page = 1, limit = 50, search = '', status = '', tag = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('email_subscribers')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) query = query.eq('status', status);
    if (tag) query = query.contains('tags', [tag]);
    if (search) query = query.ilike('email', `%${search}%`);

    const { data, error, count } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ subscribers: data, total: count, page: parseInt(page), limit: parseInt(limit) });
  }

  // POST — add subscriber
  if (req.method === 'POST') {
    const { email, first_name, last_name, tags = [], source = 'manual' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const { data, error } = await supabase
      .from('email_subscribers')
      .upsert({
        email: email.toLowerCase().trim(),
        first_name, last_name, tags, source,
        status: 'subscribed',
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ subscriber: data });
  }

  // PUT — update subscriber
  if (req.method === 'PUT') {
    const { id, ...fields } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });

    const { data, error } = await supabase
      .from('email_subscribers')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ subscriber: data });
  }

  // DELETE — remove subscriber
  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });

    const { error } = await supabase.from('email_subscribers').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ success: true });
  }

  // POST /sync — import all Authorr users
  if (req.method === 'POST' && req.url?.includes('sync')) {
    const { data, error } = await supabase.rpc('sync_authorr_users_to_subscribers');
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ synced: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
