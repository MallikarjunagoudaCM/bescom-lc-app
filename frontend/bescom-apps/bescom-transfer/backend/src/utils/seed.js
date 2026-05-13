require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const TransferCycle = require('../models/TransferCycle');

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB\n');

  // ── HR Corporate account (office account, no employee fields) ──
  const hrExists = await User.findOne({ username: 'hr.admin' });
  if (!hrExists) {
    await User.create({
      username:    'hr.admin',
      name:        'HR Administrator',
      email:       'hr.admin@bescom.karnataka.gov.in',
      phone:       '9876543210',
      password:    'BescomHR@2025',
      role:        'hr_corporate',
      accountType: 'office_account',
      officeName:  'BESCOM Corporate HR Department',
      isVerified:  true, isActive: true
    });
    console.log('✓ HR Admin created');
    console.log('  Login → username: hr.admin  |  password: BescomHR@2025');
  } else { console.log('⚠ HR Admin already exists'); }

  // ── Office Admin accounts (one per division) ──
  const officeAccounts = [
    {
      username: 'jayanagar.div', name: 'Jayanagar Division Admin',
      email: 'admin.jayanagar@bescom.karnataka.gov.in', phone: '9845012345',
      password: 'Office@2025', officeName: 'Jayanagar Division Office',
      managedUnit: { unitType:'division', zone:'Southern Zone', circle:'Bengaluru South Circle', division:'Jayanagar Division' }
    },
    {
      username: 'rajajinagar.div', name: 'Rajajinagar Division Admin',
      email: 'admin.rajajinagar@bescom.karnataka.gov.in', phone: '9845023456',
      password: 'Office@2025', officeName: 'Rajajinagar Division Office',
      managedUnit: { unitType:'division', zone:'Northern Zone', circle:'Bengaluru North Circle', division:'Rajajinagar Division' }
    },
    {
      username: 'malleshwaram.div', name: 'Malleshwaram Division Admin',
      email: 'admin.malleshwaram@bescom.karnataka.gov.in', phone: '9845034567',
      password: 'Office@2025', officeName: 'Malleshwaram Division Office',
      managedUnit: { unitType:'division', zone:'Northern Zone', circle:'Bengaluru North Circle', division:'Malleshwaram Division' }
    }
  ];

  for (const oa of officeAccounts) {
    const exists = await User.findOne({ username: oa.username });
    if (!exists) {
      await User.create({ ...oa, role:'office_admin', accountType:'office_account', isVerified:true, isActive:true });
      console.log(`✓ Office Admin created: ${oa.username} / Office@2025  (${oa.officeName})`);
    }
  }

  // ── Sample employee accounts ──
  const employees = [
    { employeeId:'EMP0001', username:'emp0001', name:'Ravi Kumar S',
      email:'ravi.kumar@bescom.karnataka.gov.in', phone:'9900112233', password:'Employee@2025',
      dateOfBirth: new Date('1985-04-22'), joiningDate: new Date('2017-06-14'),
      designation:'Junior Engineer', group:'C',
      currentPosting:{ zone:'Southern Zone', circle:'Bengaluru South Circle', division:'Jayanagar Division', subDivision:'BTM Layout Sub-division', section:'BTM 2nd Stage O&M', postingSince: new Date('2017-08-01') } },
    { employeeId:'EMP0002', username:'emp0002', name:'Sunita Patil',
      email:'sunita.patil@bescom.karnataka.gov.in', phone:'9900223344', password:'Employee@2025',
      dateOfBirth: new Date('1988-11-30'), joiningDate: new Date('2018-10-02'),
      designation:'Assistant Engineer', group:'C',
      currentPosting:{ zone:'Southern Zone', circle:'Bengaluru South Circle', division:'Basavanagudi Division', subDivision:'Basavanagudi Sub-division', section:'Gandhi Bazaar O&M', postingSince: new Date('2018-12-01') } },
    { employeeId:'EMP0003', username:'emp0003', name:'Anand Nair',
      email:'anand.nair@bescom.karnataka.gov.in', phone:'9900334455', password:'Employee@2025',
      dateOfBirth: new Date('1990-07-05'), joiningDate: new Date('2019-03-20'),
      designation:'Junior Engineer', group:'C',
      currentPosting:{ zone:'Southern Zone', circle:'Bengaluru South Circle', division:'Jayanagar Division', subDivision:'BTM Layout Sub-division', section:'BTM 2nd Stage O&M', postingSince: new Date('2019-05-01') } },
    { employeeId:'EMP0004', username:'emp0004', name:'Meena Devi R',
      email:'meena.devi@bescom.karnataka.gov.in', phone:'9900445566', password:'Employee@2025',
      dateOfBirth: new Date('1992-01-18'), joiningDate: new Date('2020-08-10'),
      designation:'Junior Lineman', group:'D',
      currentPosting:{ zone:'Northern Zone', circle:'Bengaluru North Circle', division:'Malleshwaram Division', subDivision:'Sadashivanagar Sub-division', section:'Sadashivanagar O&M', postingSince: new Date('2020-10-01') } }
  ];

  for (const emp of employees) {
    const exists = await User.findOne({ username: emp.username });
    if (!exists) {
      await User.create({ ...emp, role:'employee', accountType:'employee_account', isVerified:true, isActive:true });
      console.log(`✓ Employee created: ${emp.username} — ${emp.name}`);
    }
  }

  // ── Sample transfer cycle ──
  const cycleExists = await TransferCycle.findOne({ financialYear:'2025-26' });
  if (!cycleExists) {
    const hr = await User.findOne({ username:'hr.admin' });
    await TransferCycle.create({
      name:'Annual Transfer 2025-26', financialYear:'2025-26', status:'application_open',
      vacancyDeadline:      new Date(Date.now() + 15*24*60*60*1000),
      applicationStartDate: new Date(),
      applicationEndDate:   new Date(Date.now() + 30*24*60*60*1000),
      createdBy: hr?._id, notes:'Seeded automatically'
    });
    console.log('✓ Transfer cycle created (open for 30 days)');
  }

  console.log('\n─── Seed complete ───────────────────────────────────');
  console.log('\nOffice / HR login (use /office-login page):');
  console.log('  HR Admin:          hr.admin         / BescomHR@2025');
  console.log('  Jayanagar Office:  jayanagar.div    / Office@2025');
  console.log('  Rajajinagar Office:rajajinagar.div  / Office@2025');
  console.log('\nEmployee login (use /login page):');
  console.log('  Employee:          emp0001 (or EMP0001) / Employee@2025');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
