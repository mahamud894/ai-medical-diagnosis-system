const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 150 },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['patient', 'admin'], default: 'patient' }
}, { timestamps: true });
module.exports = mongoose.model('User', userSchema);
