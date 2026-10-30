const mongoose = require('mongoose');
const patientSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Name or nickname so profiles can be told apart. Older records may not have one.
  name: { type: String, trim: true, maxlength: 80, default: '' },
  age: { type: Number, min: 0, max: 120, required: true },
  gender: { type: String, enum: ['Female', 'Male', 'Other', 'Prefer not to say'], default: 'Prefer not to say' },
  symptoms: [{ type: String, trim: true, maxlength: 80 }],
  notes: { type: String, maxlength: 1000, default: '' }
}, { timestamps: true });
module.exports = mongoose.model('Patient', patientSchema);
