import React, { useEffect, useState } from 'react';
import { apiGet } from './api.js';
import { SunIcon, RainCloudIcon } from './WeatherIcons.jsx';

/**
 * Court-conditions signal shown at the top of the booking page. A big rain notice when the
 * admin has called a rain-out for today, otherwise a small, quiet sun. Signal only — it does
 * not stop anyone from booking and does not cancel anything.
 */
export default function WeatherBanner() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    apiGet('weatherStatus')
      .then((s) => { if (!cancelled) setStatus(s); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!status || status.rainedOut === undefined) return null; // fail quiet: never block the page

  if (status.rainedOut) {
    return (
      <div
        role="status"
        style={{
          display: 'flex', alignItems: 'center', gap: 14, margin: '12px 20px 0', padding: '14px 16px',
          background: '#E6EEF5', border: '1px solid #9DB4C8', borderRadius: 14, color: '#1F3A52',
        }}
      >
        <RainCloudIcon size={44} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Rained out today</div>
          <div style={{ fontSize: 13, marginTop: 2 }}>The courts are wet.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 20px 0', fontSize: 12, color: 'var(--muted)' }}>
      <SunIcon size={18} />
      <span>I'll see you on court.</span>
    </div>
  );
}
