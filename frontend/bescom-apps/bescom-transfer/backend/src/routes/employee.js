const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
router.get('/profile', protect, async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
});
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['name','phone','dateOfBirth','designation','currentPosting'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true }).select('-password');
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
router.get('/list', protect, authorize('hr_corporate'), async (req, res) => {
  try {
    const { group, division, search, page = 1, limit = 50 } = req.query;
    const filter = { role: 'employee', isActive: true };
    if (group) filter.group = group;
    if (division) filter['currentPosting.division'] = division;
    if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { employeeId: { $regex: search, $options: 'i' } }];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').skip(skip).limit(parseInt(limit)).sort({ name: 1 }),
      User.countDocuments(filter)
    ]);
    res.json({ success: true, users, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
module.exports = router;
