const mongoose = require('mongoose');
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  // File bytes are stored in MongoDB so they survive server restarts / redeploys
  // (Render's free disk is wiped on every deploy). Not loaded unless explicitly selected.
  data: { type: Buffer, select: false },
  // Legacy: reports uploaded by older versions were saved in backend/uploads.
  storedName: { type: String }
}, { timestamps: true });
module.exports = mongoose.model('Report', reportSchema);
