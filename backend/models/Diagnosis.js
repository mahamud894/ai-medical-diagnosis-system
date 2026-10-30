const mongoose = require('mongoose');
const predictionSchema = new mongoose.Schema({
  disease: { type: String, required: true },
  score: { type: Number, min: 0, max: 100 },
  matched: [{ type: String }],
  description: { type: String, default: '' }
}, { _id: false });

const diagnosisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  symptoms: [{ type: String }],
  predictedDisease: { type: String, required: true },
  // Relative model score (0–100) among the conditions in the training data — not a medical probability.
  confidence: { type: Number, min: 0, max: 100, default: null },
  explanation: { type: String, required: true },
  topPredictions: { type: [predictionSchema], default: [] },
  recognized: [{ type: String }],
  unrecognized: [{ type: String }],
  urgent: { type: Boolean, default: false },
  engine: { type: String, default: 'educational-demo-rules' }
}, { timestamps: true });
module.exports = mongoose.model('Diagnosis', diagnosisSchema);
