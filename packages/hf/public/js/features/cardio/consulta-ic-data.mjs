/**
 * Pure data-shaping + DOM-read helpers for the "Consulta IC" screen (Document
 * 1 — outpatient HF follow-up visit, Part C Phase 4). Wraps `lib/cardio/*`
 * domain logic (`consulta-seguimiento.mjs`, `hf-labs.mjs`, `hf-echo.mjs`,
 * `hf-scores.mjs`) against this screen's own DOM attribute set — mirrors the
 * separation `estado-actual-cardio-data.mjs` uses for the Estado Actual cards.
 */
import { getLabHistory } from '../../app-state.mjs';
import {
  emptyConsultaEntry,
  upsertConsultaEntry,
  seedConsultaFromLastRonda,
} from '../../../../lib/cardio/consulta-seguimiento.mjs';
import { upsertLabSnapshot, emptyLabSnapshot, latestTwoSnapshots } from '../../../../lib/cardio/hf-labs.mjs';
import { upsertEchoStudy, emptyEchoStudy, latestTwoEchoStudies } from '../../../../lib/cardio/hf-echo.mjs';
import { upsertScoreEntry, emptyScoreEntry, latestTwoScores } from '../../../../lib/cardio/hf-scores.mjs';

/** @returns {string} YYYY-MM-DD, local calendar day. */
export function todayYmd() {
  var d = new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

/**
 * @param {any} cardio
 * @param {string} date
 * @returns {any|null}
 */
export function findConsultaEntry(cardio, date) {
  var list = cardio && Array.isArray(cardio.consultas) ? cardio.consultas : [];
  return (
    list.find(function (e) {
      return e && e.date === date;
    }) || null
  );
}

/**
 * Ensures a `cardio.consultas[]` entry exists for `date`, mutating
 * `patient.cardio.consultas` in place (caller persists). Today's brand-new
 * entry is seeded from the last inpatient round per the Part C plan
 * ("Snapshot semantics"); any other missing date starts blank — only
 * "nueva consulta" (today) seeds.
 * @param {{ cardio?: any }} patient
 * @param {string} date
 * @returns {any} the entry now present at `date`
 */
export function ensureConsultaEntryForDate(patient, date) {
  var cardio = patient.cardio;
  var list = Array.isArray(cardio.consultas) ? cardio.consultas : [];
  var existing = findConsultaEntry(cardio, date);
  if (existing) return existing;
  var base = date === todayYmd() ? seedConsultaFromLastRonda(cardio) : emptyConsultaEntry();
  var seeded = Object.assign({}, base, { date: date });
  cardio.consultas = upsertConsultaEntry(list, seeded);
  return findConsultaEntry(cardio, date);
}

/** @param {any} cardio */
export function listConsultaDatesDesc(cardio) {
  var list = cardio && Array.isArray(cardio.consultas) ? cardio.consultas : [];
  return list
    .map(function (e) {
      return e && e.date;
    })
    .filter(Boolean)
    .slice()
    .sort()
    .reverse();
}

/**
 * @param {'true'|'false'|''} raw
 * @returns {boolean|null}
 */
export function parseTriState(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

/**
 * Regex-scoped scan of the patient's raw imported lab rows for NT-proBNP —
 * intentionally narrow, matching the single field `hf-labs.mjs`'s
 * `prefillFromImportedLabs()` confidently maps today (see its own header
 * comment / TODO). Does not reimplement the generic tipo/label grouping
 * pipeline in `labs-glance-model.mjs` (out of scope, and that file is not
 * ours to touch here) — only extracts the one analyte already documented as
 * safe to prefill.
 * @param {string} row
 * @returns {string|null}
 */
function extractNtProBnpFromRow(row) {
  var s = String(row || '');
  var m = /NT[\s-]?PRO\s*BNP\D{0,12}([\d.,]+)/i.exec(s);
  return m ? m[1] : null;
}

/**
 * @param {string|number|null} patientId
 * @returns {{ valuesByKey: Record<string, string> }}
 */
export function buildLabHistoryForPrefill(patientId) {
  var byPatient = getLabHistory() || {};
  var sets = (patientId != null && byPatient[patientId]) || [];
  var valuesByKey = {};
  sets.forEach(function (set) {
    var rows = (set && set.resLabs) || [];
    rows.forEach(function (row) {
      var val = extractNtProBnpFromRow(row);
      if (val != null) valuesByKey['NT-PROBNP'] = val;
    });
  });
  return { valuesByKey: valuesByKey };
}

export {
  upsertConsultaEntry,
  upsertLabSnapshot,
  emptyLabSnapshot,
  latestTwoSnapshots,
  upsertEchoStudy,
  emptyEchoStudy,
  latestTwoEchoStudies,
  upsertScoreEntry,
  emptyScoreEntry,
  latestTwoScores,
};
