import { formatScore } from '../utils';

export function Stat({ title, value, icon, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" aria-hidden="true">{icon}</div>
      <p>{title}</p>
      <strong>{value}</strong>
      {hint && <small className="stat-hint">{hint}</small>}
      <span className="stat-line" />
    </div>
  );
}

export function Quick({ icon, title, text, action, onClick }) {
  return (
    <div className="quick-card">
      <span className="quick-icon" aria-hidden="true">{icon}</span>
      <h4>{title}</h4>
      <p>{text}</p>
      <button type="button" className="text-button" onClick={onClick}>{action} →</button>
    </div>
  );
}

export function Empty({ text, children }) {
  return <div className="empty"><span aria-hidden="true">▤</span><p>{text}</p>{children}</div>;
}

export function PanelHead({ eyebrow, title, sub, right }) {
  return (
    <div className="panel-head">
      <div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3>{sub && <p className="muted">{sub}</p>}</div>
      {right}
    </div>
  );
}

// One ranked condition with a score bar.
export function Prediction({ p, rank }) {
  const width = Math.max(2, Math.min(100, p.score || 0));
  return (
    <div className={`prediction ${rank === 0 ? 'top' : ''}`}>
      <div className="prediction-head">
        <span className="rank">#{rank + 1}</span>
        <b>{p.disease}</b>
        <span className="score">{formatScore(p.score)}</span>
      </div>
      <div className="bar" role="img" aria-label={`Model score ${formatScore(p.score)}`}><span style={{ width: `${width}%` }} /></div>
      {p.matched?.length > 0 && <p className="matched">Typical symptoms matched: {p.matched.join(', ')}</p>}
      {rank === 0 && p.description && <p className="desc">{p.description}</p>}
    </div>
  );
}

export function UrgentBanner() {
  return (
    <div className="urgent" role="alert">
      <b>⚠ Some symptoms can be signs of an emergency.</b>
      <p>Chest pain, breathing difficulty, confusion, one-sided weakness, slurred speech or bleeding need medical help right away. Call local emergency services (999 in Bangladesh) — do not rely on this tool.</p>
    </div>
  );
}
