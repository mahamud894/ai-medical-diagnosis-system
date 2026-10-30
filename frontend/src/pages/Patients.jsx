import { useState } from 'react';
import { Empty, PanelHead } from '../components/ui';
import { GENDERS, formatDate, patientMeta, patientName, plural } from '../utils';

const empty = { name: '', age: '', gender: 'Prefer not to say', notes: '' };

export default function Patients({ patients, history, reports, busy, onSave, onDelete, onSelect }) {
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null); // patient being edited, or null
  const [query, setQuery] = useState('');

  function startEdit(p) {
    setEditing(p);
    setForm({ name: p.name || '', age: String(p.age), gender: p.gender, notes: p.notes || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function cancel() { setEditing(null); setForm(empty); }
  async function submit(e) {
    e.preventDefault();
    const ok = await onSave(editing?._id, { ...form, age: Number(form.age) });
    if (ok) cancel();
  }

  const q = query.trim().toLowerCase();
  const shown = q ? patients.filter(p => `${p.name} ${p.notes} ${p.age} ${p.gender}`.toLowerCase().includes(q)) : patients;
  const countFor = (p, list) => list.filter(x => (x.patientId?._id || x.patientId) === p._id).length;

  return (
    <div className="content-grid">
      <section className="panel">
        <PanelHead eyebrow={editing ? 'EDIT PROFILE' : 'PATIENT MANAGEMENT'} title={editing ? `Edit ${patientName(editing)}` : 'Add a patient profile'} right={<span className="panel-icon" aria-hidden="true">♙</span>} />
        <form onSubmit={submit} className="stack-form">
          <label>Name or nickname<input required maxLength="80" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahim, Mother, Patient A" /></label>
          <div className="two-col">
            <label>Age<input type="number" inputMode="numeric" min="0" max="120" step="1" required value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="Years" /></label>
            <label>Gender<select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>{GENDERS.map(g => <option key={g}>{g}</option>)}</select></label>
          </div>
          <label>Notes (optional)<textarea maxLength="1000" rows="3" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Non-sensitive notes, e.g. follow-up visit" /></label>
          <div className="form-actions">
            {editing && <button type="button" className="outline" onClick={cancel}>Cancel</button>}
            <button className="primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save patient'}</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <PanelHead eyebrow="YOUR RECORDS" title="Patient profiles" right={<span className="count-pill">{plural(patients.length, 'patient')}</span>} />
        {patients.length > 3 && <input className="search" type="search" placeholder="Search patients…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search patients" />}
        {patients.length === 0 ? <Empty text="No patient profiles yet. Add one to get started." /> : shown.length === 0 ? <Empty text="No patient matches your search." /> :
          <div className="record-list">{shown.map(p => (
            <div className={`record ${editing?._id === p._id ? 'editing' : ''}`} key={p._id}>
              <div className="record-icon avatar-letter" aria-hidden="true">{patientName(p).slice(0, 1).toUpperCase()}</div>
              <div className="record-main">
                <b className={p.name ? '' : 'unnamed'}>{patientName(p)}</b>
                <small>{patientMeta(p)} · added {formatDate(p.createdAt)}</small>
                {p.notes && <small className="note">{p.notes}</small>}
                <small>{plural(countFor(p, history), 'check')} · {plural(countFor(p, reports), 'report')}</small>
              </div>
              <div className="record-actions">
                <button className="primary small-btn" onClick={() => onSelect(p._id)}>Check</button>
                <button className="outline small-btn" onClick={() => startEdit(p)}>Edit</button>
                <button className="outline small-btn danger" disabled={busy} onClick={() => onDelete(p)}>Delete</button>
              </div>
            </div>))}
          </div>}
        {patients.some(p => !p.name) && <p className="tiny muted hint-line">Tip: older profiles have no name — click <b>Edit</b> to add one.</p>}
      </section>
    </div>
  );
}
