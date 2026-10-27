import { NextResponse } from 'next/server';
import { validateLead } from '@/lib/validation';
import { checkSpam } from '@/lib/spam';
import { rateLimit } from '@/lib/rateLimit';
import { insertLead, updateNotificationStatus } from '@/lib/db';
import { notifyNewLead } from '@/lib/notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 10 * 1024;

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function json(body, status, headers) {
  return NextResponse.json(body, { status, headers });
}

export async function POST(request) {
  // Content type & size guards
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return json({ success: false, message: 'Unsupported content type.' }, 415);
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ success: false, message: 'Request is too large.' }, 413);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ success: false, message: 'Invalid request body.' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ success: false, message: 'Invalid request body.' }, 400);
  }

  // Rate limiting
  const ip = getClientIp(request);
  const limit = rateLimit(ip, {
    max: Number(process.env.RATE_LIMIT_MAX || 5),
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  });
  if (!limit.allowed) {
    return json(
      { success: false, message: 'Too many submissions. Please try again later.' },
      429,
      { 'Retry-After': String(limit.retryAfterSec) }
    );
  }

  // Spam protection — respond with a fake success so bots don't learn to adapt.
  const spamReason = checkSpam(body, { minFillTimeMs: Number(process.env.MIN_FILL_TIME_MS ?? 3000) });
  if (spamReason) {
    console.warn(`[leads] blocked submission from ${ip}: ${spamReason}`);
    return json({ success: true, message: 'Thank you! We will be in touch soon.' }, 200);
  }

  // Server-side validation
  const { valid, data, errors } = validateLead(body);
  if (!valid) {
    return json({ success: false, message: 'Please correct the highlighted fields.', errors }, 422);
  }

  // Persist
  let leadId;
  try {
    leadId = await insertLead(data, {
      ip,
      userAgent: request.headers.get('user-agent') || '',
      sourcePage: typeof body.sourcePage === 'string' ? body.sourcePage : '',
    });
  } catch (err) {
    console.error('[leads] database error:', err);
    return json(
      { success: false, message: 'We could not save your request. Please try again or call us directly.' },
      500
    );
  }

  // Notify — the lead is already saved, so failures are logged, not surfaced.
  const notification = await notifyNewLead(data, leadId);
  try {
    await updateNotificationStatus(leadId, notification.status, notification.error);
  } catch (err) {
    console.error('[leads] failed to record notification status:', err);
  }
  if (notification.status === 'failed') {
    console.error(`[leads] notification failed for lead ${leadId}: ${notification.error}`);
  }

  return json(
    { success: true, message: 'Thank you! An agent will contact you shortly.', id: leadId },
    201
  );
}

export function GET() {
  return json({ success: false, message: 'Method not allowed.' }, 405, { Allow: 'POST' });
}
