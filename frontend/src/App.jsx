import { useCallback, useEffect, useRef, useState } from 'react';
import { clearSession, getStoredUser, getToken, onUnauthorized, openFile, request, setSession } from './api';
import { idOf, patientLabel } from './utils';
import AuthPage from './pages/AuthPage';
import Overview from './pages/Overview';
import Patients from './pages/Patients';
import SymptomCheck from './pages/SymptomCheck';
import History from './pages/History';
import Reports from './pages/Reports';

const NAV = [
  { id: 'overview', icon: '▦', label: 'Overview', short: 'Home' },
  { id: 'patients', icon: '♙', label: 'Patients', short: 'Patients' },
  { id: 'diagnosis', icon: '✚', label: 'Symptom Check', short: 'Check' },
  { id: 'history', icon: '◷', label: 'Diagnosis History', short: 'History' },
  { id: 'reports', icon: '▤', label: 'Medical Reports', short: 'Reports' }
];

export default function App() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getStoredUser);
  const [page, setPage] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [patients, setPatients] = useState([]);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [vocab, setVocab] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [result, setResult] = useState(null);
  const loadId = useRef(0);

  const resetWorkspace = useCallback(() => {
    setPatients([]); setHistory([]); setReports([]); setSelectedPatient(''); setResult(null); setPage('overview');
  }, []);

  const logout = useCallback((notice = '') => {
    clearSession(); setToken(null); setUser(null); resetWorkspace(); setMessage(''); setError(notice);
  }, [resetWorkspace]);

  // Expired / invalid token → back to the sign-in screen instead of a broken dashboard.
  useEffect(() => { onUnauthorized(() => logout('Your session has expired. Please sign in again.')); }, [logout]);

  const loadData = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true);
    try {
      const [me, p, h, r, s] = await Promise.all([request('/auth/me'), request('/patients'), request('/diagnosis/history'), request('/reports'), request('/diagnosis/symptoms')]);
      if (id !== loadId.current) return;
      setUser(me.user); setPatients(p); setHistory(h); setReports(r);
      setVocab(s.symptoms || []); setModelInfo(s.model ? { ...s.model, symptomCount: (s.symptoms || []).length } : null);
      setSelectedPatient(prev => (p.some(x => x._id === prev) ? prev : (p[0]?._id || '')));
    } catch (e) { if (id === loadId.current && getToken()) setError(e.message); }
    finally { if (id === loadId.current) setLoading(false); }
  }, []);
  useEffect(() => { if (token) loadData(); }, [token, loadData]);

  // Clear old notices when moving between pages; scroll to top.
  function go(id) { setPage(id); setError(''); setMessage(''); window.scrollTo({ top: 0 }); }

  // Run an async action with the busy flag + error handling. Returns true on success.
  async function act(fn, success) {
    setError(''); setMessage(''); setBusy(true);
    try { await fn(); if (success) setMessage(success); return true; }
    catch (e) { setError(e.message); return false; }
    finally { setBusy(false); }
  }

  async function submitAuth(mode, body) {
    setError(''); setMessage('');
    try {
      const res = await request(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(body) });
      resetWorkspace(); setSession(res.token, res.user); setUser(res.user); setToken(res.token);
      setMessage(mode === 'register' ? 'Account created. Welcome!' : 'Signed in successfully.');
      return true;
    } catch (e) { setError(e.message); return false; }
  }

  const savePatient = (id, data) => act(async () => {
    if (id) {
      const p = await request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      setPatients(prev => prev.map(x => (x._id === id ? p : x)));
      setHistory(prev => prev.map(h => (idOf(h.patientId) === id ? { ...h, patientId: p } : h)));
    } else {
      const p = await request('/patients', { method: 'POST', body: JSON.stringify({ ...data, symptoms: [] }) });
      setPatients(prev => [p, ...prev]); setSelectedPatient(p._id);
    }
  }, id ? 'Patient profile updated.' : 'Patient profile saved. You can run a symptom check now.');

  function deletePatient(p) {
    if (!window.confirm(`Delete ${patientLabel(p)}? Their symptom-check history and uploaded reports will also be deleted.`)) return;
    act(async () => {
      await request(`/patients/${p._id}`, { method: 'DELETE' });
      const rest = patients.filter(x => x._id !== p._id);
      setPatients(rest);
      setHistory(prev => prev.filter(h => idOf(h.patientId) !== p._id));
      setReports(prev => prev.filter(r => idOf(r.patientId) !== p._id));
      setSelectedPatient(prev => (prev === p._id ? (rest[0]?._id || '') : prev));
      if (result && idOf(result.patientId) === p._id) setResult(null);
    }, 'Patient profile deleted.');
  }

  const runCheck = symptoms => act(async () => {
    if (!selectedPatient) throw new Error('Select a patient first.');
    const res = await request('/diagnosis/predict', { method: 'POST', body: JSON.stringify({ patientId: selectedPatient, symptoms }) });
    setHistory(prev => [res.diagnosis, ...prev]); setResult(res.diagnosis);
  });

  function deleteCheck(h) {
    if (!window.confirm(`Delete the saved check "${h.predictedDisease}"?`)) return;
    act(async () => {
      await request(`/diagnosis/${h._id}`, { method: 'DELETE' });
      setHistory(prev => prev.filter(x => x._id !== h._id));
      if (result?._id === h._id) setResult(null);
    }, 'Record deleted.');
  }

  const uploadReport = file => act(async () => {
    if (!file || !selectedPatient) throw new Error('Select a patient and a report file first.');
    const data = new FormData(); data.append('patientId', selectedPatient); data.append('report', file);
    const r = await request('/reports/upload', { method: 'POST', body: data });
    setReports(prev => [r, ...prev]);
  }, 'Report uploaded.');

  async function viewReport(r) {
    setError('');
    try { await openFile(`/reports/${r._id || r.id}/file`); } catch (e) { setError(e.message); }
  }

  function deleteReport(r) {
    if (!window.confirm(`Delete report "${r.originalName}"?`)) return;
    act(async () => {
      await request(`/reports/${r._id || r.id}`, { method: 'DELETE' });
      setReports(prev => prev.filter(x => (x._id || x.id) !== (r._id || r.id)));
    }, 'Report deleted.');
  }

  if (!token) return <AuthPage onSubmit={submitAuth} error={error} setError={setError} />;

  const current = NAV.find(n => n.id === page);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="side-brand"><div className="brand-mark small" aria-hidden="true">✚</div><div><strong>MedAI</strong><small>DIAGNOSIS SYSTEM</small></div></div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {NAV.map(n => (
            <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} aria-current={page === n.id ? 'page' : undefined} onClick={() => go(n.id)}>
              <span aria-hidden="true">{n.icon}</span><em className="nav-long">{n.label}</em><em className="nav-short">{n.short}</em>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="user-mini"><div className="avatar" aria-hidden="true">{(user?.name || 'U').slice(0, 1).toUpperCase()}</div><div><strong>{user?.name || 'User'}</strong><small>{user?.email}</small></div></div>
          <button className="nav-item logout" onClick={() => logout()}><span aria-hidden="true">↪</span><em>Sign out</em></button>
        </div>
      </aside>

      <main className="main" id="main">
        <header className="topbar">
          <div className="topbar-brand" aria-hidden="true"><div className="brand-mark small">✚</div></div>
          <div className="topbar-title"><p className="eyebrow">MEDAI WORKSPACE</p><h2>{current?.label}</h2></div>
          <div className="topbar-right">
            <div className="top-user"><span className="online-dot" /> {loading ? 'Loading…' : 'AI model ready'}</div>
            <button className="mobile-logout outline small-btn" onClick={() => logout()} aria-label="Sign out">Sign out</button>
          </div>
        </header>

        {error && <div className="alert error" role="alert">{error}<button aria-label="Dismiss" onClick={() => setError('')}>×</button></div>}
        {message && <div className="alert success" role="status">{message}<button aria-label="Dismiss" onClick={() => setMessage('')}>×</button></div>}

        {page === 'overview' && <Overview user={user} patients={patients} history={history} reports={reports} modelInfo={modelInfo} go={go} />}
        {page === 'patients' && <Patients patients={patients} history={history} reports={reports} busy={busy} onSave={savePatient} onDelete={deletePatient} onSelect={id => { setSelectedPatient(id); go('diagnosis'); }} />}
        {page === 'diagnosis' && <SymptomCheck patients={patients} selectedPatient={selectedPatient} setSelectedPatient={setSelectedPatient} vocab={vocab} busy={busy} onRun={runCheck} result={result} clearResult={() => setResult(null)} go={go} />}
        {page === 'history' && <History history={history} patients={patients} busy={busy} onDelete={deleteCheck} go={go} />}
        {page === 'reports' && <Reports reports={reports} patients={patients} selectedPatient={selectedPatient} setSelectedPatient={setSelectedPatient} busy={busy} onUpload={uploadReport} onView={viewReport} onDelete={deleteReport} setError={setError} />}

        <footer className="footer">AI Medical Diagnosis System <span>•</span> Academic prototype <span>•</span> Not for clinical use</footer>
      </main>
    </div>
  );
}
