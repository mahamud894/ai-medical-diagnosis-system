const { checkEnv, isProduction } = require('./config/env');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// CORS: allow the configured origin(s) (comma separated). In development also allow any
// localhost / 127.0.0.1 port, so Vite on 5174 etc. doesn't break with "Failed to fetch".
const allowedOrigins = [process.env.CLIENT_ORIGIN || 'http://localhost:5173', process.env.RENDER_EXTERNAL_URL || ''].join(',').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
// Behind Render/Heroku-style proxies, so rate limiting sees the real client IP.
if (isProduction) app.set('trust proxy', 1);
const localhostRe = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
app.disable('x-powered-by');
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin) || (!isProduction && localhostRe.test(origin))) return cb(null, true);
    return cb(null, false);
  }
}));
app.use(express.json({ limit: '100kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many requests. Please wait a few minutes and try again.' } }));
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many login attempts. Please wait 15 minutes.' } }));

app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({ status: 'ok', service: 'AI Medical Diagnosis API', mode: 'educational-prototype', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/diagnosis', require('./routes/diagnosisRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// If the React app has been built (frontend/dist), serve it from the same server.
// This lets one deployment (e.g. Render) host both the API and the website.
const distDir = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get(/^\/(?!api(\/|$)).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
} else {
  app.get('/', (req, res) => res.json({ message: 'AI Medical Diagnosis API is running. Try GET /api/health' }));
}
app.use(notFound);
app.use(errorHandler);

const problems = checkEnv();
if (problems.length) {
  console.error('\nBackend cannot start — fix backend/.env:\n' + problems.map(p => '  • ' + p).join('\n') + '\n');
  process.exit(1);
}

connectDB()
  .then(() => {
    const server = app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}  (health: http://localhost:${PORT}/api/health)`));
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') console.error(`Port ${PORT} is already in use. Close the other server, or change PORT in backend/.env (and VITE_API_URL / the Vite proxy in the frontend).`);
      else console.error(err);
      process.exit(1);
    });
  })
  .catch(err => { console.error('\nDatabase connection failed:', err.message, '\n'); process.exit(1); });

module.exports = app;
