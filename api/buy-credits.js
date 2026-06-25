const { requireAuth, sendError } = require('./_auth');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Credit packs: key -> { credits, price_cents, label }
const CREDIT_PACKS = {
  small:  { credits: 50000,   price_cents: 500,  label: '50,000 Credits',     desc: '~1 short book' },
  medium: { credits: 200000,  price_cents: 1500, label: '200,000 Credits',    desc: '~4 books' },
  large:  { credits: 500000,  price_cents: 3000, label: '500,000 Credits',    desc: '~10 books' },
  mega:   { credits: 1500000, price_cents: 7500, label: '1,500,000 Credits',  desc: '~30 books' },
};

module.exports = async function handler(req, res) {
  // ── Stripe webhook (no auth header, has stripe-signature) ──
  if (req.method === 'POST' && req.headers['stripe-signature']) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) return res.status(500).json({ error: 'Webhook secret not configured' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    let event;
    try {
      const rawBody = req.body; // raw buffer — Vercel passes raw body as Buffer when content-type is application/json
      const payload = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(JSON.stringify(rawBody));
      event = stripe.webhooks.constructEvent(payload, req.headers['stripe-signature'], webhookSecret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId  = session.metadata?.user_id;
      const pack    = session.metadata?.pack;
      const packDef = CREDIT_PACKS[pack];

      if (!userId || !packDef) {
        console.error('Missing user_id or pack in session metadata:', session.metadata);
        return res.json({ received: true });
      }

      const { error } = await supabase.rpc('add_credits', { user_id: userId, amount: packDef.credits });
      if (error) console.error('Failed to add credits:', error.message);
      else console.log(`Added ${packDef.credits} credits to user ${userId} (pack: ${pack})`);
    }

    return res.json({ received: true });
  }

  // ── Create Stripe checkout session ──
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let user;
  try { ({ user } = await requireAuth(req)); } catch (err) { return sendError(res, err); }

  const { pack } = req.body;
  const packDef = CREDIT_PACKS[pack];
  if (!packDef) return res.status(400).json({ error: `Invalid pack. Choose: ${Object.keys(CREDIT_PACKS).join(', ')}` });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return res.status(500).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to environment.' });

  const stripe = new Stripe(stripeKey);
  const origin = req.headers.origin || 'https://authorr-ai.vercel.app';

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: packDef.price_cents,
          product_data: {
            name: `Authorr AI — ${packDef.label}`,
            description: `${packDef.desc} of AI narration credits`,
            images: [],
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { user_id: user.id, pack },
      success_url: `${origin}?credits_purchased=1&pack=${pack}`,
      cancel_url:  `${origin}?credits_cancelled=1`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
