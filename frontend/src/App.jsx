import { useCallback, useEffect, useRef, useState } from 'react';
import { clearSession, getStoredUser, getToken, onUnauthorized, openFile, request, setSession } from './api';

const symptomOptions = ['cough', 'fever', 'shortness of breath', 'breathing difficulty', 'wheezing', 'frequent urination', 'excessive thirst', 'blurred vision', 'fatigue', 'chest discomfort', 'chest pain', 'palpitations', 'dizziness', 'tremor', 'shaking', 'balance difficulty', 'stiffness', 'cold sensitivity', 'weight change', 'headache', 'nausea'];
const MAX_UPLOAD_MB = 5;
const emptyAuth = { name: '', email: '', password: '' };
const emptyPatient = { age: '', gender: 'Prefer not to say', notes: '' };
const patientLabel = p => p ? `Age ${p.age} · ${p.gender}` : 'Deleted patient';

export default function App() {
  const [token, setToken] = useState(getToken());
  const [user, setUser] = useState(getStoredUser);
  const [mode, setMode] = useState('login');
  const [page, setPage] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [patients, setPatients] = useState([]);
  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [auth, setAuth] = useState(emptyAuth);
  const [patientForm, setPatientForm] = useState(emptyPatient);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const loadId = useRef(0);

  const resetWorkspace = useCallback(() => {
    setPatients([]); setHistory([]); setReports([]); setSelectedPatient(''); setSymptoms([]); setCustomSymptom('');
    setReportFile(null); setFileInputKey(k => k + 1); setPatientForm(emptyPatient); setPage('overview');
  }, []);

  const logout = useCallback((notice = '') => {
    clearSession(); setToken(null); setUser(null); resetWorkspace();
    setAuth(emptyAuth); setMode('login'); setMessage(''); setError(notice);
  }, [resetWorkspace]);

  // Expired / invalid token → back to the sign-in screen instead of a broken dashboard.
  useEffect(() => { onUnauthorized(() => logout('Your session has expired. Please sign in again.')); }, [logout]);

  const loadData = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true);
    try {
      const [me, p, h, r] = await Promise.all([request('/auth/me'), request('/patients'), request('/diagnosis/history'), request('/reports')]);
      if (id !== loadId.current) return;
      setUser(me.user); setPatients(p); setHistory(h); setReports(r);
      // Keep the selected patient only if it still belongs to this account.
      setSelectedPatient(prev => (p.some(x => x._id === prev) ? prev : (p[0]?._id || '')));
    } catch (e) { if (id === loadId.current && getToken()) setError(e.message); }
    finally { if (id === loadId.current) setLoading(false); }
  }, []);
  useEffect(() => { if (token) loadData(); }, [token, loadData]);

  function go(id) { setPage(id); setError(''); setMessage(''); }

  async function submitAuth(e) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const body = mode === 'register' ? auth : { email: auth.email, password: auth.password };
      const result = await request(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(body) });
      resetWorkspace();
      setSession(result.token, result.user); setUser(result.user); setToken(result.token);
      setAuth(emptyAuth); setMessage(mode === 'register' ? 'Account created. Welcome!' : 'Successfully signed in.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function addPatient(e) {
    e.preventDefault(); setError(''); setMessage(''); setBusy(true);
    try {
      const p = await request('/patients', { method: 'POST', body: JSON.stringify({ ...patientForm, age: Number(patientForm.age), symptoms: [] }) });
      setPatients(prev => [p, ...prev]); setSelectedPatient(p._id); setPatientForm(emptyPatient);
      setPage('diagnosis'); setMessage('Patient profile saved. You can run a symptom check now.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function deletePatient(p) {
    if (!window.confirm(`Delete this patient profile (${patientLabel(p)})? Its symptom-check history and uploaded reports will also be deleted.`)) return;
    setError(''); setMessage(''); setBusy(true);
    try {
      await request(`/patients/${p._id}`, { method: 'DELETE' });
      const rest = patients.filter(x => x._id !== p._id);
      setPatients(rest);
      setHistory(prev => prev.filter(h => (h.patientId?._id || h.patientId) !== p._id));
      setReports(prev => prev.filter(r => r.patientId !== p._id));
      setSelectedPatient(prev => (prev === p._id ? (rest[0]?._id || '') : prev));
      setMessage('Patient profile deleted.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function addCustomSymptom() {
    const s = customSymptom.trim().toLowerCase().slice(0, 80);
    if (!s) return;
    setSymptoms(prev => (prev.includes(s) || prev.length >= 30 ? prev : [...prev, s]));
    setCustomSymptom('');
  }

  async function runPrediction(e) {
    e.preventDefault(); setError(''); setMessage('');
    if (!selectedPatient) return setError('Select a patient first.');
    if (!symptoms.length) return setError('Select at least one symptom.');
    setBusy(true);
    try {
      const result = await request('/diagnosis/predict', { method: 'POST', body: JSON.stringify({ patientId: selectedPatient, symptoms }) });
      setHistory(prev => [result.diagnosis, ...prev]); setSymptoms([]);
      setPage('history'); setMessage(`${result.diagnosis.predictedDisease} — demo result saved.`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  function chooseFile(e) {
    const f = e.target.files?.[0] || null;
    setError('');
    if (f && f.size > MAX_UPLOAD_MB * 1024 * 1024) { setReportFile(null); setFileInputKey(k => k + 1); return setError(`File is too large. Maximum size is ${MAX_UPLOAD_MB} MB.`); }
    setReportFile(f);
  }

  async function uploadReport(e) {
    e.preventDefault(); setError(''); setMessage('');
    if (!reportFile || !selectedPatient) return setError('Select a patient and report file first.');
    const data = new FormData(); data.append('patientId', selectedPatient); data.append('report', reportFile);
    setBusy(true);
    try {
      const r = await request('/reports/upload', { method: 'POST', body: data });
      setReports(prev => [r, ...prev]); setReportFile(null); setFileInputKey(k => k + 1);
      setMessage('Report uploaded. OCR is not enabled yet.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function viewReport(r) {
    setError('');
    try { await openFile(`/reports/${r._id || r.id}/file`); } catch (e) { setError(e.message); }
  }

  async function deleteReport(r) {
    if (!window.confirm(`Delete report "${r.originalName}"?`)) return;
    setError(''); setMessage(''); setBusy(true);
    try {
      await request(`/reports/${r._id || r.id}`, { method: 'DELETE' });
      setReports(prev => prev.filter(x => (x._id || x.id) !== (r._id || r.id))); setMessage('Report deleted.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const findPatient = id => patients.find(p => p._id === (id?._id || id));

  if (!token) return (
    <main className="auth-shell">
      <div className="brand-mark">✚</div>
      <p className="eyebrow">HEALTHCARE • TECHNOLOGY</p>
      <h1>AI Medical<br /><span>Diagnosis System</span></h1>
      <p className="muted auth-copy">A student prototype for patient records and educational symptom-pattern exploration.</p>
      <form className="panel auth-form" onSubmit={submitAuth}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        {mode === 'register' && <label>Full name<input required maxLength="100" autoComplete="name" value={auth.name} onChange={e => setAuth({ ...auth, name: e.target.value })} placeholder="Your name" /></label>}
        <label>Email address<input type="email" required autoComplete="email" value={auth.email} onChange={e => setAuth({ ...auth, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Password<input type="password" minLength="8" maxLength="128" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={auth.password} onChange={e => setAuth({ ...auth, password: e.target.value })} placeholder="At least 8 characters" /></label>
        <button className="primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="switch">{mode === 'login' ? 'New here?' : 'Already registered?'} <button type="button" className="text-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
        {error && <p className="alert error">{error}</p>}
      </form>
      <p className="tiny muted">Educational prototype only. Not for medical diagnosis or emergency use.</p>
    </main>
  );

  const nav = [{ id: 'overview', icon: '▦', label: 'Overview' }, { id: 'patients', icon: '♙', label: 'Patients' }, { id: 'diagnosis', icon: '✚', label: 'Symptom Check' }, { id: 'history', icon: '◷', label: 'Diagnosis History' }, { id: 'reports', icon: '▤', label: 'Medical Reports' }];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="side-brand"><div className="brand-mark small">✚</div><div><strong>MedAI</strong><small>DIAGNOSIS SYSTEM</small></div></div>
        <div className="nav-label">WORKSPACE</div>
        {nav.map(n => <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`} onClick={() => go(n.id)}><span>{n.icon}</span>{n.label}</button>)}
        <div className="side-bottom">
          <div className="user-mini"><div className="avatar">{(user?.name || 'U').slice(0, 1).toUpperCase()}</div><div><strong>{user?.name || 'User'}</strong><small>{user?.email}</small></div></div>
          <button className="nav-item logout" onClick={() => logout()}>↪ Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><p className="eyebrow">PATIENT SUPPORT WORKSPACE</p><h2>{nav.find(n => n.id === page)?.label}</h2></div>
          <div className="top-user"><span className="online-dot" /> {loading ? 'Loading…' : 'Prototype mode'}</div>
        </header>

        {error && <div className="alert error">{error}<button onClick={() => setError('')}>×</button></div>}
        {message && <div className="alert success">{message}<button onClick={() => setMessage('')}>×</button></div>}

        {page === 'overview' && <>
          <section className="hero">
            <div>
              <span className="tag">✦ STUDENT PROJECT</span>
              <h1>Better insights.<br /><span>More informed care.</span></h1>
              <p>Organize patient information, explore symptom patterns, and keep reports in one workspace.</p>
              <button className="primary" onClick={() => go('diagnosis')}>Start symptom check <span>→</span></button>
            </div>
            <div className="hero-art"><div className="orb">✚</div><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="float-card"> <span className="pulse">♥</span><div><b>Health data</b><small>Organized in one place</small></div></div></div>
          </section>
          <div className="stat-grid">
            <Stat title="Patient profiles" value={patients.length} icon="♙" />
            <Stat title="Saved records" value={history.length} icon="◷" />
            <Stat title="Uploaded reports" value={reports.length} icon="▤" />
            <Stat title="AI engine" value="Demo" icon="✧" />
          </div>
          <div className="section-heading"><div><p className="eyebrow">GETTING STARTED</p><h3>Your workspace</h3></div></div>
          <div className="quick-grid">
            <Quick icon="♙" title="Add patient" text="Create a profile for a patient." action="Open patients" click={() => go('patients')} />
            <Quick icon="✚" title="Explore symptoms" text="Run the educational symptom matcher." action="Start check" click={() => go('diagnosis')} />
            <Quick icon="▤" title="Upload report" text="Keep a PDF or image report stored." action="View reports" click={() => go('reports')} />
          </div>
          <div className="notice"><b>Important health notice</b><p>This prototype is not clinically validated. It cannot diagnose, exclude disease, or recommend treatment. For urgent or worsening symptoms, seek professional medical care.</p></div>
        </>}

        {page === 'patients' && <div className="content-grid">
          <section className="panel">
            <div className="panel-head"><div><p className="eyebrow">PATIENT MANAGEMENT</p><h3>Add a patient profile</h3></div><span className="panel-icon">♙</span></div>
            <form onSubmit={addPatient} className="stack-form">
              <label>Age<input type="number" min="0" max="120" step="1" required value={patientForm.age} onChange={e => setPatientForm({ ...patientForm, age: e.target.value })} placeholder="Age in years" /></label>
              <label>Gender<select value={patientForm.gender} onChange={e => setPatientForm({ ...patientForm, gender: e.target.value })}><option>Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></label>
              <label>Notes (optional)<textarea maxLength="1000" rows="3" value={patientForm.notes} onChange={e => setPatientForm({ ...patientForm, notes: e.target.value })} placeholder="Non-sensitive notes" /></label>
              <button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save patient'}</button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-head"><div><p className="eyebrow">YOUR RECORDS</p><h3>Patient profiles</h3></div><span className="count-pill">{patients.length} total</span></div>
            {patients.length === 0 ? <Empty text="No patient profiles yet. Add one to get started." /> :
              <div className="record-list">{patients.map(p => (
                <div className="record" key={p._id}>
                  <div className="record-icon">♙</div>
                  <div className="record-main"><b>Patient profile</b><small>{patientLabel(p)}</small>{p.notes && <small>{p.notes}</small>}<small>Added {new Date(p.createdAt).toLocaleDateString()}</small></div>
                  <div className="record-actions">
                    <button className="outline small-btn" onClick={() => { setSelectedPatient(p._id); go('diagnosis'); }}>Select</button>
                    <button className="outline small-btn danger" disabled={busy} onClick={() => deletePatient(p)}>Delete</button>
                  </div>
                </div>))}
              </div>}
          </section>
        </div>}

        {page === 'diagnosis' && <section className="panel wide-panel">
          <div className="panel-head"><div><p className="eyebrow">EDUCATIONAL SYMPTOM MATCHER</p><h3>What symptoms are present?</h3><p className="muted">Select all that apply. This is a demo pattern matcher, not a medical model.</p></div><span className="panel-icon">✚</span></div>
          {patients.length === 0 ? <div className="empty"><p>Add a patient profile before running a symptom check.</p><button className="primary" onClick={() => go('patients')}>Add patient</button></div> :
            <form onSubmit={runPrediction}>
              <label className="field-label">Patient profile<select required value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>{patients.map(p => <option key={p._id} value={p._id}>{patientLabel(p)} · {new Date(p.createdAt).toLocaleDateString()}</option>)}</select></label>
              <div className="symptom-grid">
                {[...symptomOptions, ...symptoms.filter(s => !symptomOptions.includes(s))].map(s => (
                  <label className={`symptom ${symptoms.includes(s) ? 'checked' : ''}`} key={s}>
                    <input type="checkbox" checked={symptoms.includes(s)} onChange={e => setSymptoms(prev => e.target.checked ? [...prev, s] : prev.filter(x => x !== s))} />
                    <span className="checkmark">✓</span>{s}
                  </label>))}
              </div>
              <div className="custom-symptom">
                <input value={customSymptom} maxLength="80" placeholder="Other symptom (type and press Add)" onChange={e => setCustomSymptom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSymptom(); } }} />
                <button type="button" className="outline small-btn" onClick={addCustomSymptom} disabled={!customSymptom.trim()}>Add</button>
              </div>
              <div className="form-footer"><span className="muted">{symptoms.length} symptom(s) selected</span><button className="primary" disabled={!symptoms.length || busy}>{busy ? 'Checking…' : 'Run demo check →'}</button></div>
            </form>}
          <div className="notice"><b>Not an emergency service</b><p>If you have severe chest pain, major difficulty breathing, sudden weakness, or another urgent concern, contact local emergency services immediately. Do not wait for this tool.</p></div>
        </section>}

        {page === 'history' && <section className="panel">
          <div className="panel-head"><div><p className="eyebrow">PAST ACTIVITY</p><h3>Diagnosis history</h3><p className="muted">These are demo symptom-matching records, not clinical diagnoses.</p></div><span className="count-pill">{history.length} records</span></div>
          {history.length === 0 ? <Empty text="Your saved symptom checks will appear here." /> :
            <div className="table-wrap"><table>
              <thead><tr><th>Demo result</th><th>Patient</th><th>Symptoms</th><th>Date</th><th>Type</th></tr></thead>
              <tbody>{history.map(h => (
                <tr key={h._id}>
                  <td><b>{h.predictedDisease}</b><small className="table-sub">{h.explanation}</small></td>
                  <td>{patientLabel(h.patientId?.age !== undefined ? h.patientId : findPatient(h.patientId))}</td>
                  <td>{(h.symptoms || []).join(', ')}</td>
                  <td>{new Date(h.createdAt).toLocaleString()}</td>
                  <td><span className="status">Demo</span></td>
                </tr>))}
              </tbody>
            </table></div>}
        </section>}

        {page === 'reports' && <div className="content-grid">
          <section className="panel">
            <div className="panel-head"><div><p className="eyebrow">DOCUMENT STORAGE</p><h3>Upload medical report</h3></div><span className="panel-icon">▤</span></div>
            {patients.length === 0 ? <Empty text="Create a patient profile first." /> :
              <form className="stack-form" onSubmit={uploadReport}>
                <label>Patient<select required value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>{patients.map(p => <option key={p._id} value={p._id}>{patientLabel(p)}</option>)}</select></label>
                <label className="upload-zone"><span className="upload-symbol">↑</span><b>{reportFile ? reportFile.name : 'Choose a report file'}</b><small>PDF, JPG, PNG · max {MAX_UPLOAD_MB} MB</small><input key={fileInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={chooseFile} /></label>
                <button className="primary" disabled={!reportFile || busy}>{busy ? 'Uploading…' : 'Upload report'}</button>
                <p className="tiny muted">Files are stored in the backend local uploads folder. OCR is not enabled in this prototype.</p>
              </form>}
          </section>
          <section className="panel">
            <div className="panel-head"><div><p className="eyebrow">DOCUMENT LIBRARY</p><h3>Recent reports</h3></div><span className="count-pill">{reports.length}</span></div>
            {reports.length === 0 ? <Empty text="Uploaded reports will appear here." /> :
              <div className="record-list">{reports.map(r => (
                <div className="record" key={r._id || r.id}>
                  <div className="record-icon">▤</div>
                  <div className="record-main"><b>{r.originalName}</b><small>{patientLabel(findPatient(r.patientId))}</small><small>{(r.mimeType || 'file')} · {Math.ceil((r.size || 0) / 1024)} KB · {new Date(r.createdAt).toLocaleDateString()}</small></div>
                  <div className="record-actions">
                    <button className="outline small-btn" onClick={() => viewReport(r)}>View</button>
                    <button className="outline small-btn danger" disabled={busy} onClick={() => deleteReport(r)}>Delete</button>
                  </div>
                </div>))}
              </div>}
          </section>
        </div>}

        <footer className="footer">AI Medical Diagnosis System <span>•</span> Academic prototype <span>•</span> Not for clinical use</footer>
      </main>
    </div>
  );
}

function Stat({ title, value, icon }) { return <div className="stat-card"><div className="stat-icon">{icon}</div><p>{title}</p><strong>{value}</strong><span className="stat-line" /></div>; }
function Quick({ icon, title, text, action, click }) { return <div className="quick-card"><span className="quick-icon">{icon}</span><h4>{title}</h4><p>{text}</p><button className="text-button" onClick={click}>{action} →</button></div>; }
function Empty({ text }) { return <div className="empty"><span>▤</span><p>{text}</p></div>; }
