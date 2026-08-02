#!/usr/bin/env node
/**
 * Rough Free-tier headroom for the 7.9 Nube pilot (HTTP push + 15s poll).
 * Run: npm run estimate:free
 *
 * Env overrides: USERS HOURS POLL_SEC EDITS_PER_HOUR WRITES_PER_EDIT
 */
const users = Number(process.env.USERS || 10);
const hours = Number(process.env.HOURS || 12);
const pollSec = Number(process.env.POLL_SEC || 20);
const editsPerHour = Number(process.env.EDITS_PER_HOUR || 30);
const writesPerPatientEdit = Number(process.env.WRITES_PER_EDIT || 2);

const polls = Math.ceil((users * hours * 3600) / pollSec);
const writes = users * editsPerHour * hours * writesPerPatientEdit;
const freeReqDay = 100_000;
const freeWritesDay = 100_000;

const out = {
  assumptions: { users, hours, pollSec, editsPerHour, writesPerPatientEdit },
  estimated: { pollsPerDay: polls, d1WritesPerDay: writes },
  freeLimits: { workerRequestsPerDay: freeReqDay, d1RowsWrittenPerDay: freeWritesDay },
  headroom: {
    requestPct: Math.round((polls / freeReqDay) * 1000) / 10,
    writePct: Math.round((writes / freeWritesDay) * 1000) / 10,
  },
};

console.log(JSON.stringify(out, null, 2));
if (polls > freeReqDay || writes > freeWritesDay) {
  console.error('\n⚠ Estimate exceeds Free daily caps — raise poll interval or reduce users.');
  process.exit(2);
}
console.error('\n✓ Within Free caps for these assumptions (poll only while app focused).');
