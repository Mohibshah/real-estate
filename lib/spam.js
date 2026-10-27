// Lightweight, dependency-free spam checks. Each returns a reason string when
// the submission looks automated, or null when it passes.

export const HONEYPOT_FIELD = 'website';

const MAX_LINKS = 2;
const SPAM_PHRASES = [
  'viagra', 'casino', 'crypto investment', 'seo services', 'backlinks',
  'bitcoin', 'loan offer', 'click here', 'work from home',
];

export function checkSpam(body, { minFillTimeMs = 3000, now = Date.now() } = {}) {
  // 1. Honeypot: hidden field real users never see or fill.
  if (body[HONEYPOT_FIELD]) return 'honeypot';

  // 2. Time trap: bots usually submit instantly after loading the page.
  const startedAt = Number(body.formStartedAt);
  if (!Number.isFinite(startedAt) || startedAt <= 0) return 'missing-timestamp';
  const elapsed = now - startedAt;
  if (elapsed < minFillTimeMs) return 'too-fast';
  if (elapsed > 24 * 60 * 60 * 1000) return 'stale-form';

  // 3. Content heuristics on the free-text message.
  const message = typeof body.message === 'string' ? body.message.toLowerCase() : '';
  const links = message.match(/https?:\/\/|www\./g) || [];
  if (links.length > MAX_LINKS) return 'too-many-links';
  if (SPAM_PHRASES.some((p) => message.includes(p))) return 'spam-phrase';

  return null;
}
