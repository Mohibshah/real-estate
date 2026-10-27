import { describe, it, expect } from 'vitest';
import { validateLead } from '@/lib/validation';

const valid = {
  fullName: '  Jane   Smith ',
  email: 'Jane@Example.com',
  phone: '+1 (555) 123-4567',
  interest: 'buy',
  propertyType: 'house',
  budget: '500k-1m',
  preferredContact: 'email',
  message: 'Looking for a 3 bed house.',
  consent: true,
};

describe('validateLead', () => {
  it('accepts and normalises a valid lead', () => {
    const { valid: ok, data, errors } = validateLead(valid);
    expect(ok).toBe(true);
    expect(errors).toEqual({});
    expect(data.fullName).toBe('Jane Smith');
    expect(data.email).toBe('jane@example.com');
  });

  it('requires name, email, phone, interest and consent', () => {
    const { valid: ok, errors } = validateLead({});
    expect(ok).toBe(false);
    expect(Object.keys(errors).sort()).toEqual(['consent', 'email', 'fullName', 'interest', 'phone']);
  });

  it.each([
    ['email', 'not-an-email'],
    ['phone', 'abc'],
    ['phone', '123'],
    ['interest', 'steal'],
    ['propertyType', 'castle'],
    ['budget', 'infinite'],
    ['preferredContact', 'fax'],
    ['fullName', '<script>'],
  ])('rejects invalid %s (%s)', (field, value) => {
    const { errors } = validateLead({ ...valid, [field]: value });
    expect(errors[field]).toBeTruthy();
  });

  it('rejects overly long messages', () => {
    const { errors } = validateLead({ ...valid, message: 'a'.repeat(2001) });
    expect(errors.message).toBeTruthy();
  });

  it('ignores non-string values safely', () => {
    const { errors } = validateLead({ ...valid, email: { $ne: '' } });
    expect(errors.email).toBe('Email is required.');
  });
});
