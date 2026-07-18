const bcrypt = require('bcryptjs');
const LC = require('../models/LC.model');
const User = require('../models/User.model');
const notifSvc = require('../services/notification.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const addLog = (lc, action, user, remarks, secretCode) => {
  lc.log.push({
    action,
    performedBy: user._id,
    performedByName: user.name,
    remarks,
    secretCode,
    timestamp: new Date(),
  });
};

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getYearSuffix = (date = new Date()) => String(date.getFullYear()).slice(-2);

const STATION_CODE_MAP = {
  'Koramangala 66KV': 'KRG66',
  'Hebbal 110KV': 'HBL110',
  'Electronic City 66KV': 'ECT66',
  'Yelahanka 110KV': 'YLK110',
};

const makeStationCode = (station) => {
  const normalizedStation = String(station || '').trim();
  if (STATION_CODE_MAP[normalizedStation]) {
    return STATION_CODE_MAP[normalizedStation];
  }

  const normalized = normalizedStation
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();

  const tokens = normalized
    .split(/\s+/)
    .filter(Boolean)
    .filter(token => !['STATION', 'SUBSTATION', 'SS', 'KPTCL', 'BESCOM'].includes(token));

  const sourceTokens = tokens.length ? tokens : normalized.split(/\s+/).filter(Boolean);
  const letters = sourceTokens
    .map(token => token.replace(/[^A-Z]/g, '').charAt(0))
    .join('')
    .replace(/[^A-Z0-9]/g, '');
  const digits = (normalized.match(/\d+/g) || []).join('');

  if (letters && digits) return `${letters}${digits}`.slice(0, 8);
  if (letters) return letters.length >= 3 ? letters.slice(0, 4) : letters.slice(0, 3);
  if (digits) return digits.slice(0, 4);

  const compact = normalized.replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return compact || 'GEN';
};

const generateRequestNumber = async () => {
  const year = getYearSuffix();
  const prefix = `REQ-${year}-`;
  const count = await LC.countDocuments({ requestNumber: new RegExp(`^${escapeRegex(prefix)}`) });
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
};

const generateLcNumber = async (station) => {
  const year = getYearSuffix();
  const stationCode = makeStationCode(station);
  const prefix = `LC-${stationCode}-${year}-`;
  const count = await LC.countDocuments({ station, lcNumber: new RegExp(`^${escapeRegex(prefix)}`) });
  return `${prefix}${String(count + 1).padStart(5, '0')}`;
};

const findActiveLcsOnFeederAndSection = async (feeder, section) => LC.find({
  feeder,
  section,
  status: { $in: ['INITIATED', 'APPROVED', 'JE_REVIEWED', 'DELEGATED', 'IN_PROGRESS', 'CLOSE_REQUESTED', 'RELEASED'] },
})
  .select('lcNumber requestNumber status feeder section createdAt initiatedBy')
  .sort({ createdAt: -1 })
  .lean();

const findPendingLCsOnFeeder = async (lc) => {
  const nonPendingStatuses = ['RELEASED', 'ENERGIZED', 'REJECTED'];
  const pendingLcs = await LC.find({
    feeder: lc.feeder,
    _id: { $ne: lc._id },
    status: { $nin: nonPendingStatuses },
  })
    .select('lcNumber status feeder createdAt')
    .sort({ createdAt: -1 })
    .lean();

  return pendingLcs;
};

const collectStakeholdersForLC = async (lc) => {
  const userIds = new Set();
  [lc.initiatedBy, lc.approvedBy, lc.aeeApprovedBy, lc.assignedLineman].forEach(userId => {
    if (userId) userIds.add(userId.toString ? userId.toString() : String(userId));
  });

  if (Array.isArray(lc.notifyUserIds)) {
    lc.notifyUserIds.forEach(userId => {
      if (userId) userIds.add(userId.toString ? userId.toString() : String(userId));
    });
  }

  return User.find({ _id: { $in: Array.from(userIds) } }).select('name phone role notifyEmail notifySMS email').lean();
};

const sanitizeLcForUser = (lc, user) => {
  const obj = lc.toObject ? lc.toObject() : JSON.parse(JSON.stringify(lc));
  const initiatedById = obj.initiatedBy?._id ? obj.initiatedBy._id.toString() : obj.initiatedBy?.toString?.();
  const currentUserId = user?._id?.toString?.();
  const isRequestor = initiatedById && currentUserId && initiatedById === currentUserId;

  if (!isRequestor) {
    delete obj.approvalPin;
    if (Array.isArray(obj.log)) {
      obj.log = obj.log.map(entry => ({ ...entry, secretCode: undefined }));
    }
  }

  return obj;
};

const buildLCQuery = async (user, filters = {}) => {
  const { role, _id, division, subdivision, section, station } = user;
  const query = { ...filters };

  if (role === 'LINEMAN') {
    const otherLinemen = await User.find({
      role: 'LINEMAN',
      division,
      subdivision,
      section,
      _id: { $ne: _id },
    }).select('_id');

    query.$or = [
      { initiatedBy: _id },
      { assignedLineman: _id },
      { assignedLineman: { $in: otherLinemen.map(u => u._id) }, status: { $in: ['DELEGATED', 'IN_PROGRESS', 'CLOSE_REQUESTED'] } },
    ];
  } else if (role === 'AE_BESCOM') {
    query.$or = [
      { initiatedBy: _id },
      { assignedLineman: _id },
      {
        division,
        subdivision,
        section,
        substation: user.substation,
      },
    ];
  } else if (role === 'SHIFT_JE_KPTCL') {
    query.$or = [
      { initiatedBy: _id },
      { jeReviewedBy: _id },
      { assignedLineman: _id },
      { notifyUserIds: _id },
    ];

    if (station) {
      query.$or.push({ section: station });
      query.$or.push({ substation: station });
    }
  } else if (role === 'AEE') {
    const aeIds = await User.find({
      role: 'AE_BESCOM',
      division,
      subdivision,
    }).select('_id');
    query.initiatedBy = { $in: aeIds.map(u => u._id) };
  } else if (role === 'EE') {
    const aeIds = await User.find({
      role: 'AE_BESCOM',
      division,
    }).select('_id');
    query.initiatedBy = { $in: aeIds.map(u => u._id) };
  }

  return query;
};

// ─── GET /lc ──────────────────────────────────────────────────────────────────

exports.getAll = async (req, res) => {
  const { status, workType, feeder, page = 1, limit = 20 } = req.query;
  const filters = {};
  if (status) filters.status = status;
  if (workType) filters.workType = workType;
  if (feeder) filters.feeder = new RegExp(feeder, 'i');

  const query = await buildLCQuery(req.user, filters);

  const [lcs, total] = await Promise.all([
    LC.find(query)
      .populate('initiatedBy', 'name phone role')
      .populate('approvedBy', 'name phone')
      .populate('jeReviewedBy', 'name phone')
      .populate('assignedLineman', 'name phone')
      .populate('releasedBy', 'name phone')
      .populate('energizedBy', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    LC.countDocuments(query),
  ]);

  const sanitizedLcs = lcs.map(lc => sanitizeLcForUser(lc, req.user));
  res.json({ lcs: sanitizedLcs, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// ─── GET /lc/:id ─────────────────────────────────────────────────────────────

exports.getById = async (req, res) => {
  const lc = await LC.findById(req.params.id)
    .populate('initiatedBy', 'name phone role phone')
    .populate('approvedBy', 'name phone')
    .populate('jeReviewedBy', 'name phone')
    .populate('assignedLineman', 'name phone phone')
    .populate('releasedBy', 'name phone')
    .populate('energizedBy', 'name phone')
    .populate('notifyUserIds', 'name phone role')
    .populate('log.performedBy', 'name phone');

  if (!lc) return res.status(404).json({ error: 'LC not found' });
  res.json({ lc: sanitizeLcForUser(lc, req.user) });
};

// ─── POST /lc ─────────────────────────────────────────────────────────────────

exports.create = async (req, res) => {
  const { feeder, section, substation: requestSubstation, station: requestStation, natureOfWork, description, estimatedDuration, workType, plannedStartAt } = req.body;
  const substation = requestSubstation || requestStation;
  const station = requestStation || requestSubstation || req.user.station || req.user.substation;

  if (!feeder || !natureOfWork || !estimatedDuration || !station) {
    return res.status(400).json({ error: 'station, feeder, natureOfWork, estimatedDuration are required' });
  }

  const user = req.user;

  // Only BESCOM AE, BESCOM JE, or BESCOM Lineman can raise an unplanned LC.
  // KPTCL Shift JE can only issue the LC after it is approved and reviewed.
  const allowedRoles = ['AE_BESCOM', 'JE_BESCOM', 'LINEMAN'];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ error: 'Only AE_BESCOM, JE_BESCOM, or LINEMAN can create this LC' });
  }

  let finalSection = section;
  let finalSubstation = substation;
  let finalFeeder = feeder;
  let approverRole = null;

  // Role-based feeder validation and approver determination
  if (user.role === 'LINEMAN') {
    // LINEMAN must provide all details, should be approved by their AE
    finalSection = user.section || section;
    finalSubstation = user.substation || substation;
    approverRole = 'AE_BESCOM';
  } else if (user.role === 'JE_BESCOM') {
    // BESCOM JE provides details, should be approved by the BESCOM AE in the same section
    finalSection = user.section || section;
    finalSubstation = user.substation || substation;
    approverRole = 'AE_BESCOM';
  } else if (user.role === 'AE_BESCOM') {
    // AE provides full details, should be approved by AEE
    finalSection = user.section || section;
    finalSubstation = user.substation || substation;
    if (!user.feeders || !user.feeders.includes(feeder)) {
      return res.status(400).json({ error: 'Invalid feeder for your role' });
    }
    approverRole = 'AEE';
  }

  const activeLcs = await findActiveLcsOnFeederAndSection(finalFeeder, finalSection);
  if (activeLcs.length > 0) {
    return res.status(409).json({
      error: `An active LC already exists on feeder ${finalFeeder} for section ${finalSection}`,
      activeLcs: activeLcs.map(lc => ({
        lcNumber: lc.lcNumber,
        requestNumber: lc.requestNumber,
        status: lc.status,
        feeder: lc.feeder,
        section: lc.section,
        createdAt: lc.createdAt,
      })),
    });
  }

  const requestNumber = await generateRequestNumber();

  const lc = new LC({
    requestNumber,
    station,
    feeder: finalFeeder,
    division: user.division,
    subdivision: user.subdivision,
    section: finalSection,
    substation: finalSubstation,
    natureOfWork,
    description,
    estimatedDuration: Number(estimatedDuration),
    workType: workType || 'UNPLANNED',
    plannedStartAt: plannedStartAt ? new Date(plannedStartAt) : undefined,
    initiatedBy: req.user._id,
    status: 'INITIATED',
  });

  addLog(lc, 'LC request initiated', req.user);
  await lc.save();
  await lc.populate('initiatedBy', 'name phone role');

  // Notify appropriate approvers based on who raised LC
  if (user.role === 'LINEMAN') {
    // Notify the AE for approval
    const ae = await User.findOne({ 
      role: 'AE_BESCOM',
      section: user.section,
      isActive: true 
    });
    if (ae) {
      notifSvc.notifyLCInitiated(lc, [ae]).catch(console.error);
    }
  } else if (user.role === 'JE_BESCOM') {
    // Notify the BESCOM AE of the same section for approval
    const approver = await User.findOne({ role: 'AE_BESCOM', section: user.section, isActive: true });
    if (approver) {
      notifSvc.notifyLCInitiated(lc, [approver]).catch(console.error);
    }
  } else if (user.role === 'AE_BESCOM') {
    // Notify only AEEs in the same subdivision for approval
    const approvers = await User.find({ 
      role: 'AEE',
      division: user.division,
      subdivision: user.subdivision,
      isActive: true 
    });
    if (approvers.length) {
      notifSvc.notifyLCInitiated(lc, approvers).catch(console.error);
    }
  }

  res.status(201).json({ lc, message: 'LC request submitted successfully' });
};

// ─── PATCH /lc/:id/approve ────────────────────────────────────────────────────

exports.approve = async (req, res) => {
  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });

  const userRole = req.user.role;
  const remarks = req.body.remarks || '';

  if (lc.workType === 'PLANNED') {
    if (lc.status === 'INITIATED') {
      if (userRole !== 'AEE') {
        return res.status(403).json({ error: 'Only AEE can give first approval for PLANNED LC' });
      }
      lc.aeeApprovedBy = req.user._id;
      lc.aeeApprovedAt = new Date();
      lc.approvalRemarks = remarks;
      addLog(lc, 'AEE approved (1st level for PLANNED LC)', req.user, remarks);
    } else if (lc.status === 'APPROVED') {
      return res.status(400).json({ error: 'LC already approved' });
    } else {
      return res.status(400).json({ error: `Cannot approve LC in status: ${lc.status}` });
    }

    await lc.save();
    const initiator = await User.findById(lc.initiatedBy);
    notifSvc.notifyLCApproved(lc, initiator).catch(console.error);

    return res.json({ lc: sanitizeLcForUser(lc, req.user), message: 'AEE approved - Awaiting EE approval' });
  }

  if (lc.workType === 'UNPLANNED') {
    if (lc.status !== 'INITIATED') {
      return res.status(400).json({ error: `Cannot approve UNPLANNED LC in status: ${lc.status}` });
    }

    const initiator = await User.findById(lc.initiatedBy).select('role division subdivision');
    if (!initiator) {
      return res.status(400).json({ error: 'Initiator not found' });
    }

    if (initiator.role === 'LINEMAN' || initiator.role === 'JE_BESCOM') {
      const canBescomAeApprove = userRole === 'AE_BESCOM' && req.user.section === lc.section;
      const canAdminCreatedJeApprove = userRole === 'JE_BESCOM' && req.user.createdByAdmin && req.user.section === lc.section;
      if (!canBescomAeApprove && !canAdminCreatedJeApprove) {
        return res.status(403).json({ error: 'Only the BESCOM AE of the section or admin-created BESCOM JE can approve this LC' });
      }
    } else if (initiator.role === 'AE_BESCOM') {
      if (userRole !== 'AEE') {
        return res.status(403).json({ error: 'Only AEE can approve LC raised by AE_BESCOM' });
      }
      if (req.user.subdivision !== initiator.subdivision || req.user.division !== initiator.division) {
        return res.status(403).json({ error: 'AEE can only approve LCs from their own subdivision' });
      }
    } else {
      return res.status(403).json({ error: 'Invalid LC initiator for approval' });
    }

    lc.status = 'APPROVED';
    lc.approvedBy = req.user._id;
    lc.approvedAt = new Date();
    lc.approvalRemarks = remarks;
    lc.approvalPin = generateCode();
    addLog(lc, `${userRole} approved (UNPLANNED LC)`, req.user, remarks, lc.approvalPin);

    await lc.save();
    const initiatorUser = await User.findById(lc.initiatedBy);
    notifSvc.notifyLCApproved(lc, initiatorUser).catch(console.error);

    const shiftJEs = await User.find({ role: 'SHIFT_JE_KPTCL', isActive: true });
    if (shiftJEs.length) {
      notifSvc.notify({
        recipients: shiftJEs,
        lc,
        title: 'LC Approved by AE',
        message: `LC ${lc.lcNumber} for ${lc.feeder} has been approved by AE_BESCOM. Please review and isolate CB.`,
        type: 'ACTION_REQUIRED',
      }).catch(console.error);
    }

    return res.json({ lc: sanitizeLcForUser(lc, req.user), message: 'LC approved and forwarded to JE review' });
  }

  return res.status(400).json({ error: 'Cannot approve LC at this stage' });
};

exports.approveEE = async (req, res) => {
  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });

  const remarks = req.body.remarks || '';

  if (req.user.role !== 'EE') {
    return res.status(403).json({ error: 'Only EE can give final approval for PLANNED LC' });
  }

  if (lc.workType !== 'PLANNED') {
    return res.status(400).json({ error: 'EE approval is only for PLANNED LCs' });
  }

  if (!lc.aeeApprovedBy) {
    return res.status(400).json({ error: 'LC must have AEE approval first' });
  }

  // EE can only approve LCs from AE_BESCOM in their own division
  const initiator = await User.findById(lc.initiatedBy).select('division');
  if (!initiator || initiator.division !== req.user.division) {
    return res.status(403).json({ error: 'EE can only approve LCs from their own division' });
  }

  if (lc.status === 'APPROVED') {
    return res.status(400).json({ error: 'LC already approved' });
  }

  lc.status = 'APPROVED';
  lc.eeApprovedBy = req.user._id;
  lc.eeApprovedAt = new Date();
  lc.approvedBy = req.user._id;
  lc.approvedAt = new Date();
  lc.approvalRemarks = remarks;
  lc.approvalPin = generateCode();
  addLog(lc, 'EE approved (final approval for PLANNED LC)', req.user, remarks, lc.approvalPin);

  await lc.save();
  const initiator2 = await User.findById(lc.initiatedBy);
  notifSvc.notifyLCApproved(lc, initiator2).catch(console.error);

  res.json({ lc: sanitizeLcForUser(lc, req.user), message: 'EE approved - Ready for JE review' });
};

// ─── PATCH /lc/:id/reject ─────────────────────────────────────────────────────

exports.reject = async (req, res) => {
  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (!['INITIATED', 'APPROVED'].includes(lc.status)) {
    return res.status(400).json({ error: 'Cannot reject at this stage' });
  }

  // AEE can only reject LCs from AE_BESCOM in their own subdivision
  if (req.user.role === 'AEE') {
    const initiator = await User.findById(lc.initiatedBy).select('division subdivision');
    if (!initiator || initiator.division !== req.user.division || initiator.subdivision !== req.user.subdivision) {
      return res.status(403).json({ error: 'AEE can only reject LCs from their own subdivision' });
    }
  }

  // EE can only reject LCs from AE_BESCOM in their own division
  if (req.user.role === 'EE') {
    const initiator = await User.findById(lc.initiatedBy).select('division');
    if (!initiator || initiator.division !== req.user.division) {
      return res.status(403).json({ error: 'EE can only reject LCs from their own division' });
    }
  }

  lc.status = 'REJECTED';
  lc.rejectionReason = req.body.reason || '';
  addLog(lc, 'LC rejected', req.user, req.body.reason);
  await lc.save();

  res.json({ lc: sanitizeLcForUser(lc, req.user), message: 'LC rejected' });
};

// ─── PATCH /lc/:id/je-review ─────────────────────────────────────────────────

exports.jeReview = async (req, res) => {
  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'APPROVED') return res.status(400).json({ error: `Cannot review LC in status: ${lc.status}` });

  // Mandatory photos check
  if (!lc.photos.cbIsolation || lc.photos.cbIsolation.length < 2) {
    return res.status(400).json({ error: 'At least 2 CB isolation photos required' });
  }

  if (!lc.photos.earthRod || lc.photos.earthRod.length < 1) {
    return res.status(400).json({ error: 'At least 1 Earth Rod photo required' });
  }

  if (!req.body.approvalPin) {
    return res.status(400).json({ error: 'Approval PIN is required to issue this LC' });
  }

  if (lc.approvalPin !== req.body.approvalPin) {
    return res.status(400).json({ error: 'Invalid approval PIN' });
  }

  // Generate & hash secret code
  const plainCode = generateCode();
  const hashedCode = await bcrypt.hash(plainCode, 10);

  if (!lc.lcNumber) {
    lc.lcNumber = await generateLcNumber(lc.station || lc.substation || lc.section || 'GEN');
  }

  lc.status = 'JE_REVIEWED';
  lc.jeReviewedBy = req.user._id;
  lc.jeReviewedAt = new Date();
  lc.secretCodeHash = hashedCode;
  lc.jeRemarks = req.body.remarks || '';

  // Configurable notification list
  if (req.body.notifyUserIds && Array.isArray(req.body.notifyUserIds)) {
    lc.notifyUserIds = req.body.notifyUserIds;
  }

  const initiatorUser = await User.findById(lc.initiatedBy);
  const extraUsers = await User.find({ _id: { $in: lc.notifyUserIds } });

  if (initiatorUser && (initiatorUser.role === 'LINEMAN' || initiatorUser.role === 'SHIFT_JE_KPTCL')) {
    lc.status = 'DELEGATED';
    lc.assignedLineman = lc.initiatedBy;
    lc.delegatedAt = new Date();
    addLog(lc, 'Work auto-assigned to LC requestor', req.user, req.body.remarks, plainCode);
    await lc.save();

    notifSvc.notifyDelegated(lc, initiatorUser).catch(console.error);
    notifSvc.notifyJEReviewed(lc, extraUsers).catch(console.error);
    return res.json({ lc: sanitizeLcForUser(lc, req.user), secretCode: plainCode, message: 'CB isolated and work auto-assigned to requestor.' });
  }

  addLog(lc, 'CB isolated. LC Issued. Secret code generated.', req.user, req.body.remarks, plainCode);
  await lc.save();

  // Notify SO and extra configured users
  notifSvc.notifyJEReviewed(lc, [initiatorUser, ...extraUsers]).catch(console.error);

  // Return plain code only in this response — never stored in plain text
  res.json({ lc: sanitizeLcForUser(lc, req.user), secretCode: plainCode, message: 'CB isolated. Secret code generated.' });
};

// ─── PATCH /lc/:id/validate-pin ───────────────────────────────────────────────
exports.validatePin = async (req, res) => {
  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'APPROVED') return res.status(400).json({ error: `Cannot validate PIN in status: ${lc.status}` });

  const { approvalPin } = req.body;
  if (!approvalPin) return res.status(400).json({ error: 'approvalPin required' });

  if (lc.approvalPin !== approvalPin) {
    return res.status(400).json({ error: 'Invalid approval PIN' });
  }

  res.json({ valid: true, message: 'Approval PIN is valid' });
};

// ─── PATCH /lc/:id/delegate ──────────────────────────────────────────────────

exports.delegate = async (req, res) => {
  const { linemanId } = req.body;
  if (!linemanId) return res.status(400).json({ error: 'linemanId required' });

  const lc = await LC.findById(req.params.id).select('+secretCodeHash');
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'JE_REVIEWED') return res.status(400).json({ error: `Cannot delegate in status: ${lc.status}` });

  // Check if user can delegate - only the AE who initiated the LC can delegate
  if (!lc.populated('initiatedBy')) {
    await lc.populate('initiatedBy', 'role');
  }

  const initiatedById = lc.initiatedBy?._id ? lc.initiatedBy._id.toString() : lc.initiatedBy?.toString();
  const initiatedByRole = lc.initiatedBy?.role;

  if (!initiatedById || req.user._id.toString() !== initiatedById || !['AE_BESCOM', 'AE_KPTCL'].includes(initiatedByRole)) {
    return res.status(403).json({ error: 'Only the AE who initiated the LC can delegate' });
  }

  const lineman = await User.findById(linemanId);
  if (!lineman) return res.status(404).json({ error: 'Lineman not found' });

  lc.status = 'DELEGATED';
  lc.assignedLineman = linemanId;
  lc.delegatedAt = new Date();
  addLog(lc, `Work delegated to ${lineman.name} (${lineman.phone})`, req.user);
  await lc.save();

  notifSvc.notifyDelegated(lc, lineman).catch(console.error);

  res.json({ lc: sanitizeLcForUser(lc, req.user), message: 'Work delegated to lineman' });
};

// ─── PATCH /lc/:id/start-work ────────────────────────────────────────────────

exports.startWork = async (req, res) => {
  const { secretCode } = req.body;
  if (!secretCode) return res.status(400).json({ error: 'secretCode required' });

  const lc = await LC.findById(req.params.id).select('+secretCodeHash');
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'DELEGATED') return res.status(400).json({ error: `Cannot start work in status: ${lc.status}` });

  if (!lc.assignedLineman || lc.assignedLineman.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only the assigned lineman can start work' });
  }

  const valid = await bcrypt.compare(secretCode, lc.secretCodeHash);
  if (!valid) return res.status(400).json({ error: 'Invalid secret code' });

  // Check mandatory pre-work photos
  if (!lc.photos.fieldPreWork || lc.photos.fieldPreWork.length < 1) {
    return res.status(400).json({ error: 'At least 1 pre-work field photo required' });
  }

  lc.status = 'IN_PROGRESS';
  lc.workStartedAt = new Date();
  addLog(lc, 'Field work started. Secret code verified.', req.user, req.body.notes);
  await lc.save();

  res.json({ lc: sanitizeLcForUser(lc, req.user), message: 'Work started successfully' });
};

// ─── PATCH /lc/:id/validate-secret-code ──────────────────────────────────────
exports.validateSecretCode = async (req, res) => {
  const { secretCode } = req.body;
  if (!secretCode || String(secretCode).length !== 4) {
    return res.status(400).json({ error: 'Enter a valid 4-digit secret code' });
  }

  const lc = await LC.findById(req.params.id).select('+secretCodeHash');
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'DELEGATED') return res.status(400).json({ error: `Cannot validate secret code in status: ${lc.status}` });

  if (!lc.assignedLineman || lc.assignedLineman.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: 'Only the assigned lineman can validate secret code' });
  }

  const valid = await bcrypt.compare(secretCode, lc.secretCodeHash);
  if (!valid) return res.status(400).json({ error: 'Invalid secret code' });

  return res.json({ valid: true, message: 'Secret code is valid' });
};

// ─── PATCH /lc/:id/validate-release-code ─────────────────────────────────────
exports.validateReleaseCode = async (req, res) => {
  const { secretCode } = req.body;
  if (!secretCode || String(secretCode).length !== 4) {
    return res.status(400).json({ error: 'Enter a valid 4-digit secret code' });
  }

  const lc = await LC.findById(req.params.id).select('+secretCodeHash');
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'CLOSE_REQUESTED') return res.status(400).json({ error: `Cannot validate release code in status: ${lc.status}` });

  const valid = await bcrypt.compare(secretCode, lc.secretCodeHash);
  if (!valid) return res.status(400).json({ error: 'Invalid secret code' });

  return res.json({ valid: true, message: 'Release code is valid' });
};

// ─── PATCH /lc/:id/complete-work ─────────────────────────────────────────────

exports.completeWork = async (req, res) => {
  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'IN_PROGRESS') return res.status(400).json({ error: `Cannot complete in status: ${lc.status}` });

  if (!lc.photos.fieldPostWork || lc.photos.fieldPostWork.length < 1) {
    return res.status(400).json({ error: 'At least 1 post-work field photo required' });
  }

  lc.workCompletedAt = new Date();
  lc.fieldNotes = req.body.notes || '';
  addLog(lc, 'Field work completed. Awaiting close request.', req.user, req.body.notes);
  await lc.save();

  const soUser = await User.findById(lc.initiatedBy);
  notifSvc.notifyWorkComplete(lc, soUser).catch(console.error);

  res.json({ lc: sanitizeLcForUser(lc, req.user), message: 'Field work marked complete' });
};

// ─── PATCH /lc/:id/close-request ─────────────────────────────────────────────

exports.closeRequest = async (req, res) => {
  const { secretCode, clearanceNote } = req.body;
  if (!secretCode) return res.status(400).json({ error: 'secretCode required' });

  const lc = await LC.findById(req.params.id).select('+secretCodeHash');
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'IN_PROGRESS') return res.status(400).json({ error: `Cannot close in status: ${lc.status}` });

  const valid = await bcrypt.compare(secretCode, lc.secretCodeHash);
  if (!valid) return res.status(400).json({ error: 'Invalid secret code' });

  lc.status = 'CLOSE_REQUESTED';
  lc.closeRequestedAt = new Date();
  lc.clearanceNote = clearanceNote || '';
  addLog(lc, 'Close request submitted. Area confirmed clear.', req.user, clearanceNote);
  await lc.save();

  const jeUsers = await User.find({ role: 'JE_OPERATOR', isActive: true });
  notifSvc.notifyCloseRequested(lc, jeUsers).catch(console.error);

  res.json({ lc: sanitizeLcForUser(lc, req.user), message: 'Close request submitted' });
};

// ─── PATCH /lc/:id/release ────────────────────────────────────────────────────

exports.release = async (req, res) => {
  const { secretCode } = req.body;
  if (!secretCode) return res.status(400).json({ error: 'Secret code required to release LC' });

  const lc = await LC.findById(req.params.id).select('+secretCodeHash');
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'CLOSE_REQUESTED') return res.status(400).json({ error: `Cannot release in status: ${lc.status}` });

  const valid = await bcrypt.compare(secretCode, lc.secretCodeHash);
  if (!valid) return res.status(400).json({ error: 'Invalid secret code. Confirm with the LC requestor.' });

  lc.status = 'RELEASED';
  lc.releasedBy = req.user._id;
  lc.releasedAt = new Date();
  lc.releaseRemarks = req.body.remarks || '';

  if (lc.workStartedAt) {
    lc.actualDuration = Math.round((lc.releasedAt - lc.workStartedAt) / 3600000 * 10) / 10;
  }

  addLog(lc, 'LC released. Earth removed. CB restored. Awaiting feeder energization.', req.user, req.body.remarks);
  await lc.save();

  const stakeholders = await User.find({
    _id: { $in: [lc.initiatedBy, lc.approvedBy, lc.assignedLineman, ...lc.notifyUserIds] },
  });
  notifSvc.notifyLCReleased(lc, stakeholders).catch(console.error);

  res.json({ lc: sanitizeLcForUser(lc, req.user), message: 'LC released. Proceed to feeder energization after pending LCs are cleared.' });
};

// ─── GET /lc/:id/energize-readiness ──────────────────────────────────────────
exports.getEnergizeReadiness = async (req, res) => {
  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });

  if (lc.status !== 'RELEASED') {
    return res.json({
      canEnergize: false,
      pendingCount: 0,
      pendingLcs: [],
      reason: `Cannot energize feeder in status: ${lc.status}`,
    });
  }

  const pendingLcs = await findPendingLCsOnFeeder(lc);
  return res.json({
    canEnergize: pendingLcs.length === 0,
    pendingCount: pendingLcs.length,
    pendingLcs,
    reason: pendingLcs.length ? 'Pending LCs exist on the same feeder' : '',
  });
};

// ─── PATCH /lc/:id/energize-feeder ───────────────────────────────────────────
exports.energizeFeeder = async (req, res) => {
  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'RELEASED') return res.status(400).json({ error: `Cannot energize feeder in status: ${lc.status}` });

  const pendingLcs = await findPendingLCsOnFeeder(lc);
  if (pendingLcs.length > 0) {
    return res.status(400).json({
      error: 'Cannot energize feeder until all pending LCs on this feeder are cleared',
      pendingCount: pendingLcs.length,
      pendingLcs,
    });
  }

  // Require JE to upload CB restored and Earth removed photos before energizing
  if (!lc.photos || !Array.isArray(lc.photos.cbRestored) || lc.photos.cbRestored.length < 1) {
    return res.status(400).json({ error: 'Upload at least 1 CB restored photo before energizing feeder' });
  }
  if (!lc.photos || !Array.isArray(lc.photos.earthRemoved) || lc.photos.earthRemoved.length < 1) {
    return res.status(400).json({ error: 'Upload at least 1 Earth Removed photo before energizing feeder' });
  }

  const releasedLcs = await LC.find({
    feeder: lc.feeder,
    status: 'RELEASED',
  });

  const energizedAt = new Date();
  const energizeRemarks = req.body.remarks || '';

  await Promise.all(releasedLcs.map(async targetLc => {
    targetLc.status = 'ENERGIZED';
    targetLc.energizedBy = req.user._id;
    targetLc.energizedAt = energizedAt;
    targetLc.energizeRemarks = energizeRemarks;
    addLog(targetLc, 'Feeder energized after all LCs were released.', req.user, energizeRemarks);
    await targetLc.save();
  }));

  await Promise.all(releasedLcs.map(async targetLc => {
    const stakeholders = await collectStakeholdersForLC(targetLc);
    return notifSvc.notifyFeederEnergized(targetLc, stakeholders).catch(console.error);
  }));

  const updatedLc = releasedLcs.find(item => item._id.toString() === lc._id.toString()) || lc;
  return res.json({ lc: sanitizeLcForUser(updatedLc, req.user), message: 'Feeder energized successfully.' });
};

// ─── POST /lc/:id/photos ──────────────────────────────────────────────────────

exports.uploadPhotos = async (req, res) => {
  const { photoType } = req.body;
  const allowedTypes = ['cbIsolation', 'earthRod', 'fieldPreWork', 'fieldPostWork', 'earthRemoved', 'cbRestored'];

  if (!allowedTypes.includes(photoType)) {
    return res.status(400).json({ error: `Invalid photoType. Allowed: ${allowedTypes.join(', ')}` });
  }

  // Restrict certain photo uploads to JE roles only (JE_BESCOM, SHIFT_JE_KPTCL)
  if (['cbRestored', 'earthRemoved'].includes(photoType)) {
    const allowedJeRoles = ['JE_BESCOM', 'SHIFT_JE_KPTCL'];
    if (!allowedJeRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only JE users can upload this photo type' });
    }
  }

  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });

  if (['fieldPreWork', 'fieldPostWork'].includes(photoType)) {
    if (!lc.assignedLineman || lc.assignedLineman.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the assigned lineman can upload this photo type' });
    }
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const newPhotos = req.files.map(f => ({
    url: f.path,
    publicId: f.filename,
    caption: req.body.caption || '',
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  }));

  if (!Array.isArray(lc.photos[photoType])) {
    lc.photos[photoType] = [];
  }
  lc.photos[photoType].push(...newPhotos);
  addLog(lc, `${newPhotos.length} photo(s) uploaded for stage: ${photoType}`, req.user);
  await lc.save();

  res.json({ photos: lc.photos[photoType], message: 'Photos uploaded' });
};

// ─── GET /lc/stats ───────────────────────────────────────────────────────────

exports.getStats = async (req, res) => {
  const filters = {};
  const query = await buildLCQuery(req.user, filters);

  const [statusCounts, typeCounts, recent] = await Promise.all([
    LC.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    LC.aggregate([
      { $match: query },
      { $group: { _id: '$workType', count: { $sum: 1 } } },
    ]),
    LC.find(query).sort({ createdAt: -1 }).limit(5).select('lcNumber feeder status workType createdAt'),
  ]);

  const byStatus = {};
  statusCounts.forEach(s => { byStatus[s._id] = s.count; });
  const byType = {};
  typeCounts.forEach(t => { byType[t._id] = t.count; });

  res.json({ byStatus, byType, recent });
};
