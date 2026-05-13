const router   = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const User     = require('../models/User');
const HIERARCHY= require('../utils/masterData');

// ── Create Office / HR account (no employee fields needed) ────
router.post('/create-office-account', protect, authorize('hr_corporate'), async (req, res) => {
  try {
    const {
      username, name, email, phone, password,
      role, officeName, managedUnit
    } = req.body;

    if (!['hr_corporate','office_admin'].includes(role))
      return res.status(400).json({ success: false, message: 'Role must be hr_corporate or office_admin' });

    const exists = await User.findOne({ $or: [{ username: username.toLowerCase() }, { email }] });
    if (exists)
      return res.status(400).json({ success: false, message: 'Username or email already taken' });

    const user = await User.create({
      username: username.toLowerCase(),
      name, email, phone, password,
      role, officeName, managedUnit,
      accountType: 'office_account',
      isVerified: true, isActive: true
    });

    res.status(201).json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Update office account details ─────────────────────────────
router.put('/office-account/:id', protect, authorize('hr_corporate'), async (req, res) => {
  try {
    const { name, email, phone, officeName, managedUnit, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.accountType === 'employee_account')
      return res.status(400).json({ success: false, message: 'Use employee endpoints for employee accounts' });

    if (name)        user.name        = name;
    if (email)       user.email       = email;
    if (phone)       user.phone       = phone;
    if (officeName)  user.officeName  = officeName;
    if (managedUnit) user.managedUnit = managedUnit;
    if (password)    user.password    = password;   // pre-save hook hashes it

    await user.save();
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Reset password for any account ───────────────────────────
router.put('/reset-password/:id', protect, authorize('hr_corporate'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Toggle active/inactive ────────────────────────────────────
router.put('/users/:id/toggle-active', protect, authorize('hr_corporate'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── List users (filterable) ───────────────────────────────────
router.get('/users', protect, authorize('hr_corporate'), async (req, res) => {
  try {
    const { role, accountType, search, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (role)        filter.role        = role;
    if (accountType) filter.accountType = accountType;
    if (search) filter.$or = [
      { name:       { $regex: search, $options: 'i' } },
      { username:   { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { officeName: { $regex: search, $options: 'i' } }
    ];
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      User.countDocuments(filter)
    ]);
    res.json({ success: true, users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Org hierarchy master data ─────────────────────────────────
router.get('/hierarchy', (req, res) => {
  res.json({ success: true, data: HIERARCHY });
});

module.exports = router;
