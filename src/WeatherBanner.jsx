import React, { useEffect, useState } from 'react';
import { apiGet } from './api.js';
import { SunIcon } from './WeatherIcons.jsx';

const RAIN_TEXT = 'Courts are currently wet. Please check your emails for cancellation confirmations. Thank you!';

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
      <div role="status" className="rain-banner">
        <style>{`
          .rain-banner { margin: 12px 20px 0; padding: 12px 0; background: #E6EEF5; border: 1px solid #9DB4C8;
            border-radius: 14px; color: #1F3A52; overflow: hidden; white-space: nowrap; font-weight: 700; font-size: 15px; }
          .rain-banner .track { display: inline-block; padding-left: 100%; animation: rain-scroll 18s linear infinite; }
          @keyframes rain-scroll { from { transform: translateX(0); } to { transform: translateX(-100%); } }
          @media (prefers-reduced-motion: reduce) {
            .rain-banner { white-space: normal; text-align: center; padding: 12px 16px; }
            .rain-banner .track { animation: none; padding-left: 0; }
          }
        `}</style>
        <span className="track">{RAIN_TEXT}</span>
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
