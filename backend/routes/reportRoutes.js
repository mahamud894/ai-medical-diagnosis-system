const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const c = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

const maxBytes = (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024;
const allowed = { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] };
const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${allowed[file.mimetype][0]}`)
});
const upload = multer({
  storage,
  limits: { fileSize: maxBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed[file.mimetype] || !allowed[file.mimetype].includes(ext)) return cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
    cb(null, true);
  }
});

router.use(protect);
router.post('/upload', upload.single('report'), c.upload);
router.get('/', c.list);
router.get('/:id/file', c.download);
router.delete('/:id', c.remove);
module.exports = router;
