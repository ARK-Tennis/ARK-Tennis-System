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
  const [category, setCategory] = useState('Junior'); // 'Junior' | 'Adult' | 'Packs'
  const [clinics, setClinics] = useState([]);
  const [loadingClinics, setLoadingClinics] = useState(true);
  const [grips, setGrips] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (category === 'Packs') return;
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
        <button
          className={category === 'Packs' ? 'active' : ''}
          onClick={() => { setCategory('Packs'); setSelected(null); }}
        >
          Packs
        </button>
      </div>

      {category === 'Packs' ? (
        <PacksTab />
      ) : (
        <>
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
        </>
      )}

      <nav className="footer-nav">
        <Link to="/stringing" className="stringing-link">String a Racket</Link>
      </nav>
    </div>
  );
}

function PacksTab() {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);

  useEffect(() => {
    apiGet('packTiers').then((data) => {
      setTiers(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <div className="clinic-list">
        {loading && <div className="loading-state">Loading packs…</div>}
        {!loading && tiers.length === 0 && (
          <div className="empty-state">No packs are available right now.</div>
        )}
        {tiers.map((t) => (
          <div
            key={t.packGroup}
            className={`clinic-card ${selectedTier?.packGroup === t.packGroup ? 'selected' : ''}`}
            onClick={() => setSelectedTier(t)}
          >
            <div className="info">
              <span className="clinic-day">{t.category}</span>
              <h3>{t.packSize}-Session Pack</h3>
              <span className="time">${t.sessionPrice}/session clinics · valid {t.packExpiryDays} days</span>
            </div>
            <div className="price">${t.packPrice}</div>
          </div>
        ))}
      </div>
      {selectedTier && <StandalonePackForm tier={selectedTier} />}
    </>
  );
}

function StandalonePackForm({ tier }) {
  const [clientName, setClientName] = useState('');
  const [childName, setChildName] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const isJunior = tier.category === 'Junior';
  const validEmail = EMAIL_PATTERN.test(contactValue);
  const canSubmit = clientName && validEmail && paymentMethod && (!isJunior || childName);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await apiPost('buyPack', {
        packGroup: tier.packGroup,
        clientName,
        childName,
        contactMethod: 'email',
        contactValue,
        paymentMethod,
      });
      setResult(res);
    } catch (err) {
      setResult({ error: true });
    }
    setSubmitting(false);
  }

  if (result && !result.error) {
    return <Confirmation result={{ type: 'pack', ...result }} />;
  }

  return (
    <div className="booking-form">
      <div className="field">
        <label>{isJunior ? 'Parent / Guardian Name' : 'Your Name'}</label>
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
        <input type="email" value={contactValue} onChange={(e) => setContactValue(e.target.value)} placeholder="you@example.com" />
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
      <button className="submit-btn" disabled={!canSubmit || submitting} onClick={submit}>
        {submitting ? 'Buying…' : 'Buy Pack'}
      </button>
    </div>
  );
}

function BookingForm({ clinic, grips }) {
  const [mode, setMode] = useState('single'); // 'single' | 'pack'
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDates, setSelectedDates] = useState([]); // for multi-date pack redemption
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
    setSelectedDates([]);
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
    apiGet('packSettings', { packGroup: clinic.packGroup }).then(setPackSettings);
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

  function toggleDate(date) {
    setSelectedDates((prev) => prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]);
  }

  async function checkForExistingPack() {
    if (!contactValue) return;
    setCheckingPack(true);
    const res = await apiGet('myPack', { packGroup: clinic.packGroup, contactValue });
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
      ? selectedDates.length > 0 && (!isJunior || childName)
      : buyingNewPack
      ? clientName && validEmail && paymentMethod && (!isJunior || childName)
      : false;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (usingExistingPack) {
        const succeeded = [];
        const failed = [];
        for (const date of selectedDates) {
          try {
            const res = await apiPost('signup', {
              clinicId: clinic.clinicId,
              clientName,
              childName,
              contactMethod,
              contactValue,
              planType: 'pack',
              packId: packLookup.packId,
              sessionDate: date,
            });
            if (res.error) failed.push({ date, message: res.error });
            else succeeded.push({ date, ...res });
          } catch (err) {
            failed.push({ date, message: 'Failed to book' });
          }
        }
        setResult({ type: 'multi', succeeded, failed });
      } else if (buyingNewPack) {
        const res = await apiPost('buyPack', {
          packGroup: clinic.packGroup,
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
            {packSettings && <span className="sub">${packSettings.packPrice} · usable at ${clinic.sessionPrice} {clinic.category.toLowerCase()} clinics</span>}
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
              valid until <strong>{packLookup.expiryDate}</strong>. Pick up to {packLookup.sessionsRemaining} dates below.
            </p>
          </div>
          <div className="field">
            <label>Dates ({selectedDates.length} selected)</label>
            {loadingSlots && <div className="loading-state">Loading open dates…</div>}
            {!loadingSlots && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {slots.map((s) => {
                  const checked = selectedDates.includes(s.date);
                  const atLimit = !checked && selectedDates.length >= packLookup.sessionsRemaining;
                  const full = s.spotsLeft <= 0;
                  return (
                    <label
                      key={s.date}
                      className={`option-pill ${checked ? 'active' : ''}`}
                      style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'left', opacity: full || atLimit ? 0.5 : 1, cursor: full || atLimit ? 'not-allowed' : 'pointer' }}
                    >
                      <span>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={full || atLimit}
                          onChange={() => toggleDate(s.date)}
                          style={{ marginRight: 8 }}
                        />
                        {s.date}
                      </span>
                      <span>{full ? 'Full' : `${s.spotsLeft} left`}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {buyingNewPack && (
        <>
          <div className="empty-state" style={{ padding: '8px 0' }}>
            No active pack found for that contact — buy a new {packSettings ? packSettings.packSize : ''}-session pack below (usable at ${clinic.sessionPrice} {clinic.category.toLowerCase()} clinics).
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
          {submitting ? 'Booking…' : usingExistingPack ? `Book ${selectedDates.length || ''} Date${selectedDates.length === 1 ? '' : 's'}` : buyingNewPack ? 'Buy Pack' : 'Confirm Booking'}
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
  if (result.type === 'multi') {
    return (
      <div className="confirmation">
        <h3>{result.succeeded.length} of {result.succeeded.length + result.failed.length} dates booked</h3>
        {result.succeeded.length > 0 && (
          <p>Booked: {result.succeeded.map((s) => s.date).join(', ')} — all covered by your pack, nothing more to pay.</p>
        )}
        {result.failed.length > 0 && (
          <p style={{ color: 'var(--error)' }}>
            Couldn't book: {result.failed.map((f) => f.date).join(', ')} — likely ran out of pack sessions or a spot filled up. Contact us if you'd still like these.
          </p>
        )}
        {result.succeeded[0]?.statusLink && (
          <p style={{ fontSize: 13, marginTop: 12 }}>
            Check any of these bookings anytime via the confirmation emails sent for each.
          </p>
        )}
      </div>
    );
  }

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
