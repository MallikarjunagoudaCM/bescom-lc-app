const bcrypt = require('bcryptjs');
const LC = require('../models/LC.model');
const User = require('../models/User.model');
const notifSvc = require('../services/notification.service');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const addLog = (lc, action, user, remarks) => {
  lc.log.push({
    action,
    performedBy: user._id,
    performedByName: user.name,
    remarks,
    timestamp: new Date(),
  });
};

const generateCode = () => Math.floor(1000 + Math.random() * 9000).toString();

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
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    LC.countDocuments(query),
  ]);

  res.json({ lcs, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// ─── GET /lc/:id ─────────────────────────────────────────────────────────────

exports.getById = async (req, res) => {
  const lc = await LC.findById(req.params.id)
    .populate('initiatedBy', 'name phone role phone')
    .populate('approvedBy', 'name phone')
    .populate('jeReviewedBy', 'name phone')
    .populate('assignedLineman', 'name phone phone')
    .populate('releasedBy', 'name phone')
    .populate('notifyUserIds', 'name phone role')
    .populate('log.performedBy', 'name phone');

  if (!lc) return res.status(404).json({ error: 'LC not found' });
  res.json({ lc });
};

// ─── POST /lc ─────────────────────────────────────────────────────────────────

exports.create = async (req, res) => {
  const { feeder, section, substation, natureOfWork, description, estimatedDuration, workType, plannedStartAt } = req.body;

  if (!feeder || !natureOfWork || !estimatedDuration) {
    return res.status(400).json({ error: 'feeder, natureOfWork, estimatedDuration are required' });
  }

  const user = req.user;

  // Only LINEMAN, SHIFT_JE_KPTCL, AE_BESCOM, AE_KPTCL can raise LC
  const allowedRoles = ['LINEMAN', 'SHIFT_JE_KPTCL', 'AE_BESCOM'];
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ error: 'Only LINEMAN, JE, and AE can raise LC' });
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
  } else if (user.role === 'SHIFT_JE_KPTCL') {
    // JE provides details, should be approved by BESCOM AE
    finalSection = user.station || section;
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

  const lc = new LC({
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
  } else if (user.role === 'SHIFT_JE_KPTCL') {
    // Notify BESCOM AE for approval
    const approver = await User.findOne({ role: 'AE_BESCOM', section: user.station, isActive: true }) || await User.findOne({ role: 'AEE', isActive: true });
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
  } else if (lc.workType === 'UNPLANNED') {
    if (lc.status !== 'INITIATED') {
      return res.status(400).json({ error: `Cannot approve UNPLANNED LC in status: ${lc.status}` });
    }

    const initiator = await User.findById(lc.initiatedBy).select('role division subdivision');
    if (!initiator) {
      return res.status(400).json({ error: 'Initiator not found' });
    }

    if (initiator.role === 'LINEMAN') {
      if (userRole !== 'AE_BESCOM') {
        return res.status(403).json({ error: 'Only AE_BESCOM can approve LC raised by Lineman' });
      }
    } else if (initiator.role === 'SHIFT_JE_KPTCL') {
      if (!['AE_BESCOM', 'AE_KPTCL'].includes(userRole)) {
        return res.status(403).json({ error: 'Only AE_BESCOM or AE_KPTCL can approve LC raised by Shift JE' });
      }
    } else if (initiator.role === 'AE_BESCOM') {
      if (userRole !== 'AEE') {
        return res.status(403).json({ error: 'Only AEE can approve LC raised by AE_BESCOM' });
      }
      // AEE can only approve AE_BESCOM in their own subdivision
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
    addLog(lc, `${userRole} approved (UNPLANNED LC)`, req.user, remarks);

    await lc.save();
    const initiatorUser = await User.findById(lc.initiatedBy);
    notifSvc.notifyLCApproved(lc, initiatorUser).catch(console.error);

    if (initiator.role === 'LINEMAN') {
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
    }

    return res.json({ lc, message: 'LC approved and forwarded to JE review' });
  }

  await lc.save();
  const initiator = await User.findById(lc.initiatedBy);
  notifSvc.notifyLCApproved(lc, initiator).catch(console.error);

  res.json({ lc, message: lc.workType === 'PLANNED' && lc.status !== 'APPROVED' ? 'AEE approved - Awaiting EE approval' : 'LC approved' });
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
  addLog(lc, 'EE approved (final approval for PLANNED LC)', req.user, remarks);

  await lc.save();
  const initiator2 = await User.findById(lc.initiatedBy);
  notifSvc.notifyLCApproved(lc, initiator2).catch(console.error);

  res.json({ lc, message: 'EE approved - Ready for JE review' });
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

  res.json({ lc, message: 'LC rejected' });
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

  // Generate & hash secret code
  const plainCode = generateCode();
  const hashedCode = await bcrypt.hash(plainCode, 10);

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

  if (initiatorUser && initiatorUser.role === 'LINEMAN') {
    lc.status = 'DELEGATED';
    lc.assignedLineman = lc.initiatedBy;
    lc.delegatedAt = new Date();
    addLog(lc, 'Work auto-assigned to LC requestor', req.user, req.body.remarks);
    await lc.save();

    notifSvc.notifyDelegated(lc, initiatorUser).catch(console.error);
    notifSvc.notifyJEReviewed(lc, extraUsers).catch(console.error);
    return res.json({ lc, secretCode: plainCode, message: 'CB isolated and work auto-assigned to requestor.' });
  }

  addLog(lc, 'CB isolated. JE reviewed. Secret code generated.', req.user, req.body.remarks);
  await lc.save();

  // Notify SO and extra configured users
  notifSvc.notifyJEReviewed(lc, [initiatorUser, ...extraUsers]).catch(console.error);

  // Return plain code only in this response — never stored in plain text
  res.json({ lc, secretCode: plainCode, message: 'CB isolated. Secret code generated.' });
};

// ─── PATCH /lc/:id/delegate ──────────────────────────────────────────────────

exports.delegate = async (req, res) => {
  const { linemanId } = req.body;
  if (!linemanId) return res.status(400).json({ error: 'linemanId required' });

  const lc = await LC.findById(req.params.id).select('+secretCodeHash');
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'JE_REVIEWED') return res.status(400).json({ error: `Cannot delegate in status: ${lc.status}` });

  const lineman = await User.findById(linemanId);
  if (!lineman) return res.status(404).json({ error: 'Lineman not found' });

  lc.status = 'DELEGATED';
  lc.assignedLineman = linemanId;
  lc.delegatedAt = new Date();
  addLog(lc, `Work delegated to ${lineman.name} (${lineman.phone})`, req.user);
  await lc.save();

  notifSvc.notifyDelegated(lc, lineman).catch(console.error);

  res.json({ lc, message: 'Work delegated to lineman' });
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

  res.json({ lc, message: 'Work started successfully' });
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

  res.json({ lc, message: 'Field work marked complete' });
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

  res.json({ lc, message: 'Close request submitted' });
};

// ─── PATCH /lc/:id/release ────────────────────────────────────────────────────

exports.release = async (req, res) => {
  const lc = await LC.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'LC not found' });
  if (lc.status !== 'CLOSE_REQUESTED') return res.status(400).json({ error: `Cannot release in status: ${lc.status}` });

  if (!lc.photos.earthRemoved || lc.photos.earthRemoved.length < 1) {
    return res.status(400).json({ error: 'Earth removed photo required' });
  }
  if (!lc.photos.cbRestored || lc.photos.cbRestored.length < 1) {
    return res.status(400).json({ error: 'CB restored photo required' });
  }

  lc.status = 'RELEASED';
  lc.releasedBy = req.user._id;
  lc.releasedAt = new Date();
  lc.releaseRemarks = req.body.remarks || '';

  if (lc.workStartedAt) {
    lc.actualDuration = Math.round((lc.releasedAt - lc.workStartedAt) / 3600000 * 10) / 10;
  }

  addLog(lc, 'LC released. Earth removed. CB restored. Line energized.', req.user, req.body.remarks);
  await lc.save();

  const stakeholders = await User.find({
    _id: { $in: [lc.initiatedBy, lc.approvedBy, lc.assignedLineman, ...lc.notifyUserIds] },
  });
  notifSvc.notifyLCReleased(lc, stakeholders).catch(console.error);

  res.json({ lc, message: 'LC released. Line energized.' });
};

// ─── POST /lc/:id/photos ──────────────────────────────────────────────────────

exports.uploadPhotos = async (req, res) => {
  const { photoType } = req.body;
  const allowedTypes = ['cbIsolation', 'fieldPreWork', 'fieldPostWork', 'earthRemoved', 'cbRestored'];

  if (!allowedTypes.includes(photoType)) {
    return res.status(400).json({ error: `Invalid photoType. Allowed: ${allowedTypes.join(', ')}` });
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
