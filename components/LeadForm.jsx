'use client';

import { useEffect, useRef, useState } from 'react';
import { validateLead } from '@/lib/validation';
import { HONEYPOT_FIELD } from '@/lib/spam';

const INITIAL = {
  fullName: '',
  email: '',
  phone: '',
  interest: '',
  propertyType: '',
  budget: '',
  preferredContact: 'either',
  message: '',
  consent: false,
  [HONEYPOT_FIELD]: '',
};

function Field({ id, label, required, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function LeadForm({ endpoint = '/api/leads' }) {
  const [values, setValues] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [serverMessage, setServerMessage] = useState('');
  const startedAt = useRef(0);
  const statusRef = useRef(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (status === 'success' || status === 'error') statusRef.current?.focus();
  }, [status]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    const next = { ...values, [name]: type === 'checkbox' ? checked : value };
    setValues(next);
    if (touched[name]) setErrors(validateLead(next).errors);
  }

  function handleBlur(e) {
    const { name } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors(validateLead(values).errors);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (status === 'submitting') return;

    const { valid, errors: clientErrors } = validateLead(values);
    setErrors(clientErrors);
    setTouched(Object.fromEntries(Object.keys(INITIAL).map((k) => [k, true])));
    if (!valid) {
      const first = Object.keys(clientErrors)[0];
      document.getElementById(first)?.focus();
      return;
    }

    setStatus('submitting');
    setServerMessage('');

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          formStartedAt: startedAt.current,
          sourcePage: window.location.href,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setStatus('success');
        setServerMessage(data.message || 'Thank you! We will be in touch soon.');
        setValues(INITIAL);
        setTouched({});
        setErrors({});
        startedAt.current = Date.now();
        return;
      }

      if (data.errors) setErrors(data.errors);
      setStatus('error');
      setServerMessage(data.message || 'Something went wrong. Please try again.');
    } catch {
      setStatus('error');
      setServerMessage('Network error. Please check your connection and try again.');
    }
  }

  const err = (name) => (touched[name] ? errors[name] : undefined);
  const inputProps = (name) => ({
    id: name,
    name,
    value: values[name],
    onChange: handleChange,
    onBlur: handleBlur,
    disabled: status === 'submitting',
    'aria-invalid': err(name) ? 'true' : 'false',
    'aria-describedby': err(name) ? `${name}-error` : undefined,
    className: `field-input ${err(name) ? 'field-input-error' : ''}`,
  });

  if (status === 'success') {
    return (
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center shadow-sm outline-none"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
          ✓
        </div>
        <h2 className="text-xl font-semibold text-green-900">Request received</h2>
        <p className="mt-2 text-green-800">{serverMessage}</p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-6 rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      aria-describedby={status === 'error' ? 'form-status' : undefined}
    >
      <h2 className="text-xl font-semibold text-slate-900">Contact an agent</h2>

      {status === 'error' && (
        <div
          id="form-status"
          ref={statusRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none"
        >
          {serverMessage}
        </div>
      )}

      {/* Honeypot — hidden from people and assistive tech, bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor={HONEYPOT_FIELD}>Website</label>
        <input
          id={HONEYPOT_FIELD}
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values[HONEYPOT_FIELD]}
          onChange={handleChange}
        />
      </div>

      <Field id="fullName" label="Full name" required error={err('fullName')}>
        <input type="text" autoComplete="name" placeholder="Jane Smith" maxLength={100} {...inputProps('fullName')} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="email" label="Email" required error={err('email')}>
          <input type="email" autoComplete="email" placeholder="jane@example.com" maxLength={254} {...inputProps('email')} />
        </Field>
        <Field id="phone" label="Phone" required error={err('phone')}>
          <input type="tel" autoComplete="tel" placeholder="(555) 123-4567" maxLength={30} {...inputProps('phone')} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="interest" label="I'm looking to" required error={err('interest')}>
          <select {...inputProps('interest')}>
            <option value="">Select one…</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="rent">Rent</option>
            <option value="invest">Invest</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field id="propertyType" label="Property type" error={err('propertyType')}>
          <select {...inputProps('propertyType')}>
            <option value="">Any</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="condo">Condo</option>
            <option value="townhouse">Townhouse</option>
            <option value="land">Land</option>
            <option value="commercial">Commercial</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="budget" label="Budget" error={err('budget')}>
          <select {...inputProps('budget')}>
            <option value="">Prefer not to say</option>
            <option value="under-250k">Under $250k</option>
            <option value="250k-500k">$250k – $500k</option>
            <option value="500k-1m">$500k – $1M</option>
            <option value="1m-plus">$1M+</option>
          </select>
        </Field>
        <fieldset>
          <legend className="field-label">Preferred contact</legend>
          <div className="flex gap-4 pt-2">
            {['email', 'phone', 'either'].map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm capitalize text-slate-700">
                <input
                  type="radio"
                  name="preferredContact"
                  value={m}
                  checked={values.preferredContact === m}
                  onChange={handleChange}
                  disabled={status === 'submitting'}
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                {m}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <Field id="message" label="Message" error={err('message')}>
        <textarea
          rows={4}
          maxLength={2000}
          placeholder="Tell us about the property or area you're interested in…"
          {...inputProps('message')}
        />
        <p className="mt-1 text-right text-xs text-slate-400">{values.message.length}/2000</p>
      </Field>

      <div>
        <label className="flex items-start gap-3 text-sm text-slate-700">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            checked={values.consent}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={status === 'submitting'}
            aria-invalid={err('consent') ? 'true' : 'false'}
            aria-describedby={err('consent') ? 'consent-error' : undefined}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            I agree to be contacted about my inquiry. <span className="text-red-500" aria-hidden="true">*</span>
          </span>
        </label>
        {err('consent') && (
          <p id="consent-error" className="field-error" role="alert">
            {err('consent')}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === 'submitting' && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
        )}
        {status === 'submitting' ? 'Sending…' : 'Request a callback'}
      </button>
    </form>
  );
}
