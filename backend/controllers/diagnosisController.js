const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const Diagnosis = require('../models/Diagnosis');
const { predict } = require('../utils/demoPredictor');

const DISCLAIMER = 'Educational demo only—not a diagnosis. Consult a qualified clinician.';

exports.predict = async (req, res, next) => {
  try {
    const { patientId } = req.body || {};
    const raw = (req.body || {}).symptoms;
    const symptoms = Array.isArray(raw) ? [...new Set(raw.map(s => String(s).trim().toLowerCase()).filter(Boolean).map(s => s.slice(0, 80)))] : [];
    if (!patientId || symptoms.length === 0) return res.status(400).json({ message: 'Choose a patient and enter at least one symptom.' });
    if (!mongoose.isValidObjectId(patientId)) return res.status(400).json({ message: 'Select a valid patient.' });
    if (symptoms.length > 30) return res.status(400).json({ message: 'Enter no more than 30 symptoms.' });
    const patient = await Patient.findOne({ _id: patientId, userId: req.user._id });
    if (!patient) return res.status(404).json({ message: 'Patient record not found. Please select the patient again.' });
    const result = predict(symptoms);
    const created = await Diagnosis.create({ userId: req.user._id, patientId: patient._id, symptoms, ...result });
    const diagnosis = await created.populate('patientId', 'age gender');
    res.status(201).json({ diagnosis, disclaimer: DISCLAIMER });
  } catch (e) { next(e); }
};

exports.history = async (req, res, next) => {
  try { res.json(await Diagnosis.find({ userId: req.user._id }).populate('patientId', 'age gender').sort({ createdAt: -1 }).limit(100)); }
  catch (e) { next(e); }
};

exports.details = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid record ID.' });
    const d = await Diagnosis.findOne({ _id: req.params.id, userId: req.user._id }).populate('patientId', 'age gender');
    if (!d) return res.status(404).json({ message: 'Diagnosis record not found.' });
    res.json(d);
  } catch (e) { next(e); }
};
