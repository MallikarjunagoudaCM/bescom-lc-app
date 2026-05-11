const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { protect, requireRole } = require('../middleware/auth.middleware');

router.use(protect, requireRole('ADMIN'));

router.post('/bulk-import', ctrl.bulkImportOfficers);
router.get('/office-hierarchy', ctrl.getOfficeHierarchy);

module.exports = router;
