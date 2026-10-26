import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from './api.js';
import { SunIcon, RainCloudIcon } from './WeatherIcons.jsx';

/** Admin button that calls (or clears) a rain-out for today. Signal only — cancels nothing. */
export default function RainOutToggle({ token }) {
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('weatherStatus').then(setStatus).catch(() => {});
  }, []);

  async function toggle() {
    setSaving(true);
    try {
      const res = await apiPost('adminSetRainOut', { token, on: !status.rainedOut });
      if (res.error) window.alert(`Could not update the rain-out signal: ${res.error}`);
      else setStatus(res);
    } catch (err) {
      window.alert('Could not reach the server to update the rain-out signal.');
    }
    setSaving(false);
  }

  if (!status || status.rainedOut === undefined) return null;
  const on = status.rainedOut;

  return (
    <div style={{ padding: '16px 20px 0' }}>
      <button
        className="submit-btn"
        disabled={saving}
        onClick={toggle}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          ...(on ? { background: '#3B6E99', color: '#fff' } : {}),
        }}
      >
        {on ? <RainCloudIcon size={26} /> : <SunIcon size={26} />}
        {saving ? 'Updating…' : on ? 'Rain-out is ON — tap to clear' : 'Call rain-out for today'}
      </button>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
        {on
          ? 'Everyone sees "Rained out today" on the booking page until midnight. This does not cancel any classes.'
          : "Shows a rain-out notice on the booking page for today only. It does not cancel any classes."}
      </div>
    </div>
  );
}
