// POST /api/email-ai
// AI-powered email composition and subject line generation
// Body: { action: 'compose'|'subjects'|'spam_check', ...params }
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

async function callOpenRouter(messages, json = false) {
  const apiKey = process.env.OPENAI_API_KEY;
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://authorr-ai.vercel.app',
      'X-Title': 'Authorr AI Email'
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages,
      temperature: 0.8,
      response_format: json ? { type: 'json_object' } : undefined
    })
  });
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!await isAdmin(req)) return res.status(403).json({ error: 'Admin only' });

  const { action, ...params } = req.body;

  // ── Generate 6 subject line variants ─────────────────────────────
  if (action === 'subjects') {
    const { topic, audience = 'email subscribers', goal = 'engagement' } = params;
    if (!topic) return res.status(400).json({ error: 'topic required' });

    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are an expert email marketer. Generate exactly 6 email subject line variants. Each must be under 50 characters. Use these 6 styles:
1. Curiosity gap (e.g. "What nobody tells you about...")
2. Urgency/scarcity (e.g. "Last chance:")
3. Personalization (use {{first_name}})
4. Specific number or stat (e.g. "3 ways to...")
5. Direct question
6. Bold/contrarian claim
Return ONLY valid JSON: {"variants": ["...", "...", "...", "...", "...", "..."]}`
      },
      {
        role: 'user',
        content: `Topic: ${topic}\nTarget audience: ${audience}\nGoal: ${goal}`
      }
    ], true);

    try {
      const parsed = JSON.parse(content);
      return res.json({ variants: parsed.variants || [] });
    } catch {
      return res.json({ variants: [content] });
    }
  }

  // ── Generate full email HTML ──────────────────────────────────────
  if (action === 'compose') {
    const { topic, tone = 'professional', goal = 'drive engagement', key_points = '', audience = 'subscribers', brand = 'Authorr AI' } = params;
    if (!topic) return res.status(400).json({ error: 'topic required' });

    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are an expert email copywriter. Write a marketing email as complete HTML. Rules:
- Use inline CSS only (no external stylesheets) — must render in Gmail/Outlook
- Max width 600px, dark-friendly background #0f0f0f or white
- Include: subject line, preview text, greeting (use {{first_name}}), body paragraphs, clear CTA button, closing
- Keep body under 200 words
- Return ONLY valid JSON: {"subject": "...", "preview_text": "...", "html": "...full html string..."}`
      },
      {
        role: 'user',
        content: `Brand: ${brand}
Topic: ${topic}
Tone: ${tone}
Goal: ${goal}
Audience: ${audience}
Key points to cover: ${key_points || 'none specified'}`
      }
    ], true);

    try {
      const parsed = JSON.parse(content);
      return res.json({
        subject: parsed.subject || '',
        preview_text: parsed.preview_text || '',
        html: parsed.html || content
      });
    } catch {
      return res.json({ html: content, subject: '', preview_text: '' });
    }
  }

  // ── Spam score check ─────────────────────────────────────────────
  if (action === 'spam_check') {
    const { subject, html_body } = params;
    if (!subject && !html_body) return res.status(400).json({ error: 'subject or html_body required' });

    const content = await callOpenRouter([
      {
        role: 'system',
        content: `You are an email deliverability expert. Analyze this email for spam triggers and deliverability issues. Return valid JSON:
{"score": 1-10, "grade": "A/B/C/D/F", "issues": ["...", "..."], "suggestions": ["...", "..."], "summary": "one sentence"}`
      },
      {
        role: 'user',
        content: `Subject: ${subject || 'N/A'}\n\nBody (first 1500 chars):\n${(html_body || '').replace(/<[^>]+>/g, ' ').slice(0, 1500)}`
      }
    ], true);

    try {
      return res.json(JSON.parse(content));
    } catch {
      return res.json({ score: 5, grade: 'C', issues: [], suggestions: [], summary: content });
    }
  }

  // ── Improve existing subject line ────────────────────────────────
  if (action === 'improve_subject') {
    const { subject } = params;
    if (!subject) return res.status(400).json({ error: 'subject required' });

    const content = await callOpenRouter([
      {
        role: 'system',
        content: 'You are an email marketing expert. Rewrite the subject line to be more compelling, under 50 chars. Return JSON: {"improved": "..."}'
      },
      { role: 'user', content: `Original subject: "${subject}"` }
    ], true);

    try {
      return res.json(JSON.parse(content));
    } catch {
      return res.json({ improved: subject });
    }
  }

  return res.status(400).json({ error: `Unknown action: ${action}. Valid: compose, subjects, spam_check, improve_subject` });
};
