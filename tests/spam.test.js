import { describe, it, expect, beforeEach } from 'vitest';
import { checkSpam } from '@/lib/spam';
import { rateLimit, resetRateLimit } from '@/lib/rateLimit';

const now = 1_700_000_000_000;
const base = { formStartedAt: now - 10_000, message: 'Hello' };

describe('checkSpam', () => {
  it('passes a normal submission', () => {
    expect(checkSpam(base, { now })).toBeNull();
  });
  it('flags filled honeypot', () => {
    expect(checkSpam({ ...base, website: 'http://spam' }, { now })).toBe('honeypot');
  });
  it('flags submissions that are too fast', () => {
    expect(checkSpam({ ...base, formStartedAt: now - 500 }, { now })).toBe('too-fast');
  });
  it('flags missing timestamp', () => {
    expect(checkSpam({ message: 'hi' }, { now })).toBe('missing-timestamp');
  });
  it('flags link-stuffed messages', () => {
    expect(checkSpam({ ...base, message: 'http://a http://b www.c' }, { now })).toBe('too-many-links');
  });
  it('flags spam phrases', () => {
    expect(checkSpam({ ...base, message: 'Best CASINO bonus' }, { now })).toBe('spam-phrase');
  });
});

describe('rateLimit', () => {
  beforeEach(() => resetRateLimit());

  it('blocks after max requests in the window and resets after it', () => {
    const opts = { max: 2, windowMs: 1000, now };
    expect(rateLimit('ip', opts).allowed).toBe(true);
    expect(rateLimit('ip', opts).allowed).toBe(true);
    const blocked = rateLimit('ip', opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(1);
    expect(rateLimit('other-ip', opts).allowed).toBe(true);
    expect(rateLimit('ip', { ...opts, now: now + 1000 }).allowed).toBe(true);
  });
});
