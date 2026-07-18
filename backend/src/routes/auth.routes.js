const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/login', ctrl.login);
router.post('/login-sso', ctrl.loginSso);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', protect, ctrl.me);

module.exports = router;
