const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { submitApplication, getMyApplications, getApplicationById } = require('../controllers/transferController');
const TransferCycle = require('../models/TransferCycle');

// Employee: submit application
router.post('/apply', protect, submitApplication);

// Employee: list own applications
router.get('/my-applications', protect, getMyApplications);

// All logged-in: get current active cycle (for employee dashboard)
router.get('/active-cycle', protect, async (req, res) => {
  try {
    const cycle = await TransferCycle.findOne({
      status: { $in: ['application_open', 'merit_generated', 'approval_in_progress'] }
    }).sort({ createdAt: -1 });
    res.json({ success: true, cycle: cycle || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// All logged-in: get cycles with open application window (for apply page)
router.get('/open-cycles', protect, async (req, res) => {
  try {
    const cycles = await TransferCycle.find({ status: 'application_open' }).sort({ createdAt: -1 });
    res.json({ success: true, cycles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single application by ID (employee sees own, HR sees any)
router.get('/:id', protect, getApplicationById);

module.exports = router;
