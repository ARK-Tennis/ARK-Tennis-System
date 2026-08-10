import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from './api.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PAYMENT_METHODS = [
  { id: 'venmo', label: 'Venmo' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'other', label: 'Other' },
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
        <p>Book a clinic, string a racket, get on court.</p>
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

      {selected && (
        <div className="booking-form" style={{ paddingBottom: 0 }}>
          {selected.description && <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 4px' }}>{selected.description}</p>}
        </div>
      )}
      {selected && <BookingForm clinic={selected} grips={grips} />}

      <nav className="footer-nav">
        <Link to="/stringing" className="stringing-link">String a Racket</Link>
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
  const [childName, setChildName] = useState('');
  const [contactMethod, setContactMethod] = useState('email');
  const [contactValue, setContactValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [packLookup, setPackLookup] = useState(null); // null = not checked, {found:false} or {found:true,...}
  const [checkingPack, setCheckingPack] = useState(false);
  const [packSettings, setPackSettings] = useState(null); // { packSize, packPrice, packExpiryDays } for this clinic's category

  useEffect(() => {
    setSelectedDate('');
    setResult(null);
    setPackLookup(null);
    if (mode === 'single') {
      setLoadingSlots(true);
      apiGet('slots', { clinicId: clinic.clinicId, weeks: 6 }).then((data) => {
        setSlots(Array.isArray(data) ? data : []);
        setLoadingSlots(false);
      });
    }
  }, [mode, clinic]);

  useEffect(() => {
    apiGet('packSettings', { category: clinic.category }).then(setPackSettings);
  }, [clinic]);

  // Once we know we're using an existing pack, we still need open slots to pick a date from.
  useEffect(() => {
    if (packLookup?.found) {
      setLoadingSlots(true);
      apiGet('slots', { clinicId: clinic.clinicId, weeks: 6 }).then((data) => {
        setSlots(Array.isArray(data) ? data : []);
        setLoadingSlots(false);
      });
    }
  }, [packLookup, clinic]);

  async function checkForExistingPack() {
    if (!contactValue) return;
    setCheckingPack(true);
    const res = await apiGet('myPack', { category: clinic.category, contactValue });
    setPackLookup(res);
    setCheckingPack(false);
  }

  const buyingNewPack = mode === 'pack' && packLookup?.found === false;
  const usingExistingPack = mode === 'pack' && packLookup?.found === true;

  const isJunior = clinic.category === 'Junior';
  const selectedSlot = slots.find((s) => s.date === selectedDate);
  const isFullSelected = mode === 'single' && !!selectedSlot && selectedSlot.spotsLeft <= 0;

  const validEmail = EMAIL_PATTERN.test(contactValue);

  const canSubmit =
    mode === 'single'
      ? clientName && validEmail && paymentMethod && selectedDate && (!isJunior || childName)
      : usingExistingPack
      ? selectedDate && (!isJunior || childName)
      : buyingNewPack
      ? clientName && validEmail && paymentMethod && (!isJunior || childName)
      : false;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (usingExistingPack) {
        const res = await apiPost('signup', {
          clinicId: clinic.clinicId,
          clientName,
          childName,
          contactMethod,
          contactValue,
          planType: 'pack',
          packId: packLookup.packId,
          sessionDate: selectedDate,
        });
        setResult({ type: 'single', ...res });
      } else if (buyingNewPack) {
        const res = await apiPost('buyPack', {
          category: clinic.category,
          clientName,
          childName,
          contactMethod,
          contactValue,
          paymentMethod,
        });
        setResult({ type: 'pack', ...res });
      } else {
        const res = await apiPost('signup', {
          clinicId: clinic.clinicId,
          clientName,
          childName,
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
            {packSettings ? `${packSettings.packSize}-Session Pack` : 'Session Pack'}
            {packSettings && <span className="sub">${packSettings.packPrice} · any {clinic.category.toLowerCase()} clinic</span>}
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
                <option key={s.date} value={s.date}>
                  {s.date} — {s.spotsLeft > 0 ? `${s.spotsLeft} spots left` : 'Full — join waitlist'}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {mode === 'single' && isFullSelected && (
        <WaitlistForm clinic={clinic} date={selectedDate} />
      )}

      {mode === 'single' && !isFullSelected && grips.length > 0 && (
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

      {mode === 'single' && !isFullSelected && (
        <>
          <div className="field">
            <label>{isJunior ? "Parent / Guardian Name" : "Your Name"}</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Full name" />
          </div>

          {isJunior && (
            <div className="field">
              <label>Child's Name</label>
              <input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Player's name" />
            </div>
          )}

          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder="you@example.com"
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
        </>
      )}

      {mode === 'pack' && packLookup === null && (
        <>
          <div className="field">
            <label>{isJunior ? "Parent / Guardian Name" : "Your Name"}</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Full name" />
          </div>

          {isJunior && (
            <div className="field">
              <label>Child's Name</label>
              <input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Player's name" />
            </div>
          )}

          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <button className="submit-btn" disabled={!EMAIL_PATTERN.test(contactValue) || checkingPack} onClick={checkForExistingPack}>
            {checkingPack ? 'Checking…' : 'Continue'}
          </button>
        </>
      )}

      {usingExistingPack && (
        <>
          <div className="confirmation" style={{ margin: 0 }}>
            <p style={{ margin: 0 }}>
              You have <strong>{packLookup.sessionsRemaining}</strong> session{packLookup.sessionsRemaining === 1 ? '' : 's'} left,
              valid until <strong>{packLookup.expiryDate}</strong>.
            </p>
          </div>
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
        </>
      )}

      {buyingNewPack && (
        <>
          <div className="empty-state" style={{ padding: '8px 0' }}>
            No active pack found for that contact — buy a new {packSettings ? packSettings.packSize : ''}-session pack below (usable at any {clinic.category.toLowerCase()} clinic).
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
        </>
      )}

      {result?.type === 'error' && <div className="empty-state" style={{ color: 'var(--error)' }}>{result.message}</div>}

      {((mode === 'single' && !isFullSelected) || usingExistingPack || buyingNewPack) && (
        <button className="submit-btn" disabled={!canSubmit || submitting} onClick={handleSubmit}>
          {submitting ? 'Booking…' : usingExistingPack ? 'Book Session' : buyingNewPack ? 'Buy Pack' : 'Confirm Booking'}
        </button>
      )}
    </div>
  );
}

function WaitlistForm({ clinic, date }) {
  const [clientName, setClientName] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  async function submit() {
    setSubmitting(true);
    await apiPost('joinWaitlist', { clinicId: clinic.clinicId, date, clientName, contactValue });
    setSubmitting(false);
    setJoined(true);
  }

  if (joined) {
    return (
      <div className="confirmation">
        <h3>You're on the list</h3>
        <p>We'll email you the moment a spot opens up for {date}.</p>
      </div>
    );
  }

  return (
    <div className="booking-form" style={{ paddingTop: 0 }}>
      <div className="empty-state" style={{ padding: '8px 0' }}>
        That date is full — join the waitlist and we'll email you if a spot opens.
      </div>
      <div className="field">
        <label>Your Name</label>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Full name" />
      </div>
      <div className="field">
        <label>Email Address</label>
        <input type="email" value={contactValue} onChange={(e) => setContactValue(e.target.value)} placeholder="you@example.com" />
      </div>
      <button className="submit-btn" disabled={!clientName || !EMAIL_PATTERN.test(contactValue) || submitting} onClick={submit}>
        {submitting ? 'Joining…' : 'Join Waitlist'}
      </button>
    </div>
  );
}

function Confirmation({ result }) {
  const link = result.paymentLink;
  return (
    <div className="confirmation">
      <h3>You're booked!</h3>
      {!link ? (
        <p>This session is covered by your pack — nothing more to pay.</p>
      ) : typeof link === 'string' ? (
        <>
          <p>Complete payment via Venmo to finish your booking.</p>
          <a className="pay-link" href={link} target="_blank" rel="noreferrer">Pay on Venmo</a>
        </>
      ) : link?.type === 'zelle-info' ? (
        <p>Send <strong>${link.amount}</strong> via Zelle to <strong>{link.info}</strong>.</p>
      ) : (
        <p>We'll follow up about payment for <strong>${link?.amount}</strong> — cash, check, or another method, whatever works best.</p>
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
