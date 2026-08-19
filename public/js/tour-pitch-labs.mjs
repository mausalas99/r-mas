/**
 * Labs de tendencia y cultivos para el paciente demo-pitch del tour.
 */
import { procesarLabs } from './labs.js';
import { extractParsedValues } from './features/diagrams-parse.mjs';
import { DEMO_SOME_LAB_REPORT, OLDER_DEMO_SOME_LAB_REPORT } from './tour-demo-some-lab.mjs';
import { PITCH_CULTIVO_LAB_SPECS } from './tour-pitch-cultivos-some.mjs';
import { PITCH_DEMO_PATIENT_ID } from './tour-pitch-sandbox.mjs';
import { bumpLabHistoryRevision } from './lab-history-cache.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

/** @param {number} dayOffset @param {Date} today @returns {string} DD/MM/YYYY */
function fechaFromDayOffset(dayOffset, today) {
  const d = new Date(today.getTime() + dayOffset * DAY_MS);
  return (
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear()
  );
}

/** @param {{ id: string, dayOffset: number, report: string }} spec @param {Date} today */
export function buildPitchLabHistoryEntry(spec, today) {
  const resLabs = procesarLabs(spec.report).resLabs;
  return {
    id: spec.id,
    fecha: fechaFromDayOffset(spec.dayOffset || 0, today instanceof Date ? today : new Date()),
    hora: '',
    resLabs,
    parsed: extractParsedValues(resLabs),
    sourceText: spec.report,
  };
}

export function getPitchCultivoParseText() {
  return PITCH_CULTIVO_LAB_SPECS[0].report;
}

/** @param {Record<string, unknown[]>} labHistoryMap @param {Date} [today] */
export function reconcilePitchCultivoHistory(labHistoryMap, today) {
  const now = today instanceof Date ? today : new Date();
  const pid = PITCH_DEMO_PATIENT_ID;
  const list = Array.isArray(labHistoryMap[pid]) ? labHistoryMap[pid].slice() : [];
  const byId = Object.create(null);
  list.forEach(function (entry) {
    if (entry && entry.id) byId[entry.id] = entry;
  });
  PITCH_CULTIVO_LAB_SPECS.forEach(function (spec) {
    byId[spec.id] = buildPitchLabHistoryEntry(spec, now);
  });
  labHistoryMap[pid] = Object.keys(byId).map(function (id) {
    return byId[id];
  });
  bumpLabHistoryRevision(pid);
}

/**
 * Labs de tendencia + cultivos multipaciente en historial (con sourceText para S/I/R).
 * @param {Date} [today]
 */
export function buildPitchLabHistoryEntries(today) {
  const now = today instanceof Date ? today : new Date();
  const trendSpecs = [
    { id: 'pitch-lab-trend-1', dayOffset: -9, report: OLDER_DEMO_SOME_LAB_REPORT },
    { id: 'pitch-lab-trend-2', dayOffset: -6, report: DEMO_SOME_LAB_REPORT },
    { id: 'pitch-lab-trend-3', dayOffset: -4, report: OLDER_DEMO_SOME_LAB_REPORT },
    { id: 'pitch-lab-trend-4', dayOffset: -2, report: DEMO_SOME_LAB_REPORT },
    { id: 'pitch-lab-trend-5', dayOffset: 0, report: OLDER_DEMO_SOME_LAB_REPORT },
  ];
  const out = trendSpecs.map(function (spec) {
    return buildPitchLabHistoryEntry(spec, now);
  });
  PITCH_CULTIVO_LAB_SPECS.forEach(function (spec) {
    out.push(buildPitchLabHistoryEntry(spec, now));
  });
  return out;
}
