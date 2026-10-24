const router = require('express').Router();
const c = require('../controllers/diagnosisController');
const { protect } = require('../middleware/authMiddleware');
router.use(protect);
router.post('/predict', c.predict);
router.get('/history', c.history);
router.get('/:id', c.details);
module.exports = router;
