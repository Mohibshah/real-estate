import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeadForm from '@/components/LeadForm';

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { name: 'fullName', value: 'Jane Smith' } });
  fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { name: 'email', value: 'jane@example.com' } });
  fireEvent.change(screen.getByRole('textbox', { name: /phone/i }), { target: { name: 'phone', value: '555-123-4567' } });
  fireEvent.change(screen.getByLabelText(/looking to/i), { target: { name: 'interest', value: 'buy' } });
  fireEvent.click(screen.getByLabelText(/agree to be contacted/i));
}

describe('<LeadForm />', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it('shows validation errors and does not submit when empty', async () => {
    render(<LeadForm />);
    fireEvent.click(screen.getByRole('button', { name: /request a callback/i }));
    expect(await screen.findByText('Please enter your full name.')).toBeTruthy();
    expect(screen.getByText('Email is required.')).toBeTruthy();
    expect(screen.getByText('Please agree to be contacted.')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits and shows the success message', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'Thank you! An agent will contact you shortly.' }),
    });
    render(<LeadForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /request a callback/i }));

    expect(await screen.findByText('Request received')).toBeTruthy();
    expect(screen.getByText('Thank you! An agent will contact you shortly.')).toBeTruthy();

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ fullName: 'Jane Smith', interest: 'buy', consent: true, website: '' });
    expect(body.formStartedAt).toBeGreaterThan(0);
  });

  it('shows server error message and field errors', async () => {
    fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: 'Please correct the highlighted fields.',
        errors: { email: 'Please enter a valid email address.' },
      }),
    });
    render(<LeadForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /request a callback/i }));

    expect(await screen.findByText('Please correct the highlighted fields.')).toBeTruthy();
    expect(screen.getByText('Please enter a valid email address.')).toBeTruthy();
  });

  it('shows a network error message', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    render(<LeadForm />);
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: /request a callback/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/network error/i));
  });
});
