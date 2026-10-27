import nodemailer from 'nodemailer';

const LABELS = {
  buy: 'Buying', sell: 'Selling', rent: 'Renting', invest: 'Investing', other: 'Other',
};

export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildAgentEmail(lead, id) {
  const rows = [
    ['Lead #', id],
    ['Name', lead.fullName],
    ['Email', lead.email],
    ['Phone', lead.phone],
    ['Interested in', LABELS[lead.interest] || lead.interest],
    ['Property type', lead.propertyType || '—'],
    ['Budget', lead.budget || '—'],
    ['Preferred contact', lead.preferredContact],
    ['Message', lead.message || '—'],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px">
      <h2 style="color:#1e40af">New website lead</h2>
      <table cellpadding="8" style="border-collapse:collapse;width:100%">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="border-bottom:1px solid #eee;font-weight:bold;width:160px">${escapeHtml(k)}</td>` +
              `<td style="border-bottom:1px solid #eee;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`
          )
          .join('')}
      </table>
    </div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  return {
    subject: `New lead: ${lead.fullName} (${LABELS[lead.interest] || lead.interest})`,
    html,
    text,
    replyTo: lead.email,
  };
}

export function buildAutoReply(lead) {
  const first = lead.fullName.split(' ')[0];
  return {
    subject: 'Thanks for reaching out — we received your request',
    html: `<div style="font-family:Arial,sans-serif;max-width:600px">
      <p>Hi ${escapeHtml(first)},</p>
      <p>Thank you for contacting us. One of our agents will get back to you shortly by ${escapeHtml(
        lead.preferredContact === 'either' ? 'email or phone' : lead.preferredContact
      )}.</p>
      <p>Best regards,<br/>The Team</p></div>`,
    text: `Hi ${first},\n\nThank you for contacting us. One of our agents will get back to you shortly.\n\nBest regards,\nThe Team`,
  };
}

async function sendViaResend({ to, subject, html, text, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.NOTIFY_FROM,
      to: [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API ${res.status}: ${body.slice(0, 200)}`);
  }
}

let transporter;
async function sendViaSmtp({ to, subject, html, text, replyTo }) {
  transporter ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  await transporter.sendMail({ from: process.env.NOTIFY_FROM, to, subject, html, text, replyTo });
}

async function sendEmail(message) {
  const provider = (process.env.NOTIFY_PROVIDER || 'none').toLowerCase();
  if (provider === 'resend') return sendViaResend(message);
  if (provider === 'smtp') return sendViaSmtp(message);
  return 'skipped';
}

async function postWebhook(lead, id) {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...lead, createdAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}`);
}

/**
 * Notify the agent (and optionally the lead) about a new submission.
 * Returns { status: 'sent' | 'skipped' | 'failed', error? }.
 * Never throws — a notification failure must not lose the lead.
 */
export async function notifyNewLead(lead, id) {
  const errors = [];
  let sent = false;

  try {
    const result = await sendEmail({ to: process.env.NOTIFY_TO, ...buildAgentEmail(lead, id) });
    if (result !== 'skipped') sent = true;
  } catch (err) {
    errors.push(`agent email: ${err.message}`);
  }

  if (process.env.NOTIFY_SEND_AUTOREPLY === 'true') {
    try {
      await sendEmail({ to: lead.email, ...buildAutoReply(lead) });
    } catch (err) {
      errors.push(`auto-reply: ${err.message}`);
    }
  }

  try {
    if (process.env.LEAD_WEBHOOK_URL) {
      await postWebhook(lead, id);
      sent = true;
    }
  } catch (err) {
    errors.push(`webhook: ${err.message}`);
  }

  if (errors.length) return { status: 'failed', error: errors.join('; ') };
  return { status: sent ? 'sent' : 'skipped' };
}
