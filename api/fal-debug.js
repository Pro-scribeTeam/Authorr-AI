const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const results = {};

  // Step 1: env vars present?
  results.env = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    FAL_API_KEY: !!process.env.FAL_API_KEY,
  };

  // Step 2: can we create Supabase client?
  let supabase;
  try {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    results.supabase_init = 'ok';
  } catch (e) {
    results.supabase_init = e.message;
    return res.json(results);
  }

  // Step 3: validate the token
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  results.token_present = !!token;
  if (token) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      results.auth_user = user ? user.id : null;
      results.auth_error = error?.message || null;
    } catch (e) {
      results.auth_error = e.message;
    }
  }

  // Step 4: check subscription
  if (results.auth_user) {
    try {
      const { data, error } = await supabase.from('subscriptions')
        .select('plan, role, status').eq('user_id', results.auth_user).single();
      results.subscription = data;
      results.subscription_error = error?.message || null;
    } catch (e) {
      results.subscription_error = e.message;
    }
  }

  return res.json(results);
};
