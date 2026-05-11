const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', requireRole('ADMIN', 'EE', 'AEE', 'AE_BESCOM', 'AE_KPTCL'), ctrl.getAll);
router.get('/linemen', ctrl.getLinemanList);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN', 'AE_BESCOM', 'AE_KPTCL'), ctrl.create);
router.delete('/:id', requireRole('ADMIN'), ctrl.deleteUser);
router.patch('/:id', requireRole('ADMIN'), ctrl.update);
router.patch('/me/notifications', ctrl.updateNotificationPrefs);

module.exports = router;
