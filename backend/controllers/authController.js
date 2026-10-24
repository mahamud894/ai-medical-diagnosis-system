const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = user => ({ id: user._id, name: user.name, email: user.email, role: user.role });

function makeToken(user) {
  return jwt.sign({ userId: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });
}
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !String(name).trim() || !email || !password) return res.status(400).json({ message: 'Name, email and password are required.' });
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (String(password).length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (String(password).length > 128) return res.status(400).json({ message: 'Password must be 128 characters or fewer.' });
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: 'Email is already registered. Please sign in.' });
    // Role is always "patient" on self-registration; admins must be promoted in the database.
    const user = await User.create({ name: String(name).trim().slice(0, 100), email: normalizedEmail, password: await bcrypt.hash(String(password), 12) });
    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
};
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });
    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(String(password), user.password))) return res.status(401).json({ message: 'Incorrect email or password.' });
    res.json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
};
exports.me = (req, res) => res.json({ user: publicUser(req.user) });
