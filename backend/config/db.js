const mongoose = require('mongoose');

function explain(err) {
  const msg = String(err && err.message || err);
  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(msg)) return 'Could not find the database host. Check the cluster address in MONGODB_URI and your internet connection.';
  if (/bad auth|Authentication failed|auth failed/i.test(msg)) return 'Username or password in MONGODB_URI is wrong. Check Atlas → Database Access. If the password has special characters (@ : / ? # %), URL-encode them.';
  if (/whitelist|IP|Server selection timed out|ReplicaSetNoPrimary|ETIMEDOUT/i.test(msg)) return 'Timed out reaching MongoDB. In Atlas → Network Access, add your current IP address (or 0.0.0.0/0 for testing). For local MongoDB, make sure the MongoDB service is running.';
  if (/ECONNREFUSED/i.test(msg)) return 'Connection refused. If you use local MongoDB, start the MongoDB service first (Windows: Services → MongoDB Server).';
  return null;
}

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    const hint = explain(err);
    if (hint) err.message = `${err.message}\n  → ${hint}`;
    throw err;
  }
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
  mongoose.connection.on('disconnected', () => console.warn('[warn] MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
}
module.exports = connectDB;
