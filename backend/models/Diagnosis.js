const mongoose = require('mongoose');
const diagnosisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  symptoms: [{ type: String }],
  predictedDisease: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 100 },
  explanation: { type: String, required: true },
  engine: { type: String, default: 'educational-demo-rules' }
}, { timestamps: true });
module.exports = mongoose.model('Diagnosis', diagnosisSchema);
