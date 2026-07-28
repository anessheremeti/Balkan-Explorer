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
    ['Phone', inquiry.phone],
    ['Message', inquiry.message],
  ].filter(([, v]) => v);

  const text = [
    'New customer request from Balkan Explorer',
    '',
    ['Name', inquiry.name],
    ['Trip', deal.title],
    ['Budget', deal.price != null ? `${deal.price} ${deal.currency}` : null],
    ['Contact email', inquiry.email],
    ['Phone', inquiry.phone],
    ['Message', inquiry.message],
  ].filter(v => Array.isArray(v) ? v[1] : true)
   .map(([label, v]) => `${label}: ${v}`)
   .join('\n');

  // Inline styles only — most email clients (Gmail, Outlook) strip <style>
  // blocks, so anything that must render has to be inlined per-element.
  const BRAND = '#2653d9';
  const row = ([label, v]) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eef1f6;font-size:13px;color:#8a94a6;width:110px;vertical-align:top;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #eef1f6;font-size:14px;color:#1a2233;font-weight:600;">${escapeHtml(v)}</td>
    </tr>`;

  const html = `
<div style="background:#f4f6fb;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(20,30,60,0.08);">
    <div style="background:${BRAND};padding:24px 28px;">
      <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:rgba(255,255,255,0.75);">New lead</p>
      <p style="margin:4px 0 0;font-size:19px;font-weight:700;color:#ffffff;">${escapeHtml(deal.title)}</p>
    </div>
    <div style="padding:24px 28px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows.map(row).join('')}
      </table>
    </div>
    <div style="padding:8px 28px 28px;">
      <a href="mailto:${encodeURIComponent(inquiry.email)}"
         style="display:inline-block;margin-top:8px;padding:12px 20px;background:${BRAND};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:10px;">
        Reply to ${escapeHtml(inquiry.name)} →
      </a>
      <p style="margin:16px 0 0;font-size:12px;color:#a3abbd;">${escapeHtml(inquiry.email)}</p>
    </div>
  </div>
  <p style="max-width:480px;margin:16px auto 0;text-align:center;font-size:12px;color:#a3abbd;">
    Sent automatically by Balkan Explorer when a visitor inquired about this deal.
  </p>
</div>`;

  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM ?? 'Balkan Explorer <onboarding@resend.dev>',
      to,
      subject: `New Customer: ${deal.title}`,
      text,
      html,
    });
    log.info('Inquiry email sent', { dealId: deal.id, to });
  } catch (err) {
    log.warn('Inquiry email failed', { dealId: deal.id, error: err.message });
  }
}
