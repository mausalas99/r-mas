import {
  appShellWindowHandlers,
  initModalDismiss,
  productivityWindowHandlers,
  pushUndoSnapshot,
  registerAppShellContext,
  registerProcedureAgendaRuntime,
  registerProductivityRuntime,
  renderProcedureAgendaPanel,
  rpcPrefersReducedMotion,
  scheduleDeferredShellInits,
  scheduleDeferredUiInits,
  setMedTabAttention,
  showToast,
  syncWorkContextChrome,
  windowHandlers as windowHandlers10
} from "/js/chunks/chunk-T5YFML3Q.js";
import "/js/chunks/chunk-ESDETRTR.js";
import {
  AHF_RELATIVES,
  APP_DEDICATED_IDS,
  HC_INTERROGADO_NEGADO,
  addAuditEntry,
  advanceRondaPatient,
  applyDefaultsToNewIndicaciones,
  applyDefaultsToNewPatient,
  applyDriveImportHcPatch,
  applyDriveImportLabSets,
  applyEstadoActualParsedToForm,
  applyImportEntry,
  ascitisInterpretacionBody_,
  attachProfileSettingsGetter,
  buildBulkLabPreview,
  buildCultivoOutputHtmlFragments,
  buildEstudiosCopyLinesFromLabSets,
  buildLabSetDateLine,
  buildPatientEntry,
  clearLabWorkbenchMinimalDom,
  closeProfileModal,
  dayKeyFromLabSet,
  decrementPendingJobs,
  ensureEaRegistroModalForm,
  ensureParsedLabHistory,
  ensureParsedLabHistoryCached,
  ensureUniquePatientName,
  enviarLabsANota,
  findPatientByRegistro,
  formatBhExtendedTabLine,
  formatLabHistoryListMeta,
  generatePatientId,
  getActiveLab,
  getBulkLabPreviewSourceText,
  getLabOutputPrefs,
  getRoundOverviewMode,
  groupLabHistoryByDay,
  guardMobileDocExport,
  guidedTourAdvanceAfter,
  guidedTourAdvanceAfterIndicaGenerated,
  guidedTourAdvanceAfterNotaGenerated,
  handleDocumentGenerateResponse,
  hydrateProfileSettings,
  incrementPendingJobs,
  inferFechaLabSetFromId,
  initPatientModalEnterSave,
  initSidebarAutoHide,
  initTabBarMotion,
  installLabHistoryAuditHook,
  invalidateInnerTabRenderCache,
  isAscitisInterpretacionResLabChunk,
  isBhMainResLabChunk,
  isBulkLabPreviewModalOpen,
  isGasoInterpretacionResLabChunk,
  isResLabChunkPureCultivo,
  isRpcOffline,
  labSetIsFromSome,
  limpiarReporte,
  loadSettings,
  medicationsWindowHandlers,
  mergeHcPatch,
  navigateToEstadoActualPanel,
  onboardingAdvanceAfterParse,
  onboardingAdvanceAfterSend,
  openAddModal,
  openAddModalFromLabPatient,
  openEstadoActualRegistroModal,
  openPaseSectionInNormal,
  openProfileModal,
  primaryTipoForLabSet,
  profileWindowHandlers,
  rebuildEstudiosFromLabHistory,
  recetaHuWindowHandlers,
  recoverPresentationPatientsOnBoot,
  refreshAllTodoUIs,
  refreshExpedienteAfterPatientSelect,
  refreshTendenciasOrCultivosPanel,
  registerCensoRuntime,
  registerEstadoActualPanelRuntime,
  registerEstadoActualPasteModalRuntime,
  registerEstadoActualRegistroModalRuntime,
  registerExpedienteRuntime,
  registerHistoriaClinicaRuntime,
  registerLabBulkPreviewModalRuntime,
  registerLabHistoryMaintRuntime,
  registerLabPanelRuntime,
  registerMedPharmProfileRuntime,
  registerMedicationsRuntime,
  registerNotesIndicacionesRuntime,
  registerPaseBoardRuntime,
  registerPatientsRuntime,
  registerProfileRuntime,
  registerRecetaHuRuntime,
  registerTendenciasRuntime,
  registerTodosRuntime,
  registerVpoRuntime,
  removeAtbRisPanelsFromBody,
  renderDiagramas,
  renderEstadoActualPanel,
  renderIndicaForm,
  renderInnerTabs,
  renderLabHistoryPanel,
  renderListadoForm,
  renderMedRecetaPanel,
  renderNoteForm,
  renderPaseBoard,
  renderPatientDataPane,
  renderPatientList,
  renderRecetaHu,
  renderRoundOverviewPanels,
  renderTendencias,
  renderTodoForm,
  renderVpo,
  requestDocumentJson,
  rerenderParsedLabOutputAfterPrefsChange,
  resetEaRegistroForm,
  scheduleLabHistoryPostSaveMaintenance,
  scrollActiveRondaCardIntoView,
  seedTendHiddenDefaults,
  selectPatient,
  setActiveLab,
  setLabHistoryPanelCollapsed,
  setRoundOverviewMode,
  splitResLabsByTipo,
  switchAppTab,
  switchConsolidatedTab,
  switchInnerTab,
  syncAhfConditionsFromEntries,
  syncCensoExportButtonVisibility,
  syncEaRegistroGluMode,
  syncInnerTabVisualOnly,
  syncLabHistoryCollapseUI,
  syncLabOutputChrome,
  syncMainAppTabA11y,
  syncOfflineButtonStates,
  syncPreimportBackupUi,
  syncProfileSectionVisibility,
  tendenciasWindowHandlers,
  toDatetimeLocalValue,
  todosWindowHandlers,
  toggleHeaderWorkMode,
  tourAfterBulkLabParse,
  tourOnBulkPreviewPatientSaved,
  toxicomanias_substances_default,
  windowHandlers as windowHandlers3,
  windowHandlers2 as windowHandlers4,
  windowHandlers3 as windowHandlers5,
  windowHandlers4 as windowHandlers6,
  windowHandlers5 as windowHandlers7,
  windowHandlers6 as windowHandlers8,
  windowHandlers7 as windowHandlers11,
  windowHandlers8 as windowHandlers12,
  windowHandlers9 as windowHandlers13,
  wireAtbRisHoverPanels,
  wireEaModalDismiss,
  wireEstadoActualPasteModal
} from "/js/chunks/chunk-YV3X5QVR.js";
import {
  windowHandlers as windowHandlers2
} from "/js/chunks/chunk-4O2KSFAZ.js";
import {
  syncClinicalRotationEntryChrome,
  windowHandlers as windowHandlers14,
  wireClinicalRotationEntryControls
} from "/js/chunks/chunk-7EKXGZ3O.js";
import {
  closeSettingsDropdown,
  syncTeamSyncHeaderButton
} from "/js/chunks/chunk-QN3XA72E.js";
import "/js/chunks/chunk-ZN2W2FIJ.js";
import "/js/chunks/chunk-AI3JGDQE.js";
import "/js/chunks/chunk-6IT4VYWH.js";
import "/js/chunks/chunk-YL6YUWBV.js";
import "/js/chunks/chunk-MLXZVY56.js";
import "/js/chunks/chunk-POM2RBQV.js";
import {
  windowHandlers as windowHandlers9
} from "/js/chunks/chunk-SCZISFDB.js";
import {
  ahf_conditions_default,
  app_conditions_default
} from "/js/chunks/chunk-DQCOVCYX.js";
import {
  applyDriveImportEventualidades,
  buildParsedBySectionFromResLabs,
  copyToClipboardSafe,
  emitLiveSyncTodoUpsert,
  extractParsedValues,
  filterNewEventualidades,
  initChromeAppearance,
  initClinicalAccessRuntime,
  initRpcDatePicker,
  invalidateEventualidadesPanel,
  isMobileWeb,
  launchConfetti,
  migrateToV3,
  normalizeFechaLabHistory,
  registerChromeRuntime,
  registerEventualidadesRuntime,
  registerLanRuntime,
  registerLanSaveHooks,
  registerSoapEstadoRuntime,
  renderEstadoActualBar,
  renderEstadoActualButton,
  renderEventualidadesPanel,
  renderGuardiaBoard,
  resumeClinicalSession,
  sortLabHistoryChronological,
  syncGuardiaModeButtonVisibility,
  syncSettingsLanHostDiskSection,
  tryMountClinicalTeamInviteBrowserGate,
  windowHandlers,
  windowHandlers2 as windowHandlers15,
  windowHandlers3 as windowHandlers16,
  wireClinicalTeamsControls
} from "/js/chunks/chunk-5YBPJ63Q.js";
import "/js/chunks/chunk-GDIYO6HE.js";
import {
  dbUnlockWindowHandlers,
  ensureClinicalDbUnlocked
} from "/js/chunks/chunk-O7TMZZGI.js";
import "/js/chunks/chunk-BCNABZWJ.js";
import {
  bootHydrateFromDb,
  flushSaveState,
  getDefaultRegistroRecordedAt,
  initAppState,
  labHistory,
  patients,
  saveState,
  setSaveStateHooks
} from "/js/chunks/chunk-P6ZNDBV7.js";
import {
  storage
} from "/js/chunks/chunk-2TZHN5MF.js";
import {
  isDbMode
} from "/js/chunks/chunk-K6QXHWFW.js";
import "/js/chunks/chunk-MSBFOYVD.js";
import {
  resolveClinicalClientId
} from "/js/chunks/chunk-2VRIL4MF.js";
import "/js/chunks/chunk-LX374JRN.js";
import "/js/chunks/chunk-7CKRCX6S.js";
import "/js/chunks/chunk-FWKRNT2R.js";

// public/js/features/lab-history-batch-copy-modal.mjs
var rt = {
  getActiveId() {
    return null;
  },
  ensureParsedLabHistory() {
    return [];
  },
  showToast() {
  },
  copyToClipboardSafe() {
    return Promise.resolve(false);
  }
};
function registerLabHistoryBatchCopyRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}
function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function loadPatientHistory() {
  var pid = rt.getActiveId();
  if (!pid) return { pid: null, ordered: [], groups: [] };
  var ordered;
  if (rt.ensureParsedLabHistoryCached) {
    ordered = sortLabHistoryChronological(rt.ensureParsedLabHistoryCached(pid));
  } else {
    ordered = sortLabHistoryChronological(
      rt.ensureParsedLabHistory(pid, { readOnly: true })
    );
  }
  return { pid, ordered, groups: groupLabHistoryByDay(ordered) };
}
function selectedDayKeysFromBackdrop(backdrop) {
  var keys = [];
  backdrop.querySelectorAll(".lab-batch-copy-cb:checked").forEach(function(cb) {
    var dk = cb.getAttribute("data-day-key");
    if (dk) keys.push(dk);
  });
  return keys;
}
function syncBatchCopyActions(backdrop, ordered) {
  var ta = backdrop.querySelector("#lab-batch-copy-preview");
  var countEl = backdrop.querySelector("#lab-batch-copy-count");
  var copyBtn = backdrop.querySelector("#lab-batch-copy-ok");
  if (!ta) return;
  var keys = selectedDayKeysFromBackdrop(backdrop);
  var n = keys.length;
  if (countEl) {
    countEl.textContent = n === 0 ? "Ning\xFAn d\xEDa seleccionado \u2014 marca al menos uno para copiar" : n + " d\xEDa" + (n === 1 ? "" : "s") + " seleccionado" + (n === 1 ? "" : "s");
  }
  if (copyBtn) {
    copyBtn.disabled = n === 0;
    copyBtn.setAttribute("aria-disabled", n === 0 ? "true" : "false");
    copyBtn.style.opacity = n === 0 ? "0.55" : "";
    copyBtn.style.cursor = n === 0 ? "not-allowed" : "pointer";
  }
  if (!n) {
    ta.value = "";
    ta.placeholder = "La vista previa aparece al seleccionar uno o m\xE1s d\xEDas arriba.";
    return;
  }
  ta.placeholder = "";
  ta.value = buildEstudiosCopyLinesFromLabSets(ordered, { onlyDayKeys: keys }).join("\n");
}
function closeBatchCopyModal(backdrop) {
  if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
}
function openLabHistoryBatchCopyModal() {
  if (!rt.getActiveId()) {
    rt.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var loaded = loadPatientHistory();
  if (!loaded.groups.length) {
    rt.showToast("No hay laboratorios en el historial de este paciente", "error");
    return;
  }
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = "lab-batch-copy-backdrop";
  var listHtml = loaded.groups.map(function(group) {
    return '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="lab-batch-copy-cb" data-day-key="' + esc(group.dayKey) + '" style="margin-top:3px;flex-shrink:0;" /><span>' + esc(group.label) + "</span></label></li>";
  }).join("");
  backdrop.innerHTML = '<div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;"><h3 style="margin:0 0 8px;">Copiar varios d\xEDas</h3><p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca los d\xEDas que quieres copiar. El texto usa el mismo formato que el bloque <strong>Estudios</strong> del expediente (laboratorio y cultivos por d\xEDa).</p><div style="overflow-y:auto;flex:0 1 auto;max-height:28vh;padding-right:4px;"><ul style="margin:0;padding-left:0;list-style:none;font-size:13px;">' + listHtml + '</ul></div><p id="lab-batch-copy-count" style="font-size:12px;color:var(--text-muted);margin:10px 0 6px;">Ning\xFAn d\xEDa seleccionado \u2014 marca al menos uno para copiar</p><textarea id="lab-batch-copy-preview" readonly rows="8" placeholder="La vista previa aparece al seleccionar uno o m\xE1s d\xEDas arriba." style="width:100%;box-sizing:border-box;font-family:ui-monospace,monospace;font-size:12px;line-height:1.4;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);resize:vertical;flex:1;min-height:120px;"></textarea><div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;"><button type="button" id="lab-batch-copy-none" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Quitar todas</button><button type="button" id="lab-batch-copy-all" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Seleccionar todas</button><button type="button" id="lab-batch-copy-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button><button type="button" id="lab-batch-copy-ok" disabled aria-disabled="true" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Copiar al portapapeles</button></div></div>';
  document.body.appendChild(backdrop);
  function refreshPreview2() {
    syncBatchCopyActions(backdrop, loaded.ordered);
  }
  backdrop.querySelectorAll(".lab-batch-copy-cb").forEach(function(cb) {
    cb.addEventListener("change", refreshPreview2);
  });
  backdrop.querySelector("#lab-batch-copy-none").onclick = function() {
    backdrop.querySelectorAll(".lab-batch-copy-cb").forEach(function(cb) {
      cb.checked = false;
    });
    refreshPreview2();
  };
  backdrop.querySelector("#lab-batch-copy-all").onclick = function() {
    backdrop.querySelectorAll(".lab-batch-copy-cb").forEach(function(cb) {
      cb.checked = true;
    });
    refreshPreview2();
  };
  backdrop.querySelector("#lab-batch-copy-cancel").onclick = function() {
    closeBatchCopyModal(backdrop);
  };
  backdrop.addEventListener("click", function(e) {
    if (e.target === backdrop) closeBatchCopyModal(backdrop);
  });
  backdrop.querySelector("#lab-batch-copy-ok").onclick = async function() {
    var keys = selectedDayKeysFromBackdrop(backdrop);
    if (!keys.length) {
      rt.showToast("Selecciona al menos un d\xEDa", "error");
      return;
    }
    var text = buildEstudiosCopyLinesFromLabSets(loaded.ordered, { onlyDayKeys: keys }).join("\n");
    if (!text.trim()) {
      rt.showToast("No hay texto para copiar en los d\xEDas elegidos", "error");
      return;
    }
    var ok = await rt.copyToClipboardSafe(text);
    rt.showToast(
      ok ? "Copiados " + keys.length + " d\xEDa" + (keys.length === 1 ? "" : "s") + " al portapapeles \u2713" : "Error al copiar al portapapeles",
      ok ? "success" : "error"
    );
    if (ok) closeBatchCopyModal(backdrop);
  };
  refreshPreview2();
}
var windowHandlers17 = {
  openLabHistoryBatchCopyModal
};

// lib/drive-import/normalize.mjs
function normalizeDrivePaste(text) {
  return String(text == null ? "" : text).replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// lib/drive-import/segment.mjs
var DATE_ONLY_RE = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\s*$/;
var MONITOREO_RE = /^(N|V|HD|HI|NM)\s*:/i;
var SECTION_MARKERS = [
  { key: "eventualidades", re: /^EVENTUALIDADES(\s+EN ESTE INTERNAMIENTO)?\s*$/i },
  { key: "estadoActual", re: /^ESTADO ACTUAL\b/i, exclusive: true },
  { key: "historiaClinica", re: /^HISTORIA\s+CL[IÍ]NICA\s*:?\s*$/i },
  { key: "ficha", re: /^FICHA\s+DE\s+IDENTIFICACI[ÓO]N\s*:?\s*$/i },
  { key: "interrogatorio", re: /^INTERROGATORIO\s*:?\s*$/i },
  { key: "dx", re: /^(?:DX|IDX|SUGERENCIAS\s+DIAGN[ÓO]STIC[AO]S?)\s*:?\s*$/i },
  { key: "motivoConsulta", re: /^MOTIVO\s+DE\s+CONSULTA\s*:?\s*$/i },
  { key: "signosVitales", re: /^SIGNOS\s+VITALES(\s+DE\s+TRIAGE)?\s*:?\s*$/i },
  { key: "fechaIngreso", re: /^FECHA\s+DE\s+INGRESO\b/i },
  { key: "ahf", re: /^(?:ANTECEDENTES\s+HEREDOFAMILIARES|AHF)\s*:?\s*$/i },
  {
    key: "apnp",
    re: /^(?:ANTECEDENTES\s+PERSONALES(?:\s+NO\s+PATOL[ÓO]GICOS)?|ANTECEDENTES\s+SEXUALES|AGO|APNP)\s*:?\s*$/i
  },
  { key: "app", re: /^(?:ANTECEDENTES\s+PERSONALES\s+PATOL[ÓO]GICOS|APP)\s*:?\s*$/i },
  { key: "ecd", re: /^ENFERMEDADES\s+CR[ÓO]NICO-?DEGENERATIVAS\s*:?\s*$/i },
  { key: "medicamentos", re: /^MEDICAMENTOS(\s+ACTUALES|\s+HABITUALES)?\s*:?\s*$/i },
  {
    key: "peea",
    re: /^(?:PADECIMIENTO\s+ACTUAL\s*\/\s*PEEA|PEEA|PRINCIPIO\s+EVOLUCI[ÓO]N\s+Y\s+ESTADO\s+ACTUAL)\s*:?\s*$/i
  },
  { key: "pendientes", re: /^PENDIENTES\s*:?\s*$/i },
  { key: "laboratorios", re: /^LABORATORIOS(?:\s+DE\s+INGRESO)?\s*:?\s*$/i },
  { key: "efUx", re: /^EF\s+UX\s*:?\s*$/i },
  { key: "ipas", re: /^IPAS\b/i },
  { key: "cateteres", re: /^CAT[EÉ]TERES\s+Y\s+SONDAS\s*:?\s*$/i },
  { key: "antibioticos", re: /^ANTIBI[ÓO]TICOS\s*:?\s*$/i },
  { key: "cultivos", re: /^CULTIVOS\s*:?\s*$/i },
  { key: "estudiosImagen", re: /^ESTUDIOS\s+DE\s+IMAGEN\s*:?\s*$/i }
];
var INLINE_SECTIONS = [
  { key: "motivoConsulta", re: /^MOTIVO\s+DE\s+CONSULTA\s*:\s*(.+)$/i },
  { key: "signosVitales", re: /^SIGNOS\s+VITALES(?:\s+DE\s+TRIAGE)?\s*:\s*(.+)$/i }
];
function matchInlineSection(line) {
  const t = line.trim();
  for (const m of INLINE_SECTIONS) {
    const hit = m.re.exec(t);
    if (hit) return { key: m.key, body: hit[1].trim() };
  }
  return null;
}
function matchSectionHeader(line) {
  const t = line.trim();
  if (!t) return null;
  for (const m of SECTION_MARKERS) {
    if (m.re.test(t)) return { key: m.key, exclusive: m.exclusive };
  }
  return null;
}
function splitDocumentSections(rawText) {
  const text = normalizeDrivePaste(rawText);
  const lines = text.split("\n");
  const sections = {};
  const eventualidadesBlocks = [];
  const warnings = [];
  const headerLines = [];
  let currentKey = "_preamble";
  let currentLines = [];
  let inEstadoActual = false;
  let inEventualidades = false;
  let evBuffer = [];
  function flushSection() {
    const body = currentLines.join("\n").trim();
    if (currentKey === "_preamble") {
      if (body) headerLines.push(...body.split("\n"));
    } else if (currentKey === "eventualidades") {
      if (body) evBuffer.push(body);
    } else if (!inEstadoActual && body) {
      sections[currentKey] = sections[currentKey] ? sections[currentKey] + "\n\n" + body : body;
    }
    currentLines = [];
  }
  function flushEventualidadesBlock() {
    const joined = evBuffer.filter(Boolean).join("\n\n").trim();
    if (joined) eventualidadesBlocks.push(joined);
    evBuffer = [];
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (inEstadoActual && DATE_ONLY_RE.test(trimmed) && !MONITOREO_RE.test(trimmed)) {
      inEstadoActual = false;
      inEventualidades = true;
      currentKey = "eventualidades";
      currentLines = [line];
      continue;
    }
    const inline = matchInlineSection(line);
    if (inline) {
      flushSection();
      if (inEstadoActual) inEstadoActual = false;
      if (inEventualidades) {
        flushEventualidadesBlock();
        inEventualidades = false;
      }
      sections[inline.key] = inline.body;
      currentKey = "_inline";
      currentLines = [];
      continue;
    }
    const hit = matchSectionHeader(line);
    if (hit) {
      flushSection();
      if (hit.key === "estadoActual") {
        if (inEventualidades) {
          flushEventualidadesBlock();
          inEventualidades = false;
        }
        inEstadoActual = true;
        currentKey = "estadoActual";
        warnings.push("ESTADO ACTUAL detectado: no se importar\xE1 en v1.");
        continue;
      }
      if (inEstadoActual && hit.key !== "estadoActual") {
        inEstadoActual = false;
      }
      if (hit.key === "eventualidades") {
        if (inEventualidades) flushEventualidadesBlock();
        inEventualidades = true;
        inEstadoActual = false;
        currentKey = "eventualidades";
        continue;
      }
      if (inEventualidades && hit.key !== "eventualidades") {
        flushEventualidadesBlock();
        inEventualidades = false;
      }
      currentKey = hit.key;
      continue;
    }
    if (inEstadoActual) continue;
    currentLines.push(line);
  }
  flushSection();
  if (inEventualidades) flushEventualidadesBlock();
  else if (evBuffer.some(Boolean)) flushEventualidadesBlock();
  return { headerLines, sections, eventualidadesBlocks, warnings };
}

// lib/drive-import/parse-header.mjs
var PIPE_SEP = "\\|+";
var PIPE_WITH_CAMA_RE = new RegExp(
  `^(\\d+(?:-\\d+)?)\\s*${PIPE_SEP}\\s*(.+?)\\s*${PIPE_SEP}\\s*(\\d+)\\s*(?:A\xD1OS)?\\s*${PIPE_SEP}\\s*([\\d-]+)\\s*${PIPE_SEP}\\s*(.+)$`,
  "i"
);
var PIPE_NAME_FIRST_RE = new RegExp(
  `^(.+?)\\s*${PIPE_SEP}\\s*(\\d+)\\s*(?:A\xD1OS)?\\s*${PIPE_SEP}\\s*([\\d-]+)\\s*${PIPE_SEP}\\s*(.+)$`,
  "i"
);
var FICHA_KV_RE = /^([A-ZÁÉÍÓÚÑ\s]+)\s*:\s*(.+)$/i;
function parsePipeLine(line) {
  const t = String(line || "").trim();
  if (!t.includes("|")) return null;
  const withCama = PIPE_WITH_CAMA_RE.exec(t);
  if (withCama) {
    return {
      cama: withCama[1].trim(),
      nombre: withCama[2].trim(),
      edad: withCama[3].trim(),
      registro: withCama[4].trim(),
      resumenDx: withCama[5].trim()
    };
  }
  const nameFirst = PIPE_NAME_FIRST_RE.exec(t);
  if (nameFirst && !/^\d+(?:-\d+)?$/.test(nameFirst[1].trim())) {
    return {
      cama: "",
      nombre: nameFirst[1].trim(),
      edad: nameFirst[2].trim(),
      registro: nameFirst[3].trim(),
      resumenDx: nameFirst[4].trim()
    };
  }
  return null;
}
function parsePipeHeader(firstLines) {
  const lines = Array.isArray(firstLines) ? firstLines : String(firstLines || "").split("\n");
  for (const raw of lines.slice(0, 12)) {
    const line = String(raw || "").trim();
    if (!line) continue;
    const parsed = parsePipeLine(line);
    if (parsed) return parsed;
  }
  return null;
}
function parseFichaIdentificacion(block) {
  const identificacion = {};
  let sexo = "";
  const lines = String(block || "").split("\n");
  const keyMap = {
    NOMBRE: "nombre",
    EDAD: "edad",
    SEXO: "sexo",
    REGISTRO: "registro",
    ORIGEN: "lugarNacimiento",
    "LUGAR DE NACIMIENTO": "lugarNacimiento",
    "FECHA DE NACIMIENTO": "fechaNacimiento",
    RESIDENCIA: "residencia",
    OCUPACI\u00D3N: "ocupacionActual",
    OCUPACION: "ocupacionActual",
    "OCUPACI\xD3N ACTUAL": "ocupacionActual",
    "OCUPACION ACTUAL": "ocupacionActual",
    "OCUPACI\xD3N ANTERIOR": "ocupacionAnterior",
    "OCUPACION ANTERIOR": "ocupacionAnterior",
    ESCOLARIDAD: "escolaridad",
    "ESTADO CIVIL": "estadoCivil",
    RELIGI\u00D3N: "religion",
    RELIGION: "religion",
    RESPONSABLE: "informante",
    "TEL\xC9FONO FAMILIAR": "telefonoFamiliar",
    "TELEFONO FAMILIAR": "telefonoFamiliar"
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = FICHA_KV_RE.exec(line);
    if (!m) continue;
    const label = m[1].trim().toUpperCase();
    const value = m[2].trim();
    const field = keyMap[label];
    if (field) {
      identificacion[field] = value;
      if (field === "sexo") {
        if (/FEMENIN/i.test(value)) sexo = "F";
        else if (/MASCULIN/i.test(value)) sexo = "M";
      }
    }
  }
  if (identificacion.nombre && !identificacion.informante) {
    identificacion.informante = identificacion.nombre;
  }
  return { identificacion, sexo };
}
function mergeHeader(pipe, ficha) {
  const id = ficha.identificacion || {};
  const edadMatch = /(\d+)/.exec(String(id.edad || ""));
  return {
    cama: pipe?.cama || "",
    nombre: id.nombre || pipe?.nombre || "",
    edad: edadMatch ? edadMatch[1] : pipe?.edad || "",
    registro: id.registro || pipe?.registro || "",
    resumenDx: pipe?.resumenDx || "",
    sexo: ficha.sexo || "",
    identificacion: Object.assign({}, id)
  };
}

// lib/drive-import/hc-structured-extract.mjs
var NEGADO_RE = /^(?:INTERROGADO\s+Y\s+)?NEGAD/i;
var CONDITION_PATTERNS = {
  diabetes: [/\bDIABET(?:ES|IC[OA])\b/i, /\bDM\s*[12]\b/i, /\bDM2\b/i, /\bDM1\b/i],
  hipertension: [/\bHIPERTENS(?:I[ÓO]N|O)\b/i, /\bHTA\b/i, /\bHAS\b/i],
  enfermedadRenal: [
    /\bENFERMEDAD\s+RENAL\b/i,
    /\bERC\b/i,
    /\bIRC\b/i,
    /\bINSUFICIENCIA\s+RENAL\b/i,
    /\bNEFROPAT/i,
    /\bRI[ÑN]ON\s+POLIQU/i
  ],
  cardiopatia: [/\bCARDIOPAT/i, /\bINSUFICIENCIA\s+CARD[IÍ]ACA\b/i, /\bICC\b/i, /\bFEVI\b/i],
  enfermedadPulmonar: [/\bEPOC\b/i, /\bENFERMEDAD\s+PULMONAR\b/i],
  cancer: [/\bNEOPLASIA\b/i, /\bC[AÁ]NCER\b/i, /\bCA\s+DE\b/i, /\bTUMOR\b/i],
  vih: [/\bVIH\b/i, /\bSIDA\b/i, /\bHIV\b/i],
  tuberculosis: [/\bTUBERCULOSIS\b/i, /\bTBC\b/i],
  hepatitis: [/\bHEPATITIS\b/i],
  parotiditis: [/\bPAROTIDITIS\b/i],
  paperas: [/\bPAPERAS\b/i],
  sarampion: [/\bSARAMPI[ÓO]N\b/i],
  varicela: [/\bVARICELA\b/i],
  rubeola: [/\bRUB[ÉE]OLA\b/i],
  neoplasia: [/\bNEOPLASIA\b/i],
  epilepsia: [/\bEPILEPS/i, /\bCONVULS/i],
  psiquiatrico: [/\bPSIQUIATR/i, /\bDEPRESI[ÓO]N\b/i, /\bESQUIZOFREN/i],
  tiroideo: [/\bTIROIDE/i, /\bHIPOTIRO/i, /\bHIPERTIRO/i]
};
var APP_SUBSECTION_HEADERS = [
  { key: "ecd", re: /^ENFERMEDADES\s+CR[ÓO]NICO-?DEGENERATIVAS\s*:?\s*(.*)$/i },
  { key: "medicamentos", re: /^MEDICAMENTOS(?:\s+ACTUALES|\s+HABITUALES)?\s*:?\s*(.*)$/i },
  { key: "transfusiones", re: /^TRANSFUSIONES\s*:?\s*(.*)$/i },
  { key: "hospitalizaciones", re: /^HOSPITALIZACIONES\s*:?\s*(.*)$/i },
  { key: "cirugias", re: /^CIRUG[ÍI]AS(?:\s+PREVIAS)?\s*:?\s*(.*)$/i },
  { key: "traumaticos", re: /^(?:TRAUMATISMOS?|FRACTURAS?)\s*:?\s*(.*)$/i },
  { key: "inmunizaciones", re: /^INMUNIZACIONES\s*:?\s*(.*)$/i },
  { key: "alergias", re: /^ALERGIAS(?:\s+MEDICAMENTOSAS)?\s*:?\s*(.*)$/i },
  { key: "enfermedades", re: /^ENFERMEDADES\s*:?\s*(.*)$/i }
];
function isNegatedDriveText(text) {
  const t = String(text || "").trim();
  if (!t) return true;
  return NEGADO_RE.test(t);
}
function parseAppSubsections(text) {
  const out = {};
  const lines = String(text || "").split("\n");
  let currentKey = "_body";
  let currentLines = [];
  function flush() {
    const body = currentLines.join("\n").trim();
    if (body) out[currentKey] = out[currentKey] ? out[currentKey] + "\n" + body : body;
    currentLines = [];
  }
  for (const raw of lines) {
    const line = raw.trim();
    let matched = false;
    for (const header of APP_SUBSECTION_HEADERS) {
      const hit = header.re.exec(line);
      if (hit) {
        flush();
        currentKey = header.key;
        matched = true;
        if (hit[1] && hit[1].trim()) currentLines.push(hit[1].trim());
        break;
      }
    }
    if (!matched) currentLines.push(raw);
  }
  flush();
  return out;
}
function matchCatalogConditions(text, catalog) {
  const hay = String(text || "");
  if (!hay.trim() || isNegatedDriveText(hay)) return [];
  const hits = [];
  const seen = /* @__PURE__ */ new Set();
  Object.keys(catalog || {}).forEach(function(id) {
    if (APP_DEDICATED_IDS.has(id)) return;
    if (id === "otro") return;
    const label = catalog[id];
    const patterns = CONDITION_PATTERNS[id] || [];
    const labelRe = new RegExp("\\b" + String(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
    const matched = patterns.some(function(re) {
      return re.test(hay);
    }) || labelRe.test(hay);
    if (matched && !seen.has(id)) {
      seen.add(id);
      hits.push({ id, label });
    }
  });
  return hits;
}
function parseMedicamentosList(text) {
  const t = String(text || "").trim();
  if (!t || isNegatedDriveText(t)) return [];
  return t.split(/\s*,\s*(?=[A-ZÁÉÍÓÚÑ0-9])/).map(function(chunk) {
    return chunk.trim();
  }).filter(Boolean).map(function(med, idx) {
    return {
      id: "drv_med_" + idx,
      medication: med,
      route: "",
      dosage: "",
      frequency: ""
    };
  });
}
function matchToxicomaniasSubstances(text) {
  const hay = String(text || "");
  if (!hay.trim() || isNegatedDriveText(hay)) return [];
  const hits = [];
  Object.keys(toxicomanias_substances_default).forEach(function(id) {
    const label = toxicomanias_substances_default[id];
    const tokens = String(label).split(/\s*[\/(]/).map(function(part) {
      return part.trim();
    }).filter(function(part) {
      return part.length >= 4;
    });
    const matched = tokens.some(function(token) {
      return new RegExp("\\b" + token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(hay);
    });
    if (matched) hits.push({ id, label });
  });
  return hits;
}
var AHF_RELATIVE_LABEL_MAP = Object.fromEntries(
  AHF_RELATIVES.map(function(rel) {
    return [rel.label.toUpperCase(), rel.id];
  }).concat([
    ["ABUELA", "abuela_materna"],
    ["ABUELO", "abuelo_materno"]
  ])
);
function parseAhfRelativeLines(text) {
  const entries = [];
  String(text || "").split("\n").forEach(function(raw, lineIdx) {
    const line = raw.trim();
    const m = /^([A-ZÁÉÍÓÚÑ\s]+)\s*[:;]\s*(.+)$/i.exec(line);
    if (!m) return;
    const label = m[1].trim().toUpperCase();
    const value = m[2].trim();
    const relativeId = AHF_RELATIVE_LABEL_MAP[label];
    if (!relativeId || !value || isNegatedDriveText(value)) return;
    const vitalStatus = /FINAD|FALLECID|FALLEC/i.test(value) ? "fallecido" : /\bVIV[OA]\b|\bSANO\b/i.test(value) ? "vivo" : "desconocido";
    const conditions = matchCatalogConditions(value, ahf_conditions_default);
    if (conditions.length) {
      conditions.forEach(function(cond) {
        entries.push({
          id: "drv_ahf_" + lineIdx + "_" + relativeId + "_" + cond.id,
          conditionId: cond.id,
          relativeId,
          diagnosis: value,
          treatment: "",
          vitalStatus
        });
      });
      return;
    }
    entries.push({
      id: "drv_ahf_" + lineIdx + "_" + relativeId + "_otro",
      conditionId: "otro",
      relativeId,
      diagnosis: value,
      treatment: "",
      vitalStatus
    });
  });
  return entries;
}
function isNegatedSubsectionBody(body) {
  const t = String(body || "").trim();
  if (!t) return true;
  if (isNegatedDriveText(t)) return true;
  const inline = /^[^:]+:\s*(.+)$/i.exec(t);
  if (inline) return isNegatedDriveText(inline[1].trim());
  return false;
}
function appSubsectionShouldStrip(key, body, suggestions) {
  if (!body || !String(body).trim()) return false;
  if (isNegatedSubsectionBody(body)) return true;
  const accepted = (suggestions || []).filter(function(s) {
    return s.include !== false;
  });
  if (key === "medicamentos") {
    return accepted.some(function(s) {
      return s.target === "app.medicamentosActuales";
    });
  }
  if (key === "alergias") {
    return accepted.some(function(s) {
      return s.target === "app.alergiasNegado" || s.target === "app.alergiaMedicamentos";
    });
  }
  if (key === "inmunizaciones") {
    return accepted.some(function(s) {
      return s.target === "app.inmunizaciones";
    });
  }
  if (key === "transfusiones") {
    return accepted.some(function(s) {
      return s.target === "app.transfusionesEntries";
    });
  }
  if (key === "hospitalizaciones") {
    return accepted.some(function(s) {
      return s.target === "app.hospitalizaciones";
    });
  }
  if (key === "cirugias") {
    return accepted.some(function(s) {
      return s.target === "app.cirugias";
    });
  }
  if (key === "traumaticos") {
    return accepted.some(function(s) {
      return s.target === "app.traumaticosEntries";
    });
  }
  if (key === "ecd" || key === "enfermedades") {
    return accepted.some(function(s) {
      return s.target === "app.conditions";
    });
  }
  return false;
}
function stripIntegratedAppDescription(text, suggestions) {
  const lines = String(text || "").split("\n");
  const kept = [];
  let currentKey = "_body";
  let buffer = [];
  function flush() {
    const body = buffer.join("\n").trim();
    if (!body) {
      buffer = [];
      return;
    }
    if (currentKey === "_body") {
      let remainder = body;
      if ((suggestions || []).some(function(s) {
        return s.include !== false && s.target === "app.conditions";
      })) {
        const condHits = matchCatalogConditions(body, app_conditions_default);
        if (condHits.length && condHits.every(function(cond) {
          return (suggestions || []).some(function(s) {
            return s.include !== false && s.target === "app.conditions" && s.value === cond.id;
          });
        })) {
          remainder = "";
        }
      }
      if (remainder && !appSubsectionShouldStrip("_body", remainder, suggestions)) {
        kept.push(remainder);
      }
    } else if (!appSubsectionShouldStrip(currentKey, body, suggestions)) {
      kept.push(...buffer);
    }
    buffer = [];
  }
  for (const raw of lines) {
    const line = raw.trim();
    let matched = false;
    for (const header of APP_SUBSECTION_HEADERS) {
      const hit = header.re.exec(line);
      if (hit) {
        flush();
        currentKey = header.key;
        matched = true;
        if (hit[1] && hit[1].trim()) buffer.push(raw);
        break;
      }
    }
    if (!matched) {
      if (currentKey === "_body" || buffer.length === 0) {
        buffer.push(raw);
      } else {
        flush();
        currentKey = "_body";
        buffer.push(raw);
      }
    }
  }
  flush();
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function stripIntegratedAhfDescription(text, suggestions) {
  const acceptedEntries = (suggestions || []).filter(function(s) {
    return s.include !== false && s.target === "ahf.entries";
  });
  return String(text || "").split("\n").filter(function(raw) {
    const line = raw.trim();
    if (!line) return true;
    const m = /^([A-ZÁÉÍÓÚÑ\s]+)\s*[:;]\s*(.+)$/i.exec(line);
    if (!m) return true;
    const label = m[1].trim().toUpperCase();
    const value = m[2].trim();
    if (!AHF_RELATIVE_LABEL_MAP[label]) return true;
    if (isNegatedDriveText(value)) return false;
    if (!acceptedEntries.length) return true;
    const relativeId = AHF_RELATIVE_LABEL_MAP[label];
    return !acceptedEntries.some(function(s) {
      const row = (
        /** @type {{ relativeId?: string, diagnosis?: string }} */
        s.value || {}
      );
      return row.relativeId === relativeId && String(row.diagnosis || "").toUpperCase() === value.toUpperCase();
    });
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function buildHcStructuredSuggestions(sectionKey, text, sections) {
  sections = sections || {};
  const suggestions = [];
  const key = String(sectionKey || "");
  if (key === "app" || key === "ecd" || key === "medicamentos") {
    const subs = parseAppSubsections(text);
    const diseaseText = [subs.ecd, subs.enfermedades, subs._body, text].filter(Boolean).join("\n");
    matchCatalogConditions(diseaseText, app_conditions_default).forEach(function(cond) {
      suggestions.push({
        id: "app_cond_" + cond.id,
        label: cond.label,
        target: "app.conditions",
        include: true,
        value: cond.id,
        sourceText: cond.label
      });
    });
    const medText = subs.medicamentos || (key === "medicamentos" ? text : "");
    parseMedicamentosList(medText).forEach(function(med, idx) {
      suggestions.push({
        id: "app_med_" + idx,
        label: "Medicamento: " + med.medication,
        target: "app.medicamentosActuales",
        include: true,
        value: med,
        sourceText: med.medication
      });
    });
    const alergiasText = subs.alergias || "";
    if (alergiasText) {
      if (isNegatedDriveText(alergiasText)) {
        suggestions.push({
          id: "app_alergias_negado",
          label: "Sin alergias medicamentosas conocidas",
          target: "app.alergiasNegado",
          include: true,
          value: true,
          sourceText: alergiasText
        });
      } else {
        alergiasText.split(/\s*,\s*/).map(function(part) {
          return part.trim();
        }).filter(Boolean).forEach(function(med, idx) {
          suggestions.push({
            id: "app_alergia_" + idx,
            label: "Alergia: " + med,
            target: "app.alergiaMedicamentos",
            include: true,
            value: { id: "drv_al_" + idx, medication: med },
            sourceText: med
          });
        });
      }
    }
    const inmunText = subs.inmunizaciones || "";
    if (inmunText && !isNegatedDriveText(inmunText)) {
      suggestions.push({
        id: "app_inmunizaciones",
        label: "Inmunizaciones: " + inmunText.slice(0, 72) + (inmunText.length > 72 ? "\u2026" : ""),
        target: "app.inmunizaciones",
        include: true,
        value: inmunText,
        sourceText: inmunText
      });
    }
    [
      { subKey: "transfusiones", target: "app.transfusionesEntries", prefix: "Transfusi\xF3n" },
      { subKey: "hospitalizaciones", target: "app.hospitalizaciones", prefix: "Hospitalizaci\xF3n" },
      { subKey: "cirugias", target: "app.cirugias", prefix: "Cirug\xEDa" },
      { subKey: "traumaticos", target: "app.traumaticosEntries", prefix: "Traumatismo" }
    ].forEach(function(spec) {
      const body = subs[spec.subKey] || "";
      if (!body || isNegatedDriveText(body)) return;
      suggestions.push({
        id: "app_" + spec.subKey,
        label: spec.prefix + ": " + body.slice(0, 72) + (body.length > 72 ? "\u2026" : ""),
        target: spec.target,
        include: true,
        value: body,
        sourceText: body
      });
    });
  }
  if (key === "apnp") {
    const lines = String(text || "").split("\n");
    lines.forEach(function(raw) {
      const line = raw.trim();
      const m = /^([A-ZÁÉÍÓÚÑ0-9\s]+)\s*[:;]\s*(.+)$/i.exec(line);
      if (!m) return;
      const label = m[1].trim().toUpperCase();
      const value = m[2].trim();
      if (label === "TABAQUISMO" && isNegatedDriveText(value)) {
        suggestions.push({
          id: "apnp_tabaquismo_negado",
          label: "Tabaquismo negado",
          target: "apnp.tabaquismoDetail",
          include: true,
          value: { status: "negado" },
          sourceText: value
        });
      }
      if ((label === "ETILISMO" || label === "ALCOHOLISMO") && isNegatedDriveText(value)) {
        suggestions.push({
          id: "apnp_alcoholismo_negado",
          label: "Alcoholismo negado",
          target: "apnp.alcoholismoDetail",
          include: true,
          value: { status: "negado" },
          sourceText: value
        });
      }
      if (label === "TOXICOMAN\xCDAS" || label === "TOXICOMANIAS") {
        if (isNegatedDriveText(value)) return;
        matchToxicomaniasSubstances(value).forEach(function(sub) {
          suggestions.push({
            id: "apnp_tox_" + sub.id,
            label: "Toxicoman\xEDa: " + sub.label,
            target: "apnp.toxicomaniasEntries",
            include: true,
            value: {
              id: "drv_tox_" + sub.id,
              substanceId: sub.id,
              customLabel: "",
              frequency: "",
              years: ""
            },
            sourceText: sub.label
          });
        });
      }
    });
  }
  if (key === "ahf") {
    parseAhfRelativeLines(text).forEach(function(entry) {
      const relLabel = (AHF_RELATIVES.find(function(r) {
        return r.id === entry.relativeId;
      }) || {}).label || entry.relativeId;
      suggestions.push({
        id: entry.id,
        label: relLabel + ": " + String(entry.diagnosis || "").slice(0, 64),
        target: "ahf.entries",
        include: true,
        value: entry,
        sourceText: entry.diagnosis
      });
    });
    matchCatalogConditions(text, ahf_conditions_default).forEach(function(cond) {
      if (suggestions.some(function(s) {
        return s.target === "ahf.entries" && s.value && s.value.conditionId === cond.id;
      })) {
        return;
      }
      suggestions.push({
        id: "ahf_cond_" + cond.id,
        label: "Antecedente familiar: " + cond.label,
        target: "ahf.conditions",
        include: true,
        value: cond.id,
        sourceText: cond.label
      });
    });
  }
  if (key === "ecd" && !suggestions.length) {
    matchCatalogConditions(text, app_conditions_default).forEach(function(cond) {
      suggestions.push({
        id: "app_cond_" + cond.id,
        label: cond.label,
        target: "app.conditions",
        include: true,
        value: cond.id,
        sourceText: cond.label
      });
    });
  }
  if (key === "medicamentos" && !suggestions.some(function(s) {
    return s.target === "app.medicamentosActuales";
  })) {
    parseMedicamentosList(text).forEach(function(med, idx) {
      suggestions.push({
        id: "app_med_" + idx,
        label: "Medicamento: " + med.medication,
        target: "app.medicamentosActuales",
        include: true,
        value: med,
        sourceText: med.medication
      });
    });
  }
  return suggestions;
}
function applyStructuredSuggestionsToHcPatch(hcPatch, suggestions) {
  const accepted = (suggestions || []).filter(function(s) {
    return s.include !== false;
  });
  const out = Object.assign({}, hcPatch || {});
  accepted.forEach(function(s) {
    const parts = String(s.target || "").split(".");
    if (parts.length !== 2) return;
    const section = parts[0];
    const field = parts[1];
    if (!out[section] || typeof out[section] !== "object") {
      out[section] = {};
    }
    const block = (
      /** @type {Record<string, unknown>} */
      Object.assign({}, out[section])
    );
    if (field === "conditions") {
      const list = Array.isArray(block.conditions) ? block.conditions.slice() : [];
      const id = String(s.value);
      if (id && list.indexOf(id) < 0) list.push(id);
      block.conditions = list;
    } else if (field === "medicamentosActuales") {
      const list = Array.isArray(block.medicamentosActuales) ? block.medicamentosActuales.slice() : [];
      const med = (
        /** @type {{ medication?: string }} */
        s.value
      );
      if (med && med.medication && !list.some(function(row) {
        return String(row.medication || "").toUpperCase() === String(med.medication).toUpperCase();
      })) {
        list.push(s.value);
      }
      block.medicamentosActuales = list;
    } else if (field === "alergiasNegado") {
      block.alergiasNegado = !!s.value;
      if (block.alergiasNegado) block.alergiaMedicamentos = [];
    } else if (field === "alergiaMedicamentos") {
      block.alergiasNegado = false;
      const list = Array.isArray(block.alergiaMedicamentos) ? block.alergiaMedicamentos.slice() : [];
      const row = (
        /** @type {{ medication?: string }} */
        s.value
      );
      if (row && row.medication) list.push(s.value);
      block.alergiaMedicamentos = list;
    } else if (field === "inmunizaciones") {
      if (!String(block.inmunizaciones || "").trim()) block.inmunizaciones = String(s.value || "").trim();
    } else if (field === "transfusionesEntries") {
      const list = Array.isArray(block.transfusionesEntries) ? block.transfusionesEntries.slice() : [];
      list.push({
        id: "drv_tf_" + list.length,
        units: "",
        adverseReactions: String(s.value || "").trim(),
        date: null
      });
      block.transfusionesEntries = list;
    } else if (field === "hospitalizaciones") {
      const list = Array.isArray(block.hospitalizaciones) ? block.hospitalizaciones.slice() : [];
      list.push({
        reason: String(s.value || "").trim(),
        duration: "",
        complications: "",
        date: null
      });
      block.hospitalizaciones = list;
    } else if (field === "cirugias") {
      const list = Array.isArray(block.cirugias) ? block.cirugias.slice() : [];
      list.push({
        procedure: String(s.value || "").trim(),
        complications: "",
        date: null
      });
      block.cirugias = list;
    } else if (field === "traumaticosEntries") {
      const list = Array.isArray(block.traumaticosEntries) ? block.traumaticosEntries.slice() : [];
      list.push({
        id: "drv_tr_" + list.length,
        description: String(s.value || "").trim(),
        date: null
      });
      block.traumaticosEntries = list;
    } else if (field === "tabaquismoDetail") {
      block.tabaquismoDetail = Object.assign({}, block.tabaquismoDetail || {}, s.value || {});
      block.tabaquismo = HC_INTERROGADO_NEGADO;
    } else if (field === "alcoholismoDetail") {
      block.alcoholismoDetail = Object.assign({}, block.alcoholismoDetail || {}, s.value || {});
      block.alcoholismo = HC_INTERROGADO_NEGADO;
    } else if (field === "toxicomaniasEntries") {
      const list = Array.isArray(block.toxicomaniasEntries) ? block.toxicomaniasEntries.slice() : [];
      const row = (
        /** @type {{ substanceId?: string }} */
        s.value
      );
      if (row && row.substanceId && !list.some(function(entry) {
        return entry && entry.substanceId === row.substanceId;
      })) {
        list.push(s.value);
      }
      block.toxicomaniasEntries = list;
    } else if (field === "entries") {
      const list = Array.isArray(block.entries) ? block.entries.slice() : [];
      const row = (
        /** @type {{ id?: string, relativeId?: string, conditionId?: string }} */
        s.value
      );
      if (row && row.relativeId && row.conditionId && !list.some(function(entry) {
        return entry && entry.relativeId === row.relativeId && entry.conditionId === row.conditionId && String(entry.diagnosis || "").toUpperCase() === String(row.diagnosis || "").toUpperCase();
      })) {
        list.push(s.value);
      }
      block.entries = list;
    }
    out[section] = block;
  });
  if (out.app && typeof out.app === "object") {
    const app = (
      /** @type {Record<string, unknown>} */
      Object.assign({}, out.app)
    );
    if (typeof app.descripcionDetallada === "string") {
      app.descripcionDetallada = stripIntegratedAppDescription(app.descripcionDetallada, accepted);
    }
    out.app = app;
  }
  if (out.ahf && typeof out.ahf === "object") {
    const ahf = (
      /** @type {Record<string, unknown>} */
      syncAhfConditionsFromEntries(Object.assign({}, out.ahf))
    );
    if (typeof ahf.descripcionDetallada === "string") {
      ahf.descripcionDetallada = stripIntegratedAhfDescription(ahf.descripcionDetallada, accepted);
    }
    out.ahf = ahf;
  }
  return out;
}
var STRUCTURED_SECTION_KEYS = ["app", "apnp", "ahf", "ecd", "medicamentos"];
function collectStructuredSuggestionsFromDriveSections(sections) {
  const all = [];
  STRUCTURED_SECTION_KEYS.forEach(function(key) {
    const text = String((sections || {})[key] || "").trim();
    if (!text) return;
    buildHcStructuredSuggestions(key, text, sections).forEach(function(s) {
      all.push(s);
    });
  });
  return all;
}
function enrichHcPatchWithStructuredSuggestions(hcPatch, sections) {
  const suggestions = collectStructuredSuggestionsFromDriveSections(sections || {});
  if (!suggestions.length) return hcPatch || {};
  return applyStructuredSuggestionsToHcPatch(hcPatch || {}, suggestions);
}

// lib/drive-import/hc-field-parsers.mjs
var KV_RE = /^([A-ZÁÉÍÓÚÑ0-9\s]+)\s*[:;]\s*(.+)$/i;
function parseKeyValueBlock(block) {
  const out = {};
  const keyMap = {
    ORIGEN: "lugarNacimiento",
    RESIDENCIA: "residencia",
    "ESTADO CIVIL": "estadoCivil",
    RELIGI\u00D3N: "religion",
    RELIGION: "religion",
    ESCOLARIDAD: "escolaridad",
    OCUPACI\u00D3N: "ocupacionActual",
    OCUPACION: "ocupacionActual"
  };
  for (const raw of String(block || "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = KV_RE.exec(line);
    if (!m) continue;
    const label = m[1].trim().toUpperCase();
    const value = m[2].trim();
    const field = keyMap[label] || label.toLowerCase().replace(/\s+/g, "_");
    out[field] = value;
  }
  return out;
}
function parseApnpLines(block) {
  const apnp = {};
  const map = {
    TABAQUISMO: "tabaquismo",
    ETILISMO: "alcoholismo",
    TOXICOMAN\u00CDAS: "toxicomanias",
    TOXICOMANIAS: "toxicomanias",
    "TATUAJES/PERFORACIONES": "tatuajes",
    TATUAJES: "tatuajes",
    ZOONOSIS: "deportesPasatiemposMascotas",
    COMBE: "dieta",
    BIOMASA: "dieta",
    "VIAJES RECIENTES": "dieta",
    HERBOLARIA: "dieta"
  };
  for (const raw of String(block || "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = KV_RE.exec(line);
    if (!m) continue;
    const label = m[1].trim().toUpperCase();
    const field = map[label];
    if (field) apnp[field] = m[2].trim();
  }
  return apnp;
}
function buildAppFromSections(sections) {
  const parts = [
    sections.ecd,
    sections.medicamentos,
    sections.quirurgicos,
    sections.internamientos,
    sections.app
  ].filter(Boolean);
  const descripcionDetallada = parts.join("\n\n").trim();
  const subs = parseAppSubsections(descripcionDetallada);
  const alergiasText = subs.alergias || "";
  const inmunText = subs.inmunizaciones || "";
  return {
    conditions: [],
    customConditions: [],
    conditionDetails: {},
    cirugias: [],
    hospitalizaciones: [],
    alergiasNegado: alergiasText ? isNegatedDriveText(alergiasText) : false,
    alergiaMedicamentos: [],
    traumaticosEntries: [],
    transfusionesEntries: [],
    descripcionDetallada,
    medicamentosActuales: [],
    inmunizaciones: inmunText && !isNegatedDriveText(inmunText) ? inmunText : ""
  };
}

// lib/drive-import/filter-ficha-patient-fields.mjs
var IDENTIFICACION_PATIENT_TAB_FIELDS = /* @__PURE__ */ new Set([
  "registro",
  "dx",
  "diagnosticos",
  "nombre",
  "edad",
  "cama",
  "sexo"
]);
var FICHA_PATIENT_LINE_RES = [
  /^REGISTRO\s*[:;]/i,
  /^(?:DX|IDX|DIAGN[ÓO]STICOS?|DIAGNOSTICOS?)\s*[:;]/i,
  /^NOMBRE\s*[:;]/i,
  /^EDAD\s*[:;]/i,
  /^CAMA\s*[:;]/i,
  /^SEXO\s*[:;]/i
];
function filterFichaDriveText(text) {
  return String(text || "").split("\n").filter(function(line) {
    const t = line.trim();
    if (!t) return true;
    return !FICHA_PATIENT_LINE_RES.some(function(re) {
      return re.test(t);
    });
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
function filterIdentificacionForHcImport(identificacion) {
  const out = {};
  Object.entries(identificacion || {}).forEach(function(entry) {
    const key = entry[0];
    const value = entry[1];
    if (IDENTIFICACION_PATIENT_TAB_FIELDS.has(key)) return;
    if (value != null && String(value).trim()) out[key] = String(value).trim();
  });
  return out;
}

// lib/drive-import/profiles/drive-ficha-hc-v1.mjs
function mapHc(doc) {
  const sections = doc.sections || {};
  const ficha = parseFichaIdentificacion(sections.ficha || "");
  const apnp = parseApnpLines(sections.apnp || "");
  const app = buildAppFromSections(sections);
  const peeaParts = [sections.peea, sections.efUx, sections.pendientes].filter(Boolean);
  const padecimientoActual = peeaParts.join("\n\n").trim();
  return {
    identificacion: filterIdentificacionForHcImport(ficha.identificacion),
    motivoConsulta: (sections.motivoConsulta || "").trim(),
    signosVitalesIngreso: (sections.signosVitales || "").trim(),
    apnp,
    ahf: {
      conditions: [],
      customConditions: [],
      entries: [],
      descripcionDetallada: (sections.ahf || "").trim()
    },
    app,
    padecimientoActual,
    _sexo: ficha.sexo
  };
}

// lib/drive-import/profiles/drive-pipe-hc-v1.mjs
function mapHc2(doc) {
  const sections = doc.sections || {};
  const identificacion = filterIdentificacionForHcImport(parseKeyValueBlock(sections.historiaClinica || ""));
  const apnp = parseApnpLines(sections.apnp || "");
  const ahfText = (sections.ahf || "").trim();
  const app = buildAppFromSections(sections);
  if (sections.ecd && !app.descripcionDetallada.includes(sections.ecd)) {
    app.descripcionDetallada = [sections.ecd, app.descripcionDetallada].filter(Boolean).join("\n\n");
  }
  return {
    identificacion,
    motivoConsulta: (sections.motivoConsulta || "").trim(),
    signosVitalesIngreso: (sections.signosVitales || "").trim(),
    apnp,
    ahf: {
      conditions: [],
      customConditions: [],
      entries: [],
      descripcionDetallada: ahfText
    },
    app,
    padecimientoActual: (sections.peea || "").trim()
  };
}

// lib/drive-import/map-universal-hc.mjs
var HC_SECTION_KEYS = [
  "ficha",
  "historiaClinica",
  "peea",
  "app",
  "apnp",
  "ahf",
  "motivoConsulta",
  "signosVitales",
  "interrogatorio",
  "dx",
  "medicamentos",
  "ecd",
  "fechaIngreso"
];
function hasDriveHcSections(sections) {
  return HC_SECTION_KEYS.some(function(k) {
    return sections[k] && String(sections[k]).trim();
  });
}
function textLength(value) {
  if (value == null) return 0;
  if (typeof value === "string") return String(value).trim().length;
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value).reduce(function(sum, v) {
      return sum + textLength(v);
    }, 0);
  }
  if (Array.isArray(value)) {
    return value.reduce(function(sum, v) {
      return sum + textLength(v);
    }, 0);
  }
  return 0;
}
function listHcPatchSectionKeys(patch) {
  return Object.keys(patch || {}).filter(function(k) {
    if (String(k).startsWith("_")) return false;
    return textLength(patch[k]) > 0;
  });
}
function mapUniversalHc(doc) {
  const sections = doc.sections || {};
  if (!hasDriveHcSections(sections)) return {};
  let patch = {};
  const useFicha = sections.ficha || sections.app || sections.apnp && sections.app !== void 0 || sections.peea && sections.ficha;
  const usePipe = sections.historiaClinica || sections.peea || sections.apnp || sections.ahf || sections.motivoConsulta || sections.signosVitales || sections.ecd;
  if (useFicha || sections.ficha) {
    patch = mergeHcPatch(patch, mapHc(doc), "fill");
  }
  if (usePipe || !useFicha) {
    patch = mergeHcPatch(patch, mapHc2(doc), "fill");
  }
  if (!listHcPatchSectionKeys(patch).length) {
    patch = mergeHcPatch(mapHc(doc), mapHc2(doc), "fill");
  }
  if (patch.identificacion && typeof patch.identificacion === "object") {
    patch.identificacion = filterIdentificacionForHcImport(
      /** @type {Record<string, unknown>} */
      patch.identificacion
    );
  }
  return patch;
}

// lib/drive-import/eventualidad-dates.mjs
function parseDateLine(line) {
  const t = String(line || "").trim();
  let m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/.exec(t);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2e3;
    return { day: Number(m[1]), month: Number(m[2]), year: y };
  }
  m = /^(\d{1,2})[\/.\-](\d{1,2})$/.exec(t);
  if (m) return { day: Number(m[1]), month: Number(m[2]) };
  return null;
}
function resolveYear(partial, hints) {
  if (partial.year != null && Number.isFinite(partial.year)) return partial.year;
  if (hints.referenceYear != null) return hints.referenceYear;
  const now = /* @__PURE__ */ new Date();
  let y = hints.documentYear != null ? hints.documentYear : now.getFullYear();
  if (partial.month > now.getMonth() + 1) y -= 1;
  return y;
}
function toNoonIso(parts) {
  const dt = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  return Number.isFinite(dt.getTime()) ? dt.toISOString() : (/* @__PURE__ */ new Date()).toISOString();
}
function inferDocumentYearFromText(text) {
  const m = /(?:FIUX|FECHA\s+DE\s+INGRESO)[^\d]*(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})/i.exec(text);
  if (m) return Number(m[3]);
  const years = [];
  const re = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/g;
  let hit;
  while ((hit = re.exec(text)) !== null) {
    years.push(Number(hit[3]));
  }
  return years.length ? Math.max(...years) : void 0;
}

// lib/drive-import/map-to-eventualidades.mjs
var DATE_ONLY_RE2 = /^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?\s*$/;
var MONITOREO_RE2 = /^(N|V|HD|HI|NM)\s*:/i;
function mapSectionsToEventualidades(input) {
  const blocks = input.eventualidadesBlocks || [];
  const hints = {
    referenceYear: input.referenceYear,
    documentYear: input.documentYear
  };
  const entries = [];
  const warnings = [];
  for (const block of blocks) {
    let flush = function() {
      const text = buf.map((l) => l.trim()).filter(Boolean).join("\n").trim();
      if (curDate && text) entries.push({ at: curDate, text });
      buf = [];
    };
    const lines = String(block || "").split("\n");
    let curDate = null;
    let buf = [];
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (MONITOREO_RE2.test(line)) continue;
      if (DATE_ONLY_RE2.test(line)) {
        const d = parseDateLine(line);
        if (d) {
          flush();
          const year = resolveYear(d, hints);
          curDate = toNoonIso({ day: d.day, month: d.month, year });
          continue;
        }
      }
      buf.push(line);
    }
    flush();
  }
  return { entries, warnings };
}

// lib/drive-import/parse-drive-labs.mjs
var PANEL_PREFIX_RE = /^(BH|QS|ES|ESC|PFH|PFHs|GV|GASES|COAG|PIE|LCR|EGO|CUANTORINA|PltCit|FROTIS)[\s\t]+/i;
var INFER_PANEL_RULES = [
  { panel: "BH", re: /^(?:Hb|Hto|VCM|HCM|Leu|Neu|Eos|Plt|RBC|Ret)\b/i },
  { panel: "QS", re: /^(?:Glu|Cr|BUN|eTFG|AU|TGL|COL|PCR)\b/i },
  { panel: "ESC", re: /^(?:Na|Cl|K|Ca|F|Mg)\b/i },
  { panel: "PFHs", re: /^(?:Alb|AST|ALT|FA|BT|BD|BI|LDH|Amil)\b/i },
  { panel: "GASES", re: /^(?:pH|pCO2|pO2|Lactato|Bica|HCO3|BE)\b/i },
  { panel: "COAG", re: /^(?:TP|TTP|INR|Fib|DD)\b/i }
];
var LAB_SECTION_STOP_RE = /^(EVENTUALIDADES|ESTADO ACTUAL|HISTORIA\s+CL[IÍ]NICA|PENDIENTES|DX\s*:|FICHA\s+DE\s+IDENTIFICACI[ÓO]N|MOTIVO\s+DE\s+CONSULTA)\b/i;
function normalizeDriveLabPanel(token) {
  const u = String(token || "").trim().toUpperCase();
  if (u === "ES" || u === "ESC") return "ESC";
  if (u === "PFH" || u === "PFHS") return "PFHs";
  if (u === "GV" || u === "GASES" || u === "GASE") return "GASES";
  if (u === "BH") return "BH";
  if (u === "QS") return "QS";
  return String(token || "").trim();
}
function isDriveLabDateLine(line) {
  return !!parseDateLine(line);
}
function isDriveLabPanelLine(line) {
  const t = String(line || "").trim();
  if (!t) return false;
  if (isDriveLabDateLine(t)) return false;
  if (PANEL_PREFIX_RE.test(t)) return true;
  return INFER_PANEL_RULES.some((r) => r.re.test(t));
}
function collapseLabWhitespace(content) {
  return String(content || "").replace(/\t/g, " ").replace(/\s+/g, " ").trim();
}
function driveLabPanelLineToResLab(line) {
  const collapsed = collapseLabWhitespace(line);
  if (!collapsed) return null;
  const prefixHit = PANEL_PREFIX_RE.exec(collapsed);
  if (prefixHit) {
    const panel = normalizeDriveLabPanel(prefixHit[1]);
    const rest = collapseLabWhitespace(collapsed.slice(prefixHit[0].length));
    if (!rest) return null;
    return panel + "	" + rest;
  }
  for (const rule of INFER_PANEL_RULES) {
    if (rule.re.test(collapsed)) {
      return rule.panel + "	" + collapsed;
    }
  }
  return null;
}
function formatDriveLabFecha(partial, documentYear) {
  const y = resolveYear(partial, { documentYear, referenceYear: documentYear });
  const dd = String(partial.day).padStart(2, "0");
  const mm = String(partial.month).padStart(2, "0");
  return dd + "/" + mm + "/" + y;
}
function parseDriveLaboratorios(body, opts) {
  opts = opts || {};
  const text = normalizeDrivePaste(body);
  const warnings = [];
  if (!text.trim()) return { sets: [], warnings };
  const documentYear = opts.documentYear != null ? opts.documentYear : inferDocumentYearFromText(text);
  const sets = [];
  let currentDate = "";
  let currentLines = [];
  let currentSource = [];
  function flushDay() {
    const resLabs = [];
    currentLines.forEach(function(ln) {
      const chunk = driveLabPanelLineToResLab(ln);
      if (chunk) resLabs.push(chunk);
    });
    if (!resLabs.length) {
      currentLines = [];
      currentSource = [];
      return;
    }
    if (!currentDate) {
      warnings.push("Bloque de laboratorio sin fecha reconocible; se omiti\xF3.");
      currentLines = [];
      currentSource = [];
      return;
    }
    sets.push({
      fecha: currentDate,
      hora: "",
      resLabs,
      sourceText: currentSource.join("\n").trim()
    });
    currentLines = [];
    currentSource = [];
  }
  text.split("\n").forEach(function(rawLine) {
    const line = rawLine.trim();
    if (!line) return;
    if (LAB_SECTION_STOP_RE.test(line)) return;
    const dateParts = parseDateLine(line);
    if (dateParts) {
      flushDay();
      currentDate = formatDriveLabFecha(dateParts, documentYear);
      currentSource = [line];
      return;
    }
    if (!isDriveLabPanelLine(line)) return;
    if (!currentDate) {
      warnings.push("L\xEDnea de laboratorio antes de la primera fecha: " + line.slice(0, 48));
      return;
    }
    currentLines.push(line);
    currentSource.push(line);
  });
  flushDay();
  return { sets, warnings };
}
function extractLaboratoriosBody(rawText, sectionBody) {
  const fromSection = String(sectionBody || "").trim();
  if (fromSection) return fromSection;
  const text = normalizeDrivePaste(rawText);
  const m = /\nLABORATORIOS(?:\s+DE\s+INGRESO)?\s*\n/i.exec("\n" + text);
  if (!m) return "";
  const after = text.slice(m.index + m[0].length - 1);
  const lines = after.split("\n");
  const out = [];
  for (const line of lines) {
    const t = line.trim();
    if (LAB_SECTION_STOP_RE.test(t)) break;
    out.push(line);
  }
  return out.join("\n").trim();
}

// lib/drive-import/merge-drive-labs.mjs
function normalizeFecha(fecha) {
  return String(fecha || "").trim();
}
function calendarDayKeyFromLabSet({ fecha, hora }) {
  const t = normalizeFecha(fecha);
  if (!t || t === "Anterior") return "";
  const m = t.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (!m) return t;
  let y = m[3] ? parseInt(m[3], 10) : (/* @__PURE__ */ new Date()).getFullYear();
  if (y < 100) y += 2e3;
  const h = String(hora || "").trim();
  const hm = h.match(/^(\d{1,2}):(\d{2})/);
  if (hm) {
    const ms = new Date(y, parseInt(m[2], 10) - 1, parseInt(m[1], 10)).getTime();
    const withH = ms + (parseInt(hm[1], 10) * 3600 + parseInt(hm[2], 10) * 60) * 1e3;
    const d = new Date(withH);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  return y + "-" + parseInt(m[2], 10) + "-" + parseInt(m[1], 10);
}
function normalizeLabLines(lines) {
  return (Array.isArray(lines) ? lines : []).map(function(line) {
    return String(line || "").trim().replace(/\s+/g, " ");
  }).filter(Boolean);
}
function isSubsetLabLines(subset, superset) {
  const sub = normalizeLabLines(subset);
  const sup = normalizeLabLines(superset);
  if (!sub.length) return false;
  const supSet = new Set(sup);
  return sub.every(function(line) {
    return supSet.has(line);
  });
}
function areDriveLabSetsEquivalent(a, b) {
  const aa = normalizeLabLines(a);
  const bb = normalizeLabLines(b);
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i += 1) {
    if (aa[i] !== bb[i]) return false;
  }
  return true;
}
function isDuplicateDriveLabSet(existing, incoming) {
  if (!existing || !incoming) return false;
  const exLabs = existing.resLabs || [];
  const inLabs = incoming.resLabs || [];
  const sameFecha = normalizeFecha(existing.fecha) === normalizeFecha(incoming.fecha);
  const eh = String(existing.hora || "").trim();
  const ih = String(incoming.hora || "").trim();
  const sameHora = eh === ih;
  if (sameFecha && sameHora && areDriveLabSetsEquivalent(exLabs, inLabs)) return true;
  const dayEx = calendarDayKeyFromLabSet(existing);
  const dayIn = calendarDayKeyFromLabSet(incoming);
  if (!dayEx || !dayIn || dayEx !== dayIn) return false;
  if (areDriveLabSetsEquivalent(exLabs, inLabs)) return true;
  if (isSubsetLabLines(inLabs, exLabs)) return true;
  return false;
}
function filterNewDriveLabSets(existingHistory, incomingSets) {
  let skipped = 0;
  const fresh = [];
  (incomingSets || []).forEach(function(set) {
    const dup = (existingHistory || []).some(function(ex) {
      return isDuplicateDriveLabSet(ex, set);
    });
    if (dup) skipped += 1;
    else fresh.push(set);
  });
  return { sets: fresh, skipped };
}

// lib/drive-import/drive-import-hc-edit.mjs
var HC_SECTION_LABELS = {
  identificacion: "Identificaci\xF3n",
  motivoConsulta: "Motivo de consulta",
  signosVitalesIngreso: "Signos vitales de ingreso",
  apnp: "Antecedentes no patol\xF3gicos",
  ahf: "Antecedentes heredofamiliares",
  app: "Antecedentes patol\xF3gicos",
  padecimientoActual: "Padecimiento actual / PEEA"
};
var IDENT_LABELS = {
  lugarNacimiento: "ORIGEN",
  residencia: "RESIDENCIA",
  estadoCivil: "ESTADO CIVIL",
  religion: "RELIGI\xD3N",
  escolaridad: "ESCOLARIDAD",
  ocupacionActual: "OCUPACI\xD3N",
  informante: "INFORMANTE",
  registro: "REGISTRO",
  cama: "CAMA",
  dx: "DX",
  edad: "EDAD"
};
var APNP_LABELS = {
  tabaquismo: "TABAQUISMO",
  alcoholismo: "ETILISMO",
  toxicomanias: "TOXICOMAN\xCDAS",
  tatuajes: "TATUAJES",
  deportesPasatiemposMascotas: "ZOONOSIS",
  dieta: "DIETA / COMBE"
};
function hcPatchValueToEditText(key, value) {
  if (value == null) return "";
  if (key === "motivoConsulta" || key === "padecimientoActual" || key === "signosVitalesIngreso") {
    return String(value).trim();
  }
  if (key === "identificacion" && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(filterIdentificacionForHcImport(
      /** @type {Record<string, string>} */
      value
    )).filter(function(entry) {
      return entry[1] != null && String(entry[1]).trim();
    }).map(function(entry) {
      const label = IDENT_LABELS[entry[0]] || entry[0].toUpperCase();
      return label + ": " + String(entry[1]).trim();
    }).join("\n");
  }
  if (key === "ahf" && typeof value === "object" && value) {
    return String(
      /** @type {{ descripcionDetallada?: string }} */
      value.descripcionDetallada || ""
    ).trim();
  }
  if (key === "app" && typeof value === "object" && value) {
    return String(
      /** @type {{ descripcionDetallada?: string }} */
      value.descripcionDetallada || ""
    ).trim();
  }
  if (key === "apnp" && typeof value === "object" && value) {
    return Object.entries(
      /** @type {Record<string, string>} */
      value
    ).filter(function(entry) {
      return entry[1] != null && String(entry[1]).trim();
    }).map(function(entry) {
      const label = APNP_LABELS[entry[0]] || entry[0].toUpperCase();
      return label + ": " + String(entry[1]).trim();
    }).join("\n");
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (_e) {
    return String(value);
  }
}
function parseLabeledLines(block, labelToField) {
  const out = {};
  const reverse = {};
  Object.keys(labelToField).forEach(function(field) {
    reverse[String(labelToField[field]).toUpperCase()] = field;
  });
  for (const raw of String(block || "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 1) continue;
    const label = line.slice(0, idx).trim().toUpperCase();
    const value = line.slice(idx + 1).trim();
    const field = reverse[label] || label.toLowerCase().replace(/\s+/g, "_");
    out[field] = value;
  }
  return out;
}
function editTextToHcPatchValue(key, text, original) {
  const trimmed = String(text || "").trim();
  if (key === "motivoConsulta" || key === "padecimientoActual" || key === "signosVitalesIngreso") {
    return trimmed;
  }
  if (key === "identificacion") {
    const base = original && typeof original === "object" && !Array.isArray(original) ? Object.assign(
      {},
      /** @type {Record<string, unknown>} */
      original
    ) : {};
    return filterIdentificacionForHcImport(
      Object.assign(base, parseLabeledLines(trimmed, IDENT_LABELS))
    );
  }
  if (key === "ahf") {
    const base = original && typeof original === "object" && !Array.isArray(original) ? Object.assign(
      {},
      /** @type {Record<string, unknown>} */
      original
    ) : { conditions: [], customConditions: [], entries: [] };
    base.descripcionDetallada = trimmed;
    return base;
  }
  if (key === "app") {
    const base = original && typeof original === "object" && !Array.isArray(original) ? Object.assign(
      {},
      /** @type {Record<string, unknown>} */
      original
    ) : { conditions: [], customConditions: [], entries: [] };
    base.descripcionDetallada = trimmed;
    return base;
  }
  if (key === "apnp") {
    const base = original && typeof original === "object" && !Array.isArray(original) ? Object.assign(
      {},
      /** @type {Record<string, unknown>} */
      original
    ) : {};
    return Object.assign(base, parseLabeledLines(trimmed, APNP_LABELS));
  }
  if (!trimmed) return original;
  try {
    return JSON.parse(trimmed);
  } catch (_e) {
    return trimmed;
  }
}

// lib/drive-import/format-drive-import-preview.mjs
function summarizeHcValue(value) {
  if (value == null) return "vac\xEDo";
  if (typeof value === "string") {
    const t = value.trim();
    if (!t) return "vac\xEDo";
    if (t.length <= 72) return '"' + t.replace(/\s+/g, " ") + '"';
    return t.slice(0, 70).replace(/\s+/g, " ") + "\u2026 (" + t.length + " caracteres)";
  }
  if (Array.isArray(value)) {
    return value.length + " elemento" + (value.length === 1 ? "" : "s");
  }
  if (typeof value === "object") {
    const parts = [];
    const desc = value.descripcionDetallada || value.descripcion;
    if (desc && String(desc).trim()) {
      const d = String(desc).trim();
      parts.push(
        d.length <= 60 ? d : d.slice(0, 58).replace(/\s+/g, " ") + "\u2026 (" + d.length + " car.)"
      );
    }
    const conds = value.conditions || value.entries;
    if (Array.isArray(conds) && conds.length) {
      parts.push(conds.length + " condici\xF3n" + (conds.length === 1 ? "" : "es"));
    }
    if (value.tabaquismo || value.alcoholismo) {
      parts.push("h\xE1bitos");
    }
    return parts.length ? parts.join(" \xB7 ") : "bloque estructurado";
  }
  return "contenido";
}
function formatEvDate(iso) {
  if (!iso) return "sin fecha";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "sin fecha";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return dd + "/" + mm + "/" + yy;
}
function clipLine(text, max) {
  const t = String(text || "").trim().replace(/\s+/g, " ");
  if (!t) return "(vac\xEDa)";
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "\u2026";
}
function summarizeLabPanels(resLabs) {
  const panels = [];
  (resLabs || []).forEach(function(chunk) {
    const first = String(chunk || "").split("\n")[0].trim();
    const tok = first.split(/\s+/)[0].replace(":", "");
    if (tok && panels.indexOf(tok) === -1) panels.push(tok);
  });
  return panels.length ? panels.join(", ") : "sin paneles";
}
function formatDriveImportPreview(parsed, opts) {
  opts = opts || {};
  const mode = opts.applyMode || "fill";
  const lines = [];
  lines.push("Vista previa de importaci\xF3n");
  lines.push("");
  if (parsed.header && (parsed.header.nombre || parsed.header.registro)) {
    lines.push("Paciente en documento");
    const bits = [];
    if (parsed.header.nombre) bits.push(parsed.header.nombre);
    if (parsed.header.registro) bits.push("Reg. " + parsed.header.registro);
    if (parsed.header.edad) bits.push(parsed.header.edad);
    if (parsed.header.cama) bits.push("Cama " + parsed.header.cama);
    if (parsed.header.sexo) bits.push(parsed.header.sexo);
    lines.push("  " + bits.join(" \xB7 "));
    lines.push("");
  }
  const hcKeys = listHcPatchSectionKeys(parsed.hcPatch || {});
  lines.push("Historia cl\xEDnica");
  if (mode === "eventos") {
    lines.push("  Omitida (modo solo eventualidades)");
  } else if (!hcKeys.length) {
    lines.push("  Sin secciones detectadas en el pegado");
  } else {
    const modeLabel = mode === "replace" ? "Reemplazar\xE1 secciones presentes en el documento" : "Completar\xE1 solo campos vac\xEDos en HC";
    lines.push("  " + modeLabel);
    hcKeys.forEach(function(key) {
      const label = HC_SECTION_LABELS[key] || key;
      lines.push("  \u2022 " + label + ": " + summarizeHcValue(parsed.hcPatch[key]));
    });
  }
  lines.push("");
  const allEv = parsed.eventualidades.entries || [];
  const evFiltered = filterNewEventualidades(opts.existingEventualidades || [], allEv);
  const evNew = evFiltered.toAdd || [];
  const evSkipped = parsed.eventualidades.skippedEstimate ?? evFiltered.skipped ?? 0;
  lines.push("Eventualidades");
  if (!allEv.length) {
    lines.push("  Ninguna detectada");
  } else {
    lines.push(
      "  " + evNew.length + " nueva" + (evNew.length === 1 ? "" : "s") + (evSkipped ? " \xB7 " + evSkipped + " duplicada" + (evSkipped === 1 ? "" : "s") + " omitida" + (evSkipped === 1 ? "" : "s") : "")
    );
    const show = evNew.slice(0, 12);
    show.forEach(function(entry, idx) {
      const date = formatEvDate(entry.at);
      const firstLine = clipLine(String(entry.text || "").split("\n")[0], 64);
      lines.push("  " + (idx + 1) + ". " + date + " \u2014 " + firstLine);
    });
    if (evNew.length > show.length) {
      lines.push("  \u2026 y " + (evNew.length - show.length) + " m\xE1s");
    }
    if (evSkipped) {
      lines.push("  (" + evSkipped + " ya en expediente, no se repetir\xE1n)");
    }
  }
  lines.push("");
  const labAll = parsed.laboratorios.allSets || parsed.laboratorios.sets || [];
  const labNew = parsed.laboratorios.sets || [];
  const labSkipped = parsed.laboratorios.skippedEstimate || 0;
  lines.push("Laboratorios");
  if (!labAll.length) {
    lines.push("  Ning\xFAn bloque con fecha detectado");
  } else {
    lines.push(
      "  " + labNew.length + " fecha" + (labNew.length === 1 ? "" : "s") + " a agregar al historial" + (labSkipped ? " \xB7 " + labSkipped + " duplicada" + (labSkipped === 1 ? "" : "s") + " omitida" + (labSkipped === 1 ? "" : "s") : "")
    );
    labNew.slice(0, 10).forEach(function(set, idx) {
      lines.push(
        "  " + (idx + 1) + ". " + (set.fecha || "?") + " \u2014 " + summarizeLabPanels(set.resLabs)
      );
    });
    if (labNew.length > 10) {
      lines.push("  \u2026 y " + (labNew.length - 10) + " fechas m\xE1s");
    }
  }
  lines.push("");
  if (parsed.warnings && parsed.warnings.length) {
    lines.push("Advertencias");
    parsed.warnings.forEach(function(w) {
      lines.push("  \u2022 " + w);
    });
  }
  return lines.join("\n");
}

// lib/drive-import/parse-drive-document.mjs
function parseDriveDocument(rawText, opts) {
  opts = opts || {};
  const split = splitDocumentSections(rawText);
  const pipe = parsePipeHeader(split.headerLines);
  const ficha = parseFichaIdentificacion(split.sections.ficha || "");
  const header = mergeHeader(pipe, ficha);
  const doc = { sections: split.sections, headerLines: split.headerLines };
  let hcPatch = mapUniversalHc(doc) || {};
  const sexo = hcPatch._sexo;
  if (sexo) delete hcPatch._sexo;
  if (sexo && !header.sexo) header.sexo = sexo;
  const documentYear = inferDocumentYearFromText(rawText);
  let evBlocks = split.eventualidadesBlocks;
  const hasHc = hasDriveHcSections(split.sections);
  if (!evBlocks.length && !hasHc) {
    const trimmed = String(rawText || "").trim();
    if (trimmed) evBlocks = [trimmed];
  }
  const { entries, warnings: evWarn } = mapSectionsToEventualidades({
    eventualidadesBlocks: evBlocks,
    referenceYear: documentYear,
    documentYear
  });
  const { skipped: evSkipped } = filterNewEventualidades(opts.existingEventualidades || [], entries);
  const labBody = extractLaboratoriosBody(rawText, split.sections.laboratorios || "");
  const labParsed = parseDriveLaboratorios(labBody, { documentYear });
  const labFiltered = filterNewDriveLabSets(opts.existingLabHistory || [], labParsed.sets);
  const warnings = split.warnings.slice();
  if (!hasHc && !split.eventualidadesBlocks.length && evBlocks.length === 1 && evBlocks[0] === String(rawText || "").trim()) {
    warnings.push("Texto interpretado como fragmento de eventualidades (sin encabezados de secci\xF3n).");
  }
  if (!split.eventualidadesBlocks.length && !evBlocks.length) {
    warnings.push("No se encontr\xF3 secci\xF3n EVENTUALIDADES.");
  }
  warnings.push(...evWarn);
  warnings.push(...labParsed.warnings);
  if (labBody && !labParsed.sets.length) {
    warnings.push("Secci\xF3n LABORATORIOS sin bloques de fecha reconocibles.");
  }
  const result = {
    header,
    driveSections: Object.assign({}, split.sections),
    hcPatch,
    eventualidades: {
      entries,
      skippedEstimate: evSkipped
    },
    laboratorios: {
      sets: labFiltered.sets,
      allSets: labParsed.sets,
      skippedEstimate: labFiltered.skipped
    },
    warnings
  };
  result.previewText = formatDriveImportPreview(result, {
    applyMode: opts.applyMode,
    existingEventualidades: opts.existingEventualidades
  });
  return result;
}

// public/js/features/drive-import-apply.mjs
async function applyDriveImport(parsed, options) {
  return applyDriveImportInner(parsed, options);
}
async function applyDriveImportInner(parsed, options) {
  const mode = options.mode || "fill";
  let patient = options.activePatient;
  let lanSyncDeferred = false;
  if (options.createNew) {
    const h = parsed.header || {};
    const id = generatePatientId();
    patient = {
      id,
      nombre: ensureUniquePatientName(h.nombre || "PACIENTE SIN NOMBRE"),
      edad: h.edad || "",
      sexo: h.sexo === "F" ? "F" : "M",
      cama: h.cama || "",
      registro: h.registro || "",
      area: "",
      servicio: "",
      cuarto: "",
      fromLab: false
    };
    applyDefaultsToNewPatient(patient);
    patients.unshift(patient);
    selectPatient(id);
  }
  if (!patient) {
    return { ok: false, error: "no-patient" };
  }
  let hcOk = true;
  if (mode !== "eventos") {
    const hcRes = await applyDriveImportHcPatch(patient, parsed.hcPatch || {}, mode, {
      fromReview: !!options.fromReview
    });
    hcOk = hcRes.ok;
    if (hcRes.lanDeferred) lanSyncDeferred = true;
    if (!hcOk) return { ok: false, error: "hc-conflict" };
  }
  const evRes = await applyDriveImportEventualidades(patient, parsed.eventualidades.entries || []);
  if (evRes.lanDeferred) lanSyncDeferred = true;
  invalidateEventualidadesPanel();
  const evMount = document.getElementById("exp-pane-eventualidades");
  if (evMount && evRes.added) {
    renderEventualidadesPanel(evMount);
  }
  let labRes = { added: 0, skipped: 0 };
  const labSets = parsed.laboratorios && parsed.laboratorios.sets ? parsed.laboratorios.sets : [];
  if (labSets.length) {
    labRes = await applyDriveImportLabSets(patient, labSets);
  }
  await saveState({ immediate: true });
  const hcKeys = Object.keys(parsed.hcPatch || {}).filter(function(k) {
    return !String(k).startsWith("_");
  });
  let navigateTo = mode === "eventos" || !hcKeys.length ? "eventualidades" : "historia";
  if (labRes.added && navigateTo === "eventualidades" && mode === "eventos") {
    navigateTo = "lab";
  }
  return {
    ok: true,
    navigateTo,
    evAdded: evRes.added,
    evSkipped: evRes.skipped,
    labAdded: labRes.added,
    labSkipped: labRes.skipped,
    patientId: patient.id,
    lanSyncDeferred
  };
}

// lib/drive-import/drive-hc-sections.mjs
var DRIVE_HC_REVIEW_ORDER = [
  { sectionKey: "pendientes", label: "Pendientes" },
  { sectionKey: "historiaClinica", label: "Historia cl\xEDnica" },
  { sectionKey: "motivoConsulta", label: "Motivo de consulta" },
  { sectionKey: "signosVitales", label: "Signos vitales de ingreso" },
  { sectionKey: "ficha", label: "Ficha de identificaci\xF3n" },
  { sectionKey: "ahf", label: "Antecedentes heredofamiliares" },
  { sectionKey: "apnp", label: "Antecedentes personales no patol\xF3gicos" },
  { sectionKey: "app", label: "Antecedentes personales patol\xF3gicos" },
  { sectionKey: "peea", label: "Padecimiento actual / PEEA" }
];
function listDriveHcReviewSections(sections) {
  const src = sections || {};
  const out = [];
  for (const spec of DRIVE_HC_REVIEW_ORDER) {
    const text = String(src[spec.sectionKey] || "").trim();
    if (!text) continue;
    out.push({ sectionKey: spec.sectionKey, label: spec.label, text });
  }
  return out;
}

// lib/drive-import/drive-import-review.mjs
function summarizeLabPanels2(resLabs) {
  const panels = [];
  (resLabs || []).forEach(function(chunk) {
    const first = String(chunk || "").split("\n")[0].trim();
    const tok = first.split(/\s+/)[0].replace(":", "");
    if (tok && panels.indexOf(tok) === -1) panels.push(tok);
  });
  return panels.length ? panels.join(", ") : "sin paneles";
}
function suggestionsForSection(sectionKey, text) {
  return buildHcStructuredSuggestions(sectionKey, String(text || "").trim());
}
function buildDriveImportReviewSteps(parsed, opts) {
  opts = opts || {};
  const mode = opts.applyMode || "fill";
  const steps = [];
  if (opts.createNew && parsed.header && (parsed.header.nombre || parsed.header.registro)) {
    steps.push({
      kind: "header",
      label: "Datos del paciente (nuevo)",
      include: true,
      header: Object.assign({}, parsed.header)
    });
  }
  if (mode !== "eventos") {
    const driveRows = listDriveHcReviewSections(parsed.driveSections || {});
    if (driveRows.length) {
      driveRows.forEach(function(row) {
        const editText = row.sectionKey === "ficha" ? filterFichaDriveText(row.text) : row.text;
        steps.push({
          kind: "hc",
          driveSectionKey: row.sectionKey,
          label: row.label,
          include: true,
          editText,
          structuredSuggestions: suggestionsForSection(row.sectionKey, row.text)
        });
      });
    } else {
      Object.keys(parsed.hcPatch || {}).filter(function(key) {
        return !String(key).startsWith("_");
      }).forEach(function(key) {
        const value = parsed.hcPatch[key];
        if (value == null) return;
        steps.push({
          kind: "hc",
          key,
          label: HC_SECTION_LABELS[key] || key,
          include: true,
          editText: hcPatchValueToEditText(key, value),
          originalValue: value,
          structuredSuggestions: suggestionsForSection(key, hcPatchValueToEditText(key, value))
        });
      });
    }
  }
  const allEv = parsed.eventualidades.entries || [];
  const evFiltered = filterNewEventualidades(opts.existingEventualidades || [], allEv);
  const evNew = evFiltered.toAdd || [];
  if (evNew.length) {
    steps.push({
      kind: "eventos",
      label: "Eventualidades (" + evNew.length + " nueva" + (evNew.length === 1 ? "" : "s") + ")",
      entries: evNew.map(function(entry) {
        return { at: entry.at, text: entry.text, include: true };
      })
    });
  }
  const allLabSets = (parsed.laboratorios.allSets && parsed.laboratorios.allSets.length ? parsed.laboratorios.allSets : parsed.laboratorios.sets) || [];
  const existingLabs = opts.existingLabHistory || [];
  if (allLabSets.length) {
    let dupCount = 0;
    const sets = allLabSets.map(function(set) {
      const isDuplicate = existingLabs.some(function(ex) {
        return isDuplicateDriveLabSet(ex, set);
      });
      if (isDuplicate) dupCount += 1;
      const panels = summarizeLabPanels2(set.resLabs);
      return {
        fecha: set.fecha || "",
        hora: set.hora || "",
        resLabs: set.resLabs || [],
        sourceText: set.sourceText,
        bhExtras: set.bhExtras,
        include: !isDuplicate,
        isDuplicate,
        summary: (set.fecha || "?") + " \u2014 " + panels
      };
    });
    const newCount = sets.length - dupCount;
    let label = "Laboratorios (" + sets.length + " fecha" + (sets.length === 1 ? "" : "s") + ")";
    if (dupCount && newCount) {
      label += " \xB7 " + newCount + " nueva" + (newCount === 1 ? "" : "s") + ", " + dupCount + " en historial";
    } else if (dupCount && !newCount) {
      label += " \xB7 todas en historial";
    }
    steps.push({
      kind: "labs",
      label,
      sets
    });
  }
  return steps;
}
function patchReviewStep(step, patch) {
  if (step.kind === "hc") {
    if (patch.include != null) step.include = !!patch.include;
    if (patch.editText != null) step.editText = patch.editText;
    if (patch.structuredSuggestions && step.structuredSuggestions) {
      patch.structuredSuggestions.forEach(function(row, idx) {
        if (!step.structuredSuggestions[idx]) return;
        if (row.include != null) step.structuredSuggestions[idx].include = !!row.include;
      });
    }
    return;
  }
  if (step.kind === "header" && patch.include != null) {
    step.include = !!patch.include;
    return;
  }
  if (step.kind === "eventos" && patch.entries) {
    patch.entries.forEach(function(row, idx) {
      if (!step.entries[idx]) return;
      if (row.include != null) step.entries[idx].include = !!row.include;
      if (row.text != null) step.entries[idx].text = row.text;
    });
    return;
  }
  if (step.kind === "labs" && patch.sets) {
    patch.sets.forEach(function(row, idx) {
      if (!step.sets[idx]) return;
      if (row.include != null) step.sets[idx].include = !!row.include;
    });
  }
}
function applyReviewStepsToParsed(parsed, steps, opts) {
  opts = opts || {};
  const out = Object.assign({}, parsed, {
    driveSections: Object.assign({}, parsed.driveSections || {}),
    hcPatch: Object.assign({}, parsed.hcPatch || {}),
    eventualidades: {
      entries: (parsed.eventualidades.entries || []).slice(),
      skippedEstimate: parsed.eventualidades.skippedEstimate
    },
    laboratorios: Object.assign({}, parsed.laboratorios, {
      sets: (parsed.laboratorios.sets || []).slice()
    }),
    header: Object.assign({}, parsed.header || {})
  });
  steps.forEach(function(step) {
    if (step.kind === "header") {
      if (opts.createNew && step.include) out.header = Object.assign({}, step.header);
      return;
    }
    if (step.kind === "hc") {
      if (step.driveSectionKey) {
        if (step.include) {
          const raw = String(step.editText || "").trim();
          out.driveSections[step.driveSectionKey] = step.driveSectionKey === "ficha" ? filterFichaDriveText(raw) : raw;
        } else {
          delete out.driveSections[step.driveSectionKey];
        }
        return;
      }
      if (!step.include) {
        if (step.key) delete out.hcPatch[step.key];
        return;
      }
      if (step.key) {
        out.hcPatch[step.key] = editTextToHcPatchValue(step.key, step.editText, step.originalValue);
      }
      return;
    }
    if (step.kind === "eventos") {
      out.eventualidades.entries = step.entries.filter(function(e) {
        return e.include && String(e.text || "").trim();
      }).map(function(e) {
        return { at: e.at, text: String(e.text).trim() };
      });
      return;
    }
    if (step.kind === "labs") {
      out.laboratorios.sets = step.sets.filter(function(s) {
        return s.include && s.resLabs && s.resLabs.length;
      }).map(function(s) {
        return {
          fecha: s.fecha,
          hora: s.hora,
          resLabs: s.resLabs,
          sourceText: s.sourceText,
          bhExtras: s.bhExtras
        };
      });
    }
  });
  const usedDriveSections = steps.some(function(step) {
    return step.kind === "hc" && step.driveSectionKey;
  });
  if (usedDriveSections) {
    out.hcPatch = mapUniversalHc({ sections: out.driveSections }) || {};
    const sexo = out.hcPatch._sexo;
    if (sexo) delete out.hcPatch._sexo;
    if (sexo && out.header) out.header.sexo = out.header.sexo || sexo;
  }
  const acceptedSuggestions = [];
  steps.forEach(function(step) {
    if (step.kind !== "hc" || !step.include || !step.structuredSuggestions) return;
    step.structuredSuggestions.forEach(function(s) {
      if (s.include) acceptedSuggestions.push(s);
    });
  });
  if (acceptedSuggestions.length) {
    out.hcPatch = applyStructuredSuggestionsToHcPatch(out.hcPatch || {}, acceptedSuggestions);
  }
  return out;
}
function reviewStepHint(step) {
  if (step.kind === "hc") {
    if (step.driveSectionKey === "ficha" || step.key === "identificacion") {
      return "Registro, diagn\xF3sticos y otros datos del expediente se omiten; ya est\xE1n en Datos del paciente. Edita el resto si hace falta.";
    }
    if (step.structuredSuggestions && step.structuredSuggestions.length) {
      return "Marca los campos estructurados que quieras completar (casillas, medicamentos, alergias, etc.). El texto libre se importa abajo.";
    }
    return "Edita el texto si hace falta. Desmarca \xABIncluir\xBB para omitir esta secci\xF3n en la importaci\xF3n.";
  }
  if (step.kind === "header") {
    return "Estos datos se usar\xE1n al crear el paciente nuevo.";
  }
  if (step.kind === "eventos") {
    return "Marca o desmarca cada nota. Puedes corregir el texto antes de importar.";
  }
  if (step.kind === "labs") {
    return "Marca las fechas que quieras agregar. Las que ya est\xE1n en el historial vienen desmarcadas.";
  }
  return "";
}

// public/js/features/drive-import-modal.mjs
var rt2 = {
  getActiveId() {
    return null;
  },
  getActivePatient() {
    return null;
  },
  showToast(_msg, _type) {
  },
  pushUndoSnapshot(_label) {
  },
  switchInnerTab(_tab) {
  },
  switchAppTab(_tab) {
  },
  addAuditEntry(_action, _result, _count, _detail) {
  }
};
var _debounceId = null;
var _autoReviewPending = false;
var _importBusy = false;
var _modalStep = "paste";
var _reviewSteps = [];
var _reviewIndex = 0;
function registerDriveImportRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt2, ctx);
}
function getBackdrop() {
  return document.getElementById("drive-import-backdrop");
}
function getTextarea() {
  return (
    /** @type {HTMLTextAreaElement | null} */
    document.getElementById("drive-import-input")
  );
}
function getParseHintEl() {
  return document.getElementById("drive-import-parse-hint");
}
function getModalEl() {
  return document.querySelector(".drive-import-modal");
}
function getWarningEl() {
  return document.getElementById("drive-import-warning");
}
function getApplyMode() {
  const checked = document.querySelector('input[name="drive-import-mode"]:checked');
  const v = checked ? String(checked.value) : "fill";
  if (v === "replace" || v === "eventos") return v;
  return "fill";
}
function getParsed() {
  const ta = getTextarea();
  const patient = rt2.getActivePatient();
  const existing = patient && patient.eventualidades && Array.isArray(patient.eventualidades.entries) ? patient.eventualidades.entries : [];
  const existingLabs = patient && patient.id && labHistory[patient.id] ? labHistory[patient.id] : [];
  return parseDriveDocument(ta ? ta.value : "", {
    existingEventualidades: existing,
    existingLabHistory: existingLabs,
    applyMode: getApplyMode()
  });
}
function hasImportableContent(parsed, mode) {
  const hcKeys = listHcPatchSectionKeys(parsed.hcPatch || {});
  const evTotal = (parsed.eventualidades.entries || []).length;
  const evSkipped = parsed.eventualidades.skippedEstimate || 0;
  const evWillAdd = Math.max(0, evTotal - evSkipped);
  const labsWillAdd = (parsed.laboratorios.sets || []).length;
  const willTouchHc = mode !== "eventos" && hcKeys.length > 0;
  return willTouchHc || evWillAdd > 0 || labsWillAdd > 0;
}
function updateDocSummary() {
  const ta = getTextarea();
  const el = document.getElementById("drive-import-doc-summary");
  if (!el || !ta) return;
  const text = String(ta.value || "");
  if (!text.trim()) {
    el.textContent = "";
    return;
  }
  const lines = text.split(/\r?\n/).length;
  el.textContent = "Documento pegado \xB7 " + lines + " l\xEDnea" + (lines === 1 ? "" : "s") + " \xB7 " + text.length + " caracteres";
}
function refreshPreview() {
  const parseHint = getParseHintEl();
  const warn = getWarningEl();
  const confirmBtn = document.getElementById("drive-import-confirm");
  const fastBtn = document.getElementById("drive-import-apply-fast");
  const ta = getTextarea();
  if (!ta || !String(ta.value || "").trim()) {
    if (parseHint) {
      parseHint.hidden = true;
      parseHint.textContent = "";
    }
    if (warn) warn.hidden = true;
    if (confirmBtn) confirmBtn.disabled = true;
    if (fastBtn) fastBtn.disabled = true;
    updateDocSummary();
    return;
  }
  let parsed;
  try {
    parsed = getParsed();
  } catch (err) {
    if (parseHint) {
      parseHint.hidden = false;
      parseHint.textContent = "Error al analizar: " + (err && err.message ? err.message : String(err));
    }
    if (confirmBtn) confirmBtn.disabled = true;
    if (fastBtn) fastBtn.disabled = true;
    updateDocSummary();
    return;
  }
  const mode = getApplyMode();
  const canImport = hasImportableContent(parsed, mode);
  if (parseHint) {
    if (canImport) {
      parseHint.hidden = true;
      parseHint.textContent = "";
    } else {
      parseHint.hidden = false;
      parseHint.textContent = "No se detect\xF3 contenido importable con el modo seleccionado.";
    }
  }
  const patient = rt2.getActivePatient();
  if (warn && patient && parsed.header && parsed.header.registro) {
    const mismatch = String(parsed.header.registro).trim() && String(patient.registro || "").trim() && String(parsed.header.registro).trim() !== String(patient.registro).trim();
    warn.hidden = !mismatch;
    warn.textContent = mismatch ? "El registro del documento (" + parsed.header.registro + ") no coincide con el paciente activo (" + patient.registro + ")." : "";
  } else if (warn) {
    warn.hidden = true;
  }
  if (confirmBtn) confirmBtn.disabled = !canImport;
  if (fastBtn) fastBtn.disabled = !canImport;
  updateDocSummary();
}
function setReviewImportBusy(busy) {
  _importBusy = busy;
  const nextBtn = document.getElementById("drive-import-review-next");
  const fastBtn = document.getElementById("drive-import-apply-fast");
  const confirmBtn = document.getElementById("drive-import-confirm");
  if (nextBtn) {
    nextBtn.disabled = busy;
    if (busy) nextBtn.textContent = "Importando\u2026";
    else if (_modalStep === "review") renderReviewStep();
  }
  if (fastBtn) fastBtn.disabled = busy;
  if (confirmBtn && busy) confirmBtn.disabled = true;
  if (!busy) refreshPreview();
}
function confirmDriveImportChoice(message) {
  const bd = getBackdrop();
  const wasOpen = !!(bd && bd.classList.contains("open"));
  if (bd && wasOpen) {
    bd.classList.remove("open");
    bd.setAttribute("aria-hidden", "true");
  }
  let ok = false;
  try {
    ok = confirm(message);
  } finally {
    if (bd && wasOpen) {
      bd.classList.add("open");
      bd.setAttribute("aria-hidden", "false");
    }
  }
  return ok;
}
function hasApprovedReviewContent(parsed) {
  const hcKeys = listHcPatchSectionKeys(parsed.hcPatch || {});
  const evCount = (parsed.eventualidades.entries || []).length;
  const labCount = (parsed.laboratorios.sets || []).length;
  return hcKeys.length > 0 || evCount > 0 || labCount > 0;
}
function getReviewBuildOpts(parsed) {
  const patient = rt2.getActivePatient();
  return {
    applyMode: getApplyMode(),
    existingEventualidades: patient && patient.eventualidades && Array.isArray(patient.eventualidades.entries) ? patient.eventualidades.entries : [],
    existingLabHistory: patient && patient.id && labHistory[patient.id] ? labHistory[patient.id] : [],
    createNew: !patient
  };
}
function tryAutoStartReview() {
  if (_modalStep !== "paste" || !_autoReviewPending) return;
  _autoReviewPending = false;
  const ta = getTextarea();
  if (!ta || !String(ta.value || "").trim()) return;
  let parsed;
  try {
    parsed = getParsed();
  } catch (_err) {
    return;
  }
  const mode = getApplyMode();
  if (!hasImportableContent(parsed, mode)) return;
  const patient = rt2.getActivePatient();
  const steps = buildDriveImportReviewSteps(parsed, getReviewBuildOpts(parsed));
  if (!steps.length) return;
  _reviewSteps = steps;
  _reviewIndex = 0;
  setModalStep("review");
  renderReviewStep();
  const editor = document.getElementById("drive-import-review-editor");
  if (editor && !editor.hidden) editor.focus();
}
function onPasteInputChanged() {
  const ta = getTextarea();
  const hasText = !!(ta && String(ta.value || "").trim());
  if (!hasText) {
    _autoReviewPending = false;
    refreshPreview();
    return;
  }
  _autoReviewPending = true;
  refreshPreview();
  if (_debounceId) clearTimeout(_debounceId);
  _debounceId = setTimeout(function() {
    _debounceId = null;
    tryAutoStartReview();
  }, 320);
}
function syncConfirmLabel() {
  const btn = document.getElementById("drive-import-confirm");
  const modeFs = document.getElementById("drive-import-mode-fieldset");
  const patient = rt2.getActivePatient();
  if (modeFs) modeFs.style.display = patient ? "" : "none";
  if (!btn || _modalStep !== "paste") return;
  btn.textContent = "Revisar secciones\u2026";
}
function setModalStep(step) {
  _modalStep = step;
  const modal = getModalEl();
  const pasteEl = document.getElementById("drive-import-step-paste");
  const reviewEl = document.getElementById("drive-import-step-review");
  const actionsPaste = document.getElementById("drive-import-actions-paste");
  const actionsReview = document.getElementById("drive-import-actions-review");
  const prevBtn = document.getElementById("drive-import-review-prev");
  const title = document.getElementById("drive-import-title");
  const hint = document.getElementById("drive-import-hint");
  const modeFs = document.getElementById("drive-import-mode-fieldset");
  if (modal) modal.setAttribute("data-drive-step", step);
  if (pasteEl) pasteEl.hidden = step !== "paste";
  if (reviewEl) reviewEl.hidden = step !== "review";
  if (actionsPaste) actionsPaste.hidden = step !== "paste";
  if (actionsReview) actionsReview.hidden = step !== "review";
  if (modeFs) modeFs.hidden = step === "review";
  if (title) {
    title.textContent = step === "review" ? "Revisar importaci\xF3n" : "Importar desde Drive";
  }
  if (hint) {
    hint.textContent = step === "review" ? "Confirma o edita cada secci\xF3n antes de importar." : "Pega el documento copiado desde Google Docs. Revisar\xE1s cada secci\xF3n antes de importar.";
  }
  if (step === "review") updateDocSummary();
  syncConfirmLabel();
}
function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function formatEvDate2(iso) {
  if (!iso) return "sin fecha";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "sin fecha";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return dd + "/" + mm + "/" + yy;
}
function syncCurrentReviewStepFromUi() {
  const step = _reviewSteps[_reviewIndex];
  if (!step) return;
  const includeEl = (
    /** @type {HTMLInputElement | null} */
    document.getElementById("drive-import-review-include")
  );
  const editor = (
    /** @type {HTMLTextAreaElement | null} */
    document.getElementById("drive-import-review-editor")
  );
  if (step.kind === "hc") {
    patchReviewStep(step, {
      include: includeEl ? includeEl.checked : true,
      editText: editor ? editor.value : step.editText,
      structuredSuggestions: readStructuredSuggestionsFromUi()
    });
    return;
  }
  if (step.kind === "header") {
    patchReviewStep(step, { include: includeEl ? includeEl.checked : true });
    return;
  }
  if (step.kind === "eventos") {
    const rows = document.querySelectorAll("[data-drive-ev-idx]");
    const entries = [];
    rows.forEach(function(row) {
      const idx = Number(row.getAttribute("data-drive-ev-idx"));
      const cb = row.querySelector('input[type="checkbox"]');
      const ta = row.querySelector("textarea");
      entries[idx] = {
        include: cb ? cb.checked : true,
        text: ta ? ta.value : ""
      };
    });
    patchReviewStep(step, { entries });
    return;
  }
  if (step.kind === "labs") {
    const rows = document.querySelectorAll("[data-drive-lab-idx]");
    const sets = [];
    rows.forEach(function(row) {
      const idx = Number(row.getAttribute("data-drive-lab-idx"));
      const cb = row.querySelector('input[type="checkbox"]');
      sets[idx] = { include: cb ? cb.checked : true };
    });
    patchReviewStep(step, { sets });
  }
}
function renderReviewDots() {
  const dots = document.getElementById("drive-import-review-dots");
  if (!dots) return;
  dots.innerHTML = "";
  _reviewSteps.forEach(function(step, idx) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "drive-import-review-dot" + (idx === _reviewIndex ? " is-active" : "");
    btn.title = step.label;
    btn.setAttribute("aria-label", step.label + " (" + (idx + 1) + " de " + _reviewSteps.length + ")");
    btn.setAttribute("aria-current", idx === _reviewIndex ? "step" : "false");
    btn.addEventListener("click", function() {
      syncCurrentReviewStepFromUi();
      _reviewIndex = idx;
      renderReviewStep();
    });
    dots.appendChild(btn);
  });
}
function readStructuredSuggestionsFromUi() {
  const rows = [];
  document.querySelectorAll("[data-drive-struct-idx]").forEach(function(row) {
    const idx = Number(row.getAttribute("data-drive-struct-idx"));
    const cb = row.querySelector('input[type="checkbox"]');
    rows[idx] = { include: cb ? cb.checked : true };
  });
  return rows;
}
function renderStructuredSuggestions(step) {
  const host = document.getElementById("drive-import-review-structured");
  if (!host) return;
  const suggestions = step.structuredSuggestions || [];
  if (!suggestions.length) {
    host.hidden = true;
    host.innerHTML = "";
    return;
  }
  host.hidden = false;
  let html = '<div class="drive-import-structured-head">Campos detectados \u2014 marcar para agregar a casillas estructuradas</div><div class="drive-import-structured-list">';
  suggestions.forEach(function(s, idx) {
    html += '<label class="drive-import-structured-row" data-drive-struct-idx="' + idx + '"><input type="checkbox"' + (s.include !== false ? " checked" : "") + ' aria-label="' + escapeHtml(s.label) + '" /><span class="drive-import-structured-label">' + escapeHtml(s.label) + "</span></label>";
  });
  html += "</div>";
  host.innerHTML = html;
}
function renderReviewStep() {
  const step = _reviewSteps[_reviewIndex];
  const progress = document.getElementById("drive-import-review-progress");
  const titleEl = document.getElementById("drive-import-review-title");
  const hintEl = document.getElementById("drive-import-review-hint");
  const includeWrap = document.getElementById("drive-import-review-include-wrap");
  const includeEl = (
    /** @type {HTMLInputElement | null} */
    document.getElementById("drive-import-review-include")
  );
  const editor = (
    /** @type {HTMLTextAreaElement | null} */
    document.getElementById("drive-import-review-editor")
  );
  const listEl = document.getElementById("drive-import-review-list");
  const nextBtn = document.getElementById("drive-import-review-next");
  const prevBtn = document.getElementById("drive-import-review-prev");
  if (!step) return;
  if (progress) {
    progress.textContent = "Secci\xF3n " + (_reviewIndex + 1) + " de " + _reviewSteps.length + " \xB7 " + step.label;
  }
  if (titleEl) titleEl.textContent = step.label;
  if (hintEl) hintEl.textContent = reviewStepHint(step);
  if (prevBtn) prevBtn.disabled = _reviewIndex <= 0;
  if (nextBtn) {
    nextBtn.textContent = _reviewIndex >= _reviewSteps.length - 1 ? "Importar lo aprobado" : "Siguiente secci\xF3n";
  }
  renderReviewDots();
  const isList = step.kind === "eventos" || step.kind === "labs";
  const isHeader = step.kind === "header";
  if (includeWrap) includeWrap.hidden = isList;
  if (editor) {
    editor.hidden = isList || isHeader;
    editor.style.display = isList || isHeader ? "none" : "";
  }
  if (listEl) listEl.hidden = !isList && !isHeader;
  if (step.kind === "hc" && includeEl && editor) {
    includeEl.checked = step.include;
    editor.value = step.editText;
    editor.readOnly = false;
    renderStructuredSuggestions(step);
    return;
  }
  if (isList || isHeader) {
    const structHost = document.getElementById("drive-import-review-structured");
    if (structHost) {
      structHost.hidden = true;
      structHost.innerHTML = "";
    }
  }
  if (step.kind === "header" && includeEl && listEl) {
    includeEl.checked = step.include;
    const h = step.header || {};
    const bits = [];
    if (h.nombre) bits.push("Nombre: " + h.nombre);
    if (h.registro) bits.push("Registro: " + h.registro);
    if (h.edad) bits.push("Edad: " + h.edad);
    if (h.cama) bits.push("Cama: " + h.cama);
    if (h.sexo) bits.push("Sexo: " + h.sexo);
    listEl.hidden = false;
    listEl.innerHTML = '<pre class="drive-import-review-header-pre">' + escapeHtml(bits.join("\n")) + "</pre>";
    return;
  }
  if (step.kind === "eventos" && listEl) {
    listEl.hidden = false;
    let html = "";
    step.entries.forEach(function(entry, idx) {
      const date = formatEvDate2(entry.at);
      html += '<div class="drive-import-review-row" data-drive-ev-idx="' + idx + '"><label class="drive-import-review-row-check"><input type="checkbox"' + (entry.include ? " checked" : "") + ' aria-label="Incluir eventualidad ' + (idx + 1) + '" /><span class="drive-import-review-row-date">' + escapeHtml(date) + '</span></label><textarea class="drive-import-review-row-text" rows="3" spellcheck="true">' + escapeHtml(entry.text) + "</textarea></div>";
    });
    listEl.innerHTML = html;
    return;
  }
  if (step.kind === "labs" && listEl) {
    listEl.hidden = false;
    let html = '<div class="drive-import-labs-table-wrap"><table class="drive-import-labs-table"><thead><tr><th scope="col" class="drive-import-labs-col-check">Incluir</th><th scope="col">Fecha</th><th scope="col">Paneles</th><th scope="col">Estado</th></tr></thead><tbody>';
    step.sets.forEach(function(set, idx) {
      const panels = escapeHtml(String(set.summary || "").replace(/^[^—]+—\s*/, ""));
      const statusClass = set.isDuplicate ? "drive-import-lab-status drive-import-lab-status--dup" : "drive-import-lab-status drive-import-lab-status--new";
      const statusText = set.isDuplicate ? "En historial" : "Nueva";
      html += '<tr class="drive-import-labs-row' + (set.isDuplicate ? " is-duplicate" : "") + '" data-drive-lab-idx="' + idx + '"><td class="drive-import-labs-col-check"><input type="checkbox"' + (set.include ? " checked" : "") + ' aria-label="Incluir laboratorio ' + escapeHtml(set.fecha || "") + '" /></td><td class="drive-import-labs-fecha">' + escapeHtml(set.fecha || "") + '</td><td class="drive-import-labs-panels">' + panels + '</td><td><span class="' + statusClass + '">' + statusText + "</span></td></tr>";
    });
    html += "</tbody></table></div>";
    listEl.innerHTML = html;
  }
}
function driveImportBackToPaste() {
  syncCurrentReviewStepFromUi();
  _autoReviewPending = false;
  setModalStep("paste");
  const ta = getTextarea();
  if (ta) {
    ta.focus();
    try {
      ta.setSelectionRange(ta.value.length, ta.value.length);
    } catch (_e) {
    }
  }
}
function driveImportReviewPrev() {
  if (_reviewIndex <= 0) return;
  syncCurrentReviewStepFromUi();
  _reviewIndex -= 1;
  renderReviewStep();
}
async function driveImportReviewNext() {
  if (_importBusy) return;
  try {
    syncCurrentReviewStepFromUi();
    if (_reviewIndex >= _reviewSteps.length - 1) {
      await finishReviewAndImport();
      return;
    }
    _reviewIndex += 1;
    renderReviewStep();
  } catch (err) {
    console.error("[drive-import] review next failed", err);
    rt2.showToast("No se pudo completar la revisi\xF3n", "error");
    setReviewImportBusy(false);
  }
}
function startDriveImportReview() {
  const ta = getTextarea();
  if (!ta || !String(ta.value || "").trim()) {
    rt2.showToast("Pega el contenido del documento", "error");
    return;
  }
  let parsed;
  try {
    parsed = getParsed();
  } catch (_err) {
    rt2.showToast("No se pudo analizar el texto", "error");
    return;
  }
  _reviewSteps = buildDriveImportReviewSteps(parsed, getReviewBuildOpts(parsed));
  if (!_reviewSteps.length) {
    rt2.showToast("No hay secciones para revisar en este pegado", "info");
    return;
  }
  _reviewIndex = 0;
  _autoReviewPending = false;
  setModalStep("review");
  renderReviewStep();
  const editor = document.getElementById("drive-import-review-editor");
  if (editor && !editor.hidden) editor.focus();
}
function openDriveImportModal() {
  const bd = getBackdrop();
  if (!bd) {
    rt2.showToast("Importaci\xF3n desde Drive no disponible", "error");
    return;
  }
  const ta = getTextarea();
  if (ta) ta.value = "";
  _reviewSteps = [];
  _reviewIndex = 0;
  _autoReviewPending = false;
  _importBusy = false;
  setModalStep("paste");
  syncConfirmLabel();
  refreshPreview();
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  if (ta) ta.focus();
}
function closeDriveImportModal() {
  const bd = getBackdrop();
  if (!bd) return;
  if (_modalStep === "review") syncCurrentReviewStepFromUi();
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  setModalStep("paste");
  _reviewSteps = [];
  _reviewIndex = 0;
  _importBusy = false;
}
async function finishReviewAndImport() {
  if (_importBusy) return;
  setReviewImportBusy(true);
  try {
    syncCurrentReviewStepFromUi();
    let parsed;
    try {
      parsed = getParsed();
    } catch (_err) {
      rt2.showToast("No se pudo analizar el texto", "error");
      return;
    }
    parsed = applyReviewStepsToParsed(parsed, _reviewSteps, { createNew: !rt2.getActivePatient() });
    if (!hasApprovedReviewContent(parsed)) {
      rt2.showToast("No hay secciones marcadas para importar", "info");
      return;
    }
    await Promise.race([
      runDriveImport(parsed, { fromReview: true }),
      new Promise(function(_, reject) {
        setTimeout(function() {
          reject(new Error("import-timeout"));
        }, 12e3);
      })
    ]);
  } catch (err) {
    console.error("[drive-import] import failed", err);
    if (err && err.message === "import-timeout") {
      rt2.showToast("La importaci\xF3n tard\xF3 demasiado. Revisa si los datos se guardaron.", "error");
    } else {
      rt2.showToast("Error al importar desde Drive", "error");
    }
  } finally {
    setReviewImportBusy(false);
  }
}
async function confirmDriveImport() {
  if (_importBusy) return;
  setReviewImportBusy(true);
  try {
    const ta = getTextarea();
    if (!ta || !String(ta.value || "").trim()) {
      rt2.showToast("Pega el contenido del documento", "error");
      return;
    }
    let parsed;
    try {
      parsed = getParsed();
    } catch (_err) {
      rt2.showToast("No se pudo analizar el texto", "error");
      return;
    }
    await runDriveImport(parsed, { fromReview: false });
  } catch (err) {
    console.error("[drive-import] fast import failed", err);
    rt2.showToast("Error al importar desde Drive", "error");
  } finally {
    setReviewImportBusy(false);
  }
}
async function runDriveImport(parsed, opts) {
  opts = opts || {};
  const mode = getApplyMode();
  const patient = rt2.getActivePatient();
  const createNew = !patient;
  if (patient && parsed.header && parsed.header.registro && patient.registro && String(parsed.header.registro).trim() !== String(patient.registro).trim()) {
    if (!confirmDriveImportChoice(
      "El registro del documento (" + parsed.header.registro + ") no coincide con " + patient.registro + ". \xBFContinuar de todos modos?"
    )) {
      return;
    }
  }
  if (!opts.fromReview && mode === "replace") {
    if (!confirmDriveImportChoice(
      "Se sobrescribir\xE1n las secciones de Historia cl\xEDnica presentes en el documento. \xBFContinuar?"
    )) {
      return;
    }
  }
  if (createNew && (!parsed.header || !parsed.header.nombre)) {
    if (!confirmDriveImportChoice("No se detect\xF3 nombre en el encabezado. \xBFCrear paciente igualmente?")) {
      return;
    }
  }
  if (typeof rt2.pushUndoSnapshot === "function") {
    rt2.pushUndoSnapshot("Importar desde Drive");
  }
  if (!opts.fromReview) {
    parsed = Object.assign({}, parsed, {
      hcPatch: enrichHcPatchWithStructuredSuggestions(parsed.hcPatch || {}, parsed.driveSections || {})
    });
  }
  const result = await applyDriveImport(parsed, {
    mode,
    activePatient: patient,
    createNew,
    fromReview: !!opts.fromReview
  });
  if (!result.ok) {
    if (result.error === "hc-conflict") {
      rt2.showToast("Conflicto al guardar Historia cl\xEDnica en LAN. Recarga e intenta de nuevo.", "error");
    } else {
      rt2.showToast("No se pudo aplicar la importaci\xF3n", "error");
    }
    return;
  }
  if (typeof rt2.addAuditEntry === "function") {
    rt2.addAuditEntry(
      "drive-import",
      "ok",
      result.evAdded || 0,
      JSON.stringify({
        mode,
        skipped: result.evSkipped,
        labAdded: result.labAdded,
        labSkipped: result.labSkipped,
        createNew,
        reviewed: !!opts.fromReview
      })
    );
  }
  closeDriveImportModal();
  const parts = [];
  if (mode !== "eventos") parts.push("HC actualizada");
  parts.push(
    (result.evAdded || 0) + " eventualidad" + (result.evAdded === 1 ? "" : "es") + " nueva" + (result.evAdded === 1 ? "" : "s")
  );
  if (result.evSkipped) {
    parts.push(
      result.evSkipped + " duplicada" + (result.evSkipped === 1 ? "" : "s") + " omitida" + (result.evSkipped === 1 ? "" : "s")
    );
  }
  if (result.labAdded) {
    parts.push(
      result.labAdded + " fecha" + (result.labAdded === 1 ? "" : "s") + " de laboratorio nueva" + (result.labAdded === 1 ? "" : "s")
    );
  }
  if (result.labSkipped) {
    parts.push(
      result.labSkipped + " lab" + (result.labSkipped === 1 ? "" : "s") + " duplicado" + (result.labSkipped === 1 ? "" : "s") + " omitido" + (result.labSkipped === 1 ? "" : "s")
    );
  }
  if (result.lanSyncDeferred) {
    parts.push("sincronizaci\xF3n con la sala en segundo plano");
  }
  rt2.showToast(parts.join(" \xB7 "), "success");
  if (result.navigateTo === "lab") {
    if (typeof rt2.switchAppTab === "function") rt2.switchAppTab("lab");
  } else {
    if (typeof rt2.switchAppTab === "function") rt2.switchAppTab("clinico");
    if (typeof rt2.switchInnerTab === "function") {
      rt2.switchInnerTab(result.navigateTo || "historia", { forceRender: true });
    }
  }
}
function wireDriveImportActionButtons() {
  const actions = [
    ["drive-import-confirm", startDriveImportReview],
    ["drive-import-apply-fast", confirmDriveImport],
    ["drive-import-review-next", driveImportReviewNext],
    ["drive-import-review-prev", driveImportReviewPrev],
    ["drive-import-back-paste", driveImportBackToPaste]
  ];
  actions.forEach(function(pair) {
    const btn = document.getElementById(pair[0]);
    const fn = pair[1];
    if (!btn || btn.dataset.driveImportActionWired) return;
    btn.dataset.driveImportActionWired = "1";
    btn.addEventListener("click", function(e) {
      e.preventDefault();
      void Promise.resolve(fn()).catch(function(err) {
        console.error("[drive-import] action failed", pair[0], err);
        rt2.showToast("No se pudo completar la acci\xF3n de importaci\xF3n", "error");
        setReviewImportBusy(false);
      });
    });
  });
}
function wireDriveImportModal() {
  const ta = getTextarea();
  const bd = getBackdrop();
  wireDriveImportActionButtons();
  if (ta && !ta.dataset.driveImportWired) {
    ta.dataset.driveImportWired = "1";
    ta.addEventListener("input", onPasteInputChanged);
    ta.addEventListener("paste", function() {
      setTimeout(onPasteInputChanged, 0);
    });
  }
  document.querySelectorAll('input[name="drive-import-mode"]').forEach(function(el) {
    if (el.dataset.driveImportWired) return;
    el.dataset.driveImportWired = "1";
    el.addEventListener("change", function() {
      syncConfirmLabel();
      refreshPreview();
      if (_modalStep === "paste" && _autoReviewPending) {
        if (_debounceId) clearTimeout(_debounceId);
        _debounceId = setTimeout(function() {
          _debounceId = null;
          tryAutoStartReview();
        }, 320);
      }
    });
  });
  if (bd && !bd.dataset.driveImportWired) {
    bd.dataset.driveImportWired = "1";
    bd.addEventListener("click", function(e) {
      if (e.target === bd) closeDriveImportModal();
    });
  }
}
var windowHandlers18 = {
  openDriveImportModal,
  closeDriveImportModal,
  confirmDriveImport,
  startDriveImportReview,
  driveImportBackToPaste,
  driveImportReviewPrev,
  driveImportReviewNext
};

// public/js/lazy-feature-routes.mjs
var settingsHelpPromise = null;
var platformPromise = null;
var settingsHelpModule = null;
var platformModule = null;
function ensureSettingsHelpLoaded() {
  if (settingsHelpModule) return Promise.resolve(settingsHelpModule);
  if (!settingsHelpPromise) {
    settingsHelpPromise = import("/js/chunks/settings-help-KE7NCONZ.js").then(function(mod) {
      settingsHelpModule = mod;
      return mod;
    });
  }
  return settingsHelpPromise;
}
function ensurePlatformLoaded() {
  if (platformModule) return Promise.resolve(platformModule);
  if (!platformPromise) {
    platformPromise = import("/js/chunks/platform-OLMNP64X.js").then(function(mod) {
      platformModule = mod;
      return mod;
    });
  }
  return platformPromise;
}
function patchWindowHandlers(handlers) {
  try {
    Object.assign(window, handlers);
  } catch (err) {
    console.error("[lazy-feature-routes] patchWindowHandlers", err);
  }
}
function lazyWindowHandler(exportName, loader) {
  return function lazyHandler() {
    var args = arguments;
    void loader().then(function(mod) {
      var fn = mod[exportName];
      if (typeof fn !== "function") {
        console.error("[lazy-feature-routes] missing handler", exportName);
        return;
      }
      fn.apply(null, args);
    });
  };
}
function buildLazyWindowHandlers(nameToExport, loader) {
  var out = {};
  for (var handlerName of Object.keys(nameToExport)) {
    out[handlerName] = lazyWindowHandler(nameToExport[handlerName], loader);
  }
  return out;
}
var settingsHelpWindowHandlersLazy = buildLazyWindowHandlers(
  {
    toggleSettingsSection: "toggleSettingsSection",
    toggleSettingsDropdown: "toggleSettingsDropdown",
    closeSettingsDropdown: "closeSettingsDropdown",
    expandSettingsAccordionBackupSync: "expandSettingsAccordionBackupSync",
    syncTeamSyncHeaderButton: "syncTeamSyncHeaderButton",
    openQuickHelp: "openQuickHelp",
    closeQuickHelp: "closeQuickHelp",
    onHelpSearchInput: "onHelpSearchInput",
    onHelpSearchKeydown: "onHelpSearchKeydown",
    onHelpListKeydown: "onHelpListKeydown",
    closeReleaseNotes: "closeReleaseNotes",
    startMiniTour: "startMiniTour",
    startHelpTourMain: "startHelpTourMain",
    togglePresentationModeFromHelp: "togglePresentationModeFromHelp",
    exportCensoPdfFromHelp: "exportCensoPdfFromHelp",
    guidedTourIntroChooseSala: "guidedTourIntroChooseSala",
    guidedTourIntroChooseInterconsulta: "guidedTourIntroChooseInterconsulta",
    guidedTourIntroSkip: "guidedTourIntroSkip",
    skipGuidedTour: "skipGuidedTour",
    toggleTourDockCollapsed: "toggleTourDockCollapsed",
    onTourDockClick: "onTourDockClick",
    guidedTourClickNext: "guidedTourClickNext",
    guidedTourClickPrev: "guidedTourClickPrev",
    guidedTourPause: "guidedTourPause",
    guidedTourFinish: "finishGuidedTour",
    startTourModule: "startTourModule",
    startHelpTourInterconsulta: "startHelpTourInterconsulta",
    resetAndStartOnboarding: "resetAndStartOnboarding",
    insertLabTourSecondPatientExample: "insertLabTourSecondPatientExample",
    closeLabBulkTourHintModal: "closeLabBulkTourHintModal",
    resumeGuidedTourFromProgress: "resumeGuidedTourFromProgress",
    startNeoCompanionTour: "startNeoCompanionTour",
    openLearnHub: "openLearnHub",
    closeLearnHub: "closeLearnHub",
    dismissGuardiaV7UpgradeCard: "dismissGuardiaV7UpgradeCard"
  },
  ensureSettingsHelpLoaded
);
var platformHandlerNames = {
  lockClinicalDatabaseNow: "lockClinicalDatabaseNow",
  verifyForensicAuditChain: "verifyForensicAuditChain",
  exportClinicalDbBackupJson: "exportClinicalDbBackupJson",
  exportClinicalDbBackupDb: "exportClinicalDbBackupDb",
  exportAuditLog: "exportAuditLog",
  exportMedCatalogBundle: "exportMedCatalogBundle",
  triggerImportMedCatalog: "triggerImportMedCatalog",
  onMedCatalogFileChosen: "onMedCatalogFileChosen",
  openUserDataFolderFromSettings: "openUserDataFolderFromSettings",
  onIdleLockSelectChange: "onIdleLockSelectChange",
  changeIdleLockPin: "changeIdleLockPin",
  submitIdleLockPin: "submitIdleLockPin",
  openWipeDataModal: "openWipeDataModal",
  closeWipeDataModal: "closeWipeDataModal",
  wipeCacheConfirmed: "wipeCacheConfirmed",
  wipeAllConfirmed: "wipeAllConfirmed",
  updateAutoBackupSettingsFromUi: "updateAutoBackupSettingsFromUi",
  runAutoBackupNow: "runAutoBackupNow",
  exportDataBackup: "exportDataBackup",
  exportActivePatientBackup: "exportActivePatientBackup",
  exportRangeBackupPrompt: "exportRangeBackupPrompt",
  triggerImportRangeBackup: "triggerImportRangeBackup",
  onRangeBackupFileChosen: "onRangeBackupFileChosen",
  exportSyncBundlePrompt: "exportSyncBundlePrompt",
  triggerImportSyncBundle: "triggerImportSyncBundle",
  onSyncBundleFileChosen: "onSyncBundleFileChosen",
  triggerImportActivePatientBackup: "triggerImportActivePatientBackup",
  triggerImportBackup: "triggerImportBackup",
  onPatientBackupFileChosen: "onPatientBackupFileChosen",
  importBundledDemoPerez: "importBundledDemoPerez",
  onBackupFileChosen: "onBackupFileChosen",
  restorePreimportBackupPrompt: "restorePreimportBackupPrompt",
  checkForAppUpdates: "checkForAppUpdates",
  checkForRepairUpdate: "checkForRepairUpdate",
  setUpdateChannel: "setUpdateChannel",
  setUpdateTelemetryEnabled: "setUpdateTelemetryEnabled",
  onHardwareAccelerationChange: "onHardwareAccelerationChange",
  installUpdate: "installUpdate",
  hideUpdateModal: "hideUpdateModal"
};
var platformWindowHandlersLazy = buildLazyWindowHandlers(
  platformHandlerNames,
  ensurePlatformLoaded
);
async function registerLazyFeatureRuntimesBody(ctx) {
  const [platformMod, settingsMod] = await Promise.all([
    ensurePlatformLoaded(),
    ensureSettingsHelpLoaded()
  ]);
  platformMod.registerPlatformRuntime(ctx);
  settingsMod.registerSettingsHelpRuntime(ctx);
  patchWindowHandlers(settingsMod.settingsHelpWindowHandlers);
  patchWindowHandlers(platformMod.platformWindowHandlers);
}
async function registerLazyFeatureRuntimes(ctx) {
  if (isMobileWeb()) {
    void registerLazyFeatureRuntimesBody(ctx);
    return;
  }
  return registerLazyFeatureRuntimesBody(ctx);
}

// public/js/app-runtimes.mjs
var rt3 = {
  getActiveId() {
    return null;
  },
  setActiveId(_id) {
  },
  getActiveAppTab() {
    return "lab";
  },
  setActiveAppTab(_v) {
  },
  getActiveInner() {
    return "todo";
  },
  setActiveInner(_v) {
  },
  getSettings() {
    return {};
  },
  setSettingsRef(_s) {
  }
};
var v3MigratedThisBoot = false;
function wasV3MigratedThisBoot() {
  return v3MigratedThisBoot;
}
function getAppRuntimeContext() {
  return rt3;
}
function registerAppRuntimeContext(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt3, ctx);
}
function installAppRuntimeContextDeps() {
  Object.assign(rt3, {
    showToast,
    navigateToEstadoActualPanel,
    refreshMedPanel: function refreshMedPanel() {
      renderMedRecetaPanel();
    },
    syncWorkContextChrome,
    renderMedRecetaPanel,
    renderLabHistoryPanel,
    renderProcedureAgendaPanel,
    setMedTabAttention,
    ensureParsedLabHistory,
    ensureParsedLabHistoryCached,
    splitResLabsByTipo,
    primaryTipoForLabSet,
    formatLabHistoryListMeta: function(set) {
      return formatLabHistoryListMeta(set, inferFechaLabSetFromId);
    },
    switchAppTab,
    renderPatientList,
    scrollActiveRondaCardIntoView,
    renderGuardiaBoard: function() {
      return renderGuardiaBoard(rt3.getSettings());
    },
    syncLabOutputChrome,
    setRoundOverviewMode,
    renderPaseBoard,
    getActiveLab: function() {
      return getActiveLab();
    },
    consumeActiveLab: function() {
      var x = getActiveLab();
      setActiveLab(null);
      return x;
    },
    restoreActiveLab: function(x) {
      setActiveLab(x);
    },
    clearLabOutputUi: clearLabWorkbenchMinimalDom,
    renderInnerTabs,
    invalidateInnerTabRenderCache,
    refreshExpedienteAfterPatientSelect,
    renderEstadoActualButton,
    renderPatientDataPane,
    renderNoteForm,
    renderIndicaForm,
    renderListadoForm,
    refreshTendenciasOrCultivosPanel,
    switchInnerTab,
    syncInnerTabVisualOnly,
    renderTodoForm,
    limpiarReporte,
    setLabHistoryPanelCollapsed,
    syncLabHistoryCollapseUI,
    rpcPrefersReducedMotion,
    refreshAllTodoUIs,
    renderVpo,
    renderRecetaHu,
    pushUndoSnapshot,
    addAuditEntry,
    applyDefaultsToNewPatient,
    applyDefaultsToNewIndicaciones,
    enviarLabsANota,
    normalizeFechaLabHistory,
    rerenderParsedLabOutputAfterPrefsChange,
    buildLabSetDateLine,
    getRoundOverviewMode,
    saveState,
    emitLiveSyncTodoUpsert,
    requestDocumentJson,
    handleDocumentGenerateResponse,
    guardMobileDocExport,
    isRpcOffline,
    incrementPendingJobs,
    decrementPendingJobs,
    syncOfflineButtonStates,
    syncTeamSyncHeaderButton,
    syncPreimportBackupUi,
    syncSettingsLanHostDiskSection,
    closeProfileModal,
    openProfileModal,
    openAddModalFromLabPatient,
    copyToClipboardSafe,
    renderTendencias,
    renderRoundOverviewPanels,
    switchConsolidatedTab,
    getActivePatient: function() {
      var id = rt3.getActiveId();
      if (!id) return null;
      return patients.find(function(p) {
        return String(p.id) === String(id);
      }) || null;
    },
    applyParsed: function(parsed, opts) {
      opts = opts || {};
      if (opts.fromNestedPaste) {
        applyEstadoActualParsedToForm(parsed);
        var recorded = document.getElementById("ea-recorded-at");
        if (recorded && "value" in recorded) {
          recorded.value = toDatetimeLocalValue(getDefaultRegistroRecordedAt());
        }
        return;
      }
      navigateToEstadoActualPanel();
      renderEstadoActualPanel({
        onReady: function() {
          openEstadoActualRegistroModal({ preserveForm: true });
          applyEstadoActualParsedToForm(parsed);
          var recorded2 = document.getElementById("ea-recorded-at");
          if (recorded2 && "value" in recorded2) {
            recorded2.value = toDatetimeLocalValue(getDefaultRegistroRecordedAt());
          }
        }
      });
    },
    ensureForm: ensureEaRegistroModalForm,
    syncGluMode: syncEaRegistroGluMode,
    resetForm: function() {
      var activeId2 = rt3.getActiveId();
      var patient = activeId2 && patients.find(function(p) {
        return p.id === activeId2;
      });
      resetEaRegistroForm(patient || null);
    },
    selectPatient,
    onboardingAdvanceAfterParse,
    onboardingAdvanceAfterSend,
    tourAfterBulkLabParse,
    tourOnBulkPreviewPatientSaved,
    findPatientByRegistro,
    openPaseSectionInNormal,
    renderDiagramas,
    closeSettingsDropdown,
    extractParsedValues,
    buildParsedBySectionFromResLabs,
    rebuildEstudiosFromLabHistory,
    inferFechaLabSetFromId,
    dayKeyFromLabSet,
    labSetIsFromSome,
    removeAtbRisPanelsFromBody,
    wireAtbRisHoverPanels,
    getLabOutputPrefs,
    isGasoInterpretacionResLabChunk,
    isAscitisInterpretacionResLabChunk,
    ascitisInterpretacionBody_,
    formatBhExtendedTabLine,
    isBhMainResLabChunk,
    isResLabChunkPureCultivo,
    buildCultivoOutputHtmlFragments,
    rebuildBulkLabPreviewBlocks: function(text) {
      return buildBulkLabPreview(text, { findPatientByRegistro });
    },
    getBulkLabPreviewSourceText,
    isBulkLabPreviewModalOpen,
    openAddModal,
    advanceRondaPatient,
    isMobileWeb,
    ensureUniquePatientName,
    applyImportEntry,
    buildPatientEntry,
    onMedicionRegistered: function() {
      guidedTourAdvanceAfter("estado_actual_registro");
    },
    guidedTourAdvanceAfterNotaGenerated,
    guidedTourAdvanceAfterIndicaGenerated,
    launchConfetti,
    renderEstadoActualBar
  });
}
async function registerAllFeatureRuntimes() {
  installAppRuntimeContextDeps();
  var ctx = getAppRuntimeContext();
  registerMedicationsRuntime(ctx);
  registerMedPharmProfileRuntime(ctx);
  registerProfileRuntime(ctx);
  registerPaseBoardRuntime(ctx);
  registerChromeRuntime(ctx);
  registerPatientsRuntime(ctx);
  v3MigratedThisBoot = migrateToV3(rt3.getSettings());
  if (v3MigratedThisBoot) storage.saveSettings(rt3.getSettings());
  await registerLazyFeatureRuntimes(ctx);
  registerLabHistoryMaintRuntime(ctx);
  installLabHistoryAuditHook();
  registerLanSaveHooks({ scheduleLabHistoryPostSaveMaintenance });
  registerTendenciasRuntime(ctx);
  registerTodosRuntime(ctx);
  registerVpoRuntime(ctx);
  registerRecetaHuRuntime(ctx);
  registerCensoRuntime(ctx);
  registerHistoriaClinicaRuntime(ctx);
  registerEventualidadesRuntime(ctx);
  registerExpedienteRuntime(ctx);
  registerNotesIndicacionesRuntime(ctx);
  registerProcedureAgendaRuntime(ctx);
  registerSoapEstadoRuntime(ctx);
  registerEstadoActualPanelRuntime(ctx);
  registerDriveImportRuntime(ctx);
  registerEstadoActualPasteModalRuntime(ctx);
  registerEstadoActualRegistroModalRuntime(ctx);
  registerLabPanelRuntime(ctx);
  registerLabBulkPreviewModalRuntime(ctx);
  registerLabHistoryBatchCopyRuntime(ctx);
  registerProductivityRuntime(ctx);
  registerLanRuntime(ctx);
}
function runInitialFeatureBoot() {
  initChromeAppearance();
  syncLabHistoryCollapseUI();
  wireEstadoActualPasteModal();
  wireDriveImportModal();
  wireEaModalDismiss();
  syncCensoExportButtonVisibility();
}

// public/js/boot/boot-steps.mjs
async function runBootSteps(steps, ctx) {
  for (const step of steps) {
    try {
      await step.run(ctx);
    } catch (err) {
      console.error("[boot]", step.id, err);
      throw err;
    }
  }
}

// public/js/app.js
var allWindowHandlers = Object.assign(
  {},
  dbUnlockWindowHandlers,
  windowHandlers16,
  windowHandlers15,
  windowHandlers13,
  windowHandlers5,
  windowHandlers4,
  windowHandlers17,
  windowHandlers,
  windowHandlers6,
  windowHandlers7,
  windowHandlers18,
  windowHandlers8,
  windowHandlers10,
  windowHandlers11,
  windowHandlers3,
  productivityWindowHandlers,
  settingsHelpWindowHandlersLazy,
  platformWindowHandlersLazy,
  tendenciasWindowHandlers,
  todosWindowHandlers,
  recetaHuWindowHandlers,
  windowHandlers12,
  medicationsWindowHandlers,
  profileWindowHandlers,
  windowHandlers2,
  windowHandlers14,
  windowHandlers9,
  appShellWindowHandlers,
  {
    showToast,
    loadSettings,
    resumeClinicalSession: function() {
      return resumeClinicalSession(settings, getClinicalClientId());
    }
  }
);
try {
  Object.assign(window, allWindowHandlers);
} catch (assignErr) {
  console.error("[R+] No se pudieron registrar handlers en window:", assignErr);
}
var appStateReady = (async function loadClinicalStateOnBoot() {
  if (isDbMode()) {
    const unlockResult = await ensureClinicalDbUnlocked();
    if (unlockResult && unlockResult.unlocked) {
      await bootHydrateFromDb();
      try {
        const { flushPendingClinicalOpsLanSnapshot } = await import("/js/chunks/clinical-ops-lan-QVYORILC.js");
        const flushed = await flushPendingClinicalOpsLanSnapshot();
        if (flushed.changed && typeof document !== "undefined") {
          document.dispatchEvent(new CustomEvent("rpc-clinical-ops-synced"));
        }
      } catch (_eOps) {
      }
    } else {
      console.warn(
        "[R+] Clinical DB not ready at boot:",
        unlockResult && unlockResult.reason || "locked"
      );
      initAppState();
    }
  } else {
    initAppState();
  }
})();
setSaveStateHooks({
  onSaveResult(result) {
    if (!result || result.ok) {
      if (result && result.level === "warn") {
        showToast(
          "El almacenamiento local est\xE1 casi lleno. Archiva pacientes egresados, exporta un respaldo y elimina duplicados de labs.",
          "error"
        );
      }
      return;
    }
    if (result.code === "QUOTA_EXCEEDED") {
      showToast(
        "No se pudo guardar: almacenamiento local lleno. Exporta un respaldo JSON, archiva o elimina historial de labs antes de seguir.",
        "error"
      );
    }
  }
});
window.addEventListener("beforeunload", function() {
  flushSaveState();
});
document.addEventListener("visibilitychange", function() {
  if (document.visibilityState === "hidden") flushSaveState();
});
var activeId = null;
var activeInner = "todo";
var activeAppTab = "lab";
var settings = hydrateProfileSettings(storage.getSettings());
attachProfileSettingsGetter(function() {
  return settings;
});
registerAppShellContext({
  getActiveId: function() {
    return activeId;
  },
  getActiveAppTab: function() {
    return activeAppTab;
  },
  getActiveInner: function() {
    return activeInner;
  },
  getSettings: function() {
    return settings;
  }
});
registerAppRuntimeContext({
  getActiveId: function() {
    return activeId;
  },
  setActiveId: function(id) {
    activeId = id;
  },
  getActiveAppTab: function() {
    return activeAppTab;
  },
  setActiveAppTab: function(v) {
    activeAppTab = v;
  },
  getActiveInner: function() {
    return activeInner;
  },
  setActiveInner: function(v) {
    activeInner = v;
  },
  getSettings: function() {
    return settings;
  }
});
async function registerFeatureRuntimesForBoot() {
  if (isMobileWeb()) {
    void registerAllFeatureRuntimes();
    runInitialFeatureBoot();
    return;
  }
  await registerAllFeatureRuntimes();
  runInitialFeatureBoot();
}
appStateReady.then(async function() {
  try {
    await registerFeatureRuntimesForBoot();
  } catch (bootErr) {
    console.error("[R+] Error registrando runtimes de features:", bootErr);
  }
}).catch(async function(stateErr) {
  console.error("[R+] Error cargando estado cl\xEDnico:", stateErr);
  try {
    initAppState();
    await registerFeatureRuntimesForBoot();
  } catch (bootErr) {
    console.error("[R+] Error registrando runtimes de features:", bootErr);
  }
});
function getClinicalClientId() {
  return resolveClinicalClientId(settings);
}
function syncHeaderTodayDate() {
  var todayEl = document.getElementById("today-date");
  if (!todayEl) return;
  var d = /* @__PURE__ */ new Date();
  var long = d.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  var compact = d.toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  var narrow = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 920px)").matches;
  todayEl.textContent = narrow ? compact : long;
  todayEl.title = long;
}
var CLINICAL_DB_BOOT_STEPS = [
  {
    id: "clinical-access-init",
    async run(ctx) {
      await initClinicalAccessRuntime(ctx.settings, ctx.getClinicalClientId());
    }
  },
  {
    id: "onboarding-dynamic-import",
    async run() {
      loadSettings();
      const mod = await import("/js/chunks/clinical-onboarding-main-6BAEIL4V.js");
      await mod.showMainClinicalOnboarding();
    }
  },
  {
    id: "clinical-teams-dynamic-import",
    async run(ctx) {
      wireClinicalRotationEntryControls();
      wireClinicalTeamsControls();
      syncClinicalRotationEntryChrome();
      syncGuardiaModeButtonVisibility();
      ctx.teamsMod = await import("/js/chunks/clinical-teams-ID3YITEV.js");
    }
  },
  {
    id: "consume-team-join-url",
    async run(ctx) {
      const teamsMod = ctx.teamsMod;
      if (teamsMod && typeof teamsMod.consumeClinicalTeamJoinFromUrl === "function") {
        await teamsMod.consumeClinicalTeamJoinFromUrl();
      }
    }
  }
];
function runDomBoot() {
  appStateReady.then(function() {
    runDomBootAfterState();
  }).catch(function() {
    runDomBootAfterState();
  });
}
function runDomBootAfterState() {
  try {
    let finishPatientListBoot = function() {
      void import("/js/chunks/clinical-access-runtime-WPSDP3GD.js").then(function(mod) {
        if (typeof mod.refreshClinicalPatientListForScope === "function") {
          return mod.refreshClinicalPatientListForScope();
        }
        renderPatientList();
      }).catch(function() {
        renderPatientList();
      }).then(function() {
        if (patients.length > 0) selectPatient(patients[0].id);
        else renderLabHistoryPanel();
      });
    };
    tryMountClinicalTeamInviteBrowserGate();
    if (recoverPresentationPatientsOnBoot()) {
      showToast("Se restaur\xF3 tu lista de pacientes tras el modo presentaci\xF3n.", "info");
    }
    initModalDismiss();
    syncHeaderTodayDate();
    if (!window._rpcHeaderDateResizeWired) {
      window._rpcHeaderDateResizeWired = true;
      window.addEventListener("resize", syncHeaderTodayDate);
    }
    loadSettings();
    syncWorkContextChrome();
    seedTendHiddenDefaults();
    syncMainAppTabA11y(activeAppTab);
    renderInnerTabs();
    initTabBarMotion();
    if (wasV3MigratedThisBoot() && !isMobileWeb() && !(window.electronAPI && typeof window.electronAPI.isLanDevPeer === "function" && window.electronAPI.isLanDevPeer())) {
      setTimeout(function() {
        try {
          showToast("R+ 3.0 \u2014 Sala activado por defecto. Cambia en Mi Perfil \u2192 Aplicaci\xF3n.");
        } catch (_e) {
        }
      }, 800);
    }
    scheduleDeferredShellInits();
    scheduleDeferredUiInits();
    initRpcDatePicker();
    _rpcDeferInit(initSidebarAutoHide);
    _rpcDeferInit(initPatientModalEnterSave);
    syncProfileSectionVisibility();
    wireHeaderAppModeChip();
    if (isDbMode()) {
      void runBootSteps(CLINICAL_DB_BOOT_STEPS, {
        settings,
        getClinicalClientId,
        teamsMod: null
      }).then(finishPatientListBoot).catch(function(err) {
        console.warn("[R+] Clinical access runtime init:", err && err.message);
        finishPatientListBoot();
      });
    } else {
      finishPatientListBoot();
    }
  } catch (domErr) {
    console.error("[R+] Error en arranque de UI:", domErr);
  }
}
function wireHeaderAppModeChip() {
  var chip = document.getElementById("header-app-mode-chip");
  if (!chip || chip._rpcModeChipWired) return;
  chip._rpcModeChipWired = true;
  chip.addEventListener("click", function(ev) {
    ev.preventDefault();
    toggleHeaderWorkMode();
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runDomBoot);
} else {
  runDomBoot();
}
function _rpcDeferInit(fn) {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(
      function() {
        try {
          fn();
        } catch (e) {
          console.error("deferInit error:", e && e.message);
        }
      },
      { timeout: 1500 }
    );
  } else {
    setTimeout(function() {
      try {
        fn();
      } catch (e) {
        console.error("deferInit error:", e && e.message);
      }
    }, 200);
  }
}
//# sourceMappingURL=/js/app.bundle.js.map
