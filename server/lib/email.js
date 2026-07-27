import { Resend } from 'resend';
import { log } from './logger.js';

// Best-effort notification only — a lead is already saved in Supabase by the
// time this runs, so an email failure (missing API key, Resend outage) must
// never surface as an error to the visitor who submitted the form.
let _resend;
function getClient() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export async function sendInquiryEmail({ deal, inquiry }) {
  const to = deal.agency_email;
  if (!to) {
    log.debug('Skipping inquiry email — deal has no agency_email', { dealId: deal.id });
    return;
  }

  const client = getClient();
  if (!client) {
    log.warn('Skipping inquiry email — RESEND_API_KEY not set');
    return;
  }

  const rows = [
    ['Name', inquiry.name],
    ['Trip', deal.title],
    ['Budget', deal.price != null ? `${deal.price} ${deal.currency}` : null],
    ['Contact email', inquiry.email],
    ['Phone', inquiry.phone],
    ['Message', inquiry.message],
  ].filter(([, v]) => v);

  const text = [
    'New customer request from Balkan Explorer',
    '',
    ...rows.map(([label, v]) => `${label}: ${v}`),
  ].join('\n');

  const html = `
    <p><strong>New customer request from Balkan Explorer</strong></p>
    <table cellpadding="4" cellspacing="0">
      ${rows.map(([label, v]) => `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(v)}</td></tr>`).join('')}
    </table>
  `;

  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM ?? 'Balkan Explorer <onboarding@resend.dev>',
      to,
      subject: `New lead: ${deal.title}`,
      text,
      html,
    });
    log.info('Inquiry email sent', { dealId: deal.id, to });
  } catch (err) {
    log.warn('Inquiry email failed', { dealId: deal.id, error: err.message });
  }
}
