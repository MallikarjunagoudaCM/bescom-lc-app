const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { generateTokens, setRefreshCookie } = require('../services/auth.service');

exports.login = async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });

  const user = await User.findOne({ phone }).select('+password');
  if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save hashed refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);

  res.json({ accessToken, user: user.toSafeObject() });
};

exports.refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) return res.status(401).json({ error: 'Invalid refresh token' });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, user: user.toSafeObject() });
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
};

exports.logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    const user = await User.findOne({ refreshToken: token }).select('+refreshToken');
    if (user) { user.refreshToken = null; await user.save({ validateBeforeSave: false }); }
  }
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};

exports.me = async (req, res) => {
  res.json({ user: req.user.toSafeObject ? req.user.toSafeObject() : req.user });
};
