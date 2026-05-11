const User = require('../models/User.model');

exports.getAll = async (req, res) => {
  const { role, isActive } = req.query;
  const query = {};
  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  const users = await User.find(query).select('-password -refreshToken').sort({ name: 1 });
  res.json({ users });
};

exports.getById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password -refreshToken');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
};

exports.create = async (req, res) => {
  const {
    name, email, phone, role, division, subdivision, section,
    substation, feeders, station, shiftPattern, maxShiftJEs, password,
  } = req.body;

  if (!name || !email || !phone || !role || !password) {
    return res.status(400).json({ error: 'name, email, phone, role, password are required' });
  }

  const feederList = Array.isArray(feeders)
    ? feeders.map(f => f.trim()).filter(Boolean)
    : typeof feeders === 'string'
      ? feeders.split(',').map(f => f.trim()).filter(Boolean)
      : [];

  const isBESCOM_SO = req.user.role === 'AE_BESCOM';
  const isKPTCL_AE = req.user.role === 'AE_KPTCL';

  if (req.user.role === 'ADMIN') {
    if (role === 'AE_BESCOM') {
      if (!division || !subdivision || !section || !substation || feederList.length === 0) {
        return res.status(400).json({
          error: 'AE_BESCOM requires: division, subdivision, section, substation, and feeders',
        });
      }
    } else if (role === 'AE_KPTCL') {
      if (!station || !maxShiftJEs || maxShiftJEs < 1 || maxShiftJEs > 4) {
        return res.status(400).json({
          error: 'AE_KPTCL requires: station and maxShiftJEs (1-4)',
        });
      }
    } else if (role === 'SHIFT_JE_KPTCL') {
      if (!station || !shiftPattern || !['WEEKLY', 'MONTHLY'].includes(shiftPattern)) {
        return res.status(400).json({
          error: 'SHIFT_JE_KPTCL requires: station and shiftPattern (WEEKLY or MONTHLY)',
        });
      }
    } else if (role === 'LINEMAN') {
      if (!division || !subdivision || !section || !substation) {
        return res.status(400).json({
          error: 'LINEMAN requires: division, subdivision, section, substation',
        });
      }
    }
  } else if (isBESCOM_SO) {
    if (role !== 'LINEMAN') {
      return res.status(403).json({ error: 'AE_BESCOM can only create Lineman accounts' });
    }
  } else if (isKPTCL_AE) {
    if (role !== 'SHIFT_JE_KPTCL') {
      return res.status(403).json({ error: 'AE_KPTCL can only create Shift JE accounts' });
    }
    const countJEs = await User.countDocuments({ assignedToAEKPTCL: req.user._id, role: 'SHIFT_JE_KPTCL' });
    if (countJEs >= req.user.maxShiftJEs) {
      return res.status(400).json({ error: `Cannot exceed ${req.user.maxShiftJEs} Shift JEs` });
    }
  } else {
    return res.status(403).json({ error: 'Access denied' });
  }

  const userData = {
    name,
    email,
    phone,
    password,
  };

  if (isBESCOM_SO) {
    userData.role = 'LINEMAN';
    userData.division = req.user.division;
    userData.subdivision = req.user.subdivision;
    userData.section = req.user.section;
    userData.substation = req.user.substation;
    userData.feeders = req.user.feeders || [];
  } else if (isKPTCL_AE) {
    userData.role = 'SHIFT_JE_KPTCL';
    userData.station = req.user.station;
    userData.shiftPattern = shiftPattern;
    userData.assignedToAEKPTCL = req.user._id;
  } else {
    userData.role = role;
    if (role === 'AE_BESCOM') {
      userData.division = division;
      userData.subdivision = subdivision;
      userData.section = section;
      userData.substation = substation;
      userData.feeders = feederList;
    } else if (role === 'AE_KPTCL') {
      userData.station = station;
      userData.maxShiftJEs = maxShiftJEs;
    } else if (role === 'SHIFT_JE_KPTCL') {
      userData.station = station;
      userData.shiftPattern = shiftPattern;
    } else if (role === 'LINEMAN') {
      userData.division = division;
      userData.subdivision = subdivision;
      userData.section = section;
      userData.substation = substation;
      userData.feeders = feederList || [];
    }
  }

  const user = await User.create(userData);
  res.status(201).json({ user: user.toSafeObject(), message: 'User created' });
};

exports.update = async (req, res) => {
  const { password, ...rest } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true })
    .select('-password -refreshToken');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user, message: 'User updated' });
};

exports.deleteUser = async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'User deleted' });
};

exports.updateNotificationPrefs = async (req, res) => {
  const { notifyEmail, notifySMS } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { notifyEmail, notifySMS },
    { new: true }
  ).select('-password -refreshToken');
  res.json({ user, message: 'Notification preferences updated' });
};

exports.getLinemanList = async (req, res) => {
  const query = { role: 'LINEMAN', isActive: true };

  // BESCOM AE should only see linemen in their own section/substation
  if (req.user.role === 'AE_BESCOM') {
    query.division = req.user.division;
    query.subdivision = req.user.subdivision;
    query.section = req.user.section;
    query.substation = req.user.substation;
  }

  const users = await User.find(query)
    .select('name phone role');
  res.json({ users });
};
