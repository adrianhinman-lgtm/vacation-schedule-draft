// Resend API key lives here only — never in client-side code
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_C6Qx2gCi_6TBVq4TpjtqXfEhJVLLkpxWW';

// Allowed origins — only requests from your domain are accepted
const ALLOWED_ORIGINS = [
  'https://vacationscheduledraft.com',
  'https://www.vacationscheduledraft.com',
  'https://vacation-schedule-draft.vercel.app',
];

export default async function handler(req, res) {
  const origin = req.headers.origin || '';

  // Only allow requests from your own domain
  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.warn('Blocked request from unauthorized origin:', origin);
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, toName, subject, body, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing required fields' });

  // Basic email validation
  if (!to.includes('@') || !to.includes('.')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const payload = {
      from: `Vacation Schedule Draft <draft@vacationscheduledraft.com>`,
      to: [toName ? `${toName} <${to}>` : to],
      subject,
    };

    if (html) {
      payload.html = html;
      payload.text = body || 'Please view this email in an HTML-capable email client.';
    } else {
      payload.text = body || '';
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Resend error:', data);
      return res.status(response.status).json({ error: data });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (err) {
    console.error('Send email error:', err);
    return res.status(500).json({ error: err.message });
  }
}
