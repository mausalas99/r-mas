import { storage } from './storage.js';
import {
  procesarLabs,
  buildRefsBySectionFromReport,
  extractLabReportHora,
  reprocessLabResultLines_,
} from './labs.js';
import {
  findExactDuplicateLabGroups,
  findNormalizedSourceDuplicateGroups,
  findConflictingSameDateTimeGroups,
  areLabSetsEquivalent,
  compareLabSetIdForDedupe,
  normalizeLabLine,
} from './lab-history-auto-store-core.mjs';
import { isModeSala, migrateToV3 } from './mode-features.mjs';
import { parseLanJoinQuery } from './lan-join-link.mjs';
import { isMobileWeb, blockIfMobileDocExport, mobileDocExportToast } from './mobile-web.mjs';
import { resolveQuickOutputAction } from './quick-output.mjs';
import { handleOutputDirFallback } from './output-dir-fallback.mjs';
import {
  sortLabHistoryChronological,
  parseFechaLabToMs,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
} from './tend-core.mjs';
import { createModalDismissRegistry } from './modal-dismiss.mjs';
import {
  getUiDensity,
  isPaseMode,
  setUiDensity,
  toggleHighContrast,
  initChromeAppearance,
  registerChromeRuntime,
  windowHandlers as chromeWindowHandlers,
} from './features/chrome.mjs';
import {
  registerLanRuntime,
  registerLanSaveHooks,
  windowHandlers as lanWindowHandlers,
  emitLiveSyncTodoUpsert,
  emitLiveSyncTodoDelete,
  closeConnectionDropdown,
  openConnectionDropdown,
  configureLanFromMobileJoin,
  syncLanHostTeamCodeSettingsInput,
  syncLanHostFirstTimeHintUi,
  DEFAULT_LAN_TEAM_CODE,
} from './features/lan-sync.mjs';
import {
  registerPatientsRuntime,
  windowHandlers as patientsWindowHandlers,
  renderPatientList,
  selectPatient,
  deletePatient,
  advanceRondaPatient,
  scrollActiveRondaCardIntoView,
  syncRoundExpedienteLayout,
  renderRoundOverviewPanels,
  returnToRoundOverview,
  openFullExpedienteFromRound,
  buildPatientEntry,
  findPatientByRegistro,
  ensureUniquePatientName,
  generatePatientId,
  openAddModal,
  openAddModalFromLab,
  closeModal,
  confirmCloseAddPatientModal,
  savePatient,
  onPatientSearchInput,
  focusPatientSearchInput,
  togglePatientPinned,
  togglePatientArchived,
  togglePatientRoundSeen,
  movePatientByOffset,
  toggleArchivedSection,
  toggleSidebarAutoHide,
  initSidebarAutoHide,
  initPatientModalEnterSave,
  setRoundOverviewMode,
  getRoundOverviewMode,
} from './features/patients.mjs';
import {
  registerLabPanelRuntime,
  windowHandlers as labPanelWindowHandlers,
  renderLabHistoryPanel,
  syncLabHistoryCollapseUI,
  setLabHistoryPanelCollapsed,
  getActiveLab as labPanelGetActiveLab,
  setActiveLab as labPanelSetActiveLab,
  rerenderParsedLabOutputAfterPrefsChange,
  clearLabWorkbenchMinimalDom,
  limpiarReporte,
  enviarLabsANota,
} from './features/lab-panel.mjs';
import {
  registerTendenciasRuntime,
  tendenciasWindowHandlers,
  seedTendHiddenDefaults,
  inferFechaLabSetFromId,
  getLabOutputPrefs,
  isGasoInterpretacionResLabChunk,
  isBhMainResLabChunk,
  formatBhExtendedTabLine,
  renderTendencias,
} from './features/tendencias.mjs';
import {
  registerTodosRuntime,
  todosWindowHandlers,
  refreshAllTodoUIs,
  renderTodoForm,
} from './features/todos.mjs';
import {
  registerPaseBoardRuntime,
  windowHandlers as paseBoardWindowHandlers,
  renderPaseBoard,
  switchAppTab,
  openPaseSectionInNormal,
  syncMainAppTabA11y,
  switchInnerTab,
  renderInnerTabs,
  syncInnerTabVisualOnly,
} from './features/pase-board.mjs';
import {
  registerMedicationsRuntime,
  medicationsWindowHandlers,
  renderMedRecetaPanel,
} from './features/medications.mjs';
import {
  attachProfileSettingsGetter,
  registerProfileRuntime,
  profileWindowHandlers,
  loadSettings,
  normalizeQuickOutputFormat,
  syncHeaderAppModeChip,
  openProfileModal,
  closeProfileModal,
  toggleProfileSection,
  syncProfileSectionVisibility,
  closeTemplatesModal,
} from './features/profile.mjs';
import {
  registerSoapEstadoRuntime,
  windowHandlers as soapEstadoWindowHandlers,
  closeSOAPModal,
  copyToClipboardSafe,
  renderEstadoActualBar,
  renderEstadoActualButton,
} from './features/soap-estado.mjs';
import {
  registerProcedureAgendaRuntime,
  windowHandlers as agendaWindowHandlers,
  renderProcedureAgendaPanel,
  navigateProcedureAgendaWeek,
  openProcedureAgendaModal,
  closeProcedureAgendaModal,
  saveProcedureAgendaFromModal,
  deleteProcedureAgendaFromModal,
} from './features/agenda.mjs';
import {
  registerExpedienteRuntime,
  refreshTendenciasOrCultivosPanel,
  renderListadoForm,
  removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels,
  buildCultivoOutputHtmlFragments,
  isResLabChunkPureCultivo,
  extractCultivoTableRowsFromHistory,
  filterCultivoRowsSignificantFlip,
  formatPaseCultivoResistenciasHtml,
  paseCultivoAtbBlockHtml,
  renderPatientDataPane,
  windowHandlers as expedienteWindowHandlers,
} from './features/expediente.mjs';
import {
  extractParsedValues,
  buildParsedBySectionFromResLabs,
  renderDiagramas,
} from './features/diagrams.mjs';
import {
  registerProductivityRuntime,
  productivityWindowHandlers,
  initProductivityKeyboardShortcuts,
  pushUndoSnapshot,
} from './features/productivity.mjs';
import {
  registerSettingsHelpRuntime,
  settingsHelpWindowHandlers,
  onChromeGuidedTourPaseEnter,
  resolveAppVersionForTour,
  normalizeTourVersionLabel,
  markGuidedTourVersionDone,
  initGuidedTourGate,
  guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  syncTeamSyncHeaderButton,
  closeSettingsDropdown,
} from './features/settings-help.mjs';
import {
  registerPlatformRuntime,
  platformWindowHandlers,
  addAuditEntry,
  incrementPendingJobs,
  decrementPendingJobs,
  syncOfflineButtonStates,
  isRpcOffline,
  initRpcServerHealthWatch,
  initIdleLockFeature,
  syncIdleLockSelectUi,
  syncPreimportBackupUi,
  syncUpdateChannelUI,
  syncUpdateTelemetryUI,
  initUpdateChannelAndGate,
  initGoalGFeatures,
  applyImportEntry,
} from './features/platform.mjs';
import {
  registerNotesIndicacionesRuntime,
  applyProfileToNoteIfEmpty,
  renderNoteForm,
  renderIndicaForm,
  windowHandlers as notesIndicacionesWindowHandlers,
} from './features/notes-indicaciones.mjs';
import {
  patients,
  notes,
  indicaciones,
  labHistory,
  medRecetaByPatient,
  listadoProblemas,
  initAppState,
  saveState,
  setPatients,
  setNotes,
  setIndicaciones,
  setLabHistory,
  setMedRecetaByPatient,
} from './app-state.mjs';

initAppState();

var activeId     = null;
var activeInner  = 'todo';
var activeAppTab = 'lab';
var settings = storage.getSettings();
attachProfileSettingsGetter(function () {
  return settings;
});
registerMedicationsRuntime({
  getActiveId: function () {
    return activeId;
  },
  showToast: showToast,
});
registerProfileRuntime({
  showToast: showToast,
  getActiveId: function () {
    return activeId;
  },
  syncWorkContextChrome: syncWorkContextChrome,
});
registerPaseBoardRuntime({
  getActiveAppTab: function () {
    return activeAppTab;
  },
  setActiveAppTab: function (v) {
    activeAppTab = v;
  },
  getActiveInner: function () {
    return activeInner;
  },
  setActiveInner: function (v) {
    activeInner = v;
  },
  getActiveId: function () {
    return activeId;
  },
  getSettings: function () {
    return settings;
  },
  renderMedRecetaPanel: renderMedRecetaPanel,
  renderLabHistoryPanel: renderLabHistoryPanel,
  renderProcedureAgendaPanel: renderProcedureAgendaPanel,
  setMedTabAttention: setMedTabAttention,
  syncWorkContextChrome: syncWorkContextChrome,
  ensureParsedLabHistory: ensureParsedLabHistory,
  splitResLabsByTipo: splitResLabsByTipo,
  primaryTipoForLabSet: primaryTipoForLabSet,
});
var __v3MigratedThisBoot = migrateToV3(settings);
if (__v3MigratedThisBoot) storage.saveSettings(settings);



function isLikelyLabDataLine(line) {
  if (!line) return false;
  var t = line.trim();
  if (!t) return false;
  if (/^\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?$/.test(t)) return false; // date-only line
  if (t.indexOf('\t') !== -1) return true;
  if (/^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|CULTIVO)\b/i.test(t)) return true;
  // Legacy plain-text rows still include numbers and at least one section token
  return /\d/.test(t) && /[A-Za-z]/.test(t);
}

function extractLabDataLines(lines) {
  return (lines || []).filter(isLikelyLabDataLine);
}

function buildLabSetDateLine(set) {
  if (!set) return '';
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '';
  var rawHora = normalizeHoraLabHistory(set.hora);
  if (!rawDate) return '';
  return rawHora ? (rawDate + ' ' + rawHora.slice(0, 5)) : rawDate;
}

/** Fecha abreviada DD/MM para el bloque de estudios en la nota (sin hora). */
function buildLabSetDateLineForNota(set) {
  if (!set) return '';
  if (set.fecha === 'Anterior' || set.id === 'migrated-anterior') return 'Anterior';
  var rawDate = normalizeFechaLabHistory(set.fecha) || String(set.fecha || '').trim() || inferFechaLabSetFromId(set) || '';
  if (!rawDate) return '';
  if (rawDate.length >= 5 && rawDate.indexOf('/') !== -1) return rawDate.slice(0, 5);
  return rawDate;
}

/** Encabezado de sección de laboratorio tabular (BH, QS, …). */
function isLabSectionHeaderLine(s) {
  return /^(BH|QS|ESC|PFHs|GASES|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS)\b/i.test(String(s).trim());
}

/**
 * Inicio de bloque microbiología / cultivos (no solo líneas CULTIVO\t del parser).
 * Tras activarse, todo va a cultivos hasta el siguiente encabezado BH|QS|…
 */
function isCultivoBlockStartLine(s) {
  var t = String(s).trim();
  if (!t) return false;
  if (/^CULTIVO\b/i.test(t)) return true;
  if (/^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s\/.-]*\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?:\s+\S/i.test(t)) return true;
  if (/^BACTERIOLOGIA\b/i.test(t)) return true;
  if (/^UROCULTIVO\b/i.test(t)) return true;
  if (/^HEMOCULTIVO\b/i.test(t)) return true;
  if (/^FUNGICULTIVO\b/i.test(t)) return true;
  if (/^TINCION\s+DE\s+GRAM/i.test(t)) return true;
  if (/^CATETER\b/i.test(t)) return true;
  if (/^ATB\b/i.test(t)) return true;
  if (/^Cuenta:/i.test(t)) return true;
  if (/^[•\u2022\u00B7]\s*/.test(t)) return true;
  if (/^Cultivos$/i.test(t)) return true;
  if (t.indexOf('\t') === -1 && /^[A-ZÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÚÑ]+){1,4}$/.test(t)) {
    var ws = t.split(/\s+/).filter(Boolean);
    if (ws.length < 2 || ws[0].length < 5 || ws[1].length < 3) return false;
    if (/^(INTERCONSULTA|SALA|SERVICIO|UNIDAD|PACIENTE|HOSPITAL|AREA|CONTROL|DEPARTAMENTO)/i.test(ws[0])) return false;
    if (/^(CARDIOLOGIA|CIRUGIA|URGENCIAS|INTERNA|MEDICINA|PEDIATRIA|NEFROLOGIA|HEMATOLOGIA)$/i.test(ws[1])) return false;
    return true;
  }
  return false;
}

/** Parte líneas de un set en laboratorio convencional vs cultivos / bacteriología. */
function splitResLabsByTipo(rows) {
  var labs = [];
  var cultivo = [];
  var inCultivo = false;
  (rows || []).forEach(function (row) {
    var raw = row == null ? '' : row;
    var s = String(raw).trim();
    if (isLabSectionHeaderLine(s)) {
      inCultivo = false;
      labs.push(raw);
      return;
    }
    if (inCultivo) {
      cultivo.push(raw);
      return;
    }
    if (isCultivoBlockStartLine(s)) {
      inCultivo = true;
      cultivo.push(raw);
      return;
    }
    labs.push(raw);
  });
  return { labs: labs, cultivo: cultivo };
}

function dayKeyFromLabSet(set) {
  if (!set || set.fecha === 'Anterior') return 'Anterior';
  var ms = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof ms === 'number' && isFinite(ms)) {
    var d = new Date(ms);
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  var n = normalizeFechaLabHistory(set.fecha);
  if (n && n !== 'Anterior') {
    var ms2 = parseFechaLabToMs(n, set.hora);
    if (typeof ms2 === 'number' && isFinite(ms2)) {
      var d2 = new Date(ms2);
      return d2.getFullYear() + '-' + (d2.getMonth() + 1) + '-' + d2.getDate();
    }
  }
  return 'unknown';
}

function dayKeyToSortMs(dk) {
  if (dk === 'Anterior') return Number.NEGATIVE_INFINITY;
  if (dk === 'unknown') return Number.MIN_SAFE_INTEGER;
  var p = dk.split('-').map(function (x) {
    return parseInt(x, 10);
  });
  if (p.length !== 3 || !isFinite(p[0])) return 0;
  return new Date(p[0], p[1] - 1, p[2]).getTime();
}

/** Clasificación del conjunto completo (no mezclar en fusión de historial). */
function primaryTipoForLabSet(resLabs) {
  var sp = splitResLabsByTipo(resLabs || []);
  var hasL = sp.labs.some(function (r) {
    return String(r || '').trim();
  });
  var hasC = sp.cultivo.some(function (r) {
    return String(r || '').trim();
  });
  if (hasC && hasL) return 'mixed';
  if (hasC) return 'cultivo';
  return 'labs';
}

function rebuildEstudiosFromLabHistory(patientId) {
  if (!patientId) return;
  if (!notes[patientId]) notes[patientId] = {};
  var ordered = sortLabHistoryChronological(ensureParsedLabHistory(patientId));
  if (!ordered.length) {
    notes[patientId].estudios = '';
    return;
  }
  var byDay = Object.create(null);
  ordered.forEach(function (set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var dk = dayKeyFromLabSet(set);
    if (!byDay[dk]) byDay[dk] = { sets: [] };
    byDay[dk].sets.push(set);
  });
  var dayKeys = Object.keys(byDay).sort(function (a, b) {
    if (a === 'Anterior') return 1;
    if (b === 'Anterior') return -1;
    return dayKeyToSortMs(b) - dayKeyToSortMs(a);
  });
  var lines = [];
  dayKeys.forEach(function (dk) {
    var sets = byDay[dk].sets.slice().sort(function (a, b) {
      var ta = parseFechaLabToMs(a.fecha, a.hora);
      var tb = parseFechaLabToMs(b.fecha, b.hora);
      if (typeof ta === 'number' && typeof tb === 'number' && isFinite(ta) && isFinite(tb) && ta !== tb) return tb - ta;
      return compareLabSetIdForDedupe(a, b);
    });
    var labsAcc = [];
    var cultAcc = [];
    var seenLab = Object.create(null);
    var seenCul = Object.create(null);
    sets.forEach(function (set) {
      var sp = splitResLabsByTipo(set.resLabs);
      sp.labs.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (!clean) return;
        var norm = normalizeLabLine(clean);
        if (seenLab[norm]) return;
        seenLab[norm] = true;
        labsAcc.push(row);
      });
      sp.cultivo.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (!clean) return;
        var norm = normalizeLabLine(clean);
        if (seenCul[norm]) return;
        seenCul[norm] = true;
        cultAcc.push(row);
      });
    });
    if (!labsAcc.length && !cultAcc.length) return;
    var headerSet = sets[0];
    var dateLine = buildLabSetDateLineForNota(headerSet);
    if (dateLine) lines.push(dateLine);
    if (labsAcc.length) {
      labsAcc.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (clean) lines.push(clean);
      });
    }
    if (cultAcc.length) {
      if (labsAcc.length) lines.push('');
      lines.push('Cultivos');
      cultAcc.forEach(function (row) {
        var clean = String(row == null ? '' : row).trim();
        if (clean) lines.push(clean);
      });
    }
    lines.push('');
  });
  while (lines.length && !String(lines[lines.length - 1]).trim()) lines.pop();
  notes[patientId].estudios = lines.join('\n');
}



// ── Lab History Migration ─────────────────────────────────────────
(function migrateLabHistory() {
  try {
    if (localStorage.getItem('rpc-labHistory')) return;
  } catch (_lsErr) { return; }
  patients.forEach(function(p) {
    try {
      if (!notes[p.id] || !notes[p.id].estudios) return;
      var lines = notes[p.id].estudios.split('\n');
      var anteriorLines = lines.slice(0, 3).filter(function(l){ return l.trim(); });
      var recentLines   = lines.slice(3).filter(function(l){ return l.trim(); });
      var sets = [];
      if (anteriorLines.length) {
        var migratedAnteriorLabs = extractLabDataLines(anteriorLines);
        sets.push({
          id: 'migrated-anterior',
          fecha: 'Anterior',
          hora: '',
          resLabs: migratedAnteriorLabs,
          parsed: extractParsedValues(migratedAnteriorLabs)
        });
      }
      if (recentLines.length) {
        var migratedRecentLabs = extractLabDataLines(recentLines);
        sets.push({
          id: 'migrated-recent',
          fecha: normalizeFechaLabHistory(recentLines[0] || notes[p.id].fecha || ''),
          hora: notes[p.id].hora || '',
          resLabs: migratedRecentLabs,
          parsed: extractParsedValues(migratedRecentLabs)
        });
      }
      if (sets.length) labHistory[p.id] = sets;
    } catch (e) {
      console.error('migrateLabHistory patient error:', p && p.id, e && e.message);
    }
  });
  try { localStorage.setItem('rpc-labHistory', JSON.stringify(labHistory)); }
  catch (e) { console.error('migrateLabHistory write error:', e && e.message); }
}());

registerPlatformRuntime({
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  getSettings: function () {
    return settings;
  },
  showToast: showToast,
  syncTeamSyncHeaderButton: syncTeamSyncHeaderButton,
  pushUndoSnapshot: pushUndoSnapshot,
});

registerTendenciasRuntime({
  getActiveId: function () {
    return activeId;
  },
  ensureParsedLabHistory: ensureParsedLabHistory,
  rerenderParsedLabOutputAfterPrefsChange: rerenderParsedLabOutputAfterPrefsChange,
  rpcPrefersReducedMotion: rpcPrefersReducedMotion,
  showToast: showToast,
  buildLabSetDateLine: buildLabSetDateLine,
});

registerTodosRuntime({
  getActiveId: function () {
    return activeId;
  },
  getActiveAppTab: function () {
    return activeAppTab;
  },
  getRoundOverviewMode: getRoundOverviewMode,
  renderPaseBoard: renderPaseBoard,
});

registerSettingsHelpRuntime({
  getSettings: function () {
    return settings;
  },
  getActiveInner: function () {
    return activeInner;
  },
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  switchInnerTab: switchInnerTab,
  renderInnerTabs: renderInnerTabs,
  renderEstadoActualButton: renderEstadoActualButton,
  renderEstadoActualBar: renderEstadoActualBar,
  switchAppTab: switchAppTab,
  showToast: showToast,
  launchConfetti: launchConfetti,
  syncPreimportBackupUi: syncPreimportBackupUi,
  syncSettingsLanHostDiskSection: syncSettingsLanHostDiskSection,
  closeProfileModal: closeProfileModal,
  openProfileModal: openProfileModal,
  renderMedRecetaPanel: renderMedRecetaPanel,
});

registerExpedienteRuntime({
  getActiveId: function () {
    return activeId;
  },
  getActiveAppTab: function () {
    return activeAppTab;
  },
  getActiveInner: function () {
    return activeInner;
  },
  getSettings: function () {
    return settings;
  },
  showToast: showToast,
  renderTendencias: renderTendencias,
  renderPaseBoard: renderPaseBoard,
  splitResLabsByTipo: splitResLabsByTipo,
  buildLabSetDateLine: buildLabSetDateLine,
  ensureParsedLabHistory: ensureParsedLabHistory,
  guardMobileDocExport: guardMobileDocExport,
  isRpcOffline: isRpcOffline,
  incrementPendingJobs: incrementPendingJobs,
  decrementPendingJobs: decrementPendingJobs,
  syncOfflineButtonStates: syncOfflineButtonStates,
  copyToClipboardSafe: copyToClipboardSafe,
  requestDocumentJson: requestDocumentJson,
  handleDocumentGenerateResponse: handleDocumentGenerateResponse,
});

registerNotesIndicacionesRuntime({
  getActiveId: function () {
    return activeId;
  },
  getSettings: function () {
    return settings;
  },
  showToast: showToast,
  renderRoundOverviewPanels: renderRoundOverviewPanels,
  syncOfflineButtonStates: syncOfflineButtonStates,
  guardMobileDocExport: guardMobileDocExport,
  isRpcOffline: isRpcOffline,
  incrementPendingJobs: incrementPendingJobs,
  decrementPendingJobs: decrementPendingJobs,
  requestDocumentJson: requestDocumentJson,
  handleDocumentGenerateResponse: handleDocumentGenerateResponse,
  guidedTourAdvanceAfterNotaGenerated: guidedTourAdvanceAfterNotaGenerated,
  guidedTourAdvanceAfterIndicaGenerated: guidedTourAdvanceAfterIndicaGenerated,
  addAuditEntry: addAuditEntry,
});

registerProcedureAgendaRuntime({
  getActiveId: function () {
    return activeId;
  },
  showToast: showToast,
  renderPaseBoard: renderPaseBoard,
});

registerSoapEstadoRuntime({
  getActiveId: function () {
    return activeId;
  },
  showToast: showToast,
  getSettings: function () {
    return settings;
  },
});

registerLabPanelRuntime({
  showToast: showToast,
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  selectPatient: selectPatient,
  renderRoundOverviewPanels: renderRoundOverviewPanels,
  refreshTendenciasOrCultivosPanel: refreshTendenciasOrCultivosPanel,
  renderPaseBoard: renderPaseBoard,
  onboardingAdvanceAfterParse: onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend: onboardingAdvanceAfterSend,
  findPatientByRegistro: findPatientByRegistro,
  addAuditEntry: addAuditEntry,
  openPaseSectionInNormal: openPaseSectionInNormal,
  renderDiagramas: renderDiagramas,
  pushUndoSnapshot: pushUndoSnapshot,
  setMedTabAttention: setMedTabAttention,
  switchAppTab: switchAppTab,
  closeSettingsDropdown: closeSettingsDropdown,
  extractParsedValues: extractParsedValues,
  buildParsedBySectionFromResLabs: buildParsedBySectionFromResLabs,
  ensureParsedLabHistory: ensureParsedLabHistory,
  rebuildEstudiosFromLabHistory: rebuildEstudiosFromLabHistory,
  inferFechaLabSetFromId: inferFechaLabSetFromId,
  dayKeyFromLabSet: dayKeyFromLabSet,
  primaryTipoForLabSet: primaryTipoForLabSet,
  refreshAllTodoUIs: refreshAllTodoUIs,
  emitLiveSyncTodoUpsert: emitLiveSyncTodoUpsert,
  removeAtbRisPanelsFromBody: removeAtbRisPanelsFromBody,
  wireAtbRisHoverPanels: wireAtbRisHoverPanels,
  getLabOutputPrefs: getLabOutputPrefs,
  isGasoInterpretacionResLabChunk: isGasoInterpretacionResLabChunk,
  formatBhExtendedTabLine: formatBhExtendedTabLine,
  isBhMainResLabChunk: isBhMainResLabChunk,
  isResLabChunkPureCultivo: isResLabChunkPureCultivo,
  buildCultivoOutputHtmlFragments: buildCultivoOutputHtmlFragments,
  buildLabSetDateLine: buildLabSetDateLine,
});

registerProductivityRuntime({
  getActiveId: function () {
    return activeId;
  },
  getSettings: function () {
    return settings;
  },
  selectPatient: selectPatient,
  switchAppTab: switchAppTab,
  switchInnerTab: switchInnerTab,
  saveState: saveState,
  renderIndicaForm: renderIndicaForm,
  closeSettingsDropdown: closeSettingsDropdown,
  openAddModal: openAddModal,
  addAuditEntry: addAuditEntry,
  showToast: showToast,
  advanceRondaPatient: advanceRondaPatient,
});

registerPatientsRuntime({
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  getActiveAppTab: function () {
    return activeAppTab;
  },
  getActiveInner: function () {
    return activeInner;
  },
  setActiveInner: function (v) {
    activeInner = v;
  },
  getSettings: function () {
    return settings;
  },
  getActiveLab: function () {
    return labPanelGetActiveLab();
  },
  consumeActiveLab: function () {
    var x = labPanelGetActiveLab();
    labPanelSetActiveLab(null);
    return x;
  },
  restoreActiveLab: function (x) {
    labPanelSetActiveLab(x);
  },
  clearLabOutputUi: clearLabWorkbenchMinimalDom,
  switchAppTab: switchAppTab,
  showToast: showToast,
  renderInnerTabs: renderInnerTabs,
  renderEstadoActualButton: renderEstadoActualButton,
  renderNoteForm: renderNoteForm,
  renderIndicaForm: renderIndicaForm,
  renderListadoForm: renderListadoForm,
  refreshTendenciasOrCultivosPanel: refreshTendenciasOrCultivosPanel,
  renderLabHistoryPanel: renderLabHistoryPanel,
  renderMedRecetaPanel: renderMedRecetaPanel,
  switchInnerTab: switchInnerTab,
  syncInnerTabVisualOnly: syncInnerTabVisualOnly,
  renderTodoForm: renderTodoForm,
  limpiarReporte: limpiarReporte,
  setLabHistoryPanelCollapsed: setLabHistoryPanelCollapsed,
  syncLabHistoryCollapseUI: syncLabHistoryCollapseUI,
  syncWorkContextChrome: syncWorkContextChrome,
  rpcPrefersReducedMotion: rpcPrefersReducedMotion,
  renderProcedureAgendaPanel: renderProcedureAgendaPanel,
  refreshAllTodoUIs: refreshAllTodoUIs,
  renderPaseBoard: renderPaseBoard,
  pushUndoSnapshot: pushUndoSnapshot,
  addAuditEntry: addAuditEntry,
  applyDefaultsToNewPatient: applyDefaultsToNewPatient,
  applyDefaultsToNewIndicaciones: applyDefaultsToNewIndicaciones,
  enviarLabsANota: enviarLabsANota,
  ensureParsedLabHistory: ensureParsedLabHistory,
  primaryTipoForLabSet: primaryTipoForLabSet,
  normalizeFechaLabHistory: normalizeFechaLabHistory,
});

registerChromeRuntime({
  switchAppTab,
  renderPatientList,
  scrollActiveRondaCardIntoView,
  renderProcedureAgendaPanel,
  getActiveAppTab: function () { return activeAppTab; },
  getActiveId: function () { return activeId; },
  setRoundOverviewMode: setRoundOverviewMode,
  onGuidedTourPaseEnter: onChromeGuidedTourPaseEnter,
});
registerLanRuntime({
  showToast,
  renderPatientList,
  renderNoteForm,
  renderLabHistoryPanel,
  getActiveId: function () {
    return activeId;
  },
  setActiveId: function (id) {
    activeId = id;
  },
  getActiveAppTab: function () {
    return activeAppTab;
  },
  selectPatient,
  isMobileWeb,
  renderProcedureAgendaPanel,
  refreshAllTodoUIs,
  syncWorkContextChrome,
  findPatientByRegistro,
  ensureUniquePatientName,
  applyImportEntry,
  syncSettingsLanHostDiskSection,
  buildPatientEntry,
  closeSettingsDropdown,
});
initChromeAppearance();
syncLabHistoryCollapseUI();

document.getElementById('today-date').textContent =
  new Date().toLocaleDateString('es-MX', {weekday:'long',year:'numeric',month:'long',day:'numeric'});
renderPatientList();
if (patients.length > 0) selectPatient(patients[0].id);
else renderLabHistoryPanel();
loadSettings();
syncWorkContextChrome();
seedTendHiddenDefaults();
syncMainAppTabA11y(activeAppTab);
renderInnerTabs();
if (__v3MigratedThisBoot) {
  setTimeout(function() {
    try { showToast('R+ 3.0 — Sala activado por defecto. Cambia en Mi Perfil → Aplicación.'); } catch (_e) {}
  }, 800);
}
function _rpcDeferInit(fn) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(function() { try { fn(); } catch (e) { console.error('deferInit error:', e && e.message); } }, { timeout: 1500 });
  } else {
    setTimeout(function() { try { fn(); } catch (e) { console.error('deferInit error:', e && e.message); } }, 200);
  }
}
_rpcDeferInit(initGoalGFeatures);
_rpcDeferInit(initGuidedTourGate);
_rpcDeferInit(initMobileWebBoot);
_rpcDeferInit(initRpcServerHealthWatch);
_rpcDeferInit(initIdleLockFeature);
initUpdateChannelAndGate();

function syncActivePatientContextBar() {
  /* Paciente activo solo en la barra lateral; no repetir en el header */
}

function syncMedPatientGate() {
  var empty = document.getElementById('med-empty-guided');
  var work = document.getElementById('med-work-area');
  if (!empty || !work) return;
  var showEmpty = activeAppTab === 'med' && !activeId;
  empty.style.display = showEmpty ? 'flex' : 'none';
  work.style.display = showEmpty ? 'none' : 'flex';
}

function syncLabComboButtonState() {
  var btn = document.getElementById('btn-procesar-y-expediente');
  var hint = document.getElementById('lab-combo-hint');
  var ok = !!activeId;
  if (btn) btn.disabled = !ok;
  if (hint) hint.style.display = ok ? 'none' : 'block';
}

function setMedTabAttention(on) {
  var tab = document.getElementById('apptab-med');
  if (tab) tab.classList.toggle('app-tab-attention', !!on);
}

function syncWorkContextChrome() {
  syncActivePatientContextBar();
  syncHeaderAppModeChip();
  syncMedPatientGate();
  syncLabComboButtonState();
}

}


var _labMaintTimer = null;
var _labMaintRunning = false;
var LAB_MAINT_DEBOUNCE_MS = 550;

/**
 * Tras cada guardado: reprocesa líneas de resultado guardadas (GASES/dedupe interno)
 * y arma un informe de duplicados exactos, mismo sourceText y conflictos fecha/hora.
 * Expone `window.__rpcLabAudit` y escribe en consola si hay algo que revisar.
 * @returns {boolean} true si se modificó algún set (conviene volver a persistir).
 */
function runLabHistoryPostSaveMaintenance() {
  var report = {
    at: new Date().toISOString(),
    reprocessedSetCount: 0,
    patientsReprocessed: [],
    exactDuplicates: [],
    sourceDuplicates: [],
    sameDateTimeConflicts: [],
  };
  var changed = false;
  Object.keys(labHistory || {}).forEach(function (pid) {
    if (pid.indexOf('demo-') === 0) return;
    var sets = labHistory[pid];
    if (!Array.isArray(sets) || !sets.length) return;
    sets.forEach(function (set) {
      if (!set.resLabs || !set.resLabs.length) return;
      var repro = reprocessLabResultLines_(set.resLabs);
      if (!repro || !repro.length) return;
      if (!areLabSetsEquivalent(set.resLabs, repro)) {
        set.resLabs = repro.slice();
        set.parsed = extractParsedValues(repro);
        set.parsedBySection = buildParsedBySectionFromResLabs(repro, set.bhExtras);
        changed = true;
        report.reprocessedSetCount++;
        if (report.patientsReprocessed.indexOf(pid) === -1) report.patientsReprocessed.push(pid);
      }
    });
    var ex = findExactDuplicateLabGroups(sets);
    if (ex.length) {
      report.exactDuplicates.push({ patientId: pid, groups: ex });
    }
    var src = findNormalizedSourceDuplicateGroups(sets);
    if (src.length) {
      report.sourceDuplicates.push({ patientId: pid, groups: src });
    }
    var ct = findConflictingSameDateTimeGroups(sets);
    if (ct.length) {
      report.sameDateTimeConflicts.push({ patientId: pid, groups: ct });
    }
  });
  try {
    window.__rpcLabAudit = report;
  } catch (_e) {}
  var noise =
    report.reprocessedSetCount > 0 ||
    report.exactDuplicates.length > 0 ||
    report.sourceDuplicates.length > 0 ||
    report.sameDateTimeConflicts.length > 0;
  if (noise) {
    console.info('[R+ Laboratorio] Auditoría tras guardado — revisa window.__rpcLabAudit:', report);
  }
  return changed;
}

function scheduleLabHistoryPostSaveMaintenance() {
  clearTimeout(_labMaintTimer);
  _labMaintTimer = setTimeout(function () {
    _labMaintTimer = null;
    if (_labMaintRunning) return;
    _labMaintRunning = true;
    try {
      var changed = runLabHistoryPostSaveMaintenance();
      if (changed) {
        storage.saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient, listadoProblemas);
        if (typeof renderLabHistoryPanel === 'function' && activeId) {
          try {
            renderLabHistoryPanel();
          } catch (_r) {}
        }
        if (typeof refreshTendenciasOrCultivosPanel === 'function') {
          try {
            refreshTendenciasOrCultivosPanel();
          } catch (_t) {}
        }
      }
    } catch (err) {
      console.warn('[R+ Laboratorio] Falló mantenimiento post-guardado:', err);
    } finally {
      _labMaintRunning = false;
    }
  }, LAB_MAINT_DEBOUNCE_MS);
}

registerLanSaveHooks({ scheduleLabHistoryPostSaveMaintenance });

try {
  window.runRpcLabAuditNow = function () {
    var ch = runLabHistoryPostSaveMaintenance();
    if (ch) {
      storage.saveAll(patients, notes, indicaciones, labHistory, medRecetaByPatient, listadoProblemas);
      if (typeof renderLabHistoryPanel === 'function' && activeId) {
        try {
          renderLabHistoryPanel();
        } catch (_e) {}
      }
      if (typeof refreshTendenciasOrCultivosPanel === 'function') {
        try {
          refreshTendenciasOrCultivosPanel();
        } catch (_e2) {}
      }
    }
    return window.__rpcLabAudit;
  };
} catch (_eRun) {}




function chooseOutputDir() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
    showToast('Función no disponible en este entorno', 'error');
    return;
  }
  window.electronAPI.selectOutputDir().then(function(dir) {
    if (!dir) return;
    settings.outputDir = dir;
    localStorage.setItem('rpc-settings', JSON.stringify(settings));
    loadSettings();
    showToast('Carpeta actualizada ✓', 'success');
  });
}

function saveOutputDirSelection(dir) {
  if (!dir) return;
  settings.outputDir = dir;
  localStorage.setItem('rpc-settings', JSON.stringify(settings));
  loadSettings();
}

function requestDocumentJson(url, payload) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(function(r){ return r.json(); });
}

function getOutputDirSelector() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) return undefined;
  return function() { return window.electronAPI.selectOutputDir(); };
}

function handleDocumentGenerateResponse(opts) {
  return handleOutputDirFallback({
    response: opts.response,
    selectOutputDir: getOutputDirSelector(),
    saveOutputDir: saveOutputDirSelection,
    retry: function(dir) {
      return requestDocumentJson(opts.url, opts.buildPayload(dir));
    },
    onSuccess: opts.onSuccess,
    onError: function(message) {
      showToast('Error: ' + message, 'error');
    },
    onPrompt: function() {
      showToast('Selecciona una carpeta para guardar el documento.', 'error');
    },
    onCancel: function() {
      showToast('No se guardó el documento: no se eligió carpeta.', 'error');
    },
  });
}


function toggleSettingsSection() {
  toggleSettingsDropdown();
}


function syncSettingsLanHostDiskSection() {
  var acc = document.getElementById('settings-accordion-lan-host-disk');
  if (!acc) return;
  var trigger = document.getElementById('btn-open-settings');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

/** Abre el desplegable de Ajustes y la sección «Respaldos, sync y recuperación» (mismos controles que en ⚙). */
function expandSettingsAccordionBackupSync() {
  var det = document.getElementById('settings-accordion-backup-sync');
  if (det) det.open = true;
}


function syncTeamSyncHeaderButton() {
  var btn = document.getElementById('btn-header-team-sync');
  if (!btn) return;
  var desktop = !!(window.electronAPI && typeof window.electronAPI.getAppVersion === 'function');
  btn.style.display = desktop || isMobileWeb() ? 'flex' : 'none';
}

function guardMobileDocExport() {
  if (!blockIfMobileDocExport()) return false;
  mobileDocExportToast(showToast);
  return true;
}

async function initMobileWebBoot() {
  if (!isMobileWeb()) return;
  try {
    document.title = 'R+ Móvil';
  } catch (_e) {}
  syncTeamSyncHeaderButton();
  try {
    var v = await resolveAppVersionForTour();
    window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
    markGuidedTourVersionDone();
  } catch (_bootVer) {}
  var intro = document.getElementById('onboarding-intro-backdrop');
  if (intro) {
    intro.classList.remove('open');
    intro.setAttribute('aria-hidden', 'true');
  }
  var parsed = parseLanJoinQuery(location.search, location.origin);
  if (!parsed.teamCode) {
    setTimeout(function () {
      if (typeof openConnectionDropdown === 'function') openConnectionDropdown();
    }, 600);
    return;
  }
  var hostUrl = String(parsed.hostUrl || location.origin || '')
    .trim()
    .replace(/\/+$/, '');
  if (!hostUrl) return;
  configureLanFromMobileJoin(hostUrl, parsed.teamCode, parsed.roomId);
}



function applyDefaultsToNewPatient(patientId) {
  if (!notes[patientId]) return;
  applyProfileToNoteIfEmpty(notes[patientId]);
}

function applyDefaultsToNewIndicaciones(patientId) {
  if (!indicaciones[patientId]) return;
  if (settings.defaultDieta        && !indicaciones[patientId].dieta)        indicaciones[patientId].dieta        = settings.defaultDieta;
  if (settings.defaultCuidados     && !indicaciones[patientId].cuidados)     indicaciones[patientId].cuidados     = settings.defaultCuidados;
  if (settings.defaultMedicamentos && !indicaciones[patientId].medicamentos) indicaciones[patientId].medicamentos = settings.defaultMedicamentos;
}





function launchConfetti() {
  var colors = ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#fb7185'];
  for (var i = 0; i < 40; i++) {
    (function(idx) {
      setTimeout(function() {
        var el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = (Math.random() * 100) + 'vw';
        el.style.top  = '-10px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = (Math.random() * 0.5) + 's';
        el.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
        document.body.appendChild(el);
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
      }, idx * 40);
    })(i);
  }
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showToast(msg, type) {
  var focused = document.activeElement;
  var t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show' + (type ? ' '+type : '');
  if (focused && focused.tagName !== 'BODY') setTimeout(function(){ focused.focus(); }, 0);
  setTimeout(function(){ t.className = 'toast'; }, 3500);
}


var modalDismiss = createModalDismissRegistry();

function initModalDismiss() {
  var dynamicBackdropIds = [
    'lab-dedupe-backdrop',
    'soap-confirm-backdrop',
    'dup-confirm-backdrop',
    'lab-conflict-backdrop',
    'exp-advice-backdrop'
  ];

  function el(id) {
    return document.getElementById(id);
  }

  modalDismiss.register({
    isOpen: function () {
      return dynamicBackdropIds.some(function (id) {
        return !!el(id);
      });
    },
    close: function () {
      dynamicBackdropIds.forEach(function (id) {
        var node = el(id);
        if (node) node.remove();
      });
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('update-modal-backdrop'));
    },
    close: hideUpdateModal,
    backdropEl: function () {
      return el('update-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('tend-detail-backdrop'));
    },
    close: closeTendDetail,
    backdropEl: function () {
      return el('tend-detail-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return tendGroupModal.isOpen();
    },
    close: closeTendGroupModal,
    backdropEl: function () {
      return el('tend-group-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('rpc-wipe-modal');
      return m && m.getAttribute('aria-hidden') === 'false';
    },
    close: closeWipeDataModal,
    backdropEl: function () {
      return el('rpc-wipe-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('soap-modal-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeSOAPModal,
    backdropEl: function () {
      return el('soap-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('procedure-agenda-modal');
      return m && m.classList.contains('open');
    },
    close: closeProcedureAgendaModal,
    backdropEl: function () {
      return el('procedure-agenda-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('modal');
      return m && m.classList.contains('open');
    },
    close: closeModal,
    confirmClose: confirmCloseAddPatientModal,
    backdropEl: function () {
      return el('modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('profile-modal');
      return m && m.classList.contains('open');
    },
    close: closeProfileModal,
    backdropEl: function () {
      return el('profile-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('templates-modal'));
    },
    close: closeTemplatesModal,
    backdropEl: function () {
      return el('templates-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('extra-templates-modal'));
    },
    close: closeExtraTemplatesManager,
    backdropEl: function () {
      return el('extra-templates-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('unified-search-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeUnifiedSearch,
    backdropEl: function () {
      return el('unified-search-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('help-quick-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeQuickHelp,
    backdropEl: function () {
      return el('help-quick-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('release-notes-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeReleaseNotes,
    backdropEl: function () {
      return el('release-notes-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('tend-hidden-modal-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeTendHiddenModal,
    backdropEl: function () {
      return el('tend-hidden-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('lab-display-prefs-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeLabDisplayPrefsModal,
    backdropEl: function () {
      return el('lab-display-prefs-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('onboarding-intro-backdrop');
      return b && b.classList.contains('open');
    },
    close: hideTourIntroModal,
    backdropEl: function () {
      return el('onboarding-intro-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var c = el('connection-dropdown');
      return c && c.classList.contains('open');
    },
    close: closeConnectionDropdown,
    backdropEl: function () {
      return el('connection-dropdown-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var s = el('settings-dropdown');
      return s && s.classList.contains('open');
    },
    close: closeSettingsDropdown,
    backdropEl: function () {
      return el('settings-dropdown-backdrop');
    }
  });

  modalDismiss.init();

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('lab-conflict-backdrop')) return;
    if (dynamicBackdropIds.indexOf(t.id) === -1) return;
    t.remove();
  });
}

document.addEventListener('keydown', function(e) {
  var mod = e.metaKey || e.ctrlKey;
  if (mod) {
    var key = e.key.toLowerCase();
    if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
      e.preventDefault();
      if (isPaseMode()) {
        if (key === '1') openPaseSectionInNormal('labs');
        if (key === '2') openPaseSectionInNormal('expediente');
        if (key === '3') openPaseSectionInNormal('med');
        if (key === '5') openPaseSectionInNormal('agenda');
      } else {
        if (key === '1') switchAppTab('lab');
        if (key === '2') switchAppTab('nota');
        if (key === '3') switchAppTab('med');
        if (key === '5') switchAppTab('agenda');
      }
      if (key === '4') {
        var dd = document.getElementById('settings-dropdown');
        if (dd && !dd.classList.contains('open')) toggleSettingsDropdown();
      }
    }
    if (key === 'p' && !e.altKey) {
      e.preventDefault();
      if (e.shiftKey) toggleProfileSection();
      else setUiDensity(getUiDensity() === 'normal' ? 'pase' : 'normal');
    }
    if (e.key === ',' && !e.shiftKey && !e.altKey) {
      if (typeof isTypingContext === 'function' && isTypingContext(e.target)) return;
      e.preventDefault();
      window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
      showToast(
        window.__rpcPreferImportOverwrite
          ? 'Importación: conflictos → sobrescribir (⌘, o Ctrl+, de nuevo para apagar).'
          : 'Importación: se preguntará en cada conflicto.',
        window.__rpcPreferImportOverwrite ? 'success' : 'info'
      );
    }
  }
});


function updatePatient(field, value) {
  if (activeId == null) return;
  var pid = String(activeId);
  var p = patients.find(function (pl) {
    return String(pl.id) === pid;
  });
  if (!p) return;
  var next =
    field === 'nombre' || field === 'area' || field === 'servicio'
      ? String(value || '').toUpperCase()
      : value;
  if (String(p[field] || '') === String(next || '')) return;
  p[field] = next;
  saveState();
  renderPatientList();
  renderPatientDataPane();
  syncWorkContextChrome();
  if (isPaseMode()) {
    renderPaseBoard();
    renderRoundOverviewPanels();
    if (activeAppTab === 'agenda') renderProcedureAgendaPanel();
  }
}

function escHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toLines(value) {
  if (Array.isArray(value)) return value.map(function(v){ return String(v || '').trim(); }).filter(Boolean);
  return String(value || '').split('\n').map(function(v){ return v.trim(); }).filter(Boolean);
}

function slugFilePart(value, fallback) {
  var base = String(value || '').trim().toLowerCase();
  var slug = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}

function getCurrentPatientClinicalData() {
  var patient = patients.find(function(p){ return p.id === activeId; });
  if (!patient) return null;
  return {
    patient: patient,
    note: notes[activeId] || {},
    indicacion: indicaciones[activeId] || {}
  };
}

function buildClinicalTextExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || 'both';
  var blocks = [];
  blocks.push('R+ - SALIDA CLINICA');
  blocks.push('PACIENTE: ' + (patient.nombre || ''));
  blocks.push('REGISTRO: ' + (patient.registro || ''));
  blocks.push('SERVICIO: ' + (patient.servicio || ''));
  blocks.push('CUARTO/CAMA: ' + (patient.cuarto || '') + '/' + (patient.cama || ''));
  blocks.push('');
  if (mode !== 'indica') {
    blocks.push('== NOTA DE EVOLUCION ==');
    blocks.push('FECHA/HORA: ' + (note.fecha || '') + ' ' + (note.hora || ''));
    blocks.push('DIAGNOSTICOS:');
    toLines(note.diagnosticos || []).forEach(function(v, idx){ blocks.push((idx + 1) + '. ' + v); });
    if (!toLines(note.diagnosticos || []).length) blocks.push('(sin contenido)');
  }
  function pushBlock(label, value) {
    blocks.push(label + ':');
    var lines = toLines(value);
    if (!lines.length) blocks.push('(sin contenido)');
    lines.forEach(function(l){ blocks.push('- ' + l); });
  }
  if (mode !== 'indica') {
    pushBlock('INTERROGATORIO', note.interrogatorio);
    pushBlock('EXPLORACION FISICA', note.exploracion);
    pushBlock('ESTUDIOS', note.estudios);
    pushBlock('ANALISIS', note.analisis);
    pushBlock('PLAN', note.plan);
    blocks.push('SIGNOS VITALES: TA ' + (note.ta || '-') + ' | FR ' + (note.fr || '-') + ' | FC ' + (note.fc || '-') + ' | TEMP ' + (note.temp || '-') + ' | PESO ' + (note.peso || '-'));
    pushBlock('TRATAMIENTO E INDICACIONES', note.tratamiento || []);
    blocks.push('MEDICO TRATANTE: ' + (note.medico || ''));
    blocks.push('PROFESOR RESPONSABLE: ' + (note.profesor || ''));
  }
  if (mode === 'both') blocks.push('');
  if (mode !== 'note') {
    blocks.push('== INDICACIONES ==');
    blocks.push('FECHA/HORA: ' + (ind.fecha || '') + ' ' + (ind.hora || ''));
    pushBlock('MEDICOS', ind.medicos);
    pushBlock('DIETA', ind.dieta);
    pushBlock('CUIDADOS', ind.cuidados);
    pushBlock('ESTUDIOS', ind.estudios);
    pushBlock('MEDICAMENTOS', ind.medicamentos);
    pushBlock('INTERCONSULTAS', ind.interconsultas);
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (otros.length) {
      blocks.push('OTROS:');
      otros.forEach(function(item, idx) {
        if (!item || typeof item !== 'object') return;
        blocks.push((idx + 1) + '. ' + (item.titulo || 'Seccion sin titulo'));
        toLines(item.contenido || '').forEach(function(line) { blocks.push('   - ' + line); });
      });
    }
  }
  return blocks.join('\n');
}

function buildClinicalHtmlExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || 'both';
  function renderList(values) {
    var lines = toLines(values);
    if (!lines.length) return '<p><em>Sin contenido</em></p>';
    return '<ul>' + lines.map(function(line){ return '<li>' + escHtml(line) + '</li>'; }).join('') + '</ul>';
  }
  function renderOtherSections() {
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (!otros.length) return '<p><em>Sin secciones adicionales</em></p>';
    return otros.filter(function(item) { return item && typeof item === 'object'; }).map(function(item) {
      return '<article><h4>' + escHtml(item.titulo || 'Seccion sin titulo') + '</h4>' + renderList(item.contenido || '') + '</article>';
    }).join('');
  }
  var noteHtml = '<section><h2>Nota de evolucion</h2>' +
    '<p><strong>Fecha/Hora:</strong> ' + escHtml(note.fecha || '') + ' ' + escHtml(note.hora || '') + '</p>' +
    '<h3>Diagnosticos</h3>' + renderList(note.diagnosticos || []) +
    '<h3>Interrogatorio</h3>' + renderList(note.interrogatorio) +
    '<h3>Exploracion fisica</h3>' + renderList(note.exploracion) +
    '<h3>Estudios</h3>' + renderList(note.estudios) +
    '<h3>Analisis</h3>' + renderList(note.analisis) +
    '<h3>Plan</h3>' + renderList(note.plan) +
    '<h3>Signos vitales</h3><p>TA ' + escHtml(note.ta || '-') + ' | FR ' + escHtml(note.fr || '-') + ' | FC ' + escHtml(note.fc || '-') + ' | TEMP ' + escHtml(note.temp || '-') + ' | PESO ' + escHtml(note.peso || '-') + '</p>' +
    '<h3>Tratamiento e indicaciones medicas</h3>' + renderList(note.tratamiento || []) +
    '</section>';
  var indicaHtml = '<section><h2>Indicaciones</h2>' +
    '<p><strong>Fecha/Hora:</strong> ' + escHtml(ind.fecha || '') + ' ' + escHtml(ind.hora || '') + '</p>' +
    '<h3>Medicos</h3>' + renderList(ind.medicos) +
    '<h3>Dieta</h3>' + renderList(ind.dieta) +
    '<h3>Cuidados</h3>' + renderList(ind.cuidados) +
    '<h3>Estudios</h3>' + renderList(ind.estudios) +
    '<h3>Medicamentos</h3>' + renderList(ind.medicamentos) +
    '<h3>Interconsultas</h3>' + renderList(ind.interconsultas) +
    '<h3>Otros</h3>' + renderOtherSections() +
    '</section>';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:;">' +
    '<title>R+ salida clinica</title>' +
    '<style>body{font-family:Arial,sans-serif;line-height:1.45;margin:24px;color:#111}h1,h2{margin-bottom:8px}section{margin:20px 0;padding-top:8px;border-top:1px solid #ddd}h3{margin:14px 0 6px}ul{margin:0 0 8px 20px}p{margin:0 0 8px}</style>' +
    '</head><body>' +
    '<h1>R+ - Salida clinica</h1>' +
    '<p><strong>Paciente:</strong> ' + escHtml(patient.nombre || '') + ' | <strong>Registro:</strong> ' + escHtml(patient.registro || '') + '</p>' +
    '<p><strong>Servicio:</strong> ' + escHtml(patient.servicio || '') + ' | <strong>Cuarto/Cama:</strong> ' + escHtml(patient.cuarto || '') + '/' + escHtml(patient.cama || '') + '</p>' +
    (mode !== 'indica' ? noteHtml : '') +
    (mode !== 'note' ? indicaHtml : '') +
    '</body></html>';
}

function exportCurrentPatientAsText() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = activeInner === 'indica' ? 'indica' : 'note';
  var fileName = 'R-plus-' + slugFilePart(bundle.patient.nombre, 'paciente') + '-clinico-' + formatDateSlug(new Date()) + '.txt';
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalTextExport(bundle), fileName, 'text/plain');
    showToast('Salida .txt descargada', 'success');
  } catch (e) {
    showToast('No se pudo exportar: ' + (e && e.message ? e.message : 'error'), 'error');
  } finally {
    decrementPendingJobs();
  }
}

function exportCurrentPatientAsHtml() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = activeInner === 'indica' ? 'indica' : 'note';
  var fileName = 'R-plus-' + slugFilePart(bundle.patient.nombre, 'paciente') + '-clinico-' + formatDateSlug(new Date()) + '.html';
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalHtmlExport(bundle), fileName, 'text/html');
    showToast('Salida .html descargada', 'success');
  } catch (e) {
    showToast('No se pudo exportar: ' + (e && e.message ? e.message : 'error'), 'error');
  } finally {
    decrementPendingJobs();
  }
}

function quickExportCurrentPatient() {
  if (guardMobileDocExport()) return;
  if (!activeId) {
    showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var format = normalizeQuickOutputFormat(settings.quickOutputFormat);
  var action = resolveQuickOutputAction({
    format: format,
    appMode: isModeSala(settings) ? 'sala' : 'interconsulta',
    activeInner: activeInner,
    listado: listadoProblemas[activeId] || null,
  });
  switch (action.kind) {
    case 'html':           exportCurrentPatientAsHtml(); return;
    case 'txt':            exportCurrentPatientAsText(); return;
    case 'listado':        generateListado(); return;
    case 'listado_empty':  showToast(action.message, 'error'); return;
    case 'indicaciones':   generateIndicaciones(); return;
    case 'nota':
    default:               generateWord(); return;
  }
}


function ensureParsedLabHistory(patientId) {
  var history = labHistory[patientId] || [];
  var changed = false;
  var rebuildNota = false;
  var noteLines = (notes[patientId] && notes[patientId].estudios ? notes[patientId].estudios.split('\n') : []);

  history.forEach(function(set) {
    if (!set) return;
    if (!set.resLabs || !set.resLabs.length) {
      if (set.id === 'migrated-anterior') {
        set.resLabs = extractLabDataLines(noteLines.slice(0, 3));
        changed = true;
      } else if (set.id === 'migrated-recent') {
        set.resLabs = extractLabDataLines(noteLines.slice(3));
        changed = true;
      }
    }
    if (!set.bhExtras && set.sourceText) {
      try {
        var reParse = procesarLabs(set.sourceText);
        set.bhExtras = reParse && reParse.bhExtras ? reParse.bhExtras : {};
      } catch (_e) {
        set.bhExtras = {};
      }
      changed = true;
    }
    var needsParse = !set.parsed || !Object.keys(set.parsed).length;
    if (needsParse) {
      if (!set.resLabs || !set.resLabs.length) {
        set.parsed = {};
        changed = true;
      } else {
        set.parsed = extractParsedValues(set.resLabs);
        changed = true;
      }
    }
    if (set.resLabs && set.resLabs.length) {
      var pbNext = buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras);
      var pbStr = JSON.stringify(pbNext);
      if (JSON.stringify(set.parsedBySection || null) !== pbStr) {
        set.parsedBySection = pbNext;
        changed = true;
      }
    } else if (set.parsedBySection && Object.keys(set.parsedBySection).length) {
      set.parsedBySection = {};
      changed = true;
    }
    var nf = normalizeFechaLabHistory(set.fecha);
    if (nf && nf !== set.fecha && set.fecha !== 'Anterior') {
      set.fecha = nf;
      changed = true;
    }
    var nh = normalizeHoraLabHistory(set.hora);
    if (nh !== (set.hora || '')) {
      set.hora = nh;
      changed = true;
    }
    if (set.sourceText) {
      if (!set.refsBySection || !Object.keys(set.refsBySection).length) {
        var refsNext = buildRefsBySectionFromReport(set.sourceText);
        if (refsNext && Object.keys(refsNext).length) {
          set.refsBySection = refsNext;
          changed = true;
        }
      }
      var horaFromSrc = extractLabReportHora(set.sourceText);
      if (horaFromSrc && horaFromSrc !== normalizeHoraLabHistory(set.hora)) {
        set.hora = horaFromSrc;
        changed = true;
        rebuildNota = true;
      }
    }
    if ((!set.fecha || !String(set.fecha).trim()) && set.fecha !== 'Anterior') {
      var inferred = inferFechaLabSetFromId(set);
      if (inferred) {
        set.fecha = inferred;
        changed = true;
      }
    }
  });
  if (rebuildNota && patientId && notes[patientId]) {
    rebuildEstudiosFromLabHistory(patientId);
    changed = true;
  }
  if (changed) saveState();
  return history;
}

function rpcPrefersReducedMotion() {
  try {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch (_e) {
    return false;
  }
}




_rpcDeferInit(initProductivityKeyboardShortcuts);
_rpcDeferInit(initModalDismiss);
_rpcDeferInit(initSidebarAutoHide);
_rpcDeferInit(initPatientModalEnterSave);
syncProfileSectionVisibility();

Object.assign(
  window,
  chromeWindowHandlers,
  lanWindowHandlers,
  patientsWindowHandlers,
  labPanelWindowHandlers,
  soapEstadoWindowHandlers,
  agendaWindowHandlers,
  expedienteWindowHandlers,
  notesIndicacionesWindowHandlers,
  productivityWindowHandlers,
  settingsHelpWindowHandlers,
  platformWindowHandlers,
  tendenciasWindowHandlers,
  todosWindowHandlers,
  paseBoardWindowHandlers,
  medicationsWindowHandlers,
  profileWindowHandlers,
  {
    onDefaultServicioBlur,
    onMedicoTemplateBlur,
    chooseOutputDir,
    updatePatient,
    quickExportCurrentPatient,
  }
);
