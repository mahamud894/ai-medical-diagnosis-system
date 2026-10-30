import { Quick, Stat } from '../components/ui';
import { cap, formatDateTime, patientName } from '../utils';

export default function Overview({ user, patients, history, reports, modelInfo, go }) {
  const last = history[0];
  const m = modelInfo?.metrics?.partialSymptoms;
  return (
    <>
      <section className="hero">
        <div>
          <span className="tag">✦ STUDENT PROJECT</span>
          <h1>Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.<br /><span>Let’s check some symptoms.</span></h1>
          <p>Organise patient profiles, rank possible conditions with a trained Naive Bayes model, and keep medical reports in one workspace.</p>
          <button className="primary" onClick={() => go(patients.length ? 'diagnosis' : 'patients')}>{patients.length ? 'Start symptom check' : 'Add your first patient'} <span>→</span></button>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="orb">✚</div><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="float-card"><span className="pulse">♥</span><div><b>Health data</b><small>Organised in one place</small></div></div></div>
      </section>

      <div className="stat-grid">
        <Stat title="Patient profiles" value={patients.length} icon="♙" />
        <Stat title="Symptom checks" value={history.length} icon="◷" hint={last ? `Last: ${formatDateTime(last.createdAt)}` : null} />
        <Stat title="Uploaded reports" value={reports.length} icon="▤" />
        <Stat title="AI engine" value="Naive Bayes" icon="✧" hint={modelInfo ? `${modelInfo.conditions} conditions · ${modelInfo.symptomCount} symptoms` : null} />
      </div>

      {last && (
        <section className="panel last-check">
          <div><p className="eyebrow">LATEST CHECK</p><h3>{last.predictedDisease}</h3><p className="muted">{patientName(last.patientId)} · {(last.symptoms || []).map(cap).join(', ')}</p></div>
          <button className="outline small-btn" onClick={() => go('history')}>View history</button>
        </section>
      )}

      <div className="section-heading"><div><p className="eyebrow">GETTING STARTED</p><h3>Your workspace</h3></div></div>
      <div className="quick-grid">
        <Quick icon="♙" title="1. Add a patient" text="Create a profile with a name, age and gender." action="Open patients" onClick={() => go('patients')} />
        <Quick icon="✚" title="2. Check symptoms" text="Pick symptoms and see the model’s top 3 possible conditions." action="Start check" onClick={() => go('diagnosis')} />
        <Quick icon="▤" title="3. Store reports" text="Upload PDF or image reports and view them any time." action="View reports" onClick={() => go('reports')} />
      </div>

      {modelInfo && (
        <section className="panel model-panel">
          <p className="eyebrow">ABOUT THE AI MODEL</p>
          <h3>{modelInfo.algorithm}</h3>
          <p className="muted">Trained on: {modelInfo.dataset}.</p>
          {m && (
            <div className="metric-grid">
              <div><strong>{m['2_symptoms'].top3}%</strong><span>right condition in top 3<br />with only 2 symptoms</span></div>
              <div><strong>{m['3_symptoms'].top1}%</strong><span>top-1 accuracy<br />with 3 symptoms</span></div>
              <div><strong>{m['3_symptoms'].top3}%</strong><span>top-3 accuracy<br />with 3 symptoms</span></div>
            </div>
          )}
          <p className="tiny muted">Measured on a held-out 20% of the dataset. The dataset is small and tidy, so real-world accuracy would be much lower.</p>
        </section>
      )}

      <div className="notice"><b>Important health notice</b><p>This prototype is not clinically validated. It cannot diagnose, exclude disease, or recommend treatment. For urgent or worsening symptoms, seek professional medical care.</p></div>
    </>
  );
}
