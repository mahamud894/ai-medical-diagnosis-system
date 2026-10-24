const mongoose = require('mongoose');
const diseaseSchema = new mongoose.Schema({
  diseaseName: { type: String, required: true, unique: true },
  symptoms: [{ type: String }],
  precautions: [{ type: String }],
  treatment: { type: String, default: 'Consult a qualified healthcare professional.' }
}, { timestamps: true });
module.exports = mongoose.model('Disease', diseaseSchema);
