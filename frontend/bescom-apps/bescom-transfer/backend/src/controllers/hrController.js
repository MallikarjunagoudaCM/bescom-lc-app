const TransferApplication = require('../models/TransferApplication');
const TransferCycle = require('../models/TransferCycle');
const Vacancy = require('../models/Vacancy');
const User = require('../models/User');

const calcServiceYears = (postingSince) => {
  if (!postingSince) return 0;
  return (Date.now() - new Date(postingSince).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
};

// Generate merit list for a cycle
exports.generateMeritList = async (req, res) => {
  try {
    const { cycleId } = req.params;
    const cycle = await TransferCycle.findById(cycleId);
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });

    const applications = await TransferApplication.find({ cycle: cycleId })
      .populate('employee');

    const applicants = applications.map(a => a.employee);

    // Compute raw scores
    const scored = applications.map(app => {
      const user = app.employee;
      const serviceYears = calcServiceYears(user.currentPosting?.postingSince);
      const joiningMs  = new Date(user.joiningDate).getTime();
      const dobMs      = new Date(user.dateOfBirth).getTime();
      return { app, serviceYears, joiningMs, dobMs };
    });

    // Rank helpers
    const sortedJoining = [...scored].sort((a, b) => a.joiningMs - b.joiningMs);
    const sortedDob     = [...scored].sort((a, b) => a.dobMs - b.dobMs);
    const n = scored.length;

    for (const item of scored) {
      const joiningRank = sortedJoining.findIndex(x => x.app._id.equals(item.app._id));
      const dobRank     = sortedDob.findIndex(x => x.app._id.equals(item.app._id));

      const serviceScore  = Math.min((item.serviceYears / 20) * 100, 100);
      const joiningScore  = n > 1 ? ((n - 1 - joiningRank) / (n - 1)) * 100 : 100;
      const dobScore      = n > 1 ? ((n - 1 - dobRank) / (n - 1)) * 100 : 100;
      const total         = serviceScore * 0.5 + joiningScore * 0.3 + dobScore * 0.2;

      item.app.meritScore = Math.round(total * 10) / 10;
      item.app.meritBreakdown = {
        serviceYearsScore: Math.round(serviceScore * 10) / 10,
        joiningDateScore:  Math.round(joiningScore * 10) / 10,
        dobScore:          Math.round(dobScore * 10) / 10,
        bonusScore: 0
      };
      item.app.status = 'merit_generated';
    }

    // Assign ranks
    const ranked = applications.sort((a, b) => b.meritScore - a.meritScore);
    for (let i = 0; i < ranked.length; i++) {
      ranked[i].meritRank = i + 1;
      ranked[i].statusHistory.push({ status: 'merit_generated', updatedBy: req.user._id, note: 'Merit list generated' });
      await ranked[i].save();
    }

    cycle.status = 'merit_generated';
    cycle.meritGeneratedAt = new Date();
    await cycle.save();

    res.json({ success: true, message: `Merit list generated for ${ranked.length} applications`, total: ranked.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get merit list for a cycle
exports.getMeritList = async (req, res) => {
  try {
    const { cycleId } = req.params;
    const { group, status, page = 1, limit = 50 } = req.query;
    const filter = { cycle: cycleId };
    if (group) filter['snapshot.group'] = group;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [applications, total] = await Promise.all([
      TransferApplication.find(filter)
        .populate('employee', 'name employeeId group designation currentPosting joiningDate dateOfBirth')
        .sort({ meritRank: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TransferApplication.countDocuments(filter)
    ]);

    res.json({ success: true, applications, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Approve / waitlist / reject an application
exports.processApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvedPreference, hrNote } = req.body;
    const app = await TransferApplication.findById(id).populate('employee');
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    if (!['merit_generated','approval_in_progress'].includes(app.status))
      return res.status(400).json({ success: false, message: 'Application not ready for approval' });

    if (action === 'approve') {
      const pref = app.preferences.find(p => p.priority === approvedPreference);
      if (!pref) return res.status(400).json({ success: false, message: 'Invalid preference number' });

      // Decrement vacancy
      const vacancy = await Vacancy.findOne({
        cycle: app.cycle,
        division: pref.division,
        group: app.snapshot.group,
        status: 'submitted'
      });
      if (vacancy && vacancy.availableVacancies > 0) {
        vacancy.filledVacancies += 1;
        await vacancy.save();
      }

      app.status = 'approved';
      app.approvedPreference = approvedPreference;
      app.approvedPosting = { zone: pref.zone, circle: pref.circle, division: pref.division, subDivision: pref.subDivision, section: pref.section };
      app.approvedBy = req.user._id;
      app.approvedAt = new Date();
    } else if (action === 'waitlist') {
      app.status = 'waitlisted';
    } else if (action === 'reject') {
      app.status = 'rejected';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    app.hrNote = hrNote;
    app.statusHistory.push({ status: app.status, updatedBy: req.user._id, note: hrNote || `HR action: ${action}` });
    await app.save();

    res.json({ success: true, application: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Cycle management
exports.createCycle = async (req, res) => {
  try {
    const cycle = await TransferCycle.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, cycle });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCycles = async (req, res) => {
  try {
    const cycles = await TransferCycle.find().sort({ createdAt: -1 });
    res.json({ success: true, cycles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCycleStatus = async (req, res) => {
  try {
    const cycle = await TransferCycle.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    res.json({ success: true, cycle });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const activeCycle = await TransferCycle.findOne({ status: { $in: ['application_open','merit_generated','approval_in_progress'] } }).sort({ createdAt: -1 });
    const stats = { activeCycle: activeCycle || null };
    if (activeCycle) {
      const [total, approved, waitlisted, pending, vacancies] = await Promise.all([
        TransferApplication.countDocuments({ cycle: activeCycle._id }),
        TransferApplication.countDocuments({ cycle: activeCycle._id, status: 'approved' }),
        TransferApplication.countDocuments({ cycle: activeCycle._id, status: 'waitlisted' }),
        TransferApplication.countDocuments({ cycle: activeCycle._id, status: { $in: ['submitted','merit_generated'] } }),
        Vacancy.aggregate([{ $match: { cycle: activeCycle._id, status: 'submitted' } },
          { $group: { _id: null, total: { $sum: '$totalVacancies' }, filled: { $sum: '$filledVacancies' } } }])
      ]);
      stats.totalApplications = total;
      stats.approved = approved;
      stats.waitlisted = waitlisted;
      stats.pending = pending;
      stats.totalVacancies = vacancies[0]?.total || 0;
      stats.filledVacancies = vacancies[0]?.filled || 0;
    }
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
