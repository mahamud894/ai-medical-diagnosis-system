import { useEffect, useMemo, useRef, useState } from 'react';
import { PanelHead, Prediction, UrgentBanner } from '../components/ui';
import { cap, patientLabel, patientName, plural } from '../utils';

const COMMON = ['high fever', 'cough', 'headache', 'fatigue', 'vomiting', 'nausea', 'itching', 'skin rash', 'chest pain', 'breathlessness', 'joint pain', 'abdominal pain', 'diarrhoea', 'chills', 'muscle pain', 'loss of appetite'];
const MAX = 30;

export default function SymptomCheck({ patients, selectedPatient, setSelectedPatient, vocab, busy, onRun, result, clearResult, go }) {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const resultRef = useRef(null);

  // On narrow screens the result sits below the form — bring it into view after a check.
  useEffect(() => {
    if (result && window.innerWidth < 1150) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  const labels = useMemo(() => vocab.map(s => s.label), [vocab]);
  const common = COMMON.filter(c => labels.includes(c));
  const q = query.trim().toLowerCase();
  const suggestions = q ? labels.filter(l => l.includes(q) && !selected.includes(l)).sort((a, b) => a.indexOf(q) - b.indexOf(q)).slice(0, 8) : [];

  function add(label) {
    const s = label.trim().toLowerCase().slice(0, 80);
    if (!s) return;
    setSelected(prev => (prev.includes(s) || prev.length >= MAX ? prev : [...prev, s]));
    setQuery(''); setActive(0); inputRef.current?.focus();
  }
  const remove = s => setSelected(prev => prev.filter(x => x !== s));
  const toggle = s => (selected.includes(s) ? remove(s) : add(s));

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (suggestions[active]) add(suggestions[active]); else if (q) add(q); }
    else if (e.key === 'Backspace' && !query && selected.length) remove(selected[selected.length - 1]);
  }

  async function run(e) {
    e.preventDefault();
    const ok = await onRun(selected);
    if (ok) setSelected([]);
  }

  if (!patients.length) {
    return <section className="panel wide-panel"><div className="empty"><p>Add a patient profile before running a symptom check.</p><button className="primary" onClick={() => go('patients')}>Add patient</button></div></section>;
  }

  return (
    <div className="check-layout">
      <section className="panel">
        <PanelHead eyebrow="AI SYMPTOM CHECKER" title="What symptoms are present?" sub="Search and add every symptom the patient has. More symptoms give a more reliable ranking." right={<span className="panel-icon" aria-hidden="true">✚</span>} />
        <form onSubmit={run}>
          <label className="field-label">Patient
            <select required value={selectedPatient} onChange={e => setSelectedPatient(e.target.value)}>{patients.map(p => <option key={p._id} value={p._id}>{patientLabel(p)}</option>)}</select>
          </label>

          <div className="field-label" role="group" aria-label="Symptoms">
            <span>Symptoms</span>
            <div className="chip-input" onClick={() => inputRef.current?.focus()}>
              {selected.map(s => <span className="chip on" key={s}>{cap(s)}<button type="button" aria-label={`Remove ${s}`} onClick={() => remove(s)}>×</button></span>)}
              <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} onKeyDown={onKey}
                placeholder={selected.length ? 'Add another…' : 'Type a symptom, e.g. fever, cough, rash'} aria-autocomplete="list" aria-controls="symptom-suggestions" />
            </div>
            {suggestions.length > 0 && (
              <ul className="suggestions" id="symptom-suggestions" role="listbox">
                {suggestions.map((s, i) => <li key={s} role="option" aria-selected={i === active} className={i === active ? 'active' : ''} onMouseDown={e => { e.preventDefault(); add(s); }}>{cap(s)}</li>)}
              </ul>
            )}
            {q && suggestions.length === 0 && <p className="tiny muted">No match in the model’s 131 symptoms. Press Enter to add “{query.trim()}” anyway (it will be listed as not recognised).</p>}
          </div>

          <p className="eyebrow common-label">COMMON SYMPTOMS</p>
          <div className="chip-row">
            {common.map(s => <button type="button" key={s} className={`chip ${selected.includes(s) ? 'on' : ''}`} aria-pressed={selected.includes(s)} onClick={() => toggle(s)}>{cap(s)}</button>)}
          </div>

          <div className="form-footer">
            <span className="muted">{plural(selected.length, 'symptom')} selected{selected.length > 0 && selected.length < 3 ? ' · add at least 3 for a better result' : ''}</span>
            <div className="form-actions">
              {selected.length > 0 && <button type="button" className="outline" onClick={() => setSelected([])}>Clear</button>}
              <button className="primary" disabled={!selected.length || busy}>{busy ? 'Analysing…' : 'Run AI check →'}</button>
            </div>
          </div>
        </form>
      </section>

      <section className="panel result-panel" aria-live="polite" ref={resultRef}>
        {result ? <Result d={result} onClose={clearResult} go={go} /> : (
          <div className="result-placeholder">
            <span aria-hidden="true">✧</span>
            <h3>Results appear here</h3>
            <p className="muted">The model ranks the 3 most likely conditions out of 41, with the symptoms that matched.</p>
          </div>
        )}
        <div className="notice"><b>Not an emergency service</b><p>If someone has severe chest pain, major difficulty breathing, sudden weakness, or another urgent problem, call 999 or go to the nearest hospital immediately.</p></div>
      </section>
    </div>
  );
}

function Result({ d, onClose, go }) {
  return (
    <div className="result">
      <PanelHead eyebrow={`RESULT · ${patientName(d.patientId)}`} title="Possible conditions" right={<button type="button" className="icon-btn" aria-label="Close result" onClick={onClose}>×</button>} />
      {d.urgent && <UrgentBanner />}
      {d.topPredictions?.length ? d.topPredictions.map((p, i) => <Prediction key={p.disease} p={p} rank={i} />) : <p className="muted">{d.explanation}</p>}
      {d.unrecognized?.length > 0 && <p className="tiny muted">Not recognised by the model: {d.unrecognized.join(', ')}</p>}
      <p className="tiny muted disclaimer">Scores compare only the 41 conditions the model knows. This is an educational AI demo, not a diagnosis — please consult a qualified doctor.</p>
      <button type="button" className="text-button" onClick={() => go('history')}>See all saved checks →</button>
    </div>
  );
}
