import { useState } from 'react';

const empty = { name: '', email: '', password: '' };

export default function AuthPage({ onSubmit, error, setError }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e) {
    e.preventDefault(); setBusy(true);
    const ok = await onSubmit(mode, mode === 'register' ? form : { email: form.email, password: form.password });
    setBusy(false);
    if (ok) setForm(empty);
  }
  const switchMode = () => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); };

  return (
    <main className="auth-shell">
      <div className="brand-mark" aria-hidden="true">✚</div>
      <p className="eyebrow">HEALTHCARE • TECHNOLOGY</p>
      <h1>AI Medical<br /><span>Diagnosis System</span></h1>
      <p className="muted auth-copy">Manage patient records, run a machine-learning symptom checker, and keep medical reports in one place.</p>
      <form className="panel auth-form" onSubmit={submit} noValidate={false}>
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        {mode === 'register' && <label>Full name<input required maxLength="100" autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}
        <label>Email address<input type="email" required autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Password
          <span className="pw-field">
            <input type={showPw ? 'text' : 'password'} minLength="8" maxLength="128" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
            <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        {error && <p className="alert error" role="alert">{error}</p>}
        <button className="primary full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        <p className="switch">{mode === 'login' ? 'New here?' : 'Already registered?'} <button type="button" className="text-button" onClick={switchMode}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
      </form>
      <p className="tiny muted">Educational prototype only. Not for medical diagnosis or emergency use.</p>
    </main>
  );
}
