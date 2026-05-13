const TransferApplication = require('../models/TransferApplication');
const TransferCycle = require('../models/TransferCycle');
const User = require('../models/User');

// Calculate service years at current posting
const calcServiceYears = (postingSince) => {
  if (!postingSince) return 0;
  const diff = Date.now() - new Date(postingSince).getTime();
  return diff / (1000 * 60 * 60 * 24 * 365.25);
};

// Merit score formula: service(50) + joining(30) + dob(20)
const computeMeritScore = (user, allApplicants) => {
  const serviceYears = calcServiceYears(user.currentPosting?.postingSince);

  // Normalise joining date (earlier = higher rank)
  const joiningMs = new Date(user.joiningDate).getTime();
  const allJoining = allApplicants.map(u => new Date(u.joiningDate).getTime()).sort((a, b) => a - b);
  const joiningRank = allJoining.indexOf(joiningMs);
  const joiningScore = allApplicants.length > 1
    ? ((allApplicants.length - 1 - joiningRank) / (allApplicants.length - 1)) * 100
    : 100;

  // Normalise DOB (older = higher rank)
  const dobMs = new Date(user.dateOfBirth).getTime();
  const allDob = allApplicants.map(u => new Date(u.dateOfBirth).getTime()).sort((a, b) => a - b);
  const dobRank = allDob.indexOf(dobMs);
  const dobScore = allApplicants.length > 1
    ? ((allApplicants.length - 1 - dobRank) / (allApplicants.length - 1)) * 100
    : 100;

  // Service score (capped at 100: 20 years = 100)
  const serviceScore = Math.min((serviceYears / 20) * 100, 100);

  const total = serviceScore * 0.5 + joiningScore * 0.3 + dobScore * 0.2;

  return {
    total: Math.round(total * 10) / 10,
    serviceYearsScore: Math.round(serviceScore * 10) / 10,
    joiningDateScore:  Math.round(joiningScore * 10) / 10,
    dobScore:          Math.round(dobScore * 10) / 10,
    serviceYears:      Math.round(serviceYears * 10) / 10
  };
};

exports.submitApplication = async (req, res) => {
  try {
    const { cycleId, preferences } = req.body;
    const cycle = await TransferCycle.findById(cycleId);
    if (!cycle)
      return res.status(404).json({ success: false, message: 'Transfer cycle not found' });
    if (!['application_open'].includes(cycle.status))
      return res.status(400).json({ success: false, message: 'Application window is not open' });
    if (new Date() > new Date(cycle.applicationEndDate))
      return res.status(400).json({ success: false, message: 'Application window has closed' });

    const existing = await TransferApplication.findOne({ employee: req.user._id, cycle: cycleId });
    if (existing)
      return res.status(400).json({ success: false, message: 'You have already applied in this cycle' });

    const user = await User.findById(req.user._id);
    const serviceYears = calcServiceYears(user.currentPosting?.postingSince);

    const application = await TransferApplication.create({
      employee: req.user._id,
      cycle: cycleId,
      preferences,
      snapshot: {
        name: user.name, employeeId: user.employeeId, group: user.group,
        designation: user.designation, joiningDate: user.joiningDate,
        dateOfBirth: user.dateOfBirth, currentPosting: user.currentPosting,
        postingSince: user.currentPosting?.postingSince, serviceYears
      }
    });

    res.status(201).json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    const applications = await TransferApplication.find({ employee: req.user._id })
      .populate('cycle', 'name financialYear status applicationEndDate')
      .sort({ createdAt: -1 });
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getApplicationById = async (req, res) => {
  try {
    const app = await TransferApplication.findById(req.params.id)
      .populate('cycle')
      .populate('employee', 'name employeeId group designation currentPosting')
      .populate('approvedBy', 'name employeeId');

    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });
    if (req.user.role === 'employee' && app.employee._id.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access forbidden' });

    res.json({ success: true, application: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
