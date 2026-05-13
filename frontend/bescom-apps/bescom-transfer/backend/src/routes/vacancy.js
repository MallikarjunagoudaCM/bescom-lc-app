const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const { submitVacancy, getMyVacancies, getAllVacancies, updateVacancy } = require('../controllers/vacancyController');
router.post('/', protect, authorize('office_admin','hr_corporate'), submitVacancy);
router.get('/my', protect, authorize('office_admin','hr_corporate'), getMyVacancies);
router.get('/', protect, authorize('hr_corporate'), getAllVacancies);
router.put('/:id', protect, authorize('office_admin','hr_corporate'), updateVacancy);
module.exports = router;
