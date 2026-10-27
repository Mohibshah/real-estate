// Shared validation rules. Used by the form (client) for instant feedback
// and by the API (server) as the source of truth — never trust the client.

export const INTERESTS = ['buy', 'sell', 'rent', 'invest', 'other'];
export const PROPERTY_TYPES = ['house', 'apartment', 'condo', 'townhouse', 'land', 'commercial'];
export const BUDGETS = ['under-250k', '250k-500k', '500k-1m', '1m-plus'];
export const CONTACT_METHODS = ['email', 'phone', 'either'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9\s().-]{7,20}$/;
const NAME_RE = /^[\p{L}\p{M}' .-]+$/u;

function clean(value, max) {
  if (typeof value !== 'string') return '';
  // Collapse whitespace, strip control characters and enforce a hard length cap.
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

/**
 * Validate and normalise raw form input.
 * @returns {{ valid: boolean, data: object, errors: Record<string, string> }}
 */
export function validateLead(input = {}) {
  const errors = {};

  const data = {
    fullName: clean(input.fullName, 100).replace(/\s+/g, ' '),
    email: clean(input.email, 254).toLowerCase(),
    phone: clean(input.phone, 30),
    interest: clean(input.interest, 20),
    propertyType: clean(input.propertyType, 30),
    budget: clean(input.budget, 30),
    preferredContact: clean(input.preferredContact, 10) || 'either',
    message: clean(input.message, 2000),
    consent: input.consent === true || input.consent === 'true' || input.consent === 'on',
  };

  if (data.fullName.length < 2) errors.fullName = 'Please enter your full name.';
  else if (!NAME_RE.test(data.fullName)) errors.fullName = 'Name contains invalid characters.';

  if (!data.email) errors.email = 'Email is required.';
  else if (!EMAIL_RE.test(data.email)) errors.email = 'Please enter a valid email address.';

  const digits = data.phone.replace(/\D/g, '');
  if (!data.phone) errors.phone = 'Phone number is required.';
  else if (!PHONE_RE.test(data.phone) || digits.length < 7 || digits.length > 15)
    errors.phone = 'Please enter a valid phone number.';

  if (!INTERESTS.includes(data.interest)) errors.interest = 'Please choose what you are looking for.';

  if (data.propertyType && !PROPERTY_TYPES.includes(data.propertyType))
    errors.propertyType = 'Invalid property type.';

  if (data.budget && !BUDGETS.includes(data.budget)) errors.budget = 'Invalid budget range.';

  if (!CONTACT_METHODS.includes(data.preferredContact))
    errors.preferredContact = 'Invalid contact preference.';

  if (typeof input.message === 'string' && input.message.trim().length > 2000)
    errors.message = 'Message must be 2000 characters or fewer.';

  if (!data.consent) errors.consent = 'Please agree to be contacted.';

  return { valid: Object.keys(errors).length === 0, data, errors };
}
