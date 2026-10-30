import { useState } from 'react';
import { Empty, PanelHead, Prediction, UrgentBanner } from '../components/ui';
import { cap, formatDateTime, formatScore, idOf, patientName, plural } from '../utils';

export default function History({ history, patients, busy, onDelete, go }) {
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(null);
  const shown = filter ? history.filter(h => idOf(h.patientId) === filter) : history;
  const findPatient = id => (id && typeof id === 'object' && id.age !== undefined ? id : patients.find(p => p._id === idOf(id)));

  return (
    <section className="panel">
      <PanelHead eyebrow="PAST ACTIVITY" title="Diagnosis history" sub="Saved AI symptom checks. These are educational results, not clinical diagnoses." right={<span className="count-pill">{plural(shown.length, 'record')}</span>} />
      {history.length > 0 && patients.length > 1 && (
        <label className="field-label inline-filter">Patient
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">All patients</option>
            {patients.map(p => <option key={p._id} value={p._id}>{patientName(p)}</option>)}
          </select>
        </label>
      )}
      {history.length === 0 ? <Empty text="Your saved symptom checks will appear here."><button className="primary" onClick={() => go('diagnosis')}>Run a symptom check</button></Empty>
        : shown.length === 0 ? <Empty text="No checks for this patient yet." /> :
        <div className="history-list">{shown.map(h => {
          const p = findPatient(h.patientId);
          const isOpen = open === h._id;
          const legacy = !h.topPredictions?.length && h.engine === 'educational-demo-rules';
          return (
            <article className={`history-card ${isOpen ? 'open' : ''}`} key={h._id}>
              <button type="button" className="history-summary" onClick={() => setOpen(isOpen ? null : h._id)} aria-expanded={isOpen}>
                <div className="history-title">
                  <b>{h.predictedDisease}</b>
                  {h.urgent && <span className="badge danger">Urgent signs</span>}
                  {legacy ? <span className="badge">Old demo</span> : h.confidence != null && <span className="badge">{formatScore(h.confidence)}</span>}
                </div>
                <span className="history-meta">{patientName(p)} · {formatDateTime(h.createdAt)}</span>
                <span className="history-symptoms">{(h.symptoms || []).map(cap).join(', ')}</span>
                <span className="chevron" aria-hidden="true">{isOpen ? '▴' : '▾'}</span>
              </button>
              {isOpen && (
                <div className="history-detail">
                  {h.urgent && <UrgentBanner />}
                  {h.topPredictions?.length ? h.topPredictions.map((tp, i) => <Prediction key={tp.disease} p={tp} rank={i} />) : null}
                  <p className="tiny muted">{h.explanation}</p>
                  <div className="form-actions"><button className="outline small-btn danger" disabled={busy} onClick={() => onDelete(h)}>Delete record</button></div>
                </div>
              )}
            </article>
          );
        })}</div>}
    </section>
  );
}
