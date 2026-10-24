const path = require('path');
const crypto = require('crypto');

// Always load backend/.env, even if the server is started from another folder.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const isProduction = process.env.NODE_ENV === 'production';
const PLACEHOLDER_SECRET = 'replace_with_a_long_random_secret_at_least_32_characters';

function checkEnv() {
  const problems = [];

  const uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) {
    problems.push('MONGODB_URI is missing. Create backend/.env (copy .env.example) and paste your MongoDB connection string.');
  } else if (/YOUR_DB_USER|YOUR_DB_PASSWORD|YOUR_CLUSTER/.test(uri)) {
    problems.push('MONGODB_URI still contains the placeholder values from .env.example. Replace YOUR_DB_USER, YOUR_DB_PASSWORD and YOUR_CLUSTER with your real Atlas values (or use mongodb://127.0.0.1:27017/medical_diagnosis for local MongoDB).');
  } else if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    problems.push('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }

  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret || secret === PLACEHOLDER_SECRET) {
    if (isProduction) {
      problems.push('JWT_SECRET is missing or still the placeholder. Set a long random secret in backend/.env.');
    } else {
      // Development fallback so login/register don't crash with "Internal server error".
      process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
      console.warn('[warn] JWT_SECRET not set — using a temporary random secret. You will be logged out whenever the server restarts. Set JWT_SECRET in backend/.env to fix this.');
    }
  } else if (secret.length < 32) {
    console.warn('[warn] JWT_SECRET is shorter than 32 characters. Use a longer random value.');
  }

  return problems;
}

module.exports = { checkEnv, isProduction };
