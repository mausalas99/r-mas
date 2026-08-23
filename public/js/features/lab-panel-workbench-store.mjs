// Lab panel — persistencia de historial (push, bulk store, drive import)
import { buildRefsBySectionFromReport } from '../labs.js';
import {
  areDuplicateLabSets,
  areLabSetsEquivalent,
  planLabHistoryDateTimeUpsert,
} from '../lab-history-auto-store-core.mjs';
import {
  dedupeConsolidatedLabRows,
  mergeBulkParseResultsForStorage,
  pickLatestDayMergedLabDisplay,
} from '../lab-bulk-paste.mjs';
import { primaryTipoForLabSet } from '../lab-history-format.mjs';
import { normalizeFechaLabHistory, normalizeHoraLabHistory } from '../tend-core.mjs';
import { getNotes, getLabHistory, persistClinicalState } from '../app-state.mjs';
import { bumpLabHistoryRevision } from '../lab-history-cache.mjs';
import { enqueueCloudLabSidecarsForPatient } from './cloud-sync/mutate-bridge.mjs';

import { sanitizeResLabsChunks } from '../labs-reslabs-sanitize.mjs';
import { rt } from './lab-panel-runtime-state.mjs';
import { labPanelBridge } from './lab-panel-bridge.mjs';
import { renderLabHistoryPanel, refreshSameDayAscitisForPatient } from './lab-panel-history.mjs';
import { autoConsolidateLabHistoryForPatient } from './lab-panel-history-dedupe.mjs';

function resolveLabHistoryFechaNorm(patientId, fecha) {
  var fechaNorm = normalizeFechaLabHistory(fecha) || String(fecha || '').trim();
  if (!fechaNorm && getNotes()[patientId] && getNotes()[patientId].fecha) {
    fechaNorm = normalizeFechaLabHistory(getNotes()[patientId].fecha) || '';
  }
  if (fechaNorm) return fechaNorm;
  var nd = new Date();
  return (
    String(nd.getDate()).padStart(2, '0') +
    '/' +
    String(nd.getMonth() + 1).padStart(2, '0') +
    '/' +
    nd.getFullYear()
  );
}

function buildLabHistorySet(patientId, resLabs, fecha, hora, sourceText, bhExtras, refsBySection, idSeed) {
  var extras = bhExtras && typeof bhExtras === 'object' ? bhExtras : {};
  var refs = refsBySection && typeof refsBySection === 'object' ? refsBySection : {};
  if (!Object.keys(refs).length && sourceText) {
    refs = buildRefsBySectionFromReport(sourceText);
  }
  var fechaNorm = resolveLabHistoryFechaNorm(patientId, fecha);
  var horaNorm = normalizeHoraLabHistory(hora);
  var cleanResLabs = sanitizeResLabsChunks(resLabs);
  var set = {
    id:
      idSeed != null && String(idSeed).trim() !== ''
        ? String(Date.now()) + '-' + String(idSeed)
        : Date.now().toString(),
    fecha: fechaNorm,
    hora: horaNorm,
    resLabs: cleanResLabs,
    bhExtras: extras,
    parsed: rt.extractParsedValues(cleanResLabs),
    parsedBySection: rt.buildParsedBySectionFromResLabs(cleanResLabs, extras),
    refsBySection: refs,
    updatedAt: new Date().toISOString(),
  };
  var raw = String(sourceText || '').trim();
  if (raw) set.sourceText = raw;
  return set;
}

function mergeBhExtras_(into, from) {
  if (!from || typeof from !== 'object') return into;
  Object.keys(from).forEach(function (k) {
    into[k] = from[k];
  });
  return into;
}

function mergeRefsBySection_(into, from) {
  if (!from || typeof from !== 'object') return into;
  Object.keys(from).forEach(function (k) {
    into[k] = from[k];
  });
  return into;
}

function appendSourceText_(existing, incoming) {
  var a = String(existing || '').trim();
  var b = String(incoming || '').trim();
  if (!b) return a;
  if (!a) return b;
  if (a.indexOf(b) !== -1) return a;
  return a + '\n\n---\n\n' + b;
}

function applyMergedLabsToKeeper_(keeper, mergedRows, sourceText, bhExtras, refsBySection) {
  var clean = sanitizeResLabsChunks(mergedRows);
  keeper.resLabs = clean;
  keeper.bhExtras = mergeBhExtras_(
    keeper.bhExtras && typeof keeper.bhExtras === 'object' ? Object.assign({}, keeper.bhExtras) : {},
    bhExtras
  );
  keeper.refsBySection = mergeRefsBySection_(
    keeper.refsBySection && typeof keeper.refsBySection === 'object'
      ? Object.assign({}, keeper.refsBySection)
      : {},
    refsBySection
  );
  keeper.parsed = rt.extractParsedValues(clean);
  keeper.parsedBySection = rt.buildParsedBySectionFromResLabs(clean, keeper.bhExtras);
  var nextSrc = appendSourceText_(keeper.sourceText, sourceText);
  if (nextSrc) keeper.sourceText = nextSrc;
  keeper.updatedAt = new Date().toISOString();
}

function mergeUpsertLabRows_(keeper, siblings, draft) {
  var tipo = primaryTipoForLabSet(keeper.resLabs) || primaryTipoForLabSet(draft.resLabs) || 'labs';
  var mergedRows = [];
  [keeper].concat(siblings || []).concat([draft]).forEach(function (s) {
    var rows = (s && s.resLabs) || [];
    if (mergedRows.length && rows.length) mergedRows.push('');
    mergedRows = mergedRows.concat(rows);
  });
  return dedupeConsolidatedLabRows(mergedRows, tipo === 'mixed' ? 'labs' : tipo);
}

function removeSiblingsFromHistory_(patientId, siblings) {
  if (!siblings.length) return;
  var remove = new Set(
    siblings.map(function (s) {
      return String(s.id);
    })
  );
  getLabHistory()[patientId] = getLabHistory()[patientId].filter(function (s) {
    return !remove.has(String(s.id));
  });
}

/**
 * Actualizar labs (re-fetch del repositorio): la toma re-consultada reemplaza
 * por completo el set existente en esa fecha+hora — no se pisan valores nuevos
 * y viejos entre sí. No aplica al pegado normal, donde reportes complementarios
 * (Biometría, luego Química) deben seguir combinándose vía mergeUpsertLabRows_.
 */
function replaceUpsertKeeper_(keeper, draft) {
  var clean = sanitizeResLabsChunks(draft.resLabs || []);
  keeper.resLabs = clean;
  keeper.bhExtras = draft.bhExtras && typeof draft.bhExtras === 'object' ? Object.assign({}, draft.bhExtras) : {};
  keeper.refsBySection =
    draft.refsBySection && typeof draft.refsBySection === 'object' ? Object.assign({}, draft.refsBySection) : {};
  keeper.parsed = rt.extractParsedValues(clean);
  keeper.parsedBySection = rt.buildParsedBySectionFromResLabs(clean, keeper.bhExtras);
  if (draft.sourceText) keeper.sourceText = draft.sourceText;
  keeper.updatedAt = new Date().toISOString();
}

function applyUpsertMergePlan_(patientId, plan, draft, opts) {
  var keeper = plan.keeper;
  var siblings = plan.siblings || [];
  var replaceOnMatch = !!(opts && opts.replaceOnMatch) && plan.matchKind === 'datetime';

  if (replaceOnMatch) {
    var unchanged = !siblings.length && areLabSetsEquivalent(draft.resLabs || [], keeper.resLabs || []);
    replaceUpsertKeeper_(keeper, draft);
    removeSiblingsFromHistory_(patientId, siblings);
    refreshSameDayAscitisForPatient(patientId, keeper.id);
    bumpLabHistoryRevision(patientId);
    return { action: unchanged ? 'skipped' : 'merged', set: keeper };
  }

  var deduped = mergeUpsertLabRows_(keeper, siblings, draft);
  if (!areLabSetsEquivalent(deduped, keeper.resLabs || []) || siblings.length) {
    applyMergedLabsToKeeper_(keeper, deduped, draft.sourceText, draft.bhExtras, draft.refsBySection);
    removeSiblingsFromHistory_(patientId, siblings);
    refreshSameDayAscitisForPatient(patientId, keeper.id);
    bumpLabHistoryRevision(patientId);
    return { action: 'merged', set: keeper };
  }
  return { action: 'skipped', set: keeper };
}

/**
 * Misma fecha+hora: no crea otro set. Omite si ya está; anexa paneles nuevos al keeper;
 * colapsa hermanos del mismo timestamp (p. ej. Labs 1…8).
 * @returns {{ action: 'added'|'merged'|'skipped', set: object|null }}
 */
function upsertLabHistory(patientId, resLabs, fecha, hora, sourceText, bhExtras, refsBySection, idSeed, upsertOpts) {
  if (!patientId || !resLabs || !resLabs.length) return { action: 'skipped', set: null };
  if (!getLabHistory()[patientId]) getLabHistory()[patientId] = [];
  var draft = buildLabHistorySet(
    patientId,
    resLabs,
    fecha,
    hora,
    sourceText,
    bhExtras,
    refsBySection,
    idSeed
  );
  if (!draft.resLabs || !draft.resLabs.length) return { action: 'skipped', set: null };

  var plan = planLabHistoryDateTimeUpsert(getLabHistory()[patientId], draft);
  if (plan.action === 'skip') return { action: 'skipped', set: plan.keeper };
  if (plan.action === 'add') {
    getLabHistory()[patientId].push(draft);
    refreshSameDayAscitisForPatient(patientId, draft.id);
    bumpLabHistoryRevision(patientId);
    return { action: 'added', set: draft };
  }
  return applyUpsertMergePlan_(patientId, plan, draft, upsertOpts);
}

function pushLabHistory(patientId, resLabs, fecha, hora, sourceText, bhExtras, refsBySection, idSeed) {
  var result = upsertLabHistory(
    patientId,
    resLabs,
    fecha,
    hora,
    sourceText,
    bhExtras,
    refsBySection,
    idSeed
  );
  return result && result.set ? result.set : null;
}

/**
 * Entrada manual / labs externos → historial con origin: 'externo'.
 * @param {string} patientId
 * @param {{ resLabs: string[], fecha?: string, hora?: string, sectionKey?: string }} opts
 * @returns {object|null}
 */
function pushExternalLabHistory(patientId, opts) {
  var o = opts && typeof opts === 'object' ? opts : {};
  var sectionKey = String(o.sectionKey || 'LAB').trim() || 'LAB';
  var set = pushLabHistory(
    patientId,
    o.resLabs,
    o.fecha,
    o.hora,
    '[entrada manual · ' + sectionKey + ']',
    {},
    {},
    'ext-' + sectionKey
  );
  if (!set) return null;
  set.origin = 'externo';
  return set;
}

function pushLabHistoryFromBulkPayload(patientId, payload, idSeed, upsertOpts) {
  if (!payload || !payload.resLabs || !payload.resLabs.length) {
    return { action: 'skipped', set: null };
  }
  return upsertLabHistory(
    patientId,
    payload.resLabs,
    payload.fecha,
    payload.hora,
    payload.sourceText,
    payload.bhExtras,
    payload.refsBySection,
    idSeed,
    upsertOpts
  );
}

function isDuplicateInPatientHistory(patientId, payload) {
  var list = getLabHistory()[patientId] || [];
  var incoming = {
    fecha: normalizeFechaLabHistory(payload.fecha) || String(payload.fecha || '').trim(),
    hora: normalizeHoraLabHistory(payload.hora),
    resLabs: payload.resLabs || [],
  };
  var plan = planLabHistoryDateTimeUpsert(list, incoming);
  if (plan.action === 'skip') return true;
  if (plan.action === 'merge' && plan.keeper && !plan.siblings.length) {
    // Cubierto si el merge no aportaría líneas nuevas (subset equivalente tras dedupe).
    var tipo = primaryTipoForLabSet(plan.keeper.resLabs) || 'labs';
    var trial = dedupeConsolidatedLabRows(
      [].concat(plan.keeper.resLabs || [], [''], incoming.resLabs || []),
      tipo === 'mixed' ? 'labs' : tipo
    );
    return areLabSetsEquivalent(trial, plan.keeper.resLabs || []);
  }
  return list.some(function (existing) {
    return areDuplicateLabSets(existing, incoming);
  });
}

/**
 * @param {{ id: string }} patient
 * @param {Array<{ fecha?: string, hora?: string, resLabs?: string[], sourceText?: string, bhExtras?: object }>} labSets
 */
export async function applyDriveImportLabSets(patient, labSets) {
  if (!patient || !patient.id || !labSets || !labSets.length) {
    return { added: 0, skipped: 0 };
  }
  var patientId = patient.id;
  var added = 0;
  var skipped = 0;
  labSets.forEach(function (set, idx) {
    var payload = {
      fecha: set.fecha,
      hora: set.hora || '',
      resLabs: set.resLabs || [],
      sourceText: set.sourceText || '',
    };
    if (!payload.resLabs.length) return;
    var upsert = upsertLabHistory(
      patientId,
      payload.resLabs,
      payload.fecha,
      payload.hora,
      payload.sourceText,
      set.bhExtras || {},
      {},
      'drive-import-' + idx
    );
    if (!upsert || upsert.action === 'skipped') {
      skipped += 1;
      return;
    }
    added += 1;
  });
  if (!added) return { added: 0, skipped: skipped };

  rt.rebuildEstudiosFromLabHistory(patientId);
  rt.ensureParsedLabHistory(patientId);
  labPanelBridge.setActiveLab(null);
  renderLabHistoryPanel();
  rt.refreshTendenciasOrCultivosPanel();
  return { added: added, skipped: skipped };
}

function finalizeLabHistoryImport(patientId) {
  var consolidation = autoConsolidateLabHistoryForPatient(patientId);
  if (consolidation.merged > 0) {
    
    if (typeof rt.addAuditEntry === 'function') {
      rt.addAuditEntry('lab-history-auto-consolidate', 'ok', consolidation.merged, String(patientId));
    }
  }
  rt.rebuildEstudiosFromLabHistory(patientId);
  enqueueCloudLabSidecarsForPatient(patientId);
}

function storeBulkLabBlocks(blocks, processable, opts) {
  if (processable.length > 1 && typeof rt.pushUndoSnapshot === 'function') {
    rt.pushUndoSnapshot('Procesar laboratorios (' + processable.length + ' pacientes)');
  }
  var storedSets = 0;
  var mergedSets = 0;
  var skippedDupes = 0;
  /** @type {Record<string, object[]>} */
  var storedByPatient = Object.create(null);
  processable.forEach(function (block) {
    var patientId = block.patient.id;
    var patientReg = String(block.patient.registro || '').trim();
    var okItems = block.reports
      .filter(function (r) {
        return r.ok && r.result && (!patientReg || r.expediente === patientReg);
      })
      .map(function (r) {
        return { result: r.result, reportText: r.reportText };
      });
    var mergedPayloads = mergeBulkParseResultsForStorage(okItems);
    mergedPayloads.forEach(function (payload, idx) {
      var upsert = pushLabHistoryFromBulkPayload(patientId, payload, block.blockIndex + '-' + idx, opts);
      if (!upsert || upsert.action === 'skipped') {
        skippedDupes += 1;
        return;
      }
      if (upsert.action === 'merged') mergedSets += 1;
      else storedSets += 1;
      if (!storedByPatient[patientId]) storedByPatient[patientId] = [];
      storedByPatient[patientId].push({
        fecha: payload.fecha,
        hora: payload.hora || '',
        resLabs: payload.resLabs || [],
      });
    });
    finalizeLabHistoryImport(patientId);
  });
  if (storedSets || mergedSets || skippedDupes) {
    persistClinicalState({ immediate: true });
    labPanelBridge.setActiveLab(null);
    renderLabHistoryPanel();
    rt.refreshTendenciasOrCultivosPanel();
  }
  return {
    storedSets: storedSets,
    mergedSets: mergedSets,
    skippedDupes: skippedDupes,
    skippedBlocks: blocks.length - processable.length,
    storedByPatient: storedByPatient,
  };
}

function pickDisplayLabResult(blocks, processable, activeId) {
  var activeBlock = null;
  if (activeId) {
    activeBlock = processable.find(function (b) {
      return b.patient && String(b.patient.id) === String(activeId);
    });
  }
  var block = activeBlock || processable[0] || blocks.find(function (b) {
    return b.okReportCount > 0;
  });
  if (!block) return null;

  var patientReg = block.patient ? String(block.patient.registro || '').trim() : '';
  var okItems = block.reports
    .filter(function (r) {
      return r.ok && r.result && (!patientReg || r.expediente === patientReg);
    })
    .map(function (r) {
      return { result: r.result, reportText: r.reportText };
    });
  if (!okItems.length) return null;

  var display = pickLatestDayMergedLabDisplay(okItems);
  if (!display) return null;
  return {
    result: {
      patient: display.patient,
      resLabs: display.resLabs,
      bhExtras: display.bhExtras,
      refsBySection: display.refsBySection,
    },
    reportText: display.sourceText,
    expediente: display.expediente || (display.patient && display.patient.expediente),
  };
}
export {
  pushLabHistory,
  upsertLabHistory,
  pushExternalLabHistory,
  pushLabHistoryFromBulkPayload,
  finalizeLabHistoryImport,
  isDuplicateInPatientHistory,
  storeBulkLabBlocks,
  pickDisplayLabResult,
};
