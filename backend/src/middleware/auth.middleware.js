const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1] ||
                req.cookies?.accessToken;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user || !user.isActive) return res.status(401).json({ error: 'User not found or deactivated' });

    if (user.role === 'LINEMAN') {
      const ae = await User.findOne({
        role: 'AE_BESCOM',
        division: user.division,
        subdivision: user.subdivision,
        section: user.section,
        substation: user.substation,
        isActive: true,
      }).select('feeders');
      if (ae && Array.isArray(ae.feeders) && ae.feeders.length) {
        user.feeders = Array.from(new Set([...(Array.isArray(user.feeders) ? user.feeders : []), ...ae.feeders]));
      }
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied: insufficient role' });
  }
  next();
};

module.exports = { protect, requireRole };
