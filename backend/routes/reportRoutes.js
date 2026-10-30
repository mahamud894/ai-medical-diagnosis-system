const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const c = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

const maxBytes = (Number(process.env.MAX_UPLOAD_MB) || 5) * 1024 * 1024;
const allowed = { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] };

// Files are kept in memory, checked, then saved into MongoDB by the controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxBytes, files: 1, fields: 5 },
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
