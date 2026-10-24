const router = require('express').Router();
const c = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');
router.use(protect);
router.route('/').get(c.list).post(c.create);
router.route('/:id').get(c.get).put(c.update).delete(c.remove);
module.exports = router;
