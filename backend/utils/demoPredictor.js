// Educational prototype only. This is NOT a trained or clinically validated model.
const RULES = [
  { name: 'Respiratory symptom pattern', terms: ['cough', 'shortness of breath', 'breathing difficulty', 'wheezing', 'fever'] },
  { name: 'Possible blood-sugar-related symptom pattern', terms: ['frequent urination', 'excessive thirst', 'increased thirst', 'blurred vision', 'fatigue'] },
  { name: 'Possible cardiovascular symptom pattern', terms: ['chest discomfort', 'chest pain', 'palpitations', 'shortness of breath', 'dizziness'] },
  { name: 'Neurological symptom pattern', terms: ['tremor', 'shaking', 'balance difficulty', 'stiffness'] },
  { name: 'Thyroid-related symptom pattern', terms: ['unusual tiredness', 'fatigue', 'cold sensitivity', 'weight change'] }
];

// A symptom matches a term if it is the same phrase, or one contains the other as whole words
// (so "chest pain" matches "severe chest pain", but a stray letter like "a" matches nothing).
function matches(symptom, term) {
  if (symptom === term) return true;
  if (symptom.length < 3) return false;
  const wrap = s => ` ${s} `;
  return wrap(symptom).includes(wrap(term)) || wrap(term).includes(wrap(symptom));
}

function predict(symptoms) {
  const normalized = [...new Set(symptoms.map(s => String(s).toLowerCase().replace(/\s+/g, ' ').trim()).filter(Boolean))];
  let best = { name: 'No specific pattern matched', count: 0, matched: [], ratio: 0 };
  for (const rule of RULES) {
    const matched = rule.terms.filter(term => normalized.some(s => matches(s, term)));
    // Ties go to the pattern that covers a larger share of its own terms.
    if (matched.length > best.count || (matched.length && matched.length === best.count && matched.length / rule.terms.length > best.ratio)) {
      best = { name: rule.name, count: matched.length, matched, ratio: matched.length / rule.terms.length };
    }
  }
  return {
    predictedDisease: best.name,
    confidence: null,
    explanation: best.count
      ? `The demo matched ${best.count} symptom term(s): ${best.matched.join(', ')}. This is not a probability or diagnosis.`
      : 'The demo could not match a symptom pattern. This does not rule out a medical condition.',
    engine: 'educational-demo-rules'
  };
}
module.exports = { predict };
