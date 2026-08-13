import { refreshCitoquimicoInterpretacionInResLabs_, resLabsHasCitoquimFluid_ } from '../labs.js';
import { getLabHistory } from '../app-state.mjs';
import { rt } from './lab-panel-runtime-state.mjs';

export function buildSameDaySerumContext(patientId, targetSet) {
  if (!patientId || !targetSet) return {};
  var dk = rt.dayKeyFromLabSet(targetSet);
  if (!dk || dk === 'unknown' || dk === 'Anterior') return {};
  var sets = getLabHistory()[patientId] || [];
  var extraSourceTexts = [];
  var extraResLabs = [];
  sets.forEach(function (other) {
    if (!other || String(other.id) === String(targetSet.id)) return;
    if (rt.dayKeyFromLabSet(other) !== dk) return;
    if (rt.primaryTipoForLabSet(other.resLabs || []) === 'cultivo') return;
    var src = String(other.sourceText || '').trim();
    if (src) extraSourceTexts.push(src);
    if (other.resLabs && other.resLabs.length) extraResLabs.push(other.resLabs);
  });
  return { extraSourceTexts: extraSourceTexts, extraResLabs: extraResLabs };
}

export function refreshSameDayAscitisForPatient(patientId, triggerSetId) {
  if (!patientId) return false;
  var sets = getLabHistory()[patientId];
  if (!Array.isArray(sets) || !sets.length) return false;
  var trigger =
    triggerSetId != null
      ? sets.find(function (s) {
          return s && String(s.id) === String(triggerSetId);
        })
      : null;
  var dayKeys = Object.create(null);
  if (trigger) {
    var tdk = rt.dayKeyFromLabSet(trigger);
    if (tdk && tdk !== 'unknown' && tdk !== 'Anterior') dayKeys[tdk] = true;
  } else {
    sets.forEach(function (s) {
      var dk = rt.dayKeyFromLabSet(s);
      if (dk && dk !== 'unknown' && dk !== 'Anterior') dayKeys[dk] = true;
    });
  }
  var changed = false;
  Object.keys(dayKeys).forEach(function (dk) {
    sets.forEach(function (set) {
      if (!set || rt.dayKeyFromLabSet(set) !== dk) return;
      var src = String(set.sourceText || '').trim();
      var hasCitoquim =
        resLabsHasCitoquimFluid_(set.resLabs) ||
        (src && /\bCITOQUIMICO\b/i.test(src));
      if (!hasCitoquim) return;
      var ctx = buildSameDaySerumContext(patientId, set);
      var next = refreshCitoquimicoInterpretacionInResLabs_(set.resLabs || [], src, ctx);
      var prevStr = '';
      var nextStr = '';
      try {
        prevStr = JSON.stringify(set.resLabs || []);
        nextStr = JSON.stringify(next);
      } catch {
        set.resLabs = next;
        changed = true;
        return;
      }
      if (prevStr !== nextStr) {
        set.resLabs = next;
        set.parsed = rt.extractParsedValues(next);
        set.parsedBySection = rt.buildParsedBySectionFromResLabs(next, set.bhExtras);
        delete set._parseFingerprint;
        changed = true;
      }
    });
  });
  return changed;
}
