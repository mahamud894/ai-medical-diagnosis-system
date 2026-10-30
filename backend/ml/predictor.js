// Educational symptom → condition ranking using the Naive Bayes model in model.json.
// NOT a diagnosis. Scores are relative to the 41 conditions in the training data only.
const model = require('./model.json');

const ENGINE = `naive-bayes-v${model.version}`;
const byId = new Map(model.symptoms.map((s, i) => [s.id, i]));
const byLabel = new Map(model.symptoms.map((s, i) => [s.label.toLowerCase(), i]));

// Everyday words people type → dataset symptom ids.
const SYNONYMS = {
  fever: 'high_fever', 'high temperature': 'high_fever', temperature: 'high_fever', 'low fever': 'mild_fever', 'slight fever': 'mild_fever',
  'shortness of breath': 'breathlessness', 'breathing difficulty': 'breathlessness', 'difficulty breathing': 'breathlessness', 'short of breath': 'breathlessness',
  tiredness: 'fatigue', tired: 'fatigue', 'unusual tiredness': 'fatigue', exhaustion: 'fatigue',
  'chest discomfort': 'chest_pain', 'frequent urination': 'polyuria', 'blurred vision': 'blurred_and_distorted_vision', 'blurry vision': 'blurred_and_distorted_vision',
  diarrhea: 'diarrhoea', 'loose motion': 'diarrhoea', 'stomach ache': 'stomach_pain', stomachache: 'stomach_pain', 'tummy pain': 'belly_pain',
  rash: 'skin_rash', sneezing: 'continuous_sneezing', 'body ache': 'muscle_pain', 'body pain': 'muscle_pain', 'muscle ache': 'muscle_pain',
  stiffness: 'movement_stiffness', 'balance difficulty': 'loss_of_balance', 'yellow skin': 'yellowish_skin', 'yellow eyes': 'yellowing_of_eyes',
  'sore throat': 'throat_irritation', 'blocked nose': 'congestion', 'stuffy nose': 'congestion', vomit: 'vomiting', 'throwing up': 'vomiting',
  'heartburn': 'acidity', 'racing heart': 'fast_heart_rate', 'heart racing': 'fast_heart_rate', 'cold hands': 'cold_hands_and_feets',
  'joint swelling': 'swelling_joints', 'swollen joints': 'swelling_joints', 'weight gain': 'weight_gain', 'weight loss': 'weight_loss',
  'loss of appetite': 'loss_of_appetite', 'no appetite': 'loss_of_appetite', confusion: 'altered_sensorium', 'itchy skin': 'itching', itch: 'itching'
};

// Symptoms that need urgent medical attention regardless of what the model says.
const RED_FLAGS = new Set(['chest_pain', 'breathlessness', 'slurred_speech', 'weakness_of_one_body_side', 'coma', 'altered_sensorium', 'stomach_bleeding', 'blood_in_sputum', 'acute_liver_failure', 'bloody_stool']);

function normalize(text) { return String(text).toLowerCase().replace(/[_\s]+/g, ' ').replace(/[^\w\s()/-]/g, '').trim(); }

function resolve(text) {
  const t = normalize(text);
  if (!t) return -1;
  const id = t.replace(/\s+/g, '_');
  if (byId.has(id)) return byId.get(id);
  if (byLabel.has(t)) return byLabel.get(t);
  if (SYNONYMS[t] && byId.has(SYNONYMS[t])) return byId.get(SYNONYMS[t]);
  return -1;
}

function listSymptoms() { return model.symptoms; }

function predict(input) {
  const idx = []; const unrecognized = [];
  for (const s of input) {
    const i = resolve(s);
    if (i === -1) { if (normalize(s)) unrecognized.push(String(s).trim()); }
    else if (!idx.includes(i)) idx.push(i);
  }
  const recognized = idx.map(i => model.symptoms[i].label);
  const urgent = idx.some(i => RED_FLAGS.has(model.symptoms[i].id));

  if (!idx.length) {
    return {
      predictedDisease: 'No recognised symptoms', confidence: null, engine: ENGINE, topPredictions: [], recognized, unrecognized, urgent: false,
      explanation: 'None of the entered symptoms are in the model’s vocabulary, so no ranking was made. This does not rule out a medical condition.'
    };
  }

  const scored = model.diseases.map(d => ({ d, s: d.logPrior + idx.reduce((sum, i) => sum + d.logLik[i], 0) }));
  const max = Math.max(...scored.map(x => x.s));
  const total = scored.reduce((a, x) => a + Math.exp(x.s - max), 0);
  const ranked = scored.map(x => ({ d: x.d, p: Math.exp(x.s - max) / total })).sort((a, b) => b.p - a.p).slice(0, 3);

  const topPredictions = ranked.map(({ d, p }) => ({
    disease: d.name,
    score: Math.round(p * 1000) / 10,
    matched: idx.filter(i => d.typical.includes(model.symptoms[i].id)).map(i => model.symptoms[i].label),
    description: d.description
  }));
  const top = topPredictions[0];
  const lowInfo = idx.length < 3;
  const explanation = [
    `Naive Bayes model ranked "${top.disease}" highest from ${idx.length} recognised symptom(s)` + (top.matched.length ? ` (typical match: ${top.matched.join(', ')}).` : '.'),
    `The ${top.score}% score is relative to the 41 conditions in the training data only — it is not a medical probability or a diagnosis.`,
    lowInfo ? 'With fewer than 3 symptoms the ranking is unreliable; add more symptoms if present.' : '',
    unrecognized.length ? `Not recognised by the model: ${unrecognized.join(', ')}.` : ''
  ].filter(Boolean).join(' ');

  return { predictedDisease: top.disease, confidence: top.score, explanation, engine: ENGINE, topPredictions, recognized, unrecognized, urgent };
}

module.exports = { predict, listSymptoms, resolve, ENGINE, metrics: model.metrics };
