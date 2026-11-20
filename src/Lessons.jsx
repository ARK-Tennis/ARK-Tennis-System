import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from './api.js';
import { longDay, fmtTime } from './calUtil.js';
import './calendar.css';

/**
 * Public private-lesson calendar. Shows only "Open" and "Booked" — never names or amounts.
 * Asking for a time does not confirm it: the coach confirms by email.
 */
export default function Lessons() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [chosen, setChosen] = useState(null); // {date, start, end}
  const [form, setForm] = useState({ name: '', email: '', code: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  function load() {
    apiGet('calPublicSlots')
      .then((r) => { if (r.error) setLoadError(r.error); else { setData(r); setLoadError(''); } })
      .catch(() => setLoadError('Could not load open times. Please try again.'));
  }
  useEffect(load, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await apiPost('calRequestSlot', { date: chosen.date, start: chosen.start, ...form });
      if (res.error) {
        setError(res.error);
        if (/booked|not available/i.test(res.error)) { setChosen(null); load(); }
      } else {
        setDone({ when: `${longDay(chosen.date)}, ${fmtTime(chosen.start)} – ${fmtTime(chosen.end)}` });
        setChosen(null);
        setForm({ name: '', email: '', code: '', website: '' });
        load();
      }
    } catch (err) { setError('Could not send your request. Please try again.'); }
    setBusy(false);
  }

  return (
    <div className="page">
      <header className="site-header">
        <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
        <h1>Private Lessons</h1>
        <div className="net-cord" />
      </header>

      <div className="cal-wrap">
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)' }}>
          Pick an open time to request a private lesson. A request isn&rsquo;t confirmed until you hear back from me by email.
        </p>

        {done && (
          <div className="confirmation" style={{ margin: 0 }}>
            <h3>Request sent</h3>
            <p>{done.when}</p>
            <p>Check your email &mdash; I&rsquo;ll confirm with you soon.</p>
          </div>
        )}

        {loadError && <div className="cal-error">{loadError}</div>}
        {!data && !loadError && <div className="loading-state">Loading open times…</div>}
        {data && data.days.length === 0 && <div className="empty-state">No private lesson times are listed right now. Please check back soon.</div>}

        {data && data.days.map((day) => (
          <div key={day.date} className="les-day">
            <h3>{longDay(day.date)}</h3>
            <div className="les-slots">
              {day.slots.map((s) => {
                const isChosen = chosen && chosen.date === day.date && chosen.start === s.start;
                return s.status === 'open' ? (
                  <button
                    key={s.start}
                    className={`les-slot open ${isChosen ? 'chosen' : ''}`}
                    onClick={() => { setChosen({ date: day.date, start: s.start, end: s.end }); setDone(null); setError(''); }}
                  >
                    <span className="t">{fmtTime(s.start)}</span>
                    <span className="s">Open</span>
                  </button>
                ) : (
                  <div key={s.start} className="les-slot booked" aria-disabled="true">
                    <span className="t">{fmtTime(s.start)}</span>
                    <span className="s">Booked</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {chosen && (
        <div className="cal-sheet-back" onClick={(e) => { if (e.target === e.currentTarget) setChosen(null); }}>
          <form className="cal-sheet" onSubmit={submit} style={{ position: 'relative' }}>
            <div className="cal-row"><h2 style={{ flex: 1 }}>Request this time</h2><button type="button" className="cal-btn small" onClick={() => setChosen(null)}>Cancel</button></div>
            <div style={{ fontWeight: 700 }}>{longDay(chosen.date)}, {fmtTime(chosen.start)} – {fmtTime(chosen.end)}</div>
            <div className="field"><label>Your name</label><input required maxLength={80} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="field"><label>Email</label><input required type="email" maxLength={120} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            {data && data.codeRequired && (
              <div className="field"><label>Booking code (from my weekly email)</label><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            )}
            {/* Hidden spam trap: people never see or fill this; bots do. */}
            <div className="les-hp" aria-hidden="true">
              <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
            </div>
            {error && <div className="cal-error">{error}</div>}
            <button className="submit-btn" disabled={busy}>{busy ? 'Sending…' : 'Request this time'}</button>
          </form>
        </div>
      )}

      <nav className="footer-nav"><Link to="/">&larr; Back to Booking</Link></nav>
    </div>
  );
}
