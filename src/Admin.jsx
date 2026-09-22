import React, { useEffect, useState, useRef } from 'react';
import { apiGet, apiPost } from './api.js';

const TOKEN_KEY = 'ark_admin_token';

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (token) verifyToken(token);
  }, []); // eslint-disable-line

  async function verifyToken(candidate) {
    setChecking(true);
    setAuthError('');
    const res = await apiGet('adminBookings', { token: candidate });
    setChecking(false);
    if (res?.error) {
      setAuthError('Incorrect password.');
      setAuthed(false);
    } else {
      localStorage.setItem(TOKEN_KEY, candidate);
      setAuthed(true);
    }
  }

  if (!authed) {
    return (
      <div className="page">
        <header className="site-header">
          <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
          <h1>Admin</h1>
          <div className="net-cord" />
        </header>
        <div className="booking-form">
          <div className="field">
            <label>Admin Password</label>
            <input type="password" value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          {authError && <div className="empty-state" style={{ color: 'var(--error)' }}>{authError}</div>}
          <button className="submit-btn" disabled={!token || checking} onClick={() => verifyToken(token)}>
            {checking ? 'Checking…' : 'Log In'}
          </button>
        </div>
      </div>
    );
  }

  return <Dashboard token={token} />;
}

function Dashboard({ token }) {
  const [data, setData] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [adminClinics, setAdminClinics] = useState([]);
  const [tab, setTab] = useState('signups');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    apiGet('adminBookings', { token }).then(setData);
    apiGet('clinics').then((c) => setClinics(Array.isArray(c) ? c : []));
    apiGet('adminClinics', { token }).then((c) => setAdminClinics(Array.isArray(c) ? c : []));
  }, [token, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  async function markPaid(sheetTab, rowId, idColumnName) {
    await apiPost('markPaid', { token, tab: sheetTab, rowId, idColumnName, status: 'paid' });
    refresh();
  }

  async function markComplete(orderId) {
    await apiPost('adminMarkStringingComplete', { token, orderId });
    refresh();
  }

  if (!data) return <div className="page"><div className="loading-state">Loading dashboard…</div></div>;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <header className="site-header">
        <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
        <h1>Admin Dashboard</h1>
        <div className="net-cord" />
      </header>

      <WalkInForm token={token} clinics={clinics} onAdded={refresh} />
      <ManualPackForm token={token} clinics={adminClinics} onAdded={refresh} />
      <StringingOrderForm token={token} onAdded={refresh} />
      <CancelClassForm token={token} clinics={clinics} onCancelled={refresh} />

      <div className="category-toggle" style={{ margin: '20px 20px 4px' }}>
        {['roster', 'packLookup', 'signups', 'packs', 'stringingOrders', 'makeupCredits', 'clinics'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {labelFor(t)}
          </button>
        ))}
      </div>

      {tab === 'clinics' ? (
        <ClinicsEditor token={token} clinics={adminClinics} onSaved={refresh} />
      ) : tab === 'roster' ? (
        <RosterTab token={token} clinics={adminClinics} onMarkPaid={markPaid} />
      ) : tab === 'packLookup' ? (
        <PackLookupTab token={token} />
      ) : (
        <div style={{ padding: '16px 20px 40px', overflowX: 'auto' }}>
          <DataTable
            rows={data[tab] || []}
            tab={tab}
            onMarkPaid={markPaid}
            onMarkComplete={markComplete}
          />
        </div>
      )}
    </div>
  );
}

function labelFor(t) {
  return { roster: 'Roster', packLookup: 'Pack Lookup', signups: 'Bookings', packs: 'Packs', stringingOrders: 'Stringing', makeupCredits: 'Makeup Credits', clinics: 'Clinics' }[t];
}

const SHEET_META = {
  signups: { idCol: 'SignupID', columns: ['ClientName', 'ChildName', 'ClinicID', 'SessionDate', 'PlanType', 'PaymentMethod', 'PaymentStatus', 'Source'] },
  packs: { idCol: 'PackId', columns: ['ClientName', 'ChildName', 'PackGroup', 'SessionsRemaining', 'ExpiryDate', 'PricePaid', 'PaymentMethod', 'PaymentStatus'] },
  stringingOrders: { idCol: 'OrderID', columns: ['ClientName', 'RacketDescription', 'StringID', 'Tension', 'DateReceived', 'DateCompleted', 'PaymentMethod', 'PaymentStatus', 'Status'] },
  makeupCredits: { idCol: 'CreditID', columns: ['ClientName', 'OriginClinicID', 'OriginDate', 'Status', 'ExpiryDate'] },
};

function DataTable({ rows, tab, onMarkPaid, onMarkComplete }) {
  const meta = SHEET_META[tab];
  if (!rows || rows.length === 0) return <div className="empty-state">Nothing here yet.</div>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          {meta.columns.map((c) => (
            <th key={c} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--line)', fontFamily: 'var(--font-mono)', fontWeight: 400, color: 'var(--muted)' }}>
              {c}
            </th>
          ))}
          {meta.columns.includes('PaymentStatus') && <th style={{ padding: '8px 10px', borderBottom: '2px solid var(--line)' }} />}
          {tab === 'stringingOrders' && <th style={{ padding: '8px 10px', borderBottom: '2px solid var(--line)' }} />}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
            {meta.columns.map((c) => (
              <td key={c} style={{ padding: '8px 10px' }}>{String(row[c] ?? '')}</td>
            ))}
            {meta.columns.includes('PaymentStatus') && (
              <td style={{ padding: '8px 10px' }}>
                {row.PaymentStatus === 'pending' && (
                  <button
                    className="option-pill"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => onMarkPaid(tabToSheetName(tab), row[meta.idCol], meta.idCol)}
                  >
                    Mark Paid
                  </button>
                )}
              </td>
            )}
            {tab === 'stringingOrders' && (
              <td style={{ padding: '8px 10px' }}>
                {row.Status !== 'done' && (
                  <button
                    className="option-pill"
                    style={{ padding: '6px 10px', fontSize: 12 }}
                    onClick={() => onMarkComplete(row.OrderID)}
                  >
                    Mark Complete
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function tabToSheetName(tab) {
  return { signups: 'Signups', packs: 'Packs', stringingOrders: 'StringingOrders', makeupCredits: 'MakeupCredits' }[tab];
}

function PackLookupTab({ token }) {
  const [query, setQuery] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reconciliation, setReconciliation] = useState(null);
  const [checkingReconciliation, setCheckingReconciliation] = useState(false);

  async function pickClient(s) {
    setQuery(s.name);
    setContactValue(s.email);
    setLoading(true);
    const res = await apiGet('adminClientPackDetail', { token, contactValue: s.email });
    setDetail(res);
    setLoading(false);
  }

  async function checkReconciliation() {
    setCheckingReconciliation(true);
    const res = await apiGet('adminPackReconciliation', { token });
    setReconciliation(Array.isArray(res) ? res : []);
    setCheckingReconciliation(false);
  }

  return (
    <div style={{ padding: '16px 20px 40px' }}>
      <div className="field">
        <label>Look up a client's pack(s)</label>
        <ClientAutocomplete token={token} query={query} onQueryChange={setQuery} onPick={pickClient} placeholder="Start typing a name or email…" />
      </div>

      {loading && <div className="loading-state">Loading pack detail…</div>}

      {detail && !loading && (
        <div style={{ marginTop: 16 }}>
          {detail.packs.length === 0 && <div className="empty-state">No packs found for this contact.</div>}
          {detail.packs.map((p) => (
            <div key={p.packId} className="clinic-card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 10, marginBottom: 12 }}>
              <div className="info">
                <span className="clinic-day">{p.packGroup}</span>
                <h3>{p.sessionsRemaining} of {p.sessionsTotal} remaining</h3>
                <span className="time">Purchased {p.purchaseDate} · Expires {p.expiryDate} · ${p.pricePaid} · {p.paymentStatus}</span>
              </div>

              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>BOOKINGS AGAINST THIS PACK ({p.bookings.length})</div>
                {p.bookings.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>None yet.</div>}
                {p.bookings.map((b, i) => (
                  <div key={i} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                    {b.clinicId} — {b.sessionDate} {b.bookingStatus === 'cancelled' && <span style={{ color: 'var(--error)' }}>(cancelled)</span>}
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>HISTORY</div>
                {p.history.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>No history logged (pack predates the audit trail).</div>}
                {p.history.map((h, i) => (
                  <div key={i} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                    <strong>{h.change > 0 ? `+${h.change}` : h.change}</strong> → {h.resultingRemaining} remaining — {h.note} <span style={{ color: 'var(--muted)' }}>({h.timestamp})</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {detail.makeupCredits && detail.makeupCredits.length > 0 && (
            <div className="clinic-card" style={{ cursor: 'default', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div className="info"><h3>Makeup Credits</h3></div>
              {detail.makeupCredits.map((c, i) => (
                <div key={i} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                  {c.OriginClinicID} — {c.OriginDate} — <strong>{c.Status}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: '0 0 10px' }}>Reconciliation Check</h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px' }}>
          Cross-checks every pack's remaining-sessions count against its actual booking history and flags anything that doesn't add up.
        </p>
        <button className="submit-btn" disabled={checkingReconciliation} onClick={checkReconciliation}>
          {checkingReconciliation ? 'Checking…' : 'Check All Packs'}
        </button>

        {reconciliation && (
          <div style={{ marginTop: 12 }}>
            {reconciliation.length === 0 ? (
              <div className="confirmation"><p style={{ margin: 0 }}>Everything checks out — no mismatches found.</p></div>
            ) : (
              reconciliation.map((r) => (
                <div key={r.packId} className="clinic-card" style={{ cursor: 'default', marginBottom: 8 }}>
                  <div className="info">
                    <h3>{r.clientName} — {r.packGroup}</h3>
                    <span className="time">{r.contactValue}</span>
                  </div>
                  <div style={{ color: 'var(--error)', fontSize: 13, fontWeight: 600 }}>
                    Shows {r.storedRemaining}, expected {r.expectedRemaining}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RosterTab({ token, clinics, onMarkPaid }) {
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [dates, setDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);

  function pickClinic(c) {
    setSelectedClinic(c);
    setSelectedDate(null);
    setRoster([]);
    setLoadingDates(true);
    apiGet('adminRosterDates', { token, clinicId: c.clinicId }).then((d) => {
      setDates(Array.isArray(d) ? d : []);
      setLoadingDates(false);
    });
  }

  function pickDate(date) {
    setSelectedDate(date);
    setLoadingRoster(true);
    apiGet('adminRoster', { token, clinicId: selectedClinic.clinicId, date }).then((r) => {
      setRoster(Array.isArray(r) ? r : []);
      setLoadingRoster(false);
    });
  }

  async function markPaidAndRefresh(signupId) {
    await onMarkPaid('Signups', signupId, 'SignupID');
    pickDate(selectedDate);
  }

  // Step 1: pick a clinic
  if (!selectedClinic) {
    return (
      <div className="clinic-list" style={{ paddingBottom: 24 }}>
        {(!clinics || clinics.length === 0) && <div className="empty-state">No clinics found.</div>}
        {clinics && clinics.map((c) => (
          <div key={c.clinicId} className="clinic-card" onClick={() => pickClinic(c)}>
            <div className="info">
              <span className="clinic-day">{c.dayOfWeek}</span>
              <h3>{c.name}</h3>
              <span className="time">{c.startTime} – {c.endTime}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Step 2: pick a date for that clinic
  if (!selectedDate) {
    return (
      <div style={{ padding: '16px 20px 40px' }}>
        <button className="option-pill" style={{ marginBottom: 12 }} onClick={() => setSelectedClinic(null)}>← All Clinics</button>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: '0 0 10px' }}>{selectedClinic.name}</h3>
        {loadingDates && <div className="loading-state">Loading dates…</div>}
        {!loadingDates && dates.length === 0 && <div className="empty-state">No bookings recorded for this clinic yet.</div>}
        <div className="clinic-list" style={{ padding: 0 }}>
          {dates.map((d) => (
            <div key={d.date} className="clinic-card" onClick={() => pickDate(d.date)}>
              <div className="info">
                <h3>{d.date}</h3>
              </div>
              <div className="price">{d.count} player{d.count === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Step 3: roster for that clinic + date
  return (
    <div style={{ padding: '16px 20px 40px', overflowX: 'auto' }}>
      <button className="option-pill" style={{ marginBottom: 12 }} onClick={() => setSelectedDate(null)}>← {selectedClinic.name} Dates</button>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: '0 0 10px' }}>{selectedClinic.name} — {selectedDate}</h3>
      {loadingRoster && <div className="loading-state">Loading roster…</div>}
      {!loadingRoster && roster.length === 0 && <div className="empty-state">No one booked for this date.</div>}
      {!loadingRoster && roster.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['ClientName', 'ChildName', 'PlanType', 'PaymentMethod', 'PaymentStatus'].map((c) => (
                <th key={c} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid var(--line)', fontFamily: 'var(--font-mono)', fontWeight: 400, color: 'var(--muted)' }}>
                  {c}
                </th>
              ))}
              <th style={{ padding: '8px 10px', borderBottom: '2px solid var(--line)' }} />
            </tr>
          </thead>
          <tbody>
            {roster.map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '8px 10px' }}>{row.ClientName}</td>
                <td style={{ padding: '8px 10px' }}>{row.ChildName}</td>
                <td style={{ padding: '8px 10px' }}>{row.PlanType}</td>
                <td style={{ padding: '8px 10px' }}>{row.PaymentMethod}</td>
                <td style={{ padding: '8px 10px' }}>{row.PaymentStatus}</td>
                <td style={{ padding: '8px 10px' }}>
                  {row.PaymentStatus === 'pending' && (
                    <button className="option-pill" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => markPaidAndRefresh(row.SignupID)}>
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PackSettingsEditor({ token, clinics }) {
  const [options, setOptions] = useState({}); // packGroup -> array of {packSize, packPrice, packExpiryDays}, or undefined until loaded
  const [edits, setEdits] = useState({}); // `${packGroup}:${packSize}` -> partial edits
  const [saving, setSaving] = useState(null);
  const [newSizeDrafts, setNewSizeDrafts] = useState({}); // packGroup -> {packSize, packPrice, packExpiryDays}

  // Distinct packGroups actually in use, e.g. "Junior-25", "Junior-30", "Junior-35", "Adult-40"
  const packGroups = [...new Set((clinics || []).map((c) => c.packGroup))].sort();

  useEffect(() => {
    packGroups.forEach((pg) => {
      if (!(pg in options)) {
        apiGet('packSettings', { packGroup: pg }).then((res) => setOptions((prev) => ({ ...prev, [pg]: Array.isArray(res) ? res : [] })));
      }
    });
  }, [clinics]); // eslint-disable-line

  function setField(packGroup, packSize, field, value) {
    const key = `${packGroup}:${packSize}`;
    setEdits((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function save(packGroup, opt) {
    const key = `${packGroup}:${opt.packSize}`;
    setSaving(key);
    const merged = { ...opt, ...edits[key] };
    await apiPost('updatePackSettings', { token, packGroup, packSize: opt.packSize, ...merged });
    setSaving(null);
    setEdits((prev) => ({ ...prev, [key]: {} }));
    apiGet('packSettings', { packGroup }).then((res) => setOptions((prev) => ({ ...prev, [packGroup]: Array.isArray(res) ? res : [] })));
  }

  function setDraftField(packGroup, field, value) {
    setNewSizeDrafts((prev) => ({ ...prev, [packGroup]: { ...prev[packGroup], [field]: value } }));
  }

  async function createNewSize(packGroup) {
    const draft = newSizeDrafts[packGroup] || {};
    if (!draft.packSize) return;
    setSaving(`${packGroup}:new`);
    await apiPost('updatePackSettings', { token, packGroup, ...draft });
    setSaving(null);
    setNewSizeDrafts((prev) => ({ ...prev, [packGroup]: {} }));
    apiGet('packSettings', { packGroup }).then((res) => setOptions((prev) => ({ ...prev, [packGroup]: Array.isArray(res) ? res : [] })));
  }

  if (packGroups.length === 0) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, margin: '0 0 10px' }}>Pack Settings (by price tier)</h3>
      {packGroups.map((packGroup) => {
        const opts = options[packGroup];
        const [category, price] = packGroup.split('-');
        const draft = newSizeDrafts[packGroup] || {};

        if (opts === undefined) return <div key={packGroup} className="loading-state">Loading {packGroup}…</div>;

        return (
          <div key={packGroup} style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              {category} — ${price}/session {opts.length === 0 && <span style={{ color: 'var(--error)' }}>— no pack sizes configured yet</span>}
            </div>

            {opts.map((opt) => {
              const key = `${packGroup}:${opt.packSize}`;
              const edit = edits[key] || {};
              return (
                <div key={key} className="clinic-card" style={{ cursor: 'default', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
                  <div className="info" style={{ flex: '1 1 100px' }}>
                    <h3>{opt.packSize}-Pack</h3>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Price</label>
                      <input type="number" style={{ width: 90, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}
                        value={edit.packPrice ?? opt.packPrice} onChange={(e) => setField(packGroup, opt.packSize, 'packPrice', e.target.value)} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Expiry (days)</label>
                      <input type="number" style={{ width: 80, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}
                        value={edit.packExpiryDays ?? opt.packExpiryDays} onChange={(e) => setField(packGroup, opt.packSize, 'packExpiryDays', e.target.value)} />
                    </div>
                    <button className="option-pill" style={{ padding: '10px 14px' }} disabled={saving === key} onClick={() => save(packGroup, opt)}>
                      {saving === key ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              );
            })}

            <div className="clinic-card" style={{ cursor: 'default', flexWrap: 'wrap', gap: 12, background: 'rgba(176, 141, 62, 0.06)' }}>
              <div className="info" style={{ flex: '1 1 100px' }}>
                <h3 style={{ fontSize: 14, color: 'var(--muted)' }}>+ Add Size</h3>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Sessions</label>
                  <input type="number" style={{ width: 70, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}
                    value={draft.packSize ?? ''} placeholder="4" onChange={(e) => setDraftField(packGroup, 'packSize', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Price</label>
                  <input type="number" style={{ width: 90, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}
                    value={draft.packPrice ?? ''} placeholder="100" onChange={(e) => setDraftField(packGroup, 'packPrice', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Expiry (days)</label>
                  <input type="number" style={{ width: 80, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}
                    value={draft.packExpiryDays ?? 120} onChange={(e) => setDraftField(packGroup, 'packExpiryDays', e.target.value)} />
                </div>
                <button className="option-pill" style={{ padding: '10px 14px' }} disabled={!draft.packSize || saving === `${packGroup}:new`} onClick={() => createNewSize(packGroup)}>
                  {saving === `${packGroup}:new` ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ClinicsEditor({ token, clinics, onSaved }) {
  const [edits, setEdits] = useState({}); // clinicId -> { sessionPrice }
  const [savingId, setSavingId] = useState(null);

  function setField(clinicId, field, value) {
    setEdits((prev) => ({ ...prev, [clinicId]: { ...prev[clinicId], [field]: value } }));
  }

  async function save(clinicId) {
    setSavingId(clinicId);
    await apiPost('updateClinic', { token, clinicId, ...edits[clinicId] });
    setSavingId(null);
    setEdits((prev) => ({ ...prev, [clinicId]: {} }));
    onSaved();
  }

  return (
    <div style={{ padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <PackSettingsEditor token={token} clinics={clinics} />

      {(!clinics || clinics.length === 0) && <div className="empty-state">No clinics found.</div>}
      {clinics && clinics.map((c) => {
        const edit = edits[c.clinicId] || {};
        return (
          <div key={c.clinicId} className="clinic-card" style={{ cursor: 'default', flexWrap: 'wrap', gap: 12 }}>
            <div className="info" style={{ flex: '1 1 220px' }}>
              <span className="clinic-day">{c.dayOfWeek}</span>
              <h3>{c.name}{!c.active && ' (inactive)'}</h3>
              <span className="time">{c.startTime} – {c.endTime}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Session Price</label>
                <input
                  type="number"
                  style={{ width: 90, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}
                  value={edit.sessionPrice ?? c.sessionPrice}
                  onChange={(e) => setField(c.clinicId, 'sessionPrice', e.target.value)}
                />
              </div>
              <button
                className="option-pill"
                style={{ padding: '10px 14px' }}
                disabled={!edits[c.clinicId] || savingId === c.clinicId}
                onClick={() => save(c.clinicId)}
              >
                {savingId === c.clinicId ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CancelClassForm({ token, clinics, onCancelled }) {
  const [open, setOpen] = useState(false);
  const [clinicId, setClinicId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setDate('');
    setResult(null);
    if (clinicId) {
      setLoadingSlots(true);
      apiGet('slots', { clinicId, weeks: 4 }).then((data) => {
        setSlots(Array.isArray(data) ? data : []);
        setLoadingSlots(false);
      });
    }
  }, [clinicId]);

  async function submit() {
    setSubmitting(true);
    const res = await apiPost('cancelClinic', { token, clinicId, date, reason });
    setSubmitting(false);
    setResult(res);
    onCancelled();
  }

  if (!open) {
    return (
      <div style={{ padding: '8px 20px 0' }}>
        <button
          className="submit-btn"
          style={{ background: 'var(--error)' }}
          onClick={() => setOpen(true)}
        >
          Cancel an Upcoming Class
        </button>
      </div>
    );
  }

  return (
    <div className="booking-form" style={{ paddingTop: 16 }}>
      <div className="field">
        <label>Clinic</label>
        <select value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
          <option value="">Choose a clinic</option>
          {clinics.map((c) => (
            <option key={c.clinicId} value={c.clinicId}>{c.name}</option>
          ))}
        </select>
      </div>

      {clinicId && (
        <div className="field">
          <label>Date to Cancel</label>
          {loadingSlots && <div className="loading-state">Loading upcoming dates…</div>}
          {!loadingSlots && (
            <select value={date} onChange={(e) => setDate(e.target.value)}>
              <option value="">Choose a date</option>
              {slots.map((s) => (
                <option key={s.date} value={s.date}>{s.date}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="field">
        <label>Reason (included in the email to players)</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Rain" />
      </div>

      {result && !result.error && (
        <div className="confirmation" style={{ margin: 0 }}>
          <p style={{ margin: 0 }}>
            Cancelled. {result.affectedCount} player{result.affectedCount === 1 ? '' : 's'} notified by email
            and issued a makeup credit.
          </p>
        </div>
      )}

      <div className="option-row">
        <button className="submit-btn" style={{ background: 'var(--error)' }} disabled={!clinicId || !date || submitting} onClick={submit}>
          {submitting ? 'Cancelling…' : 'Confirm Cancellation'}
        </button>
        <button className="submit-btn" style={{ background: 'var(--line)', color: 'var(--charcoal)' }} onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  );
}

function StringingOrderForm({ token, onAdded }) {
  const [open, setOpen] = useState(false);
  const [strings, setStrings] = useState([]);
  const [grips, setGrips] = useState([]);
  const [racketDescription, setRacketDescription] = useState('');
  const [stringId, setStringId] = useState('');
  const [tension, setTension] = useState('');
  const [gripAddOn, setGripAddOn] = useState('');
  const [clientName, setClientName] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [dateReceived, setDateReceived] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('other');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      apiGet('strings').then((data) => setStrings(Array.isArray(data) ? data : []));
      apiGet('grips').then((data) => setGrips(Array.isArray(data) ? data : []));
    }
  }, [open]);

  function pickClient(s) {
    setClientName(s.name);
    setContactValue(s.email);
  }

  async function submit() {
    setSubmitting(true);
    await apiPost('adminAddStringingOrder', {
      token, racketDescription, stringId, tension, gripAddOn,
      clientName, contactValue, dateReceived, paymentMethod
    });
    setSubmitting(false);
    setRacketDescription('');
    setStringId('');
    setTension('');
    setGripAddOn('');
    setClientName('');
    setContactValue('');
    setDateReceived(new Date().toISOString().slice(0, 10));
    setPaymentMethod('other');
    onAdded();
    setOpen(false);
  }

  if (!open) {
    return (
      <div style={{ padding: '8px 20px 0' }}>
        <button className="submit-btn" onClick={() => setOpen(true)}>+ Add Stringing Order</button>
      </div>
    );
  }

  const canSubmit = stringId && tension && clientName && dateReceived && paymentMethod;

  return (
    <div className="booking-form" style={{ paddingTop: 16 }}>
      <div className="field">
        <label>Client Name</label>
        <ClientAutocomplete token={token} query={clientName} onQueryChange={setClientName} onPick={pickClient} placeholder="Start typing a name or email…" />
      </div>
      <div className="field">
        <label>Email (optional — enables confirmation email)</label>
        <input type="email" value={contactValue} onChange={(e) => setContactValue(e.target.value)} placeholder="you@example.com" />
      </div>
      <div className="field">
        <label>Racket (optional)</label>
        <input value={racketDescription} onChange={(e) => setRacketDescription(e.target.value)} placeholder="e.g. Wilson Blade 98" />
      </div>
      <div className="field">
        <label>String</label>
        <select value={stringId} onChange={(e) => setStringId(e.target.value)}>
          <option value="">Choose a string</option>
          {strings.map((s) => (
            <option key={s.stringId} value={s.stringId}>{s.name} ({s.type}) — ${s.price}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Tension (lbs)</label>
        <input type="number" min="40" max="70" value={tension} onChange={(e) => setTension(e.target.value)} placeholder="e.g. 52" />
      </div>
      {grips.length > 0 && (
        <div className="field">
          <label>Grip (optional)</label>
          <select value={gripAddOn} onChange={(e) => setGripAddOn(e.target.value)}>
            <option value="">No grip</option>
            {grips.map((g) => (
              <option key={g.gripId} value={g.gripId}>{g.name} — ${g.price}</option>
            ))}
          </select>
        </div>
      )}
      <div className="field">
        <label>Date Received</label>
        <input type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} />
      </div>
      <div className="field">
        <label>Payment Method</label>
        <div className="option-row">
          {['venmo', 'zelle', 'other'].map((m) => (
            <div key={m} className={`option-pill ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </div>
          ))}
        </div>
      </div>
      <div className="option-row">
        <button className="submit-btn" disabled={!canSubmit || submitting} onClick={submit}>
          {submitting ? 'Adding…' : 'Add Stringing Order'}
        </button>
        <button className="submit-btn" style={{ background: 'var(--line)', color: 'var(--charcoal)' }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ManualPackForm({ token, clinics, onAdded }) {
  const [open, setOpen] = useState(false);
  const [packGroup, setPackGroup] = useState('');
  const [packSize, setPackSize] = useState(null);
  const [clientName, setClientName] = useState('');
  const [childName, setChildName] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('other');
  const [submitting, setSubmitting] = useState(false);
  const [packOptions, setPackOptions] = useState([]);

  const packGroups = [...new Set((clinics || []).map((c) => c.packGroup))].sort();
  const category = packGroup.split('-')[0];
  const isJunior = category === 'Junior';

  useEffect(() => {
    if (packGroup) {
      apiGet('packSettings', { packGroup }).then((options) => {
        const list = Array.isArray(options) ? options : [];
        setPackOptions(list);
        setPackSize(list.length > 0 ? list[list.length - 1].packSize : null);
      });
    } else {
      setPackOptions([]);
      setPackSize(null);
    }
  }, [packGroup]);

  async function submit() {
    setSubmitting(true);
    await apiPost('adminAddPack', { token, packGroup, packSize, clientName, childName, contactValue, paymentMethod });
    setSubmitting(false);
    setClientName('');
    setChildName('');
    setContactValue('');
    setPackGroup('');
    onAdded();
    setOpen(false);
  }

  if (!open) {
    return (
      <div style={{ padding: '8px 20px 0' }}>
        <button className="submit-btn" onClick={() => setOpen(true)}>+ Record Pack Purchase</button>
      </div>
    );
  }

  return (
    <div className="booking-form" style={{ paddingTop: 16 }}>
      <div className="field">
        <label>Pack (by price tier)</label>
        <select value={packGroup} onChange={(e) => setPackGroup(e.target.value)}>
          <option value="">Choose a pack</option>
          {packGroups.map((pg) => {
            const [cat, price] = pg.split('-');
            return <option key={pg} value={pg}>{cat} — ${price}/session</option>;
          })}
        </select>
        {packGroup && packOptions.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
            This pack tier isn't configured yet — set it up in the Clinics tab's Pack Settings first.
          </div>
        )}
      </div>
      {packGroup && packOptions.length > 0 && (
        <div className="field">
          <label>Size</label>
          <div className="option-row">
            {packOptions.map((o) => (
              <div key={o.packSize} className={`option-pill ${packSize === o.packSize ? 'active' : ''}`} onClick={() => setPackSize(o.packSize)}>
                {o.packSize}-Pack
                <span className="sub">${o.packPrice}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="field">
        <label>{isJunior ? 'Parent / Guardian Name' : 'Client Name'}</label>
        <ClientAutocomplete token={token} query={clientName} onQueryChange={setClientName} onPick={(s) => { setClientName(s.name); setContactValue(s.email); }} placeholder="Start typing a name or email…" />
      </div>
      {isJunior && (
        <div className="field">
          <label>Child's Name</label>
          <input value={childName} onChange={(e) => setChildName(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>Email (optional — enables confirmation email + group add)</label>
        <ClientAutocomplete token={token} query={contactValue} onQueryChange={setContactValue} onPick={(s) => { setClientName(s.name); setContactValue(s.email); }} placeholder="you@example.com" type="email" />
      </div>
      <div className="field">
        <label>Payment Method</label>
        <div className="option-row">
          {['venmo', 'zelle', 'other'].map((m) => (
            <div key={m} className={`option-pill ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </div>
          ))}
        </div>
      </div>
      <div className="option-row">
        <button className="submit-btn" disabled={!packGroup || !packSize || !clientName || submitting} onClick={submit}>
          {submitting ? 'Recording…' : 'Record Purchase'}
        </button>
        <button className="submit-btn" style={{ background: 'var(--line)', color: 'var(--charcoal)' }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function ClientAutocomplete({ token, query, onQueryChange, onPick, placeholder, type }) {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const debounceRef = useRef(null);

  function handleChange(value) {
    onQueryChange(value);
    setShow(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      const res = await apiGet('adminClientSearch', { token, q: value });
      setSuggestions(Array.isArray(res) ? res : []);
    }, 250);
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={type || 'text'}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 150)}
        placeholder={placeholder}
      />
      {show && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: 'var(--shadow)' }}>
          {suggestions.map((s) => (
            <div
              key={s.email}
              style={{ padding: '10px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--line)' }}
              onMouseDown={() => { onPick(s); setShow(false); }}
            >
              <strong>{s.name}</strong> — <span style={{ color: 'var(--muted)' }}>{s.email}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WalkInForm({ token, clinics, onAdded }) {
  const [open, setOpen] = useState(false);
  const [clinicId, setClinicId] = useState('');
  const [dates, setDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [sessionDate, setSessionDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('other');
  const [submitting, setSubmitting] = useState(false);
  const [pack, setPack] = useState(null); // null = not checked, {found:false/true,...}
  const [checkingPack, setCheckingPack] = useState(false);

  const selectedClinic = clinics.find((c) => c.clinicId === clinicId);

  useEffect(() => {
    setSessionDate('');
    setDates([]);
    if (clinicId) {
      setLoadingDates(true);
      apiGet('adminWalkInSlots', { token, clinicId }).then((data) => {
        setDates(Array.isArray(data) ? data : []);
        setLoadingDates(false);
      });
    }
  }, [clinicId]);

  async function checkPack() {
    if (!selectedClinic || !contactValue) return;
    setCheckingPack(true);
    const res = await apiGet('myPack', { packGroup: selectedClinic.packGroup, contactValue });
    setPack(res);
    setCheckingPack(false);
  }

  function pickClient(s) {
    setClientName(s.name);
    setContactValue(s.email);
    setPack(null);
  }

  async function submit() {
    setSubmitting(true);
    const usingPack = paymentMethod === 'pack' && pack?.found;
    await apiPost('walkIn', {
      token, clinicId, clientName, sessionDate,
      paymentMethod: usingPack ? undefined : paymentMethod,
      contactValue,
      packId: usingPack ? pack.packId : undefined,
    });
    setSubmitting(false);
    setClientName('');
    setContactValue('');
    setClinicId('');
    setSessionDate('');
    setPack(null);
    setPaymentMethod('other');
    onAdded();
    setOpen(false);
  }

  if (!open) {
    return (
      <div style={{ padding: '16px 20px 0' }}>
        <button className="submit-btn" onClick={() => setOpen(true)}>+ Add Walk-In</button>
      </div>
    );
  }

  const canSubmit = clinicId && sessionDate && clientName && (paymentMethod !== 'pack' || pack?.found);

  return (
    <div className="booking-form" style={{ paddingTop: 16 }}>
      <div className="field">
        <label>Clinic</label>
        <select value={clinicId} onChange={(e) => { setClinicId(e.target.value); setPack(null); }}>
          <option value="">Choose a clinic</option>
          {clinics.map((c) => (
            <option key={c.clinicId} value={c.clinicId}>{c.name}</option>
          ))}
        </select>
      </div>
      {clinicId && (
        <div className="field">
          <label>Date</label>
          {loadingDates && <div className="loading-state">Loading dates…</div>}
          {!loadingDates && (
            <select value={sessionDate} onChange={(e) => setSessionDate(e.target.value)}>
              <option value="">Choose a date</option>
              {dates.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date}{d.past ? ' (already happened)' : ''} — {d.spotsLeft} spots left
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="field">
        <label>Client Name</label>
        <ClientAutocomplete token={token} query={clientName} onQueryChange={setClientName} onPick={pickClient} placeholder="Start typing a name or email…" />
      </div>
      <div className="field">
        <label>Email (optional — needed to check for a pack)</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <ClientAutocomplete token={token} query={contactValue} onQueryChange={(v) => { setContactValue(v); setPack(null); }} onPick={pickClient} placeholder="you@example.com" type="email" />
          </div>
          <button className="option-pill" style={{ padding: '10px 14px', whiteSpace: 'nowrap' }} disabled={!clinicId || !contactValue || checkingPack} onClick={checkPack}>
            {checkingPack ? 'Checking…' : 'Check Pack'}
          </button>
        </div>
        {pack && (
          <div style={{ fontSize: 12, marginTop: 6, color: pack.found ? 'var(--ink)' : 'var(--error)' }}>
            {pack.found ? `Pack found — ${pack.sessionsRemaining} session(s) remaining.` : 'No active pack found for this email at this clinic\'s price.'}
          </div>
        )}
      </div>
      <div className="field">
        <label>Payment Method</label>
        <div className="option-row">
          {pack?.found && (
            <div className={`option-pill ${paymentMethod === 'pack' ? 'active' : ''}`} onClick={() => setPaymentMethod('pack')}>
              Use Pack
            </div>
          )}
          {['venmo', 'zelle', 'other'].map((m) => (
            <div key={m} className={`option-pill ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </div>
          ))}
        </div>
      </div>
      <div className="option-row">
        <button className="submit-btn" disabled={!canSubmit || submitting} onClick={submit}>
          {submitting ? 'Adding…' : 'Add Walk-In'}
        </button>
        <button className="submit-btn" style={{ background: 'var(--line)', color: 'var(--charcoal)' }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
