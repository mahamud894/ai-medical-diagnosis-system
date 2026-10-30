#!/usr/bin/env node
/*
 * Trains the symptom → condition model used by the API.
 *
 *   node ml/train.js            (run from the backend folder, or: npm run train)
 *
 * Algorithm: Multinomial Naive Bayes with Laplace smoothing, trained on the public
 * "Disease Prediction Using Machine Learning" dataset (Kaggle, kaushil268):
 * 41 conditions × 132 binary symptom columns, 4,920 training rows.
 * See ml/data/SOURCE.md. Output: ml/model.json (loaded by ml/predictor.js).
 *
 * EDUCATIONAL ONLY. The dataset is small and synthetic-looking; the model is not
 * clinically validated and must never be used for real diagnosis.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const ALPHA = 1; // Laplace smoothing
const SEED = 42;

// ---------- helpers ----------
function parseCSV(text) {
  const rows = []; let row = []; let field = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v.trim() !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v.trim() !== '')) rows.push(row);
  return rows;
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function shuffle(arr, rand) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

// Dataset typos / inconsistent spacing → clean ids and display names.
const cleanSymptomId = s => s.trim().toLowerCase().replace(/[\s_]+/g, '_').replace(/[()]/g, '').replace(/_+$/, '');
const SYMPTOM_LABEL_FIX = {
  cold_hands_and_feets: 'cold hands and feet', toxic_look_typhos: 'toxic look (typhos)',
  swollen_extremeties: 'swollen extremities', scurring: 'scarring', dischromic_patches: 'discoloured patches',
  diarrhoea: 'diarrhoea', spotting_urination: 'spotting during urination', foul_smell_of_urine: 'foul-smelling urine',
  burning_micturition: 'burning while urinating', polyuria: 'frequent urination (polyuria)',
  altered_sensorium: 'confusion / altered consciousness', extra_marital_contacts: 'unprotected sexual contacts',
  receiving_blood_transfusion: 'received blood transfusion', receiving_unsterile_injections: 'received unsterile injections'
};
const symptomLabel = id => SYMPTOM_LABEL_FIX[id] || id.replace(/_/g, ' ');
const DISEASE_FIX = {
  '(vertigo) Paroymsal  Positional Vertigo': 'Benign paroxysmal positional vertigo (BPPV)',
  'Diabetes ': 'Diabetes', 'Hypertension ': 'Hypertension', 'hepatitis A': 'Hepatitis A',
  'Dimorphic hemmorhoids(piles)': 'Haemorrhoids (piles)', 'Dimorphic hemorrhoids(piles)': 'Haemorrhoids (piles)',
  'Osteoarthristis': 'Osteoarthritis', 'Peptic ulcer diseae': 'Peptic ulcer disease', 'Chicken pox': 'Chickenpox'
};
const cleanDisease = d => DISEASE_FIX[d] || DISEASE_FIX[d.trim()] || d.trim();

// ---------- load data ----------
function loadMatrix(file) {
  const rows = parseCSV(fs.readFileSync(path.join(DATA, file), 'utf8'));
  const header = rows[0].map(h => h.trim()).filter(Boolean);
  const label = header.length - 1; // last column = prognosis
  const ids = header.slice(0, label).map(cleanSymptomId);
  return { ids, records: rows.slice(1).map(r => ({ disease: cleanDisease(r[label]), x: r.slice(0, label).map(v => v.trim() === '1') })) };
}
const train = loadMatrix('Training.csv');
const test = loadMatrix('Testing.csv');

// The dataset repeats some columns (e.g. fluid_overload) — merge duplicates with OR.
const symptoms = [...new Set(train.ids)];
const colsFor = ids => symptoms.map(s => ids.reduce((acc, id, i) => (id === s ? [...acc, i] : acc), []));
const toVec = (rec, cols) => cols.map(cs => cs.some(i => rec.x[i]));
const trainCols = colsFor(train.ids); const testCols = colsFor(test.ids);
const trainSet = train.records.map(r => ({ disease: r.disease, v: toVec(r, trainCols) }));
const testSet = test.records.map(r => ({ disease: r.disease, v: toVec(r, testCols) }));
const diseases = [...new Set(trainSet.map(r => r.disease))].sort();

// ---------- model ----------
function fit(rows) {
  const counts = {}, totals = {}, docs = {};
  for (const d of diseases) { counts[d] = new Array(symptoms.length).fill(0); totals[d] = 0; docs[d] = 0; }
  for (const r of rows) { docs[r.disease]++; r.v.forEach((on, j) => { if (on) { counts[r.disease][j]++; totals[r.disease]++; } }); }
  const V = symptoms.length;
  const logPrior = {}, logLik = {}, typical = {};
  for (const d of diseases) {
    logPrior[d] = Math.log(docs[d] / rows.length);
    logLik[d] = counts[d].map(c => +Math.log((c + ALPHA) / (totals[d] + ALPHA * V)).toFixed(5));
    // Symptoms present in at least half of this condition's rows — used to explain results.
    typical[d] = counts[d].map((c, j) => [c / docs[d], symptoms[j]]).filter(([f]) => f >= 0.5).sort((a, b) => b[0] - a[0]).map(([, s]) => s);
  }
  return { logPrior, logLik, typical };
}
function rank(m, presentIdx) {
  const scores = diseases.map(d => [d, m.logPrior[d] + presentIdx.reduce((s, j) => s + m.logLik[d][j], 0)]);
  const max = Math.max(...scores.map(s => s[1]));
  const exp = scores.map(([d, s]) => [d, Math.exp(s - max)]);
  const sum = exp.reduce((a, [, e]) => a + e, 0);
  return exp.map(([d, e]) => [d, e / sum]).sort((a, b) => b[1] - a[1]);
}
const present = v => v.reduce((a, on, j) => (on ? [...a, j] : a), []);

// ---------- evaluation ----------
const rand = rng(SEED);
// 1) Held-out split: train on 80% of rows, test on 20%, with the user entering only 2–4 symptoms.
const shuffled = shuffle([...trainSet], rand);
const cut = Math.floor(shuffled.length * 0.8);
const m80 = fit(shuffled.slice(0, cut));
const partial = { 2: [0, 0, 0], 3: [0, 0, 0], 4: [0, 0, 0] }; // [top1, top3, n]
for (const r of shuffled.slice(cut)) {
  const p = present(r.v);
  for (const k of [2, 3, 4]) {
    if (p.length < k) continue;
    const pick = shuffle([...p], rand).slice(0, k);
    const ranked = rank(m80, pick).map(x => x[0]);
    partial[k][0] += ranked[0] === r.disease; partial[k][1] += ranked.slice(0, 3).includes(r.disease); partial[k][2]++;
  }
}
// 2) Official Testing.csv (complete symptom lists) with the final model trained on all rows.
const model = fit(trainSet);
let full = 0; for (const r of testSet) full += rank(model, present(r.v))[0][0] === r.disease;

const pct = (a, b) => +(100 * a / b).toFixed(1);
const metrics = {
  officialTestTop1: pct(full, testSet.length), officialTestRows: testSet.length,
  partialSymptoms: Object.fromEntries(Object.entries(partial).map(([k, [t1, t3, n]]) => [`${k}_symptoms`, { top1: pct(t1, n), top3: pct(t3, n), samples: n }]))
};

// ---------- descriptions ----------
const descriptions = {};
for (const [d, text] of parseCSV(fs.readFileSync(path.join(DATA, 'symptom_Description.csv'), 'utf8'))) {
  if (d && text) descriptions[cleanDisease(d)] = text.trim().replace(/\s+/g, ' ').replace(/\.(?=[A-Z])/g, '. ');
}

const out = {
  name: 'symptom-naive-bayes', version: 1, algorithm: 'Multinomial Naive Bayes (Laplace alpha=1)',
  trainedAt: new Date().toISOString().slice(0, 10),
  dataset: 'Disease Prediction Using Machine Learning (Kaggle, kaushil268) — 4,920 rows, 41 conditions, 132 symptom columns',
  metrics,
  symptoms: symptoms.map(id => ({ id, label: symptomLabel(id) })),
  diseases: diseases.map(d => ({ name: d, logPrior: +model.logPrior[d].toFixed(5), logLik: model.logLik[d], typical: model.typical[d], description: descriptions[d] || '' }))
};
const missing = diseases.filter(d => !descriptions[d]);
if (missing.length) console.warn('No description for:', missing.join(', '));
fs.writeFileSync(path.join(__dirname, 'model.json'), JSON.stringify(out));
console.log(`Trained on ${trainSet.length} rows: ${diseases.length} conditions, ${symptoms.length} symptoms.`);
console.log('Metrics:', JSON.stringify(metrics, null, 2));
