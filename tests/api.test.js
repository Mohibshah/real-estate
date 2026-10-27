import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  insertLead: vi.fn(),
  updateNotificationStatus: vi.fn(),
}));
vi.mock('@/lib/notify', () => ({
  notifyNewLead: vi.fn(),
}));

const { POST, GET } = await import('@/app/api/leads/route');
const { insertLead, updateNotificationStatus } = await import('@/lib/db');
const { notifyNewLead } = await import('@/lib/notify');
const { resetRateLimit } = await import('@/lib/rateLimit');

const validBody = () => ({
  fullName: 'Jane Smith',
  email: 'jane@example.com',
  phone: '555-123-4567',
  interest: 'buy',
  preferredContact: 'either',
  message: 'Interested in downtown condos',
  consent: true,
  website: '',
  formStartedAt: Date.now() - 10_000,
  sourcePage: 'https://example.com/',
});

function request(body, { ip = '1.2.3.4', contentType = 'application/json' } = {}) {
  return new Request('http://localhost/api/leads', {
    method: 'POST',
    headers: { 'content-type': contentType, 'x-forwarded-for': ip, 'user-agent': 'vitest' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimit();
    insertLead.mockResolvedValue(101);
    notifyNewLead.mockResolvedValue({ status: 'sent' });
  });

  it('saves a valid lead, notifies, and returns 201', async () => {
    const res = await POST(request(validBody()));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json).toMatchObject({ success: true, id: 101 });
    expect(insertLead).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Jane Smith', email: 'jane@example.com', consent: true }),
      expect.objectContaining({ ip: '1.2.3.4', userAgent: 'vitest' })
    );
    expect(notifyNewLead).toHaveBeenCalledWith(expect.any(Object), 101);
    expect(updateNotificationStatus).toHaveBeenCalledWith(101, 'sent', undefined);
  });

  it('returns 422 with field errors for invalid input', async () => {
    const res = await POST(request({ ...validBody(), email: 'bad', consent: false }));
    const json = await res.json();
    expect(res.status).toBe(422);
    expect(json.success).toBe(false);
    expect(json.errors).toHaveProperty('email');
    expect(json.errors).toHaveProperty('consent');
    expect(insertLead).not.toHaveBeenCalled();
  });

  it('silently drops honeypot submissions', async () => {
    const res = await POST(request({ ...validBody(), website: 'spam.com' }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(insertLead).not.toHaveBeenCalled();
  });

  it('silently drops submissions that are too fast', async () => {
    const res = await POST(request({ ...validBody(), formStartedAt: Date.now() }));
    expect(res.status).toBe(200);
    expect(insertLead).not.toHaveBeenCalled();
  });

  it('rate limits repeated submissions from the same IP', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await POST(request(validBody(), { ip: '9.9.9.9' }))).status).toBe(201);
    }
    const res = await POST(request(validBody(), { ip: '9.9.9.9' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
  });

  it('rejects malformed JSON, wrong content type and oversized bodies', async () => {
    expect((await POST(request('{not json'))).status).toBe(400);
    expect((await POST(request('[]'))).status).toBe(400);
    expect((await POST(request('a=b', { contentType: 'application/x-www-form-urlencoded' }))).status).toBe(415);
    expect((await POST(request({ ...validBody(), message: 'x'.repeat(20_000) }))).status).toBe(413);
  });

  it('returns 500 with a friendly message when the database fails', async () => {
    insertLead.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(request(validBody()));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.message).not.toContain('ECONNREFUSED');
    expect(notifyNewLead).not.toHaveBeenCalled();
  });

  it('still succeeds when notification fails (lead is not lost)', async () => {
    notifyNewLead.mockResolvedValueOnce({ status: 'failed', error: 'smtp down' });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await POST(request(validBody()));
    expect(res.status).toBe(201);
    expect(updateNotificationStatus).toHaveBeenCalledWith(101, 'failed', 'smtp down');
  });

  it('GET is not allowed', async () => {
    expect(GET().status).toBe(405);
  });
});
