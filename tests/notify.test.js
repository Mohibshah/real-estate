import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notifyNewLead, buildAgentEmail, escapeHtml } from '@/lib/notify';

const lead = {
  fullName: 'Jane <b>Smith</b>',
  email: 'jane@example.com',
  phone: '5551234567',
  interest: 'buy',
  propertyType: '',
  budget: '',
  preferredContact: 'email',
  message: 'Hi',
  consent: true,
};

describe('notify', () => {
  beforeEach(() => {
    vi.stubEnv('NOTIFY_PROVIDER', 'resend');
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('NOTIFY_TO', 'agent@example.com');
    vi.stubEnv('NOTIFY_FROM', 'Leads <leads@example.com>');
    vi.stubEnv('NOTIFY_SEND_AUTOREPLY', 'true');
    vi.stubEnv('LEAD_WEBHOOK_URL', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('escapes HTML in emails', () => {
    expect(escapeHtml('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;');
    expect(buildAgentEmail(lead, 1).html).not.toContain('<b>Smith</b>');
  });

  it('sends agent email and auto-reply through Resend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);

    const result = await notifyNewLead(lead, 42);

    expect(result).toEqual({ status: 'sent' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test');
    const payload = JSON.parse(init.body);
    expect(payload.to).toEqual(['agent@example.com']);
    expect(payload.reply_to).toBe('jane@example.com');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).to).toEqual(['jane@example.com']);
  });

  it('reports failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'bad key' }));
    const result = await notifyNewLead(lead, 1);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('401');
  });

  it('posts to the webhook when configured', async () => {
    vi.stubEnv('NOTIFY_PROVIDER', 'none');
    vi.stubEnv('LEAD_WEBHOOK_URL', 'https://hooks.example.com/lead');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    const result = await notifyNewLead(lead, 7);
    expect(result.status).toBe('sent');
    expect(fetchMock).toHaveBeenCalledWith('https://hooks.example.com/lead', expect.any(Object));
  });

  it('returns skipped when no provider is configured', async () => {
    vi.stubEnv('NOTIFY_PROVIDER', 'none');
    vi.stubEnv('NOTIFY_SEND_AUTOREPLY', 'false');
    expect(await notifyNewLead(lead, 1)).toEqual({ status: 'skipped' });
  });
});
