'use strict';

function tsValue(iso) {
  if (!iso || typeof iso !== 'string') return 0;
  const n = Date.parse(iso);
  return Number.isFinite(n) ? n : 0;
}

/** @returns {-1|0|1} negative if a older than b */
function compareUpdatedAt(aIso, bIso) {
  const a = tsValue(aIso);
  const b = tsValue(bIso);
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function recordTimestamp(rec, fields) {
  const list = Array.isArray(fields) ? fields : ['updatedAt', 'lanUpdatedAt'];
  for (const f of list) {
    if (rec && rec[f]) return rec[f];
  }
  return null;
}

/** @param {'server'|'incoming'} preferOnTie */
function pickLwwRecordMeta(serverRec, incomingRec, preferOnTie, timestampFields) {
  const sTs = recordTimestamp(serverRec, timestampFields);
  const iTs = recordTimestamp(incomingRec, timestampFields);
  const cmp = compareUpdatedAt(sTs, iTs);
  if (cmp < 0) return { winner: incomingRec, overwritten: true };
  if (cmp > 0) return { winner: serverRec, overwritten: false };
  if (preferOnTie === 'incoming') {
    return { winner: incomingRec, overwritten: serverRec !== incomingRec };
  }
  return { winner: serverRec, overwritten: false };
}

/** @param {'server'|'incoming'} preferOnTie */
function pickLwwRecord(serverRec, incomingRec, preferOnTie, timestampFields) {
  return pickLwwRecordMeta(serverRec, incomingRec, preferOnTie, timestampFields).winner;
}

function mergeRecordsLww(serverData, incomingPatch, opts) {
  const changedKeys = Array.isArray(opts?.changedKeys) ? opts.changedKeys : Object.keys(incomingPatch || {});
  const timestampFields = opts?.timestampFields || ['lanUpdatedAt', 'updatedAt'];
  const merged = { ...(serverData || {}) };
  const overwrittenKeys = [];
  const incomingFull = { ...(serverData || {}), ...(incomingPatch || {}) };
  const { winner, overwritten } = pickLwwRecordMeta(
    serverData || {},
    incomingFull,
    'incoming',
    timestampFields
  );
  const incomingWins = winner === incomingFull || overwritten;

  for (const key of changedKeys) {
    if (!(key in (incomingPatch || {}))) continue;
    if (timestampFields.includes(key)) continue;
    const serverVal = serverData?.[key];
    const incomingVal = incomingPatch[key];
    if (incomingWins) {
      merged[key] = incomingVal;
      if (serverVal !== incomingVal) overwrittenKeys.push(key);
    }
  }

  if (incomingWins) {
    for (const f of timestampFields) {
      if (incomingPatch?.[f]) merged[f] = incomingPatch[f];
    }
  }

  return { merged, overwrittenKeys };
}

module.exports = { compareUpdatedAt, pickLwwRecord, mergeRecordsLww, recordTimestamp };
