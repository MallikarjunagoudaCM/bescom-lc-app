const Vacancy = require('../models/Vacancy');
const TransferCycle = require('../models/TransferCycle');

exports.submitVacancy = async (req, res) => {
  try {
    const { cycleId, unitType, zone, circle, division, subDivision, section, postDesignation, group, totalVacancies } = req.body;
    const cycle = await TransferCycle.findById(cycleId);
    if (!cycle) return res.status(404).json({ success: false, message: 'Cycle not found' });
    if (!['vacancy_collection','application_open'].includes(cycle.status))
      return res.status(400).json({ success: false, message: 'Vacancy collection is closed' });
    if (new Date() > new Date(cycle.vacancyDeadline))
      return res.status(400).json({ success: false, message: 'Vacancy submission deadline has passed' });

    // Check if already submitted for this unit/designation/group
    const existing = await Vacancy.findOne({ cycle: cycleId, unitType, division, subDivision, section, postDesignation, group });
    if (existing) {
      existing.totalVacancies = totalVacancies;
      existing.status = 'submitted';
      existing.submittedAt = new Date();
      await existing.save();
      return res.json({ success: true, vacancy: existing, updated: true });
    }

    const vacancy = await Vacancy.create({
      cycle: cycleId, submittedBy: req.user._id,
      unitType, zone, circle, division, subDivision, section,
      postDesignation, group, totalVacancies, status: 'submitted', submittedAt: new Date()
    });
    res.status(201).json({ success: true, vacancy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getMyVacancies = async (req, res) => {
  try {
    const { cycleId } = req.query;
    const filter = { submittedBy: req.user._id };
    if (cycleId) filter.cycle = cycleId;
    const vacancies = await Vacancy.find(filter).populate('cycle', 'name financialYear status').sort({ createdAt: -1 });
    res.json({ success: true, vacancies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllVacancies = async (req, res) => {
  try {
    const { cycleId, group, division } = req.query;
    const filter = {};
    if (cycleId)  filter.cycle    = cycleId;
    if (group)    filter.group    = group;
    if (division) filter.division = division;
    filter.status = 'submitted';
    const vacancies = await Vacancy.find(filter).populate('submittedBy', 'name employeeId').sort({ division: 1, group: 1 });
    res.json({ success: true, vacancies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateVacancy = async (req, res) => {
  try {
    const vacancy = await Vacancy.findById(req.params.id);
    if (!vacancy) return res.status(404).json({ success: false, message: 'Vacancy not found' });
    if (vacancy.submittedBy.toString() !== req.user._id.toString() && req.user.role !== 'hr_corporate')
      return res.status(403).json({ success: false, message: 'Access forbidden' });
    Object.assign(vacancy, req.body);
    await vacancy.save();
    res.json({ success: true, vacancy });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
