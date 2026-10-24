const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Diagnosis = require('../models/Diagnosis');
const Report = require('../models/Report');

const GENDERS = ['Female', 'Male', 'Other', 'Prefer not to say'];
const uploadsDir = path.join(__dirname, '..', 'uploads');

function cleanSymptoms(list) {
  return [...new Set(list.map(s => String(s).trim().toLowerCase()).filter(Boolean).map(s => s.slice(0, 80)))].slice(0, 30);
}
// Returns { data } or { error } so create and update share the same rules.
function validate(body, partial) {
  const data = {};
  if (body.age !== undefined || !partial) {
    const age = Number(body.age);
    if (body.age === undefined || body.age === '' || body.age === null || !Number.isFinite(age) || age < 0 || age > 120) return { error: 'Enter a valid age (0–120).' };
    data.age = Math.round(age);
  }
  if (body.gender !== undefined) {
    if (!GENDERS.includes(body.gender)) return { error: `Gender must be one of: ${GENDERS.join(', ')}.` };
    data.gender = body.gender;
  }
  if (body.symptoms !== undefined) {
    if (!Array.isArray(body.symptoms)) return { error: 'Symptoms must be a list.' };
    data.symptoms = cleanSymptoms(body.symptoms);
  }
  if (body.notes !== undefined) data.notes = String(body.notes ?? '').slice(0, 1000);
  return { data };
}
const badId = (res) => res.status(400).json({ message: 'Invalid record ID.' });

exports.list = async (req, res, next) => { try { res.json(await Patient.find({ userId: req.user._id }).sort({ createdAt: -1 })); } catch (e) { next(e); } };

exports.get = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const p = await Patient.findOne({ _id: req.params.id, userId: req.user._id });
    if (!p) return res.status(404).json({ message: 'Patient record not found.' });
    res.json(p);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { data, error } = validate(req.body || {}, false);
    if (error) return res.status(400).json({ message: error });
    const patient = await Patient.create({ userId: req.user._id, ...data });
    res.status(201).json(patient);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const { data, error } = validate(req.body || {}, true);
    if (error) return res.status(400).json({ message: error });
    const patient = await Patient.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, data, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ message: 'Patient record not found.' });
    res.json(patient);
  } catch (e) { next(e); }
};

// Deleting a patient also removes that patient's diagnoses and reports (and the report files).
exports.remove = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badId(res);
    const p = await Patient.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!p) return res.status(404).json({ message: 'Patient record not found.' });
    const reports = await Report.find({ patientId: p._id, userId: req.user._id }).select('storedName');
    reports.forEach(r => fs.unlink(path.join(uploadsDir, path.basename(r.storedName)), () => {}));
    await Promise.all([
      Report.deleteMany({ patientId: p._id, userId: req.user._id }),
      Diagnosis.deleteMany({ patientId: p._id, userId: req.user._id })
    ]);
    res.json({ message: 'Patient record and related history/reports deleted.' });
  } catch (e) { next(e); }
};
