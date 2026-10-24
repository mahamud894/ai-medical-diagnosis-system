const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Report = require('../models/Report');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const publicFields = r => ({ _id: r._id, id: r._id, patientId: r.patientId, originalName: r.originalName, mimeType: r.mimeType, size: r.size, createdAt: r.createdAt });

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a PDF, JPG, or PNG report file.' });
    const { patientId } = req.body;
    if (!mongoose.isValidObjectId(patientId)) { fs.unlink(req.file.path, () => {}); return res.status(400).json({ message: 'Select a valid patient.' }); }
    const patient = await Patient.findOne({ _id: patientId, userId: req.user._id });
    if (!patient) { fs.unlink(req.file.path, () => {}); return res.status(404).json({ message: 'Patient record not found.' }); }
    const report = await Report.create({ userId: req.user._id, patientId: patient._id, originalName: path.basename(req.file.originalname).slice(0, 200), storedName: req.file.filename, mimeType: req.file.mimetype, size: req.file.size });
    res.status(201).json({ ...publicFields(report), note: 'Stored locally. OCR is not enabled in this prototype.' });
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const rows = await Report.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json(rows.map(publicFields));
  } catch (e) { next(e); }
};

// Owner-only download/preview of a stored report.
exports.download = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid record ID.' });
    const report = await Report.findOne({ _id: req.params.id, userId: req.user._id });
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    const filePath = path.join(uploadsDir, path.basename(report.storedName));
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Report file is missing on the server.' });
    res.setHeader('Content-Type', report.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(report.originalName)}"`);
    fs.createReadStream(filePath).on('error', next).pipe(res);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid record ID.' });
    const report = await Report.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    fs.unlink(path.join(uploadsDir, path.basename(report.storedName)), () => {});
    res.json({ message: 'Report deleted.' });
  } catch (e) { next(e); }
};
