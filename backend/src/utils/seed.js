require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User.model');

const USERS = [
  { name: 'System Admin', email: 'admin@bescom.in', phone: '9999999999', password: 'Admin@1234', role: 'ADMIN', division: 'HQ', notifyEmail: true },
  { name: 'Dr. Vijay Sharma', email: 'ee@bescom.in', phone: '8888888888', password: 'Pass@1234', role: 'EE', division: 'South', notifyEmail: true },
  { name: 'Ramesh Nair', email: 'aee@bescom.in', phone: '7777777777', password: 'Pass@1234', role: 'AEE', division: 'South', subdivision: 'South-1', notifyEmail: true },
  { name: 'Suresh Kumar', email: 'ae_bescom@bescom.in', phone: '6666666666', password: 'Pass@1234', role: 'AE_BESCOM', division: 'South', subdivision: 'South-1', section: 'Section A', substation: 'Koramangala', feeders: ['Feeder-3'], notifyEmail: true },
  { name: 'Priya Reddy', email: 'ae_kptcl@kptcl.in', phone: '5555555555', password: 'Pass@1234', role: 'AE_KPTCL', station: 'KPT-Station-1', maxShiftJEs: 4, notifyEmail: true },
  { name: 'Mohan Das', email: 'je_kptcl@kptcl.in', phone: '4444444444', password: 'Pass@1234', role: 'SHIFT_JE_KPTCL', station: 'KPT-Station-1', shiftPattern: 'WEEKLY', notifyEmail: true },
  { name: 'Ravi B', email: 'lineman@bescom.in', phone: '3333333333', password: 'Pass@1234', role: 'LINEMAN', division: 'South', subdivision: 'South-1', section: 'Section A', substation: 'Koramangala', notifyEmail: false },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const u of USERS) {
    const exists = await User.findOne({ phone: u.phone });
    if (exists) { console.log(`  SKIP: ${u.phone} already exists`); continue; }
    await User.create(u);
    console.log(`  CREATED: ${u.role} - ${u.name} (${u.phone})`);
  }

  console.log('\nSeed complete! Default passwords: Admin@1234 (admin) / Pass@1234 (others)');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
