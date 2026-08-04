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
  const [tab, setTab] = useState('signups');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    apiGet('adminBookings', { token }).then(setData);
    apiGet('clinics').then((c) => setClinics(Array.isArray(c) ? c : []));
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

      <div className="category-toggle" style={{ margin: '20px 20px 4px' }}>
        {['signups', 'packs', 'stringingOrders', 'makeupCredits'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {labelFor(t)}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 20px 40px', overflowX: 'auto' }}>
        <DataTable
          rows={data[tab] || []}
          tab={tab}
          onMarkPaid={markPaid}
        />
      </div>
    </div>
  );
}

function labelFor(t) {
  return { signups: 'Bookings', packs: 'Packs', stringingOrders: 'Stringing', makeupCredits: 'Makeup Credits' }[t];
}

const SHEET_META = {
  signups: { idCol: 'SignupID', columns: ['ClientName', 'ClinicID', 'SessionDate', 'PlanType', 'PaymentMethod', 'PaymentStatus', 'Source'] },
  packs: { idCol: 'PackId', columns: ['ClientName', 'ClinicId', 'SessionsRemaining', 'ExpiryDate', 'PricePaid', 'PaymentMethod', 'PaymentStatus'] },
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

function WalkInForm({ token, clinics, onAdded }) {
  const [open, setOpen] = useState(false);
  const [clinicId, setClinicId] = useState('');
  const [clientName, setClientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
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
          {['venmo', 'zelle', 'cash', 'check'].map((m) => (
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
