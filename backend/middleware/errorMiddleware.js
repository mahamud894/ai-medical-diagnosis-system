function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.code === 11000) return res.status(409).json({ message: 'An account with this email already exists.' });
  if (err.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors || {}).map(e => e.message).join(' ') || 'Invalid input.' });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid record ID.' });
  if (err.name === 'MulterError') {
    const mb = Number(process.env.MAX_UPLOAD_MB) || 5;
    return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? `File is too large. Maximum size is ${mb} MB.` : err.message });
  }
  if (err.message === 'Only PDF, JPG, and PNG files are allowed.') return res.status(400).json({ message: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large.' });
  if (err.name === 'MongooseServerSelectionError' || err.name === 'MongoNetworkError') return res.status(503).json({ message: 'Database is not reachable right now. Please try again shortly.' });

  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: status < 500 ? err.message : 'Internal server error.' });
}
module.exports = { notFound, errorHandler };
