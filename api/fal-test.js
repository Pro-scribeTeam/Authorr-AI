// TEMPORARY diagnostic — no auth, tests fal queue submit directly
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const falKey = process.env.FAL_API_KEY;
    if (!falKey) return res.json({ step: 'env', error: 'FAL_API_KEY missing' });

    const resp = await fetch('https://queue.fal.run/fal-ai/chatterbox/text-to-speech', {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Hello world test.' })
    });
    const data = await resp.json();
    return res.json({ step: 'fal_submit', status: resp.status, data });
  } catch (err) {
    return res.json({ step: 'catch', error: err.message });
  }
};
