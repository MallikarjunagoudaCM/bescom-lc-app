const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { generateTokens, setRefreshCookie } = require('../services/auth.service');
const { verifyAuthentikToken } = require('../utils/authentikJwt');

// Authentik stores phone numbers with a country code prefix (e.g.
// +919900112233); this app's User.phone is a strict 10-digit field with no
// prefix. Normalize before comparing, or every match silently fails.
function normalizePhone(raw) {
  if (!raw) return '';
  const digitsOnly = String(raw).replace(/\D/g, '');
  return digitsOnly.length > 10 ? digitsOnly.slice(-10) : digitsOnly;
}

exports.loginSso = async (req, res) => {
  const idToken = req.body?.idToken;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });

  let claims;
  try {
    claims = await verifyAuthentikToken(idToken);
  } catch (err) {
    console.error('Authentik token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid or expired SSO token' });
  }

  // The bescom-profile-attributes mapping emits this claim as `mobile`,
  // not `contact_phone` — logging the full claims object here so any
  // future claim-name mismatch (or missing scope attachment) is obvious
  // immediately instead of silently failing the phone match.
  console.log('[login-sso] decoded Authentik claims:', JSON.stringify(claims, null, 2));

  const rawPhone = claims.mobile;
  if (!rawPhone) {
    // No mobile number on this Authentik account at all — this app
    // requires one, and it can't be added from here. Frontend uses this
    // flag to redirect to the SSO Portal's add-phone flow instead of
    // showing a generic error.
    return res.status(428).json({
      error: 'Mobile number not set on your account',
      needsMobile: true,
    });
  }

  const phone = normalizePhone(rawPhone);
  console.log('[login-sso] raw phone from claim:', rawPhone, '→ normalized:', phone);

  const user = await User.findOne({ phone }).select('+password');
  console.log('[login-sso] matched Mongo user:', user ? `${user.name} (${user.phone})` : 'NONE');

  if (!user || !user.isActive) {
    return res.status(403).json({
      error: 'Your account is not provisioned for BESCOM LC. Please contact your administrator to add your account into BESCOM LC App.',
    });
  }

  // Identical to the existing password-based login from this point on —
  // Authentik only replaces how we proved who this person is; role,
  // division, feeders, and everything else still comes from this same
  // Mongo User record, unchanged.
  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  setRefreshCookie(res, refreshToken);

  res.json({ accessToken, refreshToken, user: user.toSafeObject() });
};

exports.login = async (req, res) => {
  const phone = String(req.body?.phone || '').trim();
  const password = String(req.body?.password || '');
  if (!phone || !password) return res.status(400).json({ error: 'Phone and password required' });
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Enter a valid 10-digit mobile number' });

  const user = await User.findOne({ phone }).select('+password');
  if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const { accessToken, refreshToken } = generateTokens(user._id);

  // Save hashed refresh token
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);

  res.json({ accessToken, refreshToken, user: user.toSafeObject() });
};

exports.refresh = async (req, res) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) return res.status(401).json({ error: 'Invalid refresh token' });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    setRefreshCookie(res, refreshToken);
    res.json({ accessToken, refreshToken, user: user.toSafeObject() });
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