import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPost } from './api.js';

export default function Status() {
  const { link } = useParams();
  const [state, setState] = useState({ loading: true });
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);

  useEffect(() => {
    load();
  }, [link]); // eslint-disable-line

  function load() {
    setState({ loading: true });
    apiGet('status', { link }).then((data) => setState({ loading: false, ...data }));
  }

  async function handleCancel() {
    setCancelling(true);
    const res = await apiPost('cancelMyBooking', { link });
    setCancelling(false);
    setCancelResult(res);
    if (res.success) load();
  }

  const isSignup = state.tab === 'Signups';
  const isCancelled = isSignup && state.data?.BookingStatus === 'cancelled';
  const sessionInFuture = isSignup && state.data?.SessionDate && new Date(state.data.SessionDate) > new Date();
  const canCancel = isSignup && !isCancelled && sessionInFuture;

  return (
    <div className="page">
      <header className="site-header">
        <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
        <h1>Booking Status</h1>
        <div className="net-cord" />
      </header>

      <div className="booking-form">
        {state.loading && <div className="loading-state">Looking it up…</div>}

        {!state.loading && !state.found && (
          <div className="empty-state">We couldn't find a booking with that link.</div>
        )}

        {!state.loading && state.found && (
          <div className="confirmation">
            <h3>{state.data.ClientName}</h3>
            <p>
              {isSignup ? state.data.ClinicID : state.data.RacketDescription}
            </p>
            {isCancelled ? (
              <p style={{ color: 'var(--error)' }}><strong>Cancelled</strong></p>
            ) : (
              <p>
                Payment status: <strong>{state.data.PaymentStatus}</strong>
              </p>
            )}
            {state.tab === 'StringingOrders' && (
              <p>Order status: <strong>{state.data.Status}</strong></p>
            )}

            {canCancel && (
              <button
                className="submit-btn"
                style={{ background: 'var(--error)', marginTop: 12 }}
                disabled={cancelling}
                onClick={handleCancel}
              >
                {cancelling ? 'Cancelling…' : 'Cancel This Booking'}
              </button>
            )}

            {cancelResult && !cancelResult.success && (
              <p style={{ color: 'var(--error)', fontSize: 13, marginTop: 8 }}>{cancelResult.message}</p>
            )}
          </div>
        )}
      </div>

      <nav className="footer-nav">
        <Link to="/">← Back to Booking</Link>
      </nav>
    </div>
  );
}
