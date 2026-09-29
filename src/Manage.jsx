import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from './api.js';

export default function Manage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true });
  const [cancellingLink, setCancellingLink] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    load();
  }, [token]); // eslint-disable-line

  function load() {
    setState({ loading: true });
    apiGet('manageBookings', { token }).then((data) => setState({ loading: false, ...data }));
  }

  async function handleCancel(statusLink) {
    setCancellingLink(statusLink);
    const res = await apiPost('cancelMyBooking', { link: statusLink });
    setCancellingLink(null);
    if (res.success) {
      load();
    } else {
      setErrors((prev) => ({ ...prev, [statusLink]: res.message || 'Could not cancel this booking.' }));
    }
  }

  return (
    <div className="page">
      <header className="site-header">
        <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
        <h1>Your Bookings</h1>
        <div className="net-cord" />
      </header>

      <div className="booking-form">
        {state.loading && <div className="loading-state">Loading your bookings…</div>}

        {!state.loading && !state.found && (
          <div className="empty-state">We couldn't find any bookings for this link.</div>
        )}

        {!state.loading && state.found && state.bookings.length === 0 && (
          <div className="empty-state">No active bookings right now.</div>
        )}

        {!state.loading && state.found && state.bookings.map((b) => {
          const isPast = new Date(b.sessionDate) < new Date();
          return (
            <div key={b.statusLink} className="clinic-card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 6, marginBottom: 10 }}>
              <div className="info">
                <span className="clinic-day">{b.dayOfWeek}</span>
                <h3>{b.clinicName}{b.childName ? ` — ${b.childName}` : ''}</h3>
                <span className="time">{b.sessionDate} · {b.startTime} – {b.endTime}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {b.planType === 'pack' ? 'Paid via pack' : `Payment: ${b.paymentStatus}`}
              </div>
              {!isPast && (
                <button
                  className="submit-btn"
                  style={{ background: 'var(--error)', alignSelf: 'flex-start', padding: '8px 14px', fontSize: 13 }}
                  disabled={cancellingLink === b.statusLink}
                  onClick={() => handleCancel(b.statusLink)}
                >
                  {cancellingLink === b.statusLink ? 'Cancelling…' : 'Cancel This Booking'}
                </button>
              )}
              {errors[b.statusLink] && (
                <p style={{ color: 'var(--error)', fontSize: 12, margin: 0 }}>{errors[b.statusLink]}</p>
              )}
            </div>
          );
        })}
      </div>

      <nav className="footer-nav">
        <Link to="/">← Back to Booking</Link>
      </nav>
    </div>
  );
}
