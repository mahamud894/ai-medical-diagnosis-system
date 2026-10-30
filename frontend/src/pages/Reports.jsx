import { useState } from 'react';
import { Empty, PanelHead } from '../components/ui';
import { MAX_UPLOAD_MB, formatDate, formatSize, idOf, patientLabel, patientName, plural } from '../utils';

export default function Reports({ reports, patients, selectedPatient, setSelectedPatient, busy, onUpload, onView, onDelete, setError }) {
  const [file, setFile] = useState(null);
  const [inputKey, setInputKey] = useState(0);
  const [drag, setDrag] = useState(false);

  function choose(f) {
    setError('');
    if (!f) return setFile(null);
    if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) { setInputKey(k => k + 1); return setError('Only PDF, JPG, and PNG files are allowed.'); }
    if (f.size > MAX_UPLOAD_MB * 1024 * 1024) { setInputKey(k => k + 1); return setError(`File is too large. Maximum size is ${MAX_UPLOAD_MB} MB.`); }
    setFile(f);
  }
  async function submit(e) {
    e.preventDefault();
    if (await onUpload(file)) { setFile(null); setInputKey(k => k + 1); }
  }
  const findPatient = id => patients.find(p => p._id === idOf(id));
  const typeIcon = m => (m === 'application/pdf' ? 'PDF' : 'IMG');

  return (
    <div className="content-grid">
      <section className="panel">
        <PanelHead eyebrow="DOCUMENT STORAGE" title="Upload medical report" right={<span className="panel-icon" aria-hidden="true">▤</span>} />
        {patients.length === 0 ? <Empty text="Create a patient profile first." /> :
          <form className="stack-form" onSubmit={submit}>
            <label>Patient<select required value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>{patients.map(p => <option key={p._id} value={p._id}>{patientLabel(p)}</option>)}</select></label>
            <label className={`upload-zone ${drag ? 'drag' : ''} ${file ? 'has-file' : ''}`}
              onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
              onDrop={e => { e.preventDefault(); setDrag(false); choose(e.dataTransfer.files?.[0]); }}>
              <span className="upload-symbol" aria-hidden="true">{file ? '✓' : '↑'}</span>
              <b>{file ? file.name : 'Click to choose a file, or drag it here'}</b>
              <small>{file ? formatSize(file.size) : `PDF, JPG or PNG · max ${MAX_UPLOAD_MB} MB`}</small>
              <input key={inputKey} className="visually-hidden" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e => choose(e.target.files?.[0])} />
            </label>
            <button className="primary" disabled={!file || busy}>{busy ? 'Uploading…' : 'Upload report'}</button>
            <p className="tiny muted">Reports are stored securely in the database and only you can open them. Text is not read automatically (no OCR).</p>
          </form>}
      </section>
      <section className="panel">
        <PanelHead eyebrow="DOCUMENT LIBRARY" title="Recent reports" right={<span className="count-pill">{plural(reports.length, 'report')}</span>} />
        {reports.length === 0 ? <Empty text="Uploaded reports will appear here." /> :
          <div className="record-list">{reports.map(r => (
            <div className="record" key={r._id || r.id}>
              <div className="record-icon file-type" aria-hidden="true">{typeIcon(r.mimeType)}</div>
              <div className="record-main">
                <b>{r.originalName}</b>
                <small>{patientName(findPatient(r.patientId))} · {formatSize(r.size || 0)} · {formatDate(r.createdAt)}</small>
              </div>
              <div className="record-actions">
                <button className="outline small-btn" onClick={() => onView(r)}>View</button>
                <button className="outline small-btn danger" disabled={busy} onClick={() => onDelete(r)}>Delete</button>
              </div>
            </div>))}
          </div>}
      </section>
    </div>
  );
}
