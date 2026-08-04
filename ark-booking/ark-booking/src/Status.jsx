import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from './api.js';

export default function Status() {
  const { link } = useParams();
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    apiGet('status', { link }).then((data) => setState({ loading: false, ...data }));
  }, [link]);

  return (
    <div className="page">
      <header className="site-header">
        <span className="club">ARK Tennis</span>
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
              {state.tab === 'Signups' ? state.data.ClinicID : state.data.RacketDescription}
            </p>
            <p>
              Payment status: <strong>{state.data.PaymentStatus}</strong>
            </p>
            {state.tab === 'StringingOrders' && (
              <p>Order status: <strong>{state.data.Status}</strong></p>
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
