import React, { useMemo, useState } from 'react';
import { apiGet, apiPost } from './api.js';

const money = (n) => `$${Number.isInteger(n) ? n : Number(n).toFixed(2)}`;
const fmtDate = (d) => { const x = new Date(d); return isNaN(x) ? '' : x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

/**
 * Admin-only: apply a gift certificate to a clinic signup. Enter the certificate number, pick the
 * signup, and apply. It lowers the balance and marks that signup paid. Certificates themselves are
 * typed into the GiftCertificates tab of the Sheet.
 */
export default function GiftAdmin({ token, signups = [], clinics = [], onApplied }) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState('');
  const [cert, setCert] = useState(null);
  const [signupId, setSignupId] = useState('');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const clinicById = useMemo(() => Object.fromEntries(clinics.map((c) => [c.clinicId, c])), [clinics]);
  const unpaid = useMemo(() => signups
    .filter((s) => s.PaymentStatus !== 'paid' && s.BookingStatus !== 'cancelled' && s.Status !== 'cancelled')
    .sort((a, b) => new Date(a.SessionDate) - new Date(b.SessionDate)), [signups]);

  async function lookup() {
    setMsg(null); setCert(null);
    const res = await apiGet('giftLookup', { token, number });
    if (res.error) setMsg({ ok: false, text: res.error }); else setCert(res);
  }
  function pick(id) {
    setSignupId(id);
    const s = unpaid.find((x) => x.SignupID === id);
    const price = s && clinicById[s.ClinicID] ? Number(clinicById[s.ClinicID].sessionPrice) : 0;
    if (price > 0 && cert) setAmount(String(Math.min(price, cert.balance)));
  }
  async function apply() {
    setBusy(true); setMsg(null);
    const res = await apiPost('giftApply', { token, number: cert.number, signupId, amount: Number(amount) });
    setBusy(false);
    if (res.error) { setMsg({ ok: false, text: res.error }); return; }
    setMsg({ ok: true, text: `Applied ${money(res.applied)} from certificate #${res.number} to ${res.clientName} and marked it paid. ${res.balance > 0 ? `${money(res.balance)} left for their next session or stringing.` : 'Nothing left — certificate used up.'}` });
    setCert({ ...cert, balance: res.balance });
    setSignupId(''); setAmount('');
    if (onApplied) onApplied();
  }

  if (!open) {
    return (
      <div style={{ padding: '16px 20px 0' }}>
        <button className="submit-btn" onClick={() => setOpen(true)}>Apply Gift Certificate</button>
      </div>
    );
  }

  return (
    <div className="booking-form" style={{ paddingTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Apply a gift certificate</strong>
        <button className="option-pill" onClick={() => setOpen(false)}>Close</button>
      </div>

      <div className="field">
        <label>Certificate number</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="number" inputMode="numeric" value={number} onChange={(e) => { setNumber(e.target.value); setCert(null); }} placeholder="e.g. 7" style={{ flex: 1 }} />
          <button className="option-pill" onClick={lookup} disabled={!number}>Look up</button>
        </div>
      </div>

      {cert && (
        <div className="confirmation" style={{ margin: 0 }}>
          <p style={{ margin: 0 }}><strong>#{cert.number} — from {cert.buyerName || 'unknown'}</strong>{cert.recipientName ? ` (for ${cert.recipientName})` : ''}</p>
          <p style={{ margin: '4px 0 0' }}>Value {money(cert.value)} · <strong>balance {money(cert.balance)}</strong></p>
          {cert.balance > 0 && (
            <>
              <div className="field" style={{ marginTop: 10 }}>
                <label>Apply to which clinic signup? (unpaid only)</label>
                <select value={signupId} onChange={(e) => pick(e.target.value)}>
                  <option value="">Choose a signup…</option>
                  {unpaid.map((s) => (
                    <option key={s.SignupID} value={s.SignupID}>
                      {s.ClientName}{s.ChildName ? ` (${s.ChildName})` : ''} — {(clinicById[s.ClinicID] || {}).name || 'Clinic'} {fmtDate(s.SessionDate)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Amount to apply (up to {money(cert.balance)})</label>
                <input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <button className="submit-btn" disabled={busy || !signupId || !(Number(amount) > 0)} onClick={apply}>
                {busy ? 'Applying…' : 'Apply & mark paid'}
              </button>
            </>
          )}
        </div>
      )}
      {msg && <div className="empty-state" style={{ color: msg.ok ? 'var(--ink)' : 'var(--error)' }}>{msg.text}</div>}
    </div>
  );
}
