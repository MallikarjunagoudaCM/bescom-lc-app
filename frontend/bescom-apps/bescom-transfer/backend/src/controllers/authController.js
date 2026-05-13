const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── Employee self-registration ────────────────────────────────
exports.register = async (req, res) => {
  try {
    const {
      employeeId, name, email, phone, password,
      dateOfBirth, joiningDate, designation, group, currentPosting
    } = req.body;

    // username for employees = lowercase employeeId
    const username = employeeId.toLowerCase();

    const exists = await User.findOne({ $or: [{ username }, { email }, { employeeId }] });
    if (exists)
      return res.status(400).json({ success: false, message: 'Employee ID or email already registered' });

    const user = await User.create({
      username, employeeId, name, email, phone, password,
      dateOfBirth, joiningDate, designation, group,
      currentPosting, role: 'employee',
      accountType: 'employee_account', isVerified: true
    });

    const token = signToken(user._id);
    res.status(201).json({ success: true, token, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Unified login (works for all account types) ───────────────
// Accepts { username, password } — employees use their employeeId as username
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password are required' });

    // Find by username (case-insensitive) or by employeeId for backward compat
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { employeeId: username }
      ]
    });

    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!user.isActive)
      return res.status(401).json({ success: false, message: 'Account is inactive. Contact HR.' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    res.json({ success: true, token, user: user.toPublicJSON() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user.toPublicJSON() });
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    if (!(await user.comparePassword(currentPassword)))
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
