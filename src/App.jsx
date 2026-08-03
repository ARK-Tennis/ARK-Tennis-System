import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from './api.js';

const PAYMENT_METHODS = [
  { id: 'venmo', label: 'Venmo' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'cash', label: 'Cash' },
  { id: 'check', label: 'Check' },
];

export default function App() {
  const [category, setCategory] = useState('Junior');
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [grips, setGrips] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoadingClinics(true);
    apiGet('clinics', { category }).then((data) => {
      setClinics(Array.isArray(data) ? data : []);
      setLoadingClinics(false);
    });
  }, [category]);

  useEffect(() => {
    apiGet('grips').then((data) => setGrips(Array.isArray(data) ? data : []));
  }, []);

  return (
    <div className="page">
      <header className="site-header">
        <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
        <div className="brand-mark">
          <span className="club">Rohnert Park, CA</span>
        </div>
        <h1>ARK Tennis</h1>
        <p>Book a clinic, choose your plan and get on court.</p>
        <div className="net-cord" />
      </header>

      <div className="category-toggle">
        <button
          className={category === 'Junior' ? 'active' : ''}
          onClick={() => { setCategory('Junior'); setSelected(null); }}
        >
          Junior
        </button>
        <button
          className={category === 'Adult' ? 'active' : ''}
          onClick={() => { setCategory('Adult'); setSelected(null); }}
        >
          Adult
        </button>
      </div>

      <div className="clinic-list">
        {loadingClinics && <div className="loading-state">Loading clinics…</div>}
        {!loadingClinics && clinics.length === 0 && (
          <div className="empty-state">No {category.toLowerCase()} clinics are open for booking right now.</div>
        )}
        {clinics.map((c) => (
          <div
            key={c.clinicId}
            className={`clinic-card ${selected?.clinicId === c.clinicId ? 'selected' : ''}`}
            onClick={() => setSelected(c)}
          >
            <div className="info">
              <span className="clinic-day">{c.dayOfWeek}</span>
              <h3>{c.name}</h3>
              <span className="time">{c.startTime} – {c.endTime}</span>
            </div>
            <div className="price">${c.sessionPrice}</div>
          </div>
        ))}
      </div>

      {selected && <BookingForm clinic={selected} grips={grips} />}

      <nav className="footer-nav">
        <Link to="/stringing" className="stringing-link">Book a Racket Stringing →</Link>
      </nav>
    </div>
  );
}

function BookingForm({ clinic, grips }) {
  const [mode, setMode] = useState('single'); // 'single' | 'pack'
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [gripAddOn, setGripAddOn] = useState('');
  const [clientName, setClientName] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [contactValue, setContactValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setSelectedDate('');
    setResult(null);
    if (mode === 'single') {
      setLoadingSlots(true);
      apiGet('slots', { clinicId: clinic.clinicId, weeks: 6 }).then((data) => {
        setSlots(Array.isArray(data) ? data : []);
        setLoadingSlots(false);
      });
    }
  }, [mode, clinic]);

  const canSubmit =
    clientName && contactValue && paymentMethod && (mode === 'pack' || selectedDate);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (mode === 'pack') {
        const res = await apiPost('buyPack', {
          clinicId: clinic.clinicId,
          clientName,
          contactMethod,
          contactValue,
          paymentMethod,
        });
        setResult({ type: 'pack', ...res });
      } else {
        const res = await apiPost('signup', {
          clinicId: clinic.clinicId,
          clientName,
          contactMethod,
          contactValue,
          planType: 'single',
          sessionDate: selectedDate,
          paymentMethod,
          gripAddOn,
        });
        setResult({ type: 'single', ...res });
      }
    } catch (err) {
      setResult({ type: 'error', message: 'Something went wrong — please try again.' });
    }
    setSubmitting(false);
  }

  if (result && result.type !== 'error') {
    return <Confirmation result={result} />;
  }

  return (
    <div className="booking-form">
      <div className="field">
        <label>Plan</label>
        <div className="option-row">
          <div className={`option-pill ${mode === 'single' ? 'active' : ''}`} onClick={() => setMode('single')}>
            Single Session
            <span className="sub">${clinic.sessionPrice}</span>
          </div>
          <div className={`option-pill ${mode === 'pack' ? 'active' : ''}`} onClick={() => setMode('pack')}>
            {clinic.packSize}-Session Pack
            <span className="sub">${clinic.packPrice}</span>
          </div>
        </div>
      </div>

      {mode === 'single' && (
        <div className="field">
          <label>Date</label>
          {loadingSlots && <div className="loading-state">Loading open dates…</div>}
          {!loadingSlots && (
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}>
              <option value="">Choose a date</option>
              {slots.map((s) => (
                <option key={s.date} value={s.date} disabled={s.spotsLeft <= 0}>
                  {s.date} — {s.spotsLeft > 0 ? `${s.spotsLeft} spots left` : 'Full'}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {mode === 'single' && grips.length > 0 && (
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
        <label>Your Name</label>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Full name" />
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
        <input
          value={contactValue}
          onChange={(e) => setContactValue(e.target.value)}
          placeholder={contactMethod === 'email' ? 'you@example.com' : '(707) 555-1234'}
        />
      </div>

      <div className="field">
        <label>Payment Method</label>
        <div className="option-row">
          {PAYMENT_METHODS.map((m) => (
            <div
              key={m.id}
              className={`option-pill ${paymentMethod === m.id ? 'active' : ''}`}
              onClick={() => setPaymentMethod(m.id)}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {result?.type === 'error' && <div className="empty-state" style={{ color: 'var(--error)' }}>{result.message}</div>}

      <button className="submit-btn" disabled={!canSubmit || submitting} onClick={handleSubmit}>
        {submitting ? 'Booking…' : mode === 'pack' ? 'Buy Pack' : 'Confirm Booking'}
      </button>
    </div>
  );
}

function Confirmation({ result }) {
  const link = result.paymentLink;
  return (
    <div className="confirmation">
      <h3>You're booked!</h3>
      {typeof link === 'string' ? (
        <>
          <p>Complete payment via Venmo to finish your booking.</p>
          <a className="pay-link" href={link} target="_blank" rel="noreferrer">Pay on Venmo</a>
        </>
      ) : link?.type === 'zelle-info' ? (
        <p>Send <strong>${link.amount}</strong> via Zelle to <strong>{link.info}</strong>.</p>
      ) : link?.type === 'check-instructions' ? (
        <p>Please bring a check for <strong>${link.amount}</strong> to your first session.</p>
      ) : (
        <p>Please bring <strong>${link?.amount}</strong> cash to your first session.</p>
      )}
      {result.statusLink && (
        <p style={{ fontSize: 13, marginTop: 12 }}>
          Save this link to check your booking status anytime:<br />
          <code>{window.location.origin}/status/{result.statusLink}</code>
        </p>
      )}
    </div>
  );
}
