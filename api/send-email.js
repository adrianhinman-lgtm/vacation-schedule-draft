export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { to, toName, subject, body, html } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'Missing required fields' });

  try {
    const payload = {
      from: `Vacation Schedule Draft <draft@vacationscheduledraft.com>`,
      to: [toName ? `${toName} <${to}>` : to],
      subject,
    };

    // Send HTML if provided, plain text as fallback
    if (html) {
      payload.html = html;
      payload.text = body || 'Please view this email in an HTML-capable email client.';
    } else {
      payload.text = body || '';
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer re_XJa9T9MB_2RpWu7xEvGx3v3sunmQEQHvd`,
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
