const User = require('../models/User.model');

const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== 'string') return [];

  const cleanedText = csvText.replace(/\uFEFF/g, '');
  const firstLine = cleanedText.split(/\r?\n/)[0] || '';
  const delimiter = (() => {
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    if (tabCount >= commaCount && tabCount >= semicolonCount) return '\t';
    if (semicolonCount >= commaCount) return ';';
    return ',';
  })();

  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    const nextChar = cleanedText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(value.trim());
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1;
      row.push(value.trim());
      value = '';
      if (row.length > 1 || row[0]) rows.push(row);
      row = [];
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.trim());
    rows.push(row);
  }

  const headers = (rows.shift() || []).map(h => h.trim());
  return rows.map(cols => {
    const record = {};
    headers.forEach((header, idx) => {
      record[header] = (cols[idx] || '').trim();
    });
    return record;
  });
};


const normalizePhone = (value) => (value || '').toString().replace(/\D/g, '');
const getCsvValue = (record, names) => {
  // Normalize record keys to lowercase for case-insensitive matching
  const lowerRecord = {};
  Object.keys(record).forEach(key => {
    lowerRecord[key.toLowerCase()] = record[key];
  });

  // Try exact matches first (case-insensitive)
  for (const name of names) {
    const lowerName = name.toLowerCase();
    if (lowerRecord[lowerName] !== undefined && lowerRecord[lowerName] !== '') {
      return lowerRecord[lowerName];
    }
  }
  return null;
};

exports.bulkImportOfficers = async (req, res) => {
  if (!req.body?.csvText) {
    return res.status(400).json({ error: 'CSV data required' });
  }

  try {
    const records = parseCSV(req.body.csvText);
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };
    const soGroups = new Map();
    const kptclAeByPhone = new Map();

    // First pass: detect and group rows
    for (const [rowIndex, record] of records.entries()) {
      try {
        // Check if this is a KPTCL AE row: has KPTCL AE + KPTCL AE Mobile
        const aeName = getCsvValue(record, ['KPTCL AE', 'KPTCL AE Name', 'AE_KPTCL']);
        const aeMobile = getCsvValue(record, ['KPTCL AE Mobile', 'KPTCL AE Phone', 'AE Mobile', 'AE_KPTCL Mobile']);
        
        // Check if this row has BESCOM SO details
        const soName = getCsvValue(record, ['SO Name', 'SOName']);
        const soMobile = getCsvValue(record, ['SO Mobile', 'SO Phone']);

        // Check for station using multiple column name variants
        const station = getCsvValue(record, ['Station', 'KPTCL Station', 'Station Name', 'KPTCL Substation', 'KPTCLSubstation']);

        // Treat as SO row when SO details are present, even if KPTCL AE columns also exist.
        const isSoRow = !!(soName && soMobile);
        const isKPTCLAE = !!(aeName && aeMobile) && !isSoRow;

        if (isKPTCLAE) {
          if (!aeName || !aeMobile) {
            results.errors.push({ row: rowIndex + 2, error: 'KPTCL AE row: missing name or mobile' });
            continue;
          }
          const phoneNum = normalizePhone(aeMobile);
          const maxShiftJEs = parseInt(getCsvValue(record, ['MaxShiftJEs', 'Max Shift JEs', 'Max Shift JE', 'Max JEs']) || '1', 10) || 1;
          const shiftPattern = getCsvValue(record, ['ShiftPattern', 'Shift Pattern']) || 'WEEKLY';

          const existingGroup = kptclAeByPhone.get(phoneNum) || {
            name: aeName.trim(),
            station: station.trim(),
            maxShiftJEs,
            shiftPattern: shiftPattern.toUpperCase(),
          };

          if (station) existingGroup.station = station.trim();
          if (maxShiftJEs) existingGroup.maxShiftJEs = maxShiftJEs;
          if (shiftPattern) existingGroup.shiftPattern = shiftPattern.toUpperCase();
          kptclAeByPhone.set(phoneNum, existingGroup);
          continue;
        }

        // Otherwise, treat as BESCOM officer row (if it has SO Mobile)
        if (soMobile) {
          console.log(`Found SO row with mobile: ${soMobile}`);
          // Use getCsvValue for all field lookups to handle case-insensitive matching
          const eeMobile = getCsvValue(record, ['EE Mobile', 'EEMobile']);
          const eeName = getCsvValue(record, ['EE Name', 'EEName']);
          const aeeMobile = getCsvValue(record, ['AEE Mobile', 'AEEMobile']);
          const aeeName = getCsvValue(record, ['AEE Name', 'AEEName']);
          const soName = getCsvValue(record, ['SO Name', 'SOName']);
          const division = getCsvValue(record, ['Division']) || '';
          const subdivision = getCsvValue(record, ['Subdivision']) || '';
          const section = getCsvValue(record, ['Section']) || '';
          const feeders = getCsvValue(record, ['Feeders']) || '';
          const kptclSubstation = getCsvValue(record, ['KPTCL Substation', 'KPTCLSubstation']) || '';

          // Create EE
          if (eeMobile && eeName) {
            const phoneNum = normalizePhone(eeMobile);
            if (!phoneNum) {
              results.errors.push({ row: rowIndex + 2, error: 'EE Mobile is invalid or empty' });
            } else {
              const existing = await User.findOne({ phone: phoneNum });
              if (!existing) {
                await User.create({
                  name: eeName.trim(),
                  phone: phoneNum,
                  email: `ee.${phoneNum}@bescom.in`,
                  role: 'EE',
                  password: 'bescom@123',
                  division,
                });
                results.created++;
              } else {
                results.skipped++;
              }
            }
          }

          // Create AEE
          if (aeeMobile && aeeName) {
            const phoneNum = normalizePhone(aeeMobile);
            if (!phoneNum) {
              results.errors.push({ row: rowIndex + 2, error: 'AEE Mobile is invalid or empty' });
            } else {
              const existing = await User.findOne({ phone: phoneNum });
              if (!existing) {
                await User.create({
                  name: aeeName.trim(),
                  phone: phoneNum,
                  email: `aee.${phoneNum}@bescom.in`,
                  role: 'AEE',
                  password: 'bescom@123',
                  division,
                  subdivision,
                });
                results.created++;
              } else {
                results.skipped++;
              }
            }
          }

          // Group SO feeders by phone so repeated rows merge
          if (soMobile && soName) {
            const phoneNum = normalizePhone(soMobile);
            console.log(`Grouping SO: ${soName} (${phoneNum}), station: ${kptclSubstation}, feeders: ${feeders}`);
            if (!phoneNum) {
              results.errors.push({ row: rowIndex + 2, error: 'SO Mobile is invalid or empty' });
            } else {
              const feederList = feeders
                ? feeders.split(/[;,|]/).map(f => f.trim()).filter(Boolean)
                : [];
              const existingGroup = soGroups.get(phoneNum) || {
                name: soName.trim(),
                division,
                subdivision,
                section,
                substation: kptclSubstation,
                substations: new Set(),
                feeders: new Set(),
              };

              if (kptclSubstation) {
                existingGroup.substations.add(kptclSubstation.trim());
                if (!existingGroup.substation) {
                  existingGroup.substation = kptclSubstation.trim();
                }
              }

              feederList.forEach(f => existingGroup.feeders.add(f));
              soGroups.set(phoneNum, existingGroup);
            }
          }
        }
      } catch (err) {
        results.errors.push({ row: rowIndex + 2, error: err.message });
      }
    }

    // Process BESCOM SO records
    console.log('soGroups size:', soGroups.size);
    for (const [phoneNum, group] of soGroups.entries()) {
      console.log(`Processing SO: ${group.name} (${phoneNum}), feeders:`, Array.from(group.feeders));
      if (!phoneNum) continue; // Skip if phone is invalid
      const existing = await User.findOne({ phone: phoneNum });
      const feederList = Array.from(group.feeders);

      if (!group.substation && group.substations && group.substations.size > 0) {
        group.substation = Array.from(group.substations)[0];
      }

      if (!existing) {
        console.log(`Creating new AE_BESCOM: ${group.name}`);
        await User.create({
          name: group.name,
          phone: phoneNum,
          email: `so.${phoneNum}@bescom.in`,
          role: 'AE_BESCOM',
          password: 'bescom@123',
          division: group.division,
          subdivision: group.subdivision,
          section: group.section,
          substation: group.substation,
          substations: Array.from(group.substations),
          feeders: feederList,
        });
        results.created++;
      } else {
        const existingFeeders = Array.isArray(existing.feeders) ? existing.feeders : [];
        const mergedFeeders = Array.from(new Set([...existingFeeders, ...feederList]));
        let updated = false;

        if (mergedFeeders.length !== existingFeeders.length) {
          existing.feeders = mergedFeeders;
          updated = true;
        }

        const existingSubstations = Array.isArray(existing.substations) ? existing.substations : [];
        const mergedSubstations = Array.from(new Set([...(existingSubstations || []), ...Array.from(group.substations)]));
        if (mergedSubstations.length !== existingSubstations.length) {
          existing.substations = mergedSubstations;
          if (!existing.substation && mergedSubstations.length > 0) {
            existing.substation = mergedSubstations[0];
          }
          updated = true;
        }

        if (updated) {
          await existing.save();
          results.updated++;
        } else {
          results.skipped++;
        }
      }
    }

    // Process KPTCL AE records
    for (const [phoneNum, group] of kptclAeByPhone.entries()) {
      if (!phoneNum) continue; // Skip if phone is invalid
      const existing = await User.findOne({ phone: phoneNum });
      if (!existing) {
        await User.create({
          name: group.name,
          phone: phoneNum,
          email: `ae_kptcl.${phoneNum}@bescom.in`,
          role: 'AE_KPTCL',
          password: 'bescom@123',
          station: group.station,
          maxShiftJEs: group.maxShiftJEs,
          shiftPattern: ['WEEKLY', 'MONTHLY'].includes(group.shiftPattern) ? group.shiftPattern : 'WEEKLY',
        });
        results.created++;
      } else if (existing.role === 'AE_KPTCL') {
        let updated = false;
        if (group.station && existing.station !== group.station) {
          existing.station = group.station;
          updated = true;
        }
        if (group.maxShiftJEs && existing.maxShiftJEs !== group.maxShiftJEs) {
          existing.maxShiftJEs = group.maxShiftJEs;
          updated = true;
        }
        if (group.shiftPattern && existing.shiftPattern !== group.shiftPattern) {
          existing.shiftPattern = group.shiftPattern;
          updated = true;
        }
        if (updated) {
          await existing.save();
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        results.errors.push({ row: null, error: `Phone ${phoneNum} exists with role ${existing.role}` });
      }
    }

    res.json({
      message: `Import completed: ${results.created} created, ${results.updated} updated, ${results.skipped} skipped`,
      results,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
;}

exports.getOfficeHierarchy = async (req, res) => {
  try {
    const ees = await User.find({ role: 'EE' }).select('name phone division').lean();
    const aees = await User.find({ role: 'AEE' }).select('name phone division subdivision').lean();
    const sos = await User.find({ role: 'AE_BESCOM' }).select('name phone division subdivision section feeders').lean();

    const hierarchy = {};

    ees.forEach(ee => {
      if (!hierarchy[ee.division]) hierarchy[ee.division] = { name: ee.division, subdivisions: {} };
    });

    aees.forEach(aee => {
      if (hierarchy[aee.division]) {
        const div = hierarchy[aee.division];
        if (!div.subdivisions[aee.subdivision]) {
          div.subdivisions[aee.subdivision] = { name: aee.subdivision, sections: {} };
        }
      }
    });

    sos.forEach(so => {
      if (hierarchy[so.division]?.subdivisions[so.subdivision]) {
        const subdiv = hierarchy[so.division].subdivisions[so.subdivision];
        if (!subdiv.sections[so.section]) {
          subdiv.sections[so.section] = { name: so.section, officers: [] };
        }
        subdiv.sections[so.section].officers.push({ name: so.name, phone: so.phone, feeders: so.feeders });
      }
    });

    res.json({ hierarchy });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
