const router = require('express').Router();
const ctrl = require('../controllers/notification.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', ctrl.getMyNotifications);
router.patch('/:id/read', ctrl.markRead);
router.patch('/mark-all-read', ctrl.markAllRead);

module.exports = router;
