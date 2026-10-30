// Small shared helpers.
export const MAX_UPLOAD_MB = 5;
export const GENDERS = ['Prefer not to say', 'Female', 'Male', 'Other'];

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatDate = d => (d ? dateFmt.format(new Date(d)) : '');
export const formatDateTime = d => (d ? dateTimeFmt.format(new Date(d)) : '');

// Sentence case for symptom labels: "loss of appetite" → "Loss of appetite".
export const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

export function patientName(p) { return p ? (p.name || 'Unnamed patient') : 'Deleted patient'; }
export function patientMeta(p) { return p ? `${p.age} yrs · ${p.gender}` : ''; }
export function patientLabel(p) { return p ? `${patientName(p)} (${p.age} yrs, ${p.gender})` : 'Deleted patient'; }

export const idOf = x => (x && typeof x === 'object' ? x._id || x.id : x);

export function formatScore(score) {
  if (score === null || score === undefined) return '—';
  if (score < 0.1) return '<0.1%';
  return `${score}%`;
}

export const formatSize = bytes => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`);
