// api/reminder-check.js
// Runs every hour via Vercel Cron to check for stalled picks
// and send 24-hour reminder emails to the current drafter + admin

const SUPABASE_URL = 'https://fibzznhqgojdoapdnfwp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpYnp6bmhxZ29qZG9hcGRuZndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MjM5MjMsImV4cCI6MjA5MjA5OTkyM30.waPgUU1JIKVG613yGOk1dY_AThpm2IHaJZSVmJtfTZ4';
const RESEND_KEY   = 're_XJa9T9MB_2RpWu7xEvGx3v3sunmQEQHvd';
const FROM_EMAIL   = 'draft@vacationscheduledraft.com';
const FROM_NAME    = 'Vacation Schedule Draft';
const APP_URL      = 'https://vacationscheduledraft.com';

const sbHeaders = {
  'apikey': SUPABASE_KEY,
  'Authorization': 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
};

async function sbGet(table, query = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, { headers: sbHeaders });
  return r.json();
}

async function sbPatch(table, query, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, 'Prefer': 'return=representation' },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function sendEmail(to, toName, subject, body) {
  if (!to || !to.includes('@')) return;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [`${toName} <${to}>`],
      subject,
      text: body,
    }),
  });
  const d = await r.json();
  if (!r.ok) console.error('Resend error:', d);
  else console.log('✅ Reminder sent to', to);
  return d;
}

function participantAtIndex(baseOrder, idx) {
  const n = baseOrder.length;
  const round = Math.floor(idx / n);
  const pos = idx % n;
  return round % 2 === 0 ? baseOrder[pos] : baseOrder[n - 1 - pos];
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function handler(req, res) {
  // Security: only allow Vercel cron calls or manual GET with secret
  const authHeader = req.headers['authorization'];
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    console.log(`🔍 Checking for stalled picks at ${now.toISOString()}`);

    // Find all active (not complete) drafts where turn started > 24 hours ago
    const drafts = await sbGet('drafts',
      `?launched=eq.true&completion_sent=eq.false&turn_started_at=lt.${twentyFourHoursAgo}&select=*`
    );

    if (!drafts.length) {
      console.log('✓ No stalled picks found');
      return res.status(200).json({ checked: 0, reminders: 0 });
    }

    console.log(`Found ${drafts.length} stalled draft(s)`);
    let remindersSent = 0;

    for (const draft of drafts) {
      // Load participants for this draft
      const participants = await sbGet('participants', `?draft_id=eq.${draft.id}&order=sort_order`);
      if (!participants.length) continue;

      const baseOrder = JSON.parse(draft.base_order || '[]');
      const curPIdx = participantAtIndex(baseOrder, draft.current_pick_index);
      const curP = participants[curPIdx];
      if (!curP) continue;

      // Check if we already sent a reminder for this exact pick index
      // We track this by storing last_reminder_pick in the draft
      const lastReminderPick = draft.last_reminder_pick ?? -1;
      if (lastReminderPick === draft.current_pick_index) {
        console.log(`Reminder already sent for pick ${draft.current_pick_index} in draft ${draft.code}`);
        continue;
      }

      console.log(`📧 Sending reminder for draft ${draft.code} — ${curP.name} has been idle 24h`);

      // Build magic link
      const link = `${APP_URL}?draft=${draft.id}&token=${draft.current_token}`;

      // Email to current drafter
      if (curP.email) {
        await sendEmail(
          curP.email,
          curP.name,
          `⏰ ${draft.name} — Reminder: It's your turn to pick!`,
          `Hi ${curP.name.split(' ')[0]},\n\nThis is a friendly reminder that it's your turn to make your vacation selection in the ${draft.name}.\n\nYou've had 24 hours — please make your pick soon so the draft can continue!\n\n👉 Make your pick: ${link}\n\n— ${draft.name}`
        );
        remindersSent++;
      }

      // Email to admin
      if (draft.admin_email && draft.admin_email !== curP.email) {
        await sendEmail(
          draft.admin_email,
          'Admin',
          `⏰ ${draft.name} — ${curP.name} hasn't picked in 24 hours`,
          `Hi Admin,\n\n${curP.name} has not made their vacation pick in over 24 hours. A reminder has been sent to them automatically.\n\nDraft: ${draft.name}\nCurrent pick: ${curP.name}\n\nView draft: ${APP_URL}?draft=${draft.id}\n\n— ${draft.name}`
        );
        remindersSent++;
      }

      // Mark this pick index as reminded so we don't send again
      await sbPatch('drafts', `?id=eq.${draft.id}`, {
        last_reminder_pick: draft.current_pick_index,
      });
    }

    console.log(`✅ Done — sent ${remindersSent} reminder emails`);
    return res.status(200).json({ checked: drafts.length, reminders: remindersSent });

  } catch (err) {
    console.error('Reminder check error:', err);
    return res.status(500).json({ error: err.message });
  }
}
