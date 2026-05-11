export const ROLES = {
  EE: 'EE',
  AEE: 'AEE',
  AE_BESCOM: 'AE (BESCOM)',
  AE_KPTCL: 'AE (KPTCL)',
  SHIFT_JE_KPTCL: 'Shift JE (KPTCL)',
  LINEMAN: 'Lineman',
  ADMIN: 'Admin',
};

export const STAGES = [
  { key: 'INITIATED',       label: 'Initiated',       icon: '📋', color: '#4338CA', bg: '#EEF2FF' },
  { key: 'APPROVED',        label: 'Approved',         icon: '✅', color: '#15803D', bg: '#F0FDF4' },
  { key: 'JE_REVIEWED',     label: 'JE Reviewed',      icon: '🔌', color: '#1D4ED8', bg: '#EFF6FF' },
  { key: 'DELEGATED',       label: 'Delegated',        icon: '👷', color: '#C2410C', bg: '#FFF7ED' },
  { key: 'IN_PROGRESS',     label: 'In Progress',      icon: '🔧', color: '#B45309', bg: '#FFFBEB' },
  { key: 'CLOSE_REQUESTED', label: 'Close Requested',  icon: '🔒', color: '#7E22CE', bg: '#FDF4FF' },
  { key: 'RELEASED',        label: 'Released',         icon: '⚡', color: '#065F46', bg: '#F0FDF4' },
  { key: 'REJECTED',        label: 'Rejected',         icon: '❌', color: '#B91C1C', bg: '#FEF2F2' },
];

export const PHOTO_TYPES = {
  cbIsolation:   { label: 'CB Isolation Photos', required: 2, stages: ['APPROVED'] },
  fieldPreWork:  { label: 'Pre-Work Field Photos', required: 1, stages: ['DELEGATED'] },
  fieldPostWork: { label: 'Post-Work Field Photos', required: 1, stages: ['IN_PROGRESS'] },
  earthRemoved:  { label: 'Earth Removed Photos', required: 1, stages: ['CLOSE_REQUESTED'] },
  cbRestored:    { label: 'CB Restored Photos', required: 1, stages: ['CLOSE_REQUESTED'] },
};

export const FEEDERS = [
  'Feeder-1 (MG Road)', 'Feeder-2 (Whitefield)', 'Feeder-3 (Koramangala)',
  'Feeder-4 (HSR Layout)', 'Feeder-5 (Indiranagar)', 'Feeder-6 (Bannerghatta)',
  'Feeder-7 (Electronic City)', 'Feeder-8 (Hebbal)',
];

export const WORK_NATURES = [
  'Transformer Replacement', 'Cable Fault', 'Line Maintenance',
  'Pole Replacement', 'LT/HT Line Work', 'Capacitor Bank Work',
  'Metering Work', 'Equipment Testing', 'New Connection', 'Other',
];

export const canPerformAction = (role, action) => {
  const permissions = {
    approve:       ['AEE', 'EE', 'AE_BESCOM', 'AE_KPTCL', 'ADMIN'],
    reject:        ['AEE', 'EE', 'ADMIN'],
    jeReview:      ['SHIFT_JE_KPTCL', 'ADMIN'],
    delegate:      ['AE_BESCOM', 'AE_KPTCL', 'SHIFT_JE_KPTCL', 'ADMIN'],
    startWork:     ['AE_BESCOM', 'LINEMAN', 'ADMIN'],
    completeWork:  ['AE_BESCOM', 'LINEMAN', 'ADMIN'],
    closeRequest:  ['AE_BESCOM', 'LINEMAN', 'ADMIN'],
    release:       ['SHIFT_JE_KPTCL', 'ADMIN'],
    createLC:      ['AE_BESCOM', 'SHIFT_JE_KPTCL', 'LINEMAN', 'ADMIN'],
  };
  return permissions[action]?.includes(role) || false;
};
