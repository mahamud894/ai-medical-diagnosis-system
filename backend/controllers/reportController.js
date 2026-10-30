const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Report = require('../models/Report');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const publicFields = r => ({ _id: r._id, id: r._id, patientId: r.patientId, originalName: r.originalName, mimeType: r.mimeType, size: r.size, createdAt: r.createdAt });

// Check the real file content, not just the name/MIME type the browser claims.
function contentMatches(buf, mime) {
  if (!buf || buf.length < 4) return false;
  if (mime === 'application/pdf') return buf.subarray(0, 5).toString('latin1') === '%PDF-';
  if (mime === 'image/png') return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  return false;
}
const safeName = name => path.basename(String(name)).replace(/[\u0000-\u001f"\\]/g, '_').slice(0, 200) || 'report';

exports.upload = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Choose a PDF, JPG, or PNG report file.' });
    if (!contentMatches(req.file.buffer, req.file.mimetype)) return res.status(400).json({ message: 'The file content does not match its type. Upload a real PDF, JPG, or PNG file.' });
    const { patientId } = req.body;
    if (!mongoose.isValidObjectId(patientId)) return res.status(400).json({ message: 'Select a valid patient.' });
    const patient = await Patient.findOne({ _id: patientId, userId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient record not found.' });
    const report = await Report.create({
      userId: req.user._id, patientId: patient._id, originalName: safeName(req.file.originalname),
      mimeType: req.file.mimetype, size: req.file.size, data: req.file.buffer
    });
    res.status(201).json(publicFields(report));
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const filter = { userId: req.user._id };
    if (req.query.patientId && mongoose.isValidObjectId(req.query.patientId)) filter.patientId = req.query.patientId;
    const rows = await Report.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(rows.map(publicFields));
  } catch (e) { next(e); }
};

// Owner-only view/download of a stored report.
exports.download = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid record ID.' });
    const report = await Report.findOne({ _id: req.params.id, userId: req.user._id }).select('+data');
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    res.setHeader('Content-Type', report.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `inline; filename="report${path.extname(report.originalName)}"; filename*=UTF-8''${encodeURIComponent(report.originalName)}`);
    if (report.data && report.data.length) return res.end(report.data);
    // Legacy file saved on disk by an older version.
    const filePath = report.storedName && path.join(uploadsDir, path.basename(report.storedName));
    if (!filePath || !fs.existsSync(filePath)) {
      res.removeHeader('Content-Disposition');
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ message: 'This report file is no longer available (it was stored on the old server disk). Please upload it again.' });
    }
    fs.createReadStream(filePath).on('error', next).pipe(res);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid record ID.' });
    const report = await Report.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (report.storedName) fs.unlink(path.join(uploadsDir, path.basename(report.storedName)), () => {});
    res.json({ message: 'Report deleted.' });
  } catch (e) { next(e); }
};
