import React, { useEffect, useState } from 'react';
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

  if (!data) return <div className="page"><div className="loading-state">Loading dashboard…</div></div>;

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <header className="site-header">
        <img src="/logo.png" alt="ARK Tennis" className="brand-logo" />
        <h1>Admin Dashboard</h1>
        <div className="net-cord" />
      </header>

      <WalkInForm token={token} clinics={clinics} onAdded={refresh} />
      <ManualPackForm token={token} clinics={clinics} onAdded={refresh} />
      <CancelClassForm token={token} clinics={clinics} onCancelled={refresh} />

      <div className="category-toggle" style={{ margin: '20px 20px 4px' }}>
        {['signups', 'packs', 'stringingOrders', 'makeupCredits', 'clinics'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {labelFor(t)}
          </button>
        ))}
      </div>

      {tab === 'clinics' ? (
        <ClinicsEditor token={token} clinics={adminClinics} onSaved={refresh} />
      ) : (
        <div style={{ padding: '16px 20px 40px', overflowX: 'auto' }}>
          <DataTable
            rows={data[tab] || []}
            tab={tab}
            onMarkPaid={markPaid}
          />
        </div>
      )}
    </div>
  );
}

function labelFor(t) {
  return { signups: 'Bookings', packs: 'Packs', stringingOrders: 'Stringing', makeupCredits: 'Makeup Credits', clinics: 'Clinics' }[t];
}

const SHEET_META = {
  signups: { idCol: 'SignupID', columns: ['ClientName', 'ChildName', 'ClinicID', 'SessionDate', 'PlanType', 'PaymentMethod', 'PaymentStatus', 'Source'] },
  packs: { idCol: 'PackId', columns: ['ClientName', 'ChildName', 'ClinicId', 'SessionsRemaining', 'ExpiryDate', 'PricePaid', 'PaymentMethod', 'PaymentStatus'] },
  stringingOrders: { idCol: 'OrderID', columns: ['ClientName', 'RacketDescription', 'StringID', 'Tension', 'RequestedCompletionDate', 'PaymentMethod', 'PaymentStatus', 'Status'] },
  makeupCredits: { idCol: 'CreditID', columns: ['ClientName', 'OriginClinicID', 'OriginDate', 'Status', 'ExpiryDate'] },
};

function DataTable({ rows, tab, onMarkPaid }) {
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function tabToSheetName(tab) {
  return { signups: 'Signups', packs: 'Packs', stringingOrders: 'StringingOrders', makeupCredits: 'MakeupCredits' }[tab];
}

function ClinicsEditor({ token, clinics, onSaved }) {
  const [edits, setEdits] = useState({}); // clinicId -> { sessionPrice, packPrice }
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

  if (!clinics || clinics.length === 0) return <div className="empty-state">No clinics found.</div>;

  return (
    <div style={{ padding: '16px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {clinics.map((c) => {
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
              <div>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Pack Price</label>
                <input
                  type="number"
                  style={{ width: 90, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8 }}
                  value={edit.packPrice ?? c.packPrice}
                  onChange={(e) => setField(c.clinicId, 'packPrice', e.target.value)}
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

function ManualPackForm({ token, clinics, onAdded }) {
  const [open, setOpen] = useState(false);
  const [clinicId, setClinicId] = useState('');
  const [clientName, setClientName] = useState('');
  const [childName, setChildName] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('other');
  const [submitting, setSubmitting] = useState(false);

  const selectedClinic = clinics.find((c) => c.clinicId === clinicId);
  const isJunior = selectedClinic?.category === 'Junior';

  async function submit() {
    setSubmitting(true);
    await apiPost('adminAddPack', { token, clinicId, clientName, childName, contactValue, paymentMethod });
    setSubmitting(false);
    setClientName('');
    setChildName('');
    setContactValue('');
    setClinicId('');
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
        <label>Clinic</label>
        <select value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
          <option value="">Choose a clinic</option>
          {clinics.map((c) => (
            <option key={c.clinicId} value={c.clinicId}>{c.name} — {c.packSize}-pack, ${c.packPrice}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>{isJunior ? 'Parent / Guardian Name' : 'Client Name'}</label>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
      </div>
      {isJunior && (
        <div className="field">
          <label>Child's Name</label>
          <input value={childName} onChange={(e) => setChildName(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label>Email (optional — enables confirmation email + group add)</label>
        <input type="email" value={contactValue} onChange={(e) => setContactValue(e.target.value)} placeholder="you@example.com" />
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
        <button className="submit-btn" disabled={!clinicId || !clientName || submitting} onClick={submit}>
          {submitting ? 'Recording…' : 'Record Purchase'}
        </button>
        <button className="submit-btn" style={{ background: 'var(--line)', color: 'var(--charcoal)' }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function WalkInForm({ token, clinics, onAdded }) {
  const [open, setOpen] = useState(false);
  const [clinicId, setClinicId] = useState('');
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('other');
  const [sessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    await apiPost('walkIn', { token, clinicId, clientName, sessionDate, paymentMethod });
    setSubmitting(false);
    setClientName('');
    setClinicId('');
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
      <div className="field">
        <label>Client Name</label>
        <input value={clientName} onChange={(e) => setClientName(e.target.value)} />
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
        <button className="submit-btn" disabled={!clinicId || !clientName || submitting} onClick={submit}>
          {submitting ? 'Adding…' : 'Add Walk-In'}
        </button>
        <button className="submit-btn" style={{ background: 'var(--line)', color: 'var(--charcoal)' }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}
