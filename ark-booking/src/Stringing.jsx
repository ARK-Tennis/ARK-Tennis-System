import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from './api.js';

const PAYMENT_METHODS = [
  { id: 'venmo', label: 'Venmo' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'cash', label: 'Cash' },
  { id: 'check', label: 'Check' },
];

export default function Stringing() {
  const [strings, setStrings] = useState([]);
  const [grips, setGrips] = useState([]);
  const [clientName, setClientName] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [contactValue, setContactValue] = useState('');
  const [racketDescription, setRacketDescription] = useState('');
  const [stringId, setStringId] = useState('');
  const [tension, setTension] = useState('');
  const [gripAddOn, setGripAddOn] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    apiGet('strings').then((data) => setStrings(Array.isArray(data) ? data : []));
    apiGet('grips').then((data) => setGrips(Array.isArray(data) ? data : []));
  }, []);

  const canSubmit =
    clientName && contactValue && stringId && tension && requestedDate && paymentMethod;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await apiPost('stringingOrder', {
        clientName, contactMethod, contactValue, racketDescription,
        stringId, tension, gripAddOn, requestedCompletionDate: requestedDate, paymentMethod,
      });
      setResult(res);
    } catch (err) {
      setResult({ error: true });
    }
    setSubmitting(false);
  }

  if (result && !result.error) {
    const link = result.paymentLink;
    return (
      <div className="page">
        <header className="site-header">
          <span className="club">ARK Tennis</span>
          <h1>Stringing Booked</h1>
          <div className="net-cord" />
        </header>
        <div className="confirmation">
          <h3>Your racket is on the list</h3>
          {typeof link === 'string' ? (
            <a className="pay-link" href={link} target="_blank" rel="noreferrer">Pay on Venmo</a>
          ) : link?.type === 'zelle-info' ? (
            <p>Send <strong>${link.amount}</strong> via Zelle to <strong>{link.info}</strong>.</p>
          ) : link?.type === 'check-instructions' ? (
            <p>Bring a check for <strong>${link.amount}</strong> at drop-off or pickup.</p>
          ) : (
            <p>Bring <strong>${link?.amount}</strong> cash at drop-off or pickup.</p>
          )}
          {result.statusLink && (
            <p style={{ fontSize: 13, marginTop: 12 }}>
              Save this link to check on your stringing:<br />
              <code>{window.location.origin}/status/{result.statusLink}</code>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="site-header">
        <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
        <h1>Racket Stringing</h1>
        <p>Tell us the racket, string, and tension — we'll take it from there.</p>
        <div className="net-cord" />
      </header>

      <div className="booking-form">
        <div className="field">
          <label>Your Name</label>
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>

        <div className="field">
          <label>Contact via</label>
          <div className="option-row">
            <div className={`option-pill ${contactMethod === 'email' ? 'active' : ''}`} onClick={() => setContactMethod('email')}>Email</div>
            <div className={`option-pill ${contactMethod === 'phone' ? 'active' : ''}`} onClick={() => setContactMethod('phone')}>Phone</div>
          </div>
        </div>

        <div className="field">
          <label>{contactMethod === 'email' ? 'Email Address' : 'Phone Number'}</label>
          <input value={contactValue} onChange={(e) => setContactValue(e.target.value)} />
        </div>

        <div className="field">
          <label>Racket (brand / model) — optional</label>
          <input value={racketDescription} onChange={(e) => setRacketDescription(e.target.value)} placeholder="e.g. Wilson Blade 98 16x19" />
        </div>

        <div className="field">
          <label>String Choice</label>
          <select value={stringId} onChange={(e) => setStringId(e.target.value)}>
            <option value="">Choose a string</option>
            {strings.map((s) => (
              <option key={s.stringId} value={s.stringId}>{s.name} ({s.type}) — ${s.price}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Tension (lbs)</label>
          <input type="number" min="40" max="70" value={tension} onChange={(e) => setTension(e.target.value)} placeholder="e.g. 52" />
        </div>

        {grips.length > 0 && (
          <div className="field">
            <label>Add a grip? (optional)</label>
            <select value={gripAddOn} onChange={(e) => setGripAddOn(e.target.value)}>
              <option value="">No grip</option>
              {grips.map((g) => (
                <option key={g.gripId} value={g.gripId}>{g.name} — ${g.price}</option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <label>Requested Completion Date</label>
          <input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
        </div>

        <div className="field">
          <label>Payment Method</label>
          <div className="option-row">
            {PAYMENT_METHODS.map((m) => (
              <div key={m.id} className={`option-pill ${paymentMethod === m.id ? 'active' : ''}`} onClick={() => setPaymentMethod(m.id)}>
                {m.label}
              </div>
            ))}
          </div>
        </div>

        <button className="submit-btn" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? 'Booking…' : 'Book Stringing'}
        </button>
      </div>

      <nav className="footer-nav">
        <Link to="/">← Back to Clinics</Link>
      </nav>
    </div>
  );
}
