const test = require('node:test');
const assert = require('node:assert/strict');
const { predict, resolve, listSymptoms, metrics } = require('../ml/predictor');

test('symptom vocabulary is loaded', () => {
  assert.ok(listSymptoms().length > 100);
});

test('ranks diabetes for its typical symptoms', () => {
  const r = predict(['frequent urination', 'excessive hunger', 'fatigue', 'weight loss']);
  assert.equal(r.predictedDisease, 'Diabetes');
  assert.equal(r.topPredictions.length, 3);
  assert.ok(r.confidence > 50 && r.confidence <= 100);
});

test('ranks fungal infection for skin symptoms', () => {
  assert.equal(predict(['itching', 'skin_rash', 'nodal_skin_eruptions']).predictedDisease, 'Fungal infection');
});

test('understands everyday synonyms', () => {
  assert.notEqual(resolve('shortness of breath'), -1);
  assert.equal(resolve('fever'), resolve('high_fever'));
  assert.equal(resolve('Skin Rash'), resolve('skin_rash'));
});

test('flags red-flag symptoms as urgent', () => {
  assert.equal(predict(['chest pain', 'sweating']).urgent, true);
  assert.equal(predict(['itching', 'skin rash']).urgent, false);
});

test('reports unrecognised symptoms and makes no ranking when nothing is known', () => {
  const r = predict(['purple elbows']);
  assert.equal(r.topPredictions.length, 0);
  assert.deepEqual(r.unrecognized, ['purple elbows']);
  const mixed = predict(['cough', 'purple elbows']);
  assert.deepEqual(mixed.unrecognized, ['purple elbows']);
  assert.ok(mixed.topPredictions.length > 0);
});

test('explanation never claims to be a diagnosis', () => {
  assert.match(predict(['cough', 'high fever', 'chest pain']).explanation, /not a medical probability or a diagnosis/);
});

test('model meets minimum accuracy on held-out partial symptoms', () => {
  assert.ok(metrics.partialSymptoms['3_symptoms'].top3 >= 90);
});
