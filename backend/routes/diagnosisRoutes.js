const router = require('express').Router();
const c = require('../controllers/diagnosisController');
const { protect } = require('../middleware/authMiddleware');
router.use(protect);
router.get('/symptoms', c.symptoms);
router.post('/predict', c.predict);
router.get('/history', c.history);
router.route('/:id').get(c.details).delete(c.remove);
module.exports = router;
