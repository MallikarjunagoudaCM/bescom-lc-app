const router = require('express').Router();
const ctrl = require('../controllers/lc.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');
const { upload } = require('../config/cloudinary');

router.use(protect);

// Stats
router.get('/stats', ctrl.getStats);

// List & create
router.get('/', ctrl.getAll);
// LC creation is restricted to BESCOM AE, BESCOM JE, or BESCOM Lineman.
// KPTCL Shift JE only issues the LC once it is approved and reviewed.
router.post('/', requireRole('AE_BESCOM', 'JE_BESCOM', 'LINEMAN', 'ADMIN'), ctrl.create);

// Single LC
router.get('/:id', ctrl.getById);

// Stage transitions
router.patch('/:id/approve',        requireRole('AE_BESCOM', 'JE_BESCOM', 'AEE', 'ADMIN'), ctrl.approve);
router.patch('/:id/approveEE',      requireRole('EE', 'ADMIN'),                ctrl.approveEE);
router.patch('/:id/reject',         requireRole('AE_BESCOM', 'AEE', 'ADMIN'), ctrl.reject);
router.patch('/:id/je-review',      requireRole('SHIFT_JE_KPTCL', 'ADMIN'),    ctrl.jeReview);
router.patch('/:id/delegate',       requireRole('AE_BESCOM', 'ADMIN'), ctrl.delegate);
router.patch('/:id/start-work',     requireRole('AE_BESCOM', 'LINEMAN', 'ADMIN'), ctrl.startWork);
router.patch('/:id/complete-work',  requireRole('AE_BESCOM', 'LINEMAN', 'ADMIN'), ctrl.completeWork);
router.patch('/:id/close-request',  requireRole('AE_BESCOM', 'LINEMAN', 'ADMIN'), ctrl.closeRequest);
router.patch('/:id/release',        requireRole('SHIFT_JE_KPTCL', 'ADMIN'),    ctrl.release);

// Photo upload (multer -> Cloudinary)
router.post('/:id/photos', upload.array('photos', 5), ctrl.uploadPhotos);

module.exports = router;
