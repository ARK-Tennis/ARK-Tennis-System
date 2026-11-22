import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { apiGet, apiPost } from './api.js';
import {
  addDays, dayNum, weekday, monthOf, monthLabel, longDay, shortDay, fmtTime, toMin, fromMin,
  monthGrid, shiftMonth, todayStr, money, DAY_NAMES,
} from './calUtil.js';
import './calendar.css';

const SESSION_KEY = 'ark_cal_session';
const REPEATS = [
  ['none', 'Does not repeat'], ['daily', 'Every day'], ['weekly', 'Every week'],
  ['biweekly', 'Every 2 weeks'], ['monthly', 'Every month'],
];

/** Calls the API; if the login expired, signals the page to show the code screen again. */
function useApi(session, onExpired) {
  const get = useCallback(async (action, params = {}) => {
    const res = await apiGet(action, { ...params, session });
    if (res && res.error && /Session expired/i.test(res.error)) onExpired();
    return res;
  }, [session, onExpired]);
  const post = useCallback(async (action, body = {}) => {
    const res = await apiPost(action, { ...body, session });
    if (res && res.error && /Session expired/i.test(res.error)) onExpired();
    return res;
  }, [session, onExpired]);
  return { get, post };
}

export default function CalendarAdmin() {
  const [session, setSession] = useState(() => { try { return localStorage.getItem(SESSION_KEY) || ''; } catch (e) { return ''; } });

  function save(s) { setSession(s); try { if (s) localStorage.setItem(SESSION_KEY, s); else localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ } }

  if (!session) return <Login onLogin={save} />;
  return <CalendarApp session={session} onLogout={() => save('')} />;
}

function Header({ title }) {
  return (
    <header className="site-header">
      <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
      <h1>{title}</h1>
      <div className="net-cord" />
    </header>
  );
}

function Login({ onLogin }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await apiPost('calLogin', { code });
      if (res.error) setError(res.error); else onLogin(res.session);
    } catch (err) { setError('Could not reach the server.'); }
    setBusy(false);
  }

  return (
    <div className="page">
      <Header title="Calendar" />
      <form className="booking-form" onSubmit={submit}>
        <div className="field">
          <label>Access code</label>
          <input type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        {error && <div className="cal-error">{error}</div>}
        <button className="submit-btn" disabled={!code || busy}>{busy ? 'Checking…' : 'Open calendar'}</button>
      </form>
    </div>
  );
}

function CalendarApp({ session, onLogout }) {
  const [anchor, setAnchor] = useState(todayStr());
  const [view, setView] = useState('month');
  const [data, setData] = useState({ calendars: [], items: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // event form state
  const [panel, setPanel] = useState(null); // 'calendars' | 'requests' | 'settings'
  const [requests, setRequests] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [totalsView, setTotalsView] = useState('month'); // 'day' | 'week' | 'month'
  const { get, post } = useApi(session, onLogout);

  const grid = useMemo(() => monthGrid(anchor), [monthOf(anchor)]); // eslint-disable-line
  const month = monthOf(anchor);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    get('calRange', { from: grid.start, to: grid.end, month }).then((res) => {
      if (cancelled) return;
      if (res.error) setError(res.error); else setData(res);
      setLoading(false);
    }).catch(() => { if (!cancelled) { setError('Could not reach the server.'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [grid.start, grid.end, month, refreshKey]); // eslint-disable-line

  useEffect(() => {
    get('calRequests').then((r) => setRequests(Array.isArray(r) ? r : [])).catch(() => {});
  }, [refreshKey]); // eslint-disable-line

  const refresh = () => setRefreshKey((k) => k + 1);
  const calById = useMemo(() => Object.fromEntries(data.calendars.map((c) => [c.calendarId, c])), [data.calendars]);
  const itemsByDate = useMemo(() => {
    const m = {};
    data.items.forEach((i) => { (m[i.date] = m[i.date] || []).push(i); });
    return m;
  }, [data.items]);

  const pending = requests.filter((r) => r.status === 'pending').length;
  const today = todayStr();

  // Revenue counted only for the selected day, week (Sun–Sat) or month.
  const weekStartD = addDays(anchor, -weekday(anchor));
  const period = totalsView === 'day'
    ? { from: anchor, to: anchor, label: longDay(anchor) }
    : totalsView === 'week'
      ? { from: weekStartD, to: addDays(weekStartD, 6), label: `${shortDay(weekStartD)} – ${shortDay(addDays(weekStartD, 6))}` }
      : { from: `${month}-01`, to: `${month}-31`, label: monthLabel(anchor) };
  const periodTotals = useMemo(() => {
    const t = {};
    data.items.forEach((i) => {
      if (i.date >= period.from && i.date <= period.to) t[i.calendarId] = (t[i.calendarId] || 0) + (Number(i.amount) || 0);
    });
    return t;
  }, [data.items, period.from, period.to]);

  function step(delta) { setAnchor((a) => (view === 'month' ? shiftMonth(a, delta) : addDays(a, delta * 7))); }

  function newEvent(date) {
    const first = data.calendars[0];
    setEditing({
      eventId: null, calendarId: first ? first.calendarId : '', name: '', amount: '', date,
      allDay: false, startTime: '09:00', endTime: '10:00', repeat: 'none', repeatUntil: '', occurrenceDate: date, scope: 'all',
    });
  }
  function editItem(i) {
    if (i.auto) return;
    setEditing({
      eventId: i.eventId, calendarId: i.calendarId, name: i.name, amount: i.amount || '', date: i.date,
      allDay: !i.startTime, startTime: i.startTime || '09:00', endTime: i.endTime || '10:00', repeat: i.repeat, repeatUntil: i.repeatUntil, occurrenceDate: i.date,
      scope: i.repeat !== 'none' ? 'this' : 'all',
    });
  }

  const weekStart = addDays(anchor, -weekday(anchor));
  const weekDays = [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(weekStart, n));
  const title = view === 'month' ? monthLabel(anchor) : `${shortDay(weekStart)} – ${shortDay(addDays(weekStart, 6))}`;

  return (
    <div className="page">
      <Header title="Calendar" />
      <div className="cal-wrap">
        <div className="cal-bar">
          <button className="cal-btn" onClick={() => step(-1)} aria-label="Previous">‹</button>
          <div className="cal-title">{title}</div>
          <button className="cal-btn" onClick={() => step(1)} aria-label="Next">›</button>
        </div>
        <div className="cal-row">
          <button className={`cal-btn small ${view === 'month' ? 'active' : ''}`} onClick={() => { setView('month'); setTotalsView('month'); }}>Month</button>
          <button className={`cal-btn small ${view === 'week' ? 'active' : ''}`} onClick={() => { setView('week'); setTotalsView('week'); }}>Week</button>
          <button className="cal-btn small" onClick={() => { setAnchor(today); setTotalsView('day'); }}>Today</button>
          <span style={{ flex: 1 }} />
          <button className="cal-btn small primary" onClick={() => newEvent(anchor)}>+ Add</button>
        </div>

        {error && <div className="cal-error">{error}</div>}

        <div className="cal-totals">
          {data.calendars.map((c) => (
            <div key={c.calendarId} className="cal-chip">
              <span className="cal-dot" style={{ background: c.color }} />
              <span>{c.name}</span>
              <b>{money(periodTotals[c.calendarId])}</b>
            </div>
          ))}
        </div>
        <div className="cal-row">
          {[['day', 'Day'], ['week', 'Week'], ['month', 'Month']].map(([v, l]) => (
            <button key={v} className={`cal-btn small ${totalsView === v ? 'active' : ''}`} onClick={() => setTotalsView(v)}>{l} total</button>
          ))}
        </div>
        <div className="cal-note">Totals for {period.label}.{data.calendars.some((c) => c.type === 'rptc') ? ' RPTC is a plain sum for now.' : ''}</div>

        {view === 'month' && (
          <div className="cal-grid" aria-busy={loading}>
            {DAY_NAMES.map((d) => <div key={d} className="cal-dow">{d.slice(0, 3)}</div>)}
            {grid.days.map((d) => {
              const its = itemsByDate[d] || [];
              const cals = [...new Set(its.map((i) => i.calendarId))];
              return (
                <button
                  key={d}
                  className={`cal-cell ${monthOf(d) !== month ? 'other' : ''} ${d === today ? 'today' : ''} ${d === anchor ? 'selected' : ''}`}
                  onClick={() => setAnchor(d)}
                  aria-label={`${longDay(d)}, ${its.length} items`}
                >
                  <span className="cal-num">{Number(d.slice(8, 10))}</span>
                  <span className="cal-dots">
                    {cals.slice(0, 6).map((cid) => <span key={cid} className="cal-dot" style={{ background: calById[cid] ? calById[cid].color : '#999' }} />)}
                  </span>
                  {its.length > 0 && <span className="cal-more">{its.length}</span>}
                </button>
              );
            })}
          </div>
        )}

        {view === 'month' && (
          <DayPanel date={anchor} items={itemsByDate[anchor] || []} calById={calById} onEdit={editItem} onAdd={() => newEvent(anchor)} />
        )}

        {view === 'week' && weekDays.map((d) => (
          <DayPanel key={d} date={d} items={itemsByDate[d] || []} calById={calById} onEdit={editItem} onAdd={() => newEvent(d)} compact />
        ))}

        <div className="cal-row" style={{ marginTop: 6 }}>
          <button className="cal-btn small" onClick={() => setPanel('calendars')}>Calendars</button>
          <button className="cal-btn small" onClick={() => setPanel('requests')}>Lesson requests{pending ? ` (${pending})` : ''}</button>
          <button className="cal-btn small" onClick={() => setPanel('settings')}>Settings</button>
          <span style={{ flex: 1 }} />
          <button className="cal-btn small" onClick={onLogout}>Log out</button>
        </div>
      </div>

      {editing && (
        <EventSheet
          draft={editing} calendars={data.calendars} post={post}
          onClose={() => setEditing(null)} onDone={() => { setEditing(null); refresh(); }}
        />
      )}
      {panel === 'calendars' && <CalendarsSheet calendars={data.calendars} post={post} onClose={() => setPanel(null)} onChanged={refresh} />}
      {panel === 'requests' && <RequestsSheet requests={requests} post={post} onClose={() => setPanel(null)} onChanged={refresh} />}
      {panel === 'settings' && <SettingsSheet get={get} post={post} onClose={() => setPanel(null)} />}
    </div>
  );
}

function DayPanel({ date, items, calById, onEdit, onAdd, compact }) {
  return (
    <div className="cal-panel">
      {compact ? <div className="cal-weekday-head" style={{ margin: 0 }}>{longDay(date)}</div> : <h3>{longDay(date)}</h3>}
      {items.length === 0 && <div className="cal-empty">Nothing scheduled.</div>}
      {items.map((i) => {
        const cal = calById[i.calendarId];
        return (
          <button key={i.key} className={`cal-ev ${i.auto ? 'auto' : ''}`} onClick={() => onEdit(i)} disabled={i.auto}>
            <span className="bar" style={{ background: cal ? cal.color : '#999' }} />
            <span className="body">
              <span className="nm">{i.name}{i.auto ? ' (auto)' : ''}</span>
              <span className="tm">
                {i.startTime ? `${fmtTime(i.startTime)} – ${fmtTime(i.endTime)}` : 'All day'}
                {cal ? ` · ${cal.name}` : ''}{i.auto ? ` · ${i.players} player${i.players === 1 ? '' : 's'}` : ''}{i.repeat !== 'none' ? ' · repeats' : ''}
              </span>
            </span>
            {i.amount > 0 && <span className="amt">{money(i.amount)}</span>}
          </button>
        );
      })}
      <button className="cal-btn small" style={{ alignSelf: 'flex-start' }} onClick={onAdd}>+ Add event</button>
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div className="cal-sheet-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cal-sheet" role="dialog" aria-label={title}>
        <div className="cal-row"><h2 style={{ flex: 1 }}>{title}</h2><button className="cal-btn small" onClick={onClose}>Close</button></div>
        {children}
      </div>
    </div>
  );
}

function EventSheet({ draft, calendars, post, onClose, onDone }) {
  const [f, setF] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const isEdit = !!f.eventId;
  const repeats = draft.repeat !== 'none';

  function changeStart(v) {
    setF((p) => {
      const next = { ...p, startTime: v };
      if (!p.endTime || toMin(p.endTime) <= toMin(v)) next.endTime = fromMin(Math.min(toMin(v) + 60, 23 * 60 + 59));
      return next;
    });
  }

  async function save() {
    setBusy(true); setError('');
    const res = await post('calSaveEvent', { ...f, amount: f.amount === '' ? 0 : Number(f.amount) });
    setBusy(false);
    if (res.error) setError(res.error); else onDone();
  }
  async function remove() {
    const msg = repeats && f.scope === 'all' ? 'Delete every event in this series?' : 'Delete this event?';
    if (!window.confirm(msg)) return;
    setBusy(true); setError('');
    const res = await post('calDeleteEvent', { eventId: f.eventId, scope: f.scope, occurrenceDate: f.occurrenceDate });
    setBusy(false);
    if (res.error) setError(res.error); else onDone();
  }

  return (
    <Sheet title={isEdit ? 'Edit event' : 'New event'} onClose={onClose}>
      <div className="field">
        <label>Calendar</label>
        <select value={f.calendarId} onChange={(e) => set('calendarId', e.target.value)}>
          {calendars.map((c) => <option key={c.calendarId} value={c.calendarId}>{c.name}</option>)}
        </select>
      </div>
      <div className="cal-two">
        <div className="field"><label>Name</label><input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Sarah" /></div>
        <div className="field"><label>Amount ($)</label><input type="number" inputMode="decimal" min="0" step="0.01" value={f.amount} onChange={(e) => set('amount', e.target.value)} placeholder="80" /></div>
      </div>
      <div className="field"><label>Date</label><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
      <label className="cal-check" style={{ fontSize: 15 }}><input type="checkbox" checked={!!f.allDay} onChange={(e) => set('allDay', e.target.checked)} /> All day (every hour of the day)</label>
      {!f.allDay && (
        <div className="cal-two">
          <div className="field"><label>Start</label><input type="time" value={f.startTime} onChange={(e) => changeStart(e.target.value)} /></div>
          <div className="field"><label>End</label><input type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} /></div>
        </div>
      )}
      <div className="cal-two">
        <div className="field">
          <label>Repeat</label>
          <select value={f.repeat} onChange={(e) => set('repeat', e.target.value)}>
            {REPEATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {f.repeat !== 'none' && (
          <div className="field"><label>Until (optional)</label><input type="date" value={f.repeatUntil} onChange={(e) => set('repeatUntil', e.target.value)} /></div>
        )}
      </div>
      {isEdit && repeats && (
        <div className="cal-scope">
          <strong>This is a repeating event. Apply to:</strong>
          <label><input type="radio" name="scope" checked={f.scope === 'this'} onChange={() => set('scope', 'this')} /> Only {shortDay(f.occurrenceDate)}</label>
          <label><input type="radio" name="scope" checked={f.scope === 'all'} onChange={() => set('scope', 'all')} /> All events in the series</label>
        </div>
      )}
      {error && <div className="cal-error">{error}</div>}
      <div className="cal-row">
        <button className="cal-btn primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        {isEdit && <button className="cal-btn danger" disabled={busy} onClick={remove}>Delete</button>}
      </div>
    </Sheet>
  );
}

function CalendarsSheet({ calendars, post, onClose, onChanged }) {
  const [rows, setRows] = useState(calendars.map((c) => ({ ...c })));
  const [fresh, setFresh] = useState({ name: '', color: '#3b82f6', blocks: false, feed: false });
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');

  const upd = (id, k, v) => setRows((rs) => rs.map((r) => (r.calendarId === id ? { ...r, [k]: v } : r)));

  async function saveRow(r) {
    setBusyId(r.calendarId); setMsg('');
    const res = await post('calSaveCalendar', r);
    setBusyId('');
    if (res.error) setMsg(res.error); else { setMsg(`Saved "${r.name}".`); onChanged(); }
  }
  async function deleteRow(r) {
    const n = r.eventCount;
    const ok = window.confirm(`Delete the "${r.name}" calendar and ALL ${n} of its events? This cannot be undone.`);
    if (!ok) return;
    setBusyId(r.calendarId); setMsg('');
    const res = await post('calDeleteCalendar', { calendarId: r.calendarId, confirm: true });
    setBusyId('');
    if (res.error) setMsg(res.error);
    else { setRows((rs) => rs.filter((x) => x.calendarId !== r.calendarId)); setMsg(`Deleted "${r.name}" and ${res.eventsDeleted} events.`); onChanged(); }
  }
  async function addRow() {
    setBusyId('new'); setMsg('');
    const res = await post('calSaveCalendar', fresh);
    setBusyId('');
    if (res.error) { setMsg(res.error); return; }
    setRows((rs) => [...rs, { ...fresh, calendarId: res.calendarId, eventCount: 0, type: 'custom' }]);
    setFresh({ name: '', color: '#3b82f6', blocks: false, feed: false });
    setMsg(`Added "${fresh.name}".`); onChanged();
  }

  return (
    <Sheet title="Calendars" onClose={onClose}>
      {rows.map((r) => (
        <div key={r.calendarId} className="cal-calrow">
          <div className="cal-row">
            <input type="color" className="cal-color" value={r.color} onChange={(e) => upd(r.calendarId, 'color', e.target.value)} aria-label="Color" />
            <input style={{ flex: 1, minWidth: 120, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 15 }} value={r.name} onChange={(e) => upd(r.calendarId, 'name', e.target.value)} />
          </div>
          <label className="cal-check"><input type="checkbox" checked={r.blocks} onChange={(e) => upd(r.calendarId, 'blocks', e.target.checked)} /> Blocks time on the public lesson calendar</label>
          <label className="cal-check"><input type="checkbox" checked={r.feed} onChange={(e) => upd(r.calendarId, 'feed', e.target.checked)} /> Show on Skylight (calendar link)</label>
          <div className="cal-row">
            <button className="cal-btn small primary" disabled={busyId === r.calendarId} onClick={() => saveRow(r)}>Save</button>
            <button className="cal-btn small danger" disabled={busyId === r.calendarId} onClick={() => deleteRow(r)}>Delete ({r.eventCount} events)</button>
          </div>
        </div>
      ))}
      <div className="cal-calrow">
        <strong style={{ fontSize: 14 }}>Add a calendar</strong>
        <div className="cal-row">
          <input type="color" className="cal-color" value={fresh.color} onChange={(e) => setFresh({ ...fresh, color: e.target.value })} aria-label="Color" />
          <input style={{ flex: 1, minWidth: 120, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10, fontSize: 15 }} placeholder="Name" value={fresh.name} onChange={(e) => setFresh({ ...fresh, name: e.target.value })} />
        </div>
        <label className="cal-check"><input type="checkbox" checked={fresh.blocks} onChange={(e) => setFresh({ ...fresh, blocks: e.target.checked })} /> Blocks time on the public lesson calendar</label>
        <label className="cal-check"><input type="checkbox" checked={fresh.feed} onChange={(e) => setFresh({ ...fresh, feed: e.target.checked })} /> Show on Skylight (calendar link)</label>
        <button className="cal-btn small primary" style={{ alignSelf: 'flex-start' }} disabled={!fresh.name.trim() || busyId === 'new'} onClick={addRow}>Add calendar</button>
      </div>
      {msg && <div className={/Saved|Added|Deleted/.test(msg) ? 'cal-ok' : 'cal-error'}>{msg}</div>}
    </Sheet>
  );
}

function RequestsSheet({ requests, post, onClose, onChanged }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [local, setLocal] = useState(requests);

  async function setStatus(r, status) {
    setBusy(r.requestId); setError('');
    const res = await post('calSetRequestStatus', { requestId: r.requestId, status });
    setBusy('');
    if (res.error) { setError(res.error); return; }
    setLocal((ls) => (status === 'declined' ? ls.filter((x) => x.requestId !== r.requestId) : ls.map((x) => (x.requestId === r.requestId ? { ...x, status } : x))));
    onChanged();
  }

  return (
    <Sheet title="Lesson requests" onClose={onClose}>
      <div className="cal-note">Confirming keeps the time marked Booked. Declining opens it back up. Neither one sends the client an email.</div>
      {local.length === 0 && <div className="cal-empty">No upcoming requests.</div>}
      {local.map((r) => (
        <div key={r.requestId} className="cal-calrow">
          <div><strong>{r.name}</strong> · <a href={`mailto:${r.email}`}>{r.email}</a></div>
          <div>{longDay(r.date)}, {fmtTime(r.startTime)} – {fmtTime(r.endTime)}</div>
          <div className="cal-row">
            <span className={r.status === 'confirmed' ? 'cal-ok' : 'cal-note'}>{r.status === 'confirmed' ? 'Confirmed' : 'Waiting for you'}</span>
            <span style={{ flex: 1 }} />
            {r.status !== 'confirmed' && <button className="cal-btn small primary" disabled={busy === r.requestId} onClick={() => setStatus(r, 'confirmed')}>Confirm</button>}
            <button className="cal-btn small danger" disabled={busy === r.requestId} onClick={() => setStatus(r, 'declined')}>Decline</button>
          </div>
        </div>
      ))}
      {error && <div className="cal-error">{error}</div>}
    </Sheet>
  );
}

function SettingsSheet({ get, post, onClose }) {
  const [s, setS] = useState(null);
  const [feed, setFeed] = useState('');
  const [msg, setMsg] = useState('');
  const [bookingCode, setBookingCode] = useState('');
  const [newCode, setNewCode] = useState('');

  useEffect(() => {
    get('calSettings').then((r) => { if (!r.error) setS(r); else setMsg(r.error); });
    get('calFeedInfo').then((r) => { if (r.url) setFeed(r.url); });
  }, []); // eslint-disable-line

  if (!s) return <Sheet title="Settings" onClose={onClose}>{msg ? <div className="cal-error">{msg}</div> : <div className="cal-empty">Loading…</div>}</Sheet>;

  const setRow = (i, k, v) => setS((p) => ({ ...p, availability: p.availability.map((r, n) => (n === i ? { ...r, [k]: v } : r)) }));

  async function saveAvail() {
    setMsg('');
    const res = await post('calSaveAvailability', {
      slotMinutes: Number(s.slotMinutes), horizonDays: Number(s.horizonDays), availability: s.availability,
    });
    setMsg(res.error ? res.error : 'Saved. The public lesson page is updated.');
  }
  async function saveBookingCode(clear) {
    const res = await post('calSetBookingCode', { code: clear ? '' : bookingCode });
    if (res.error) setMsg(res.error);
    else { setMsg(res.required ? 'Booking code is on.' : 'Booking code is off.'); setS((p) => ({ ...p, bookingCodeSet: res.required })); setBookingCode(''); }
  }
  async function changeCode() {
    const res = await post('calChangeCode', { newCode });
    setMsg(res.error ? res.error : 'Access code changed. Use the new one next time you log in.');
    if (!res.error) setNewCode('');
  }
  async function regen() {
    if (!window.confirm('Make a new link? The old Skylight link will stop working and you will need to paste the new one into Skylight.')) return;
    const res = await post('calRegenFeedKey');
    if (res.url) { setFeed(res.url); setMsg('New link created.'); } else setMsg(res.error || 'Could not create a link.');
  }
  async function copyFeed() {
    try { await navigator.clipboard.writeText(feed); setMsg('Link copied.'); } catch (e) { setMsg('Press and hold the link to copy it.'); }
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <h3 style={{ margin: 0, fontSize: 15 }}>Private lesson hours (public page)</h3>
      <div className="cal-note">Times you offer private lessons. Anything already on a blocking calendar, a clinic, or a request shows as Booked.</div>
      {s.availability.map((r, i) => (
        <div key={i} className="cal-row">
          <select value={r.weekday} onChange={(e) => setRow(i, 'weekday', Number(e.target.value))} style={{ padding: 10, borderRadius: 10, border: '1px solid var(--line)' }}>
            {DAY_NAMES.map((d, n) => <option key={d} value={n}>{d}</option>)}
          </select>
          <input type="time" value={r.start} onChange={(e) => setRow(i, 'start', e.target.value)} style={{ padding: 9, borderRadius: 10, border: '1px solid var(--line)' }} />
          <span>to</span>
          <input type="time" value={r.end} onChange={(e) => setRow(i, 'end', e.target.value)} style={{ padding: 9, borderRadius: 10, border: '1px solid var(--line)' }} />
          <button className="cal-btn small danger" onClick={() => setS((p) => ({ ...p, availability: p.availability.filter((_, n) => n !== i) }))}>Remove</button>
        </div>
      ))}
      <button className="cal-btn small" style={{ alignSelf: 'flex-start' }} onClick={() => setS((p) => ({ ...p, availability: [...p.availability, { weekday: 1, start: '09:00', end: '12:00' }] }))}>+ Add hours</button>
      <div className="cal-two">
        <div className="field"><label>Lesson length (minutes)</label><input type="number" min="15" max="240" step="5" value={s.slotMinutes} onChange={(e) => setS({ ...s, slotMinutes: e.target.value })} /></div>
        <div className="field"><label>Days ahead to show</label><input type="number" min="7" max="90" value={s.horizonDays} onChange={(e) => setS({ ...s, horizonDays: e.target.value })} /></div>
      </div>
      <button className="cal-btn primary" style={{ alignSelf: 'flex-start' }} onClick={saveAvail}>Save hours</button>

      <h3 style={{ margin: '10px 0 0', fontSize: 15 }}>Booking code (optional)</h3>
      <div className="cal-note">{s.bookingCodeSet ? 'A code is required to request a lesson.' : 'Off. Anyone can request a lesson.'} Put the code in your weekly email so only your clients can book.</div>
      <div className="cal-row">
        <input value={bookingCode} onChange={(e) => setBookingCode(e.target.value)} placeholder="New booking code" style={{ flex: 1, minWidth: 140, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10 }} />
        <button className="cal-btn small primary" disabled={!bookingCode.trim()} onClick={() => saveBookingCode(false)}>Set</button>
        {s.bookingCodeSet && <button className="cal-btn small" onClick={() => saveBookingCode(true)}>Turn off</button>}
      </div>

      <h3 style={{ margin: '10px 0 0', fontSize: 15 }}>Skylight link (Household calendar only)</h3>
      <div className="cal-note">Anyone with this link can see your Household events, so keep it private.</div>
      {feed && <div className="cal-link">{feed}</div>}
      <div className="cal-row">
        <button className="cal-btn small" disabled={!feed} onClick={copyFeed}>Copy link</button>
        <button className="cal-btn small danger" onClick={regen}>Make a new link</button>
      </div>

      <h3 style={{ margin: '10px 0 0', fontSize: 15 }}>Change calendar access code</h3>
      <div className="cal-row">
        <input type="password" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="New code (6+ characters)" style={{ flex: 1, minWidth: 160, padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 10 }} />
        <button className="cal-btn small primary" disabled={newCode.length < 6} onClick={changeCode}>Change</button>
      </div>
      {msg && <div className={/Saved|on\.|off\.|copied|changed|created/i.test(msg) ? 'cal-ok' : 'cal-error'}>{msg}</div>}
    </Sheet>
  );
}
