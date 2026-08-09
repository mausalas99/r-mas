import {
  productivityWindowHandlers,
  pushUndoSnapshot,
  registerProductivityRuntime
} from "/mobile/js/chunks/chunk-MC5FRQ6S.js";
import {
  registerProcedureAgendaRuntime,
  renderProcedureAgendaPanel,
  windowHandlers as windowHandlers12
} from "/mobile/js/chunks/chunk-CWKH3SU2.js";
import {
  appShellWindowHandlers,
  initModalDismiss,
  registerAppShellContext,
  rpcPrefersReducedMotion,
  scheduleDeferredShellInits,
  scheduleDeferredUiInits,
  setMedTabAttention,
  showToast,
  syncWorkContextChrome
} from "/mobile/js/chunks/chunk-5N4H3KGM.js";
import {
  recoverPresentationPatientsOnBoot
} from "/mobile/js/chunks/chunk-5AYFIESA.js";
import {
  advanceRondaPatient,
  applyDefaultsToNewIndicaciones,
  applyDefaultsToNewPatient,
  applyDriveImportEventualidades,
  applyDriveImportLabSets,
  applyEstadoActualParsedToForm,
  attachProfileSettingsGetter,
  buildBulkLabPreview,
  buildCultivoOutputHtmlFragments,
  buildEstudiosCopyLinesFromLabSets,
  buildLabSetDateLine,
  buildPatientEntry,
  closeProfileModal,
  configureLanPatientEntries,
  copyToClipboardSafe,
  dayKeyFromLabSet,
  ensureActivePatientInSidebarScope,
  ensureEaRegistroModalForm,
  ensureParsedLabHistory,
  ensureParsedLabHistoryCached,
  ensureUniquePatientName,
  filterPatientsForGuardiaCensus,
  findPatientByRegistro,
  formatLabHistoryDateSelectLabel,
  formatLabHistoryListMeta,
  generatePatientId,
  getBulkLabPreviewSourceText,
  getRoundOverviewMode,
  groupLabHistoryByDay,
  guardMobileDocExport,
  handleDocumentGenerateResponse,
  hydrateProfileSettings,
  initClinicalAccessRuntime,
  initPatientModalEnterSave,
  initSidebarAutoHide,
  initTabBarMotion,
  installLabHistoryAuditHook,
  invalidateEventualidadesPanel,
  invalidateInnerTabRenderCache,
  isBulkLabPreviewModalOpen,
  isResLabChunkPureCultivo,
  labSetIsFromSome,
  loadSettings,
  medicationsWindowHandlers,
  navigateToEstadoActualPanel,
  openAddModal,
  openAddModalFromLabPatient,
  openEstadoActualRegistroModal,
  openPaseSectionInNormal,
  openProfileModal,
  primaryTipoForLabSet,
  profileWindowHandlers,
  rebuildEstudiosFromLabHistory,
  recetaHuWindowHandlers,
  refreshExpedienteAfterPatientSelect,
  refreshTendenciasOrCultivosPanel,
  registerCensoRuntime,
  registerEstadoActualPasteModalRuntime,
  registerEstadoActualRegistroModalRuntime,
  registerExpedienteRuntime,
  registerLabBulkPreviewModalRuntime,
  registerLabHistoryMaintRuntime,
  registerMedPharmProfileRuntime,
  registerMedicationsRuntime,
  registerNotesIndicacionesRuntime,
  registerPatientsRuntime,
  registerProfileRuntime,
  registerRecetaHuRuntime,
  registerSoapEstadoRuntime,
  registerVpoRuntime,
  removeAtbRisPanelsFromBody,
  renderDiagramas,
  renderEstadoActualBar,
  renderEstadoActualButton,
  renderEstadoActualPanel,
  renderEventualidadesPanel,
  renderGuardiaBoard,
  renderIndicaForm,
  renderInnerTabs,
  renderListadoForm,
  renderMedRecetaPanel,
  renderNoteForm,
  renderPaseBoard,
  renderPatientDataPane,
  renderPatientList,
  renderRecetaHu,
  renderRoundOverviewPanels,
  renderVpo,
  requestDocumentJson,
  resetEaRegistroForm,
  resumeClinicalSession,
  scrollActiveRondaCardIntoView,
  selectPatient,
  setRoundOverviewMode,
  splitResLabsByTipo,
  suspendLabBulkPreviewModal,
  switchAppTab,
  switchConsolidatedTab,
  switchInnerTab,
  syncCensoExportButtonVisibility,
  syncClinicalRotationEntryChrome,
  syncEaRegistroGluMode,
  syncGuardiaModeButtonVisibility,
  syncInnerTabVisualOnly,
  syncLabDiagramsCollapseUI,
  syncMainAppTabA11y,
  syncProfileSectionVisibility,
  syncSettingsLanHostDiskSection,
  todosWindowHandlers,
  toggleLabDiagramsSection,
  tryMountClinicalTeamInviteBrowserGate,
  windowHandlers,
  windowHandlers10 as windowHandlers9,
  windowHandlers11 as windowHandlers10,
  windowHandlers12 as windowHandlers11,
  windowHandlers13,
  windowHandlers2,
  windowHandlers3,
  windowHandlers4,
  windowHandlers5,
  windowHandlers7 as windowHandlers6,
  windowHandlers8 as windowHandlers7,
  windowHandlers9 as windowHandlers8,
  wireAtbRisHoverPanels,
  wireClinicalRotationEntryControls,
  wireClinicalTeamsControls,
  wireEaModalDismiss,
  wireEstadoActualPasteModal
} from "/mobile/js/chunks/chunk-JHCY7JRY.js";
import "/mobile/js/chunks/chunk-SITKK64L.js";
import {
  buildParsedBySectionFromResLabs,
  extractParsedValues
} from "/mobile/js/chunks/chunk-TKGLBZLP.js";
import "/mobile/js/chunks/chunk-DID5RG6K.js";
import {
  dbUnlockWindowHandlers,
  describeClinicalDbBootFailure,
  ensureClinicalDbUnlocked
} from "/mobile/js/chunks/chunk-YFGSR2LP.js";
import "/mobile/js/chunks/chunk-HZLTCETY.js";
import {
  bindLazyChartsRuntimeCtx,
  bindLazyEaVitalHistoryRuntimeCtx,
  bindLazyLabsRuntimeCtx,
  bindLazyPlatformRuntimeCtx,
  bindLazySettingsRuntimeCtx,
  chartsRuntimeProxies,
  chartsWindowHandlersLazy,
  clinicalSyncModeSettingsHandlersLazy,
  commandPaletteWindowHandlersLazy,
  eaVitalHistoryWindowHandlersLazy,
  ensureLabsLoaded,
  labPanelWindowHandlersLazy,
  labsRuntimeProxies,
  platformRuntimeProxies,
  platformWindowHandlersLazy,
  registerLazyFeatureRuntimes,
  settingsHelpRuntimeProxies,
  settingsHelpWindowHandlersLazy
} from "/mobile/js/chunks/chunk-TERSLZ3P.js";
import "/mobile/js/chunks/chunk-WQ6PPSIC.js";
import {
  registerEstadoActualPanelRuntime
} from "/mobile/js/chunks/chunk-MUKCCNIH.js";
import "/mobile/js/chunks/chunk-SYWZMYIW.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-XWOEH37S.js";
import "/mobile/js/chunks/chunk-ZJ5Q2DYI.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-PZEHK5VE.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-YQDSERQQ.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-3QKGKUYY.js";
import "/mobile/js/chunks/chunk-ARCLVSLZ.js";
import "/mobile/js/chunks/chunk-V25HP6NK.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import {
  refreshAllTodoUIs,
  refreshTodoUIsForPatient,
  refreshTodoUIsForPatients,
  registerTodosRuntime,
  renderTodoForm
} from "/mobile/js/chunks/chunk-CFQPZQBI.js";
import {
  initRpcDatePicker
} from "/mobile/js/chunks/chunk-VL2HB7CD.js";
import {
  enqueueCloudTodoUpsert,
  scheduleCloudSyncPush
} from "/mobile/js/chunks/chunk-QJ4AKPQ5.js";
import {
  initChromeAppearance,
  launchConfetti,
  registerChromeRuntime,
  windowHandlers as windowHandlers14
} from "/mobile/js/chunks/chunk-72XICSYX.js";
import {
  migrateToV3
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-RQX7XEPZ.js";
import {
  bootHydrateFromDb,
  clearWebSessionClinicalMemory,
  flushSaveState,
  initAppState,
  labHistory,
  patients,
  registerEventualidadesRuntime,
  saveState,
  setSaveStateHooks
} from "/mobile/js/chunks/chunk-4VEBEOGH.js";
import "/mobile/js/chunks/chunk-FKV7DR6T.js";
import {
  storage
} from "/mobile/js/chunks/chunk-PGT753Q4.js";
import "/mobile/js/chunks/chunk-KYGE5G3V.js";
import "/mobile/js/chunks/chunk-PMCRNWVY.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-ISXDOTEU.js";
import {
  filterNewEventualidades,
  normalizeFechaLabHistory,
  sortLabHistoryChronological
} from "/mobile/js/chunks/chunk-GJK2JHBF.js";
import {
  getDefaultRegistroRecordedAt,
  toDatetimeLocalValue
} from "/mobile/js/chunks/chunk-URXNXYS2.js";
import {
  esc,
  escapeHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-YSMCQRZC.js";
import "/mobile/js/chunks/chunk-AWQNHSEL.js";
import {
  resolveClinicalClientId
} from "/mobile/js/chunks/chunk-QY3EXE2C.js";
import "/mobile/js/chunks/chunk-NT3TRJXB.js";
import {
  registerPaseBoardRuntime
} from "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-EJ66PJTG.js";
import {
  isDbMode,
  isElectronDesktopShell,
  isWebClinicalClient
} from "/mobile/js/chunks/chunk-QHIEC6QJ.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-CAVI7UGR.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";

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
function buildBatchCopyListHtml(groups) {
  return groups.map(function(group) {
    return '<li style="margin:6px 0;"><label style="cursor:pointer;display:flex;gap:8px;align-items:flex-start;"><input type="checkbox" class="lab-batch-copy-cb" data-day-key="' + esc(group.dayKey) + '" style="margin-top:3px;flex-shrink:0;" /><span>' + esc(group.label) + "</span></label></li>";
  }).join("");
}
function buildBatchCopyModalHtml(listHtml) {
  return '<div class="lab-conflict-modal" style="max-width:560px;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;"><h3 style="margin:0 0 8px;">Copiar varios d\xEDas</h3><p style="font-size:13px;line-height:1.45;margin:0 0 10px;color:var(--text-muted);">Marca los d\xEDas que quieres copiar. El texto usa el mismo formato que el bloque <strong>Estudios</strong> del expediente (laboratorio y cultivos por d\xEDa).</p><div style="overflow-y:auto;flex:0 1 auto;max-height:28vh;padding-right:4px;"><ul style="margin:0;padding-left:0;list-style:none;font-size:13px;">' + listHtml + '</ul></div><p id="lab-batch-copy-count" style="font-size:12px;color:var(--text-muted);margin:10px 0 6px;">Ning\xFAn d\xEDa seleccionado \u2014 marca al menos uno para copiar</p><textarea id="lab-batch-copy-preview" readonly rows="8" placeholder="La vista previa aparece al seleccionar uno o m\xE1s d\xEDas arriba." style="width:100%;box-sizing:border-box;font-family:ui-monospace,monospace;font-size:12px;line-height:1.4;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);resize:vertical;flex:1;min-height:120px;"></textarea><div style="display:flex;gap:10px;margin-top:14px;justify-content:flex-end;flex-wrap:wrap;"><button type="button" id="lab-batch-copy-none" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Quitar todas</button><button type="button" id="lab-batch-copy-all" style="background:transparent;border:1px solid var(--border);border-radius:6px;padding:8px 14px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Seleccionar todas</button><button type="button" id="lab-batch-copy-cancel" style="background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:var(--text);">Cancelar</button><button type="button" id="lab-batch-copy-ok" disabled aria-disabled="true" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:not-allowed;opacity:0.55;">Copiar al portapapeles</button></div></div>';
}
function wireBatchCopyModal(backdrop, loaded) {
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
  backdrop.innerHTML = buildBatchCopyModalHtml(buildBatchCopyListHtml(loaded.groups));
  document.body.appendChild(backdrop);
  wireBatchCopyModal(backdrop, loaded);
}
var windowHandlers15 = {
  openLabHistoryBatchCopyModal
};

// public/js/features/drive-import-modal/drive-import-state.mjs
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
var driveImportState = {
  debounceId: null,
  autoReviewPending: false,
  importBusy: false,
  /** @type {'paste' | 'review'} */
  modalStep: "paste",
  /** @type {import('../../../../lib/drive-import/drive-import-review.mjs').DriveImportReviewStep[]} */
  reviewSteps: [],
  reviewIndex: 0
};
function registerDriveImportRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt2, ctx);
}
function getDriveImportRuntime() {
  return rt2;
}
function resetDriveImportSession() {
  driveImportState.reviewSteps = [];
  driveImportState.reviewIndex = 0;
  driveImportState.autoReviewPending = false;
  driveImportState.importBusy = false;
}

// public/js/features/drive-import-modal/drive-import-dom.mjs
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

// public/js/features/drive-import-modal/drive-import-modal-step.mjs
function syncConfirmLabel() {
  const btn = document.getElementById("drive-import-confirm");
  const modeFs = document.getElementById("drive-import-mode-fieldset");
  const rt4 = getDriveImportRuntime();
  const patient = rt4.getActivePatient();
  if (modeFs) modeFs.style.display = patient ? "" : "none";
  if (!btn || driveImportState.modalStep !== "paste") return;
  btn.textContent = "Revisar secciones\u2026";
}
function setModalStep(step, hooks) {
  driveImportState.modalStep = step;
  const modal = getModalEl();
  const pasteEl = document.getElementById("drive-import-step-paste");
  const reviewEl = document.getElementById("drive-import-step-review");
  const actionsPaste = document.getElementById("drive-import-actions-paste");
  const actionsReview = document.getElementById("drive-import-actions-review");
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
  if (step === "review" && hooks && typeof hooks.updateDocSummary === "function") {
    hooks.updateDocSummary();
  }
  syncConfirmLabel();
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
function focusPasteTextareaEnd() {
  const ta = getTextarea();
  if (!ta) return;
  ta.focus();
  try {
    ta.setSelectionRange(ta.value.length, ta.value.length);
  } catch {
  }
}

// lib/drive-import/normalize.mjs
function normalizeDrivePaste(text) {
  return String(text == null ? "" : text).replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

// lib/drive-import/segment.mjs
var DATE_ONLY_RE = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\s*$/;
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
function applySectionHeader(hit, ctx) {
  ctx.flushSection();
  if (hit.key === "estadoActual") {
    if (ctx.inEventualidades) {
      ctx.flushEventualidadesBlock();
      ctx.inEventualidades = false;
    }
    ctx.inEstadoActual = true;
    ctx.currentKey = "estadoActual";
    ctx.warnings.push("ESTADO ACTUAL detectado: no se importar\xE1 en v1.");
    return;
  }
  if (ctx.inEstadoActual && hit.key !== "estadoActual") {
    ctx.inEstadoActual = false;
  }
  if (hit.key === "eventualidades") {
    if (ctx.inEventualidades) ctx.flushEventualidadesBlock();
    ctx.inEventualidades = true;
    ctx.inEstadoActual = false;
    ctx.currentKey = "eventualidades";
    return;
  }
  if (ctx.inEventualidades && hit.key !== "eventualidades") {
    ctx.flushEventualidadesBlock();
    ctx.inEventualidades = false;
  }
  ctx.currentKey = hit.key;
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
  const ctx = {
    get currentKey() {
      return currentKey;
    },
    set currentKey(v) {
      currentKey = v;
    },
    get inEstadoActual() {
      return inEstadoActual;
    },
    set inEstadoActual(v) {
      inEstadoActual = v;
    },
    get inEventualidades() {
      return inEventualidades;
    },
    set inEventualidades(v) {
      inEventualidades = v;
    },
    warnings,
    flushSection,
    flushEventualidadesBlock
  };
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
      applySectionHeader(hit, ctx);
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
function resolveHeaderEdad(idEdad, pipeEdad) {
  const edadMatch = /(\d+)/.exec(String(idEdad || ""));
  return edadMatch ? edadMatch[1] : pipeEdad || "";
}
function mergeHeader(pipe, ficha) {
  const id = ficha.identificacion || {};
  return {
    cama: pipe?.cama || "",
    nombre: id.nombre || pipe?.nombre || "",
    edad: resolveHeaderEdad(id.edad, pipe?.edad),
    registro: id.registro || pipe?.registro || "",
    resumenDx: pipe?.resumenDx || "",
    sexo: ficha.sexo || "",
    identificacion: Object.assign({}, id)
  };
}

// lib/drive-import/hc-catalog-constants.mjs
var APP_DEDICATED_IDS = /* @__PURE__ */ new Set([
  "cirugias",
  "transfusiones",
  "traumaticos",
  "alergias"
]);
var AHF_RELATIVES = [
  { id: "madre", label: "Madre", group: "padres" },
  { id: "padre", label: "Padre", group: "padres" },
  { id: "abuela_paterna", label: "Abuela paterna", group: "abuelos" },
  { id: "abuelo_paterno", label: "Abuelo paterno", group: "abuelos" },
  { id: "abuela_materna", label: "Abuela materna", group: "abuelos" },
  { id: "abuelo_materno", label: "Abuelo materno", group: "abuelos" },
  { id: "hermano", label: "Hermano", group: "hermanos" },
  { id: "hermana", label: "Hermana", group: "hermanos" },
  { id: "hijo", label: "Hijo", group: "hijos" },
  { id: "hija", label: "Hija", group: "hijos" }
];

// lib/drive-import/hc-structured-patterns.mjs
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
var AHF_RELATIVE_LABEL_MAP = Object.fromEntries(
  AHF_RELATIVES.map(function(rel) {
    return [rel.label.toUpperCase(), rel.id];
  }).concat([
    ["ABUELA", "abuela_materna"],
    ["ABUELO", "abuelo_materno"]
  ])
);
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

// lib/drive-import/catalogs/app-conditions.json
var app_conditions_default = {
  parotiditis: "Parotiditis",
  paperas: "Paperas",
  sarampion: "Sarampi\xF3n",
  varicela: "Varicela",
  rubeola: "Rub\xE9ola",
  tuberculosis: "Tuberculosis",
  hepatitis: "Hepatitis",
  vih: "VIH/SIDA",
  hipertension: "Hipertensi\xF3n arterial",
  diabetes: "Diabetes mellitus",
  cardiopatia: "Cardiopat\xEDa",
  enfermedadRenal: "Enfermedad renal cr\xF3nica",
  enfermedadPulmonar: "Enfermedad pulmonar cr\xF3nica",
  cancer: "Neoplasia",
  transfusiones: "Transfusiones previas",
  cirugias: "Cirug\xEDas previas",
  traumaticos: "Antecedentes traum\xE1ticos",
  alergias: "Alergias medicamentosas",
  otro: "Otro"
};

// lib/drive-import/hc-structured-apply-field.mjs
var HC_INTERROGADO_NEGADO = "Interrogado y negado";
var PATCH_FIELD_HANDLERS = {
  conditions(block, s) {
    const list = Array.isArray(block.conditions) ? block.conditions.slice() : [];
    const id = String(s.value);
    if (id && list.indexOf(id) < 0) list.push(id);
    block.conditions = list;
  },
  medicamentosActuales(block, s) {
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
  },
  alergiasNegado(block, s) {
    block.alergiasNegado = !!s.value;
    if (block.alergiasNegado) block.alergiaMedicamentos = [];
  },
  alergiaMedicamentos(block, s) {
    block.alergiasNegado = false;
    const list = Array.isArray(block.alergiaMedicamentos) ? block.alergiaMedicamentos.slice() : [];
    const row = (
      /** @type {{ medication?: string }} */
      s.value
    );
    if (row && row.medication) list.push(s.value);
    block.alergiaMedicamentos = list;
  },
  inmunizaciones(block, s) {
    if (!String(block.inmunizaciones || "").trim()) {
      block.inmunizaciones = String(s.value || "").trim();
    }
  },
  transfusionesEntries(block, s) {
    const list = Array.isArray(block.transfusionesEntries) ? block.transfusionesEntries.slice() : [];
    list.push({
      id: "drv_tf_" + list.length,
      units: "",
      adverseReactions: String(s.value || "").trim(),
      date: null
    });
    block.transfusionesEntries = list;
  },
  hospitalizaciones(block, s) {
    const list = Array.isArray(block.hospitalizaciones) ? block.hospitalizaciones.slice() : [];
    list.push({
      reason: String(s.value || "").trim(),
      duration: "",
      complications: "",
      date: null
    });
    block.hospitalizaciones = list;
  },
  cirugias(block, s) {
    const list = Array.isArray(block.cirugias) ? block.cirugias.slice() : [];
    list.push({
      procedure: String(s.value || "").trim(),
      complications: "",
      date: null
    });
    block.cirugias = list;
  },
  traumaticosEntries(block, s) {
    const list = Array.isArray(block.traumaticosEntries) ? block.traumaticosEntries.slice() : [];
    list.push({
      id: "drv_tr_" + list.length,
      description: String(s.value || "").trim(),
      date: null
    });
    block.traumaticosEntries = list;
  },
  tabaquismoDetail(block, s) {
    block.tabaquismoDetail = Object.assign({}, block.tabaquismoDetail || {}, s.value || {});
    block.tabaquismo = HC_INTERROGADO_NEGADO;
  },
  alcoholismoDetail(block, s) {
    block.alcoholismoDetail = Object.assign({}, block.alcoholismoDetail || {}, s.value || {});
    block.alcoholismo = HC_INTERROGADO_NEGADO;
  },
  toxicomaniasEntries(block, s) {
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
  },
  entries(block, s) {
    const list = Array.isArray(block.entries) ? block.entries.slice() : [];
    const row = (
      /** @type {{ id?: string, relativeId?: string, conditionId?: string, diagnosis?: string }} */
      s.value
    );
    if (row && row.relativeId && row.conditionId && !list.some(function(entry) {
      return entry && entry.relativeId === row.relativeId && entry.conditionId === row.conditionId && String(entry.diagnosis || "").toUpperCase() === String(row.diagnosis || "").toUpperCase();
    })) {
      list.push(s.value);
    }
    block.entries = list;
  }
};
function applyStructuredSuggestionToPatch(out, s) {
  const parts = String(s.target || "").split(".");
  if (parts.length !== 2) return out;
  const section = parts[0];
  const field = parts[1];
  if (!out[section] || typeof out[section] !== "object") {
    out[section] = {};
  }
  const block = (
    /** @type {Record<string, unknown>} */
    Object.assign({}, out[section])
  );
  const handler = PATCH_FIELD_HANDLERS[field];
  if (handler) handler(block, s);
  out[section] = block;
  return out;
}

// lib/drive-import/hc-structured-strip.mjs
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

// lib/drive-import/hc-structured-suggestions.mjs
function syncAhfConditionsFromEntries(ahf) {
  if (!ahf || typeof ahf !== "object") return ahf;
  const ids = /* @__PURE__ */ new Set();
  (ahf.entries || []).forEach(function(e) {
    if (e && e.conditionId) ids.add(e.conditionId);
  });
  ahf.conditions = Array.from(ids);
  return ahf;
}
function applyStructuredSuggestionsToHcPatch(hcPatch, suggestions) {
  const accepted = (suggestions || []).filter(function(s) {
    return s.include !== false;
  });
  let out = Object.assign({}, hcPatch || {});
  accepted.forEach(function(s) {
    out = applyStructuredSuggestionToPatch(out, s);
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

// lib/drive-import/merge-hc-patch.mjs
function isEmptyString(v) {
  return v == null || typeof v === "string" && !String(v).trim();
}
function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}
function mergeObjectFill(tgt, src) {
  const out = Object.assign({}, tgt);
  for (const [k, v] of Object.entries(src)) {
    if (v === void 0) continue;
    if (isPlainObject(v)) {
      const base = isPlainObject(out[k]) ? (
        /** @type {Record<string, unknown>} */
        out[k]
      ) : {};
      out[k] = mergeObjectFill(
        base,
        /** @type {Record<string, unknown>} */
        v
      );
    } else if (Array.isArray(v)) {
      if (!Array.isArray(out[k]) || !out[k].length) out[k] = v.slice();
    } else if (isEmptyString(out[k])) {
      out[k] = v;
    }
  }
  return out;
}
function mergeObjectReplace(tgt, src) {
  const out = Object.assign({}, tgt);
  for (const [k, v] of Object.entries(src)) {
    if (v === void 0) continue;
    if (isPlainObject(v) && isPlainObject(out[k])) {
      out[k] = mergeObjectReplace(
        /** @type {Record<string, unknown>} */
        out[k],
        /** @type {Record<string, unknown>} */
        v
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}
function mergeHcPatch(existing, patch, mode) {
  const base = Object.assign({}, existing || {});
  const p = patch || {};
  if (mode === "replace") return mergeObjectReplace(base, p);
  return mergeObjectFill(base, p);
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
function shouldUseFichaProfile(sections) {
  return !!(sections.ficha || sections.app || sections.apnp && sections.app !== void 0 || sections.peea && sections.ficha);
}
function shouldUsePipeProfile(sections) {
  return !!(sections.historiaClinica || sections.peea || sections.apnp || sections.ahf || sections.motivoConsulta || sections.signosVitales || sections.ecd);
}
function mapUniversalHc(doc) {
  const sections = doc.sections || {};
  if (!hasDriveHcSections(sections)) return {};
  let patch = {};
  const useFicha = shouldUseFichaProfile(sections);
  const usePipe = shouldUsePipeProfile(sections);
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
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(t);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2e3;
    return { day: Number(m[1]), month: Number(m[2]), year: y };
  }
  m = /^(\d{1,2})[/.-](\d{1,2})$/.exec(t);
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
  const m = /(?:FIUX|FECHA\s+DE\s+INGRESO)[^\d]*(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/i.exec(text);
  if (m) return Number(m[3]);
  const years = [];
  const re = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g;
  let hit;
  while ((hit = re.exec(text)) !== null) {
    years.push(Number(hit[3]));
  }
  return years.length ? Math.max(...years) : void 0;
}

// lib/drive-import/map-to-eventualidades.mjs
var DATE_ONLY_RE2 = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\s*$/;
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
  const m = t.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
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

// lib/drive-import/summarize-hc-value.mjs
function summarizeHcString(value) {
  const t = value.trim();
  if (!t) return "vac\xEDo";
  if (t.length <= 72) return '"' + t.replace(/\s+/g, " ") + '"';
  return t.slice(0, 70).replace(/\s+/g, " ") + "\u2026 (" + t.length + " caracteres)";
}
function summarizeHcObject(value) {
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
function summarizeHcValue(value) {
  if (value == null) return "vac\xEDo";
  if (typeof value === "string") return summarizeHcString(String(value).trim());
  if (Array.isArray(value)) {
    return value.length + " elemento" + (value.length === 1 ? "" : "s");
  }
  if (typeof value === "object") return summarizeHcObject(value);
  return "contenido";
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
function cloneObjectOr(original, defaultValue) {
  return original && typeof original === "object" && !Array.isArray(original) ? Object.assign(
    {},
    /** @type {Record<string, unknown>} */
    original
  ) : defaultValue;
}
function editDescripcionDetalladaSection(trimmed, original) {
  const base = cloneObjectOr(original, { conditions: [], customConditions: [], entries: [] });
  base.descripcionDetallada = trimmed;
  return base;
}
function editTextToHcPatchValue(key, text, original) {
  const trimmed = String(text || "").trim();
  if (key === "motivoConsulta" || key === "padecimientoActual" || key === "signosVitalesIngreso") {
    return trimmed;
  }
  if (key === "identificacion") {
    const base = cloneObjectOr(original, {});
    return filterIdentificacionForHcImport(
      Object.assign(base, parseLabeledLines(trimmed, IDENT_LABELS))
    );
  }
  if (key === "ahf" || key === "app") {
    return editDescripcionDetalladaSection(trimmed, original);
  }
  if (key === "apnp") {
    const base = cloneObjectOr(original, {});
    return Object.assign(base, parseLabeledLines(trimmed, APNP_LABELS));
  }
  if (!trimmed) return original;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

// lib/drive-import/format-drive-import-preview-sections.mjs
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
function appendHcPreviewSection(parsed, mode, lines) {
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
}
function appendEventosPreviewSection(parsed, existingEventualidades, lines) {
  const allEv = parsed.eventualidades.entries || [];
  const evFiltered = filterNewEventualidades(existingEventualidades || [], allEv);
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
}
function appendLabsPreviewSection(parsed, lines) {
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
}

// lib/drive-import/format-drive-import-preview.mjs
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
  appendHcPreviewSection(parsed, mode, lines);
  appendEventosPreviewSection(parsed, opts.existingEventualidades || [], lines);
  appendLabsPreviewSection(parsed, lines);
  if (parsed.warnings && parsed.warnings.length) {
    lines.push("Advertencias");
    parsed.warnings.forEach(function(w) {
      lines.push("  \u2022 " + w);
    });
  }
  return lines.join("\n");
}

// lib/drive-import/parse-drive-document.mjs
function resolveEventualidadBlocks(split, rawText, hasHc) {
  let evBlocks = split.eventualidadesBlocks;
  if (evBlocks.length || hasHc) return evBlocks;
  const trimmed = String(rawText || "").trim();
  return trimmed ? [trimmed] : evBlocks;
}
function collectDriveDocumentWarnings(split, rawText, hasHc, evBlocks, evWarn, labParsed, labBody) {
  const warnings = split.warnings.slice();
  const trimmed = String(rawText || "").trim();
  if (!hasHc && !split.eventualidadesBlocks.length && evBlocks.length === 1 && evBlocks[0] === trimmed) {
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
  return warnings;
}
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
  const hasHc = hasDriveHcSections(split.sections);
  const evBlocks = resolveEventualidadBlocks(split, rawText, hasHc);
  const documentYear = inferDocumentYearFromText(rawText);
  const { entries, warnings: evWarn } = mapSectionsToEventualidades({
    eventualidadesBlocks: evBlocks,
    referenceYear: documentYear,
    documentYear
  });
  const { skipped: evSkipped } = filterNewEventualidades(opts.existingEventualidades || [], entries);
  const labBody = extractLaboratoriosBody(rawText, split.sections.laboratorios || "");
  const labParsed = parseDriveLaboratorios(labBody, { documentYear });
  const labFiltered = filterNewDriveLabSets(opts.existingLabHistory || [], labParsed.sets);
  const warnings = collectDriveDocumentWarnings(
    split,
    rawText,
    hasHc,
    evBlocks,
    evWarn,
    labParsed,
    labBody
  );
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

// public/js/features/drive-import-modal/drive-import-parse.mjs
function getParsed() {
  const ta = getTextarea();
  const rt4 = getDriveImportRuntime();
  const patient = rt4.getActivePatient();
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
function hasApprovedReviewContent(parsed) {
  const hcKeys = listHcPatchSectionKeys(parsed.hcPatch || {});
  const evCount = (parsed.eventualidades.entries || []).length;
  const labCount = (parsed.laboratorios.sets || []).length;
  return hcKeys.length > 0 || evCount > 0 || labCount > 0;
}
function getReviewBuildOpts(_parsed) {
  const rt4 = getDriveImportRuntime();
  const patient = rt4.getActivePatient();
  return {
    applyMode: getApplyMode(),
    existingEventualidades: patient && patient.eventualidades && Array.isArray(patient.eventualidades.entries) ? patient.eventualidades.entries : [],
    existingLabHistory: patient && patient.id && labHistory[patient.id] ? labHistory[patient.id] : [],
    createNew: !patient
  };
}

// lib/drive-import/drive-import-review-build.mjs
function buildHcReviewSteps(parsed, mode, createNew) {
  const steps = [];
  if (createNew && parsed.header && (parsed.header.nombre || parsed.header.registro)) {
    steps.push({
      kind: "header",
      label: "Datos del paciente (nuevo)",
      include: true,
      header: Object.assign({}, parsed.header)
    });
  }
  if (mode === "eventos") return steps;
  return steps;
}
function buildEventosReviewStep(parsed, existingEventualidades) {
  const allEv = parsed.eventualidades.entries || [];
  const evFiltered = filterNewEventualidades(existingEventualidades || [], allEv);
  const evNew = evFiltered.toAdd || [];
  if (!evNew.length) return null;
  return {
    kind: "eventos",
    label: "Eventualidades (" + evNew.length + " nueva" + (evNew.length === 1 ? "" : "s") + ")",
    entries: evNew.map(function(entry) {
      return { at: entry.at, text: entry.text, include: true };
    })
  };
}
function buildLabsReviewStep(parsed, existingLabs) {
  const allLabSets = (parsed.laboratorios.allSets && parsed.laboratorios.allSets.length ? parsed.laboratorios.allSets : parsed.laboratorios.sets) || [];
  if (!allLabSets.length) return null;
  let dupCount = 0;
  const sets = allLabSets.map(function(set) {
    const isDuplicate = (existingLabs || []).some(function(ex) {
      return isDuplicateDriveLabSet(ex, set);
    });
    if (isDuplicate) dupCount += 1;
    const panels = summarizeLabPanels(set.resLabs);
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
  return { kind: "labs", label, sets };
}

// lib/drive-import/drive-import-review-apply.mjs
function applyHeaderReviewStep(out, step, createNew) {
  if (createNew && step.include) out.header = Object.assign({}, step.header);
}
function applyHcReviewStep(out, step) {
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
}
function applyEventosReviewStep(out, step) {
  out.eventualidades.entries = step.entries.filter(function(e) {
    return e.include && String(e.text || "").trim();
  }).map(function(e) {
    return { at: e.at, text: String(e.text).trim() };
  });
}
function applyLabsReviewStep(out, step) {
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
function finalizeHcPatchFromDriveSections(out, steps) {
  const usedDriveSections = steps.some(function(step) {
    return step.kind === "hc" && step.driveSectionKey;
  });
  if (!usedDriveSections) return;
  out.hcPatch = mapUniversalHc({ sections: out.driveSections }) || {};
  const sexo = out.hcPatch._sexo;
  if (sexo) delete out.hcPatch._sexo;
  if (sexo && out.header) out.header.sexo = out.header.sexo || sexo;
}
function applyAcceptedStructuredSuggestions(out, steps) {
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
}

// lib/drive-import/drive-import-review.mjs
function buildDriveImportReviewSteps(parsed, opts) {
  opts = opts || {};
  const mode = opts.applyMode || "fill";
  const steps = buildHcReviewSteps(parsed, mode, !!opts.createNew);
  const eventosStep = buildEventosReviewStep(parsed, opts.existingEventualidades || []);
  if (eventosStep) steps.push(eventosStep);
  const labsStep = buildLabsReviewStep(parsed, opts.existingLabHistory || []);
  if (labsStep) steps.push(labsStep);
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
      applyHeaderReviewStep(out, step, !!opts.createNew);
      return;
    }
    if (step.kind === "hc") {
      applyHcReviewStep(out, step);
      return;
    }
    if (step.kind === "eventos") {
      applyEventosReviewStep(out, step);
      return;
    }
    if (step.kind === "labs") {
      applyLabsReviewStep(out, step);
    }
  });
  finalizeHcPatchFromDriveSections(out, steps);
  applyAcceptedStructuredSuggestions(out, steps);
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

// public/js/features/drive-import-modal/drive-import-review-render.mjs
function formatEvDate2(iso) {
  if (!iso) return "sin fecha";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "sin fecha";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return dd + "/" + mm + "/" + yy;
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
function syncCurrentReviewStepFromUi() {
  const step = driveImportState.reviewSteps[driveImportState.reviewIndex];
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
    syncEventosStepFromUi(step);
    return;
  }
  if (step.kind === "labs") {
    syncLabsStepFromUi(step);
  }
}
function syncEventosStepFromUi(step) {
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
}
function syncLabsStepFromUi(step) {
  const rows = document.querySelectorAll("[data-drive-lab-idx]");
  const sets = [];
  rows.forEach(function(row) {
    const idx = Number(row.getAttribute("data-drive-lab-idx"));
    const cb = row.querySelector('input[type="checkbox"]');
    sets[idx] = { include: cb ? cb.checked : true };
  });
  patchReviewStep(step, { sets });
}
function renderReviewDots(onSelect) {
  const dots = document.getElementById("drive-import-review-dots");
  if (!dots) return;
  dots.innerHTML = "";
  driveImportState.reviewSteps.forEach(function(step, idx) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "drive-import-review-dot" + (idx === driveImportState.reviewIndex ? " is-active" : "");
    btn.title = step.label;
    btn.setAttribute(
      "aria-label",
      step.label + " (" + (idx + 1) + " de " + driveImportState.reviewSteps.length + ")"
    );
    btn.setAttribute("aria-current", idx === driveImportState.reviewIndex ? "step" : "false");
    btn.addEventListener("click", function() {
      syncCurrentReviewStepFromUi();
      onSelect(idx);
    });
    dots.appendChild(btn);
  });
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
function hideStructuredSuggestions() {
  const structHost = document.getElementById("drive-import-review-structured");
  if (structHost) {
    structHost.hidden = true;
    structHost.innerHTML = "";
  }
}
function renderReviewStepShell(step) {
  const progress = document.getElementById("drive-import-review-progress");
  const titleEl = document.getElementById("drive-import-review-title");
  const hintEl = document.getElementById("drive-import-review-hint");
  const nextBtn = document.getElementById("drive-import-review-next");
  const prevBtn = document.getElementById("drive-import-review-prev");
  if (progress) {
    progress.textContent = "Secci\xF3n " + (driveImportState.reviewIndex + 1) + " de " + driveImportState.reviewSteps.length + " \xB7 " + step.label;
  }
  if (titleEl) titleEl.textContent = step.label;
  if (hintEl) hintEl.textContent = reviewStepHint(step);
  if (prevBtn) prevBtn.disabled = driveImportState.reviewIndex <= 0;
  if (nextBtn) {
    nextBtn.textContent = driveImportState.reviewIndex >= driveImportState.reviewSteps.length - 1 ? "Importar lo aprobado" : "Siguiente secci\xF3n";
  }
}
function setReviewEditorVisibility(isList, isHeader) {
  const includeWrap = document.getElementById("drive-import-review-include-wrap");
  const editor = (
    /** @type {HTMLTextAreaElement | null} */
    document.getElementById("drive-import-review-editor")
  );
  const listEl = document.getElementById("drive-import-review-list");
  if (includeWrap) includeWrap.hidden = isList;
  if (editor) {
    editor.hidden = isList || isHeader;
    editor.style.display = isList || isHeader ? "none" : "";
  }
  if (listEl) listEl.hidden = !isList && !isHeader;
}
function renderHcStep(step) {
  const includeEl = (
    /** @type {HTMLInputElement | null} */
    document.getElementById("drive-import-review-include")
  );
  const editor = (
    /** @type {HTMLTextAreaElement | null} */
    document.getElementById("drive-import-review-editor")
  );
  if (!includeEl || !editor) return;
  includeEl.checked = step.include;
  editor.value = step.editText;
  editor.readOnly = false;
  renderStructuredSuggestions(step);
}
function renderHeaderStep(step) {
  const includeEl = (
    /** @type {HTMLInputElement | null} */
    document.getElementById("drive-import-review-include")
  );
  const listEl = document.getElementById("drive-import-review-list");
  if (!includeEl || !listEl) return;
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
}
function renderEventosStep(step) {
  const listEl = document.getElementById("drive-import-review-list");
  if (!listEl) return;
  listEl.hidden = false;
  let html = "";
  step.entries.forEach(function(entry, idx) {
    const date = formatEvDate2(entry.at);
    html += '<div class="drive-import-review-row" data-drive-ev-idx="' + idx + '"><label class="drive-import-review-row-check"><input type="checkbox"' + (entry.include ? " checked" : "") + ' aria-label="Incluir eventualidad ' + (idx + 1) + '" /><span class="drive-import-review-row-date">' + escapeHtml(date) + '</span></label><textarea class="drive-import-review-row-text" rows="3" spellcheck="true">' + escapeHtml(entry.text) + "</textarea></div>";
  });
  listEl.innerHTML = html;
}
function renderLabsStep(step) {
  const listEl = document.getElementById("drive-import-review-list");
  if (!listEl) return;
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
function renderReviewStep() {
  const step = driveImportState.reviewSteps[driveImportState.reviewIndex];
  if (!step) return;
  renderReviewStepShell(step);
  renderReviewDots(function(idx) {
    driveImportState.reviewIndex = idx;
    renderReviewStep();
  });
  const isList = step.kind === "eventos" || step.kind === "labs";
  const isHeader = step.kind === "header";
  setReviewEditorVisibility(isList, isHeader);
  if (step.kind === "hc") {
    renderHcStep(step);
    return;
  }
  if (isList || isHeader) hideStructuredSuggestions();
  if (step.kind === "header") {
    renderHeaderStep(step);
    return;
  }
  if (step.kind === "eventos") {
    renderEventosStep(step);
    return;
  }
  if (step.kind === "labs") {
    renderLabsStep(step);
  }
}

// public/js/features/drive-import-modal/drive-import-preview.mjs
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
function setPreviewButtonsDisabled(disabled) {
  const confirmBtn = document.getElementById("drive-import-confirm");
  const fastBtn = document.getElementById("drive-import-apply-fast");
  if (confirmBtn) confirmBtn.disabled = disabled;
  if (fastBtn) fastBtn.disabled = disabled;
}
function clearPreviewHints() {
  const parseHint = getParseHintEl();
  const warn = getWarningEl();
  if (parseHint) {
    parseHint.hidden = true;
    parseHint.textContent = "";
  }
  if (warn) warn.hidden = true;
}
function showParseError(err) {
  const parseHint = getParseHintEl();
  if (parseHint) {
    parseHint.hidden = false;
    parseHint.textContent = "Error al analizar: " + (err && err.message ? err.message : String(err));
  }
  setPreviewButtonsDisabled(true);
}
function updateParseHint(canImport) {
  const parseHint = getParseHintEl();
  if (!parseHint) return;
  if (canImport) {
    parseHint.hidden = true;
    parseHint.textContent = "";
    return;
  }
  parseHint.hidden = false;
  parseHint.textContent = "No se detect\xF3 contenido importable con el modo seleccionado.";
}
function updateRegistroWarning(parsed) {
  const warn = getWarningEl();
  if (!warn) return;
  const rt4 = getDriveImportRuntime();
  const patient = rt4.getActivePatient();
  if (!patient || !parsed.header || !parsed.header.registro) {
    warn.hidden = true;
    return;
  }
  const mismatch = String(parsed.header.registro).trim() && String(patient.registro || "").trim() && String(parsed.header.registro).trim() !== String(patient.registro).trim();
  warn.hidden = !mismatch;
  warn.textContent = mismatch ? "El registro del documento (" + parsed.header.registro + ") no coincide con el paciente activo (" + patient.registro + ")." : "";
}
function refreshPreview() {
  const ta = getTextarea();
  if (!ta || !String(ta.value || "").trim()) {
    clearPreviewHints();
    setPreviewButtonsDisabled(true);
    updateDocSummary();
    return;
  }
  let parsed;
  try {
    parsed = getParsed();
  } catch (err) {
    showParseError(err);
    updateDocSummary();
    return;
  }
  const mode = getApplyMode();
  const canImport = hasImportableContent(parsed, mode);
  updateParseHint(canImport);
  updateRegistroWarning(parsed);
  setPreviewButtonsDisabled(!canImport);
  updateDocSummary();
}
function setReviewImportBusy(busy) {
  driveImportState.importBusy = busy;
  const nextBtn = document.getElementById("drive-import-review-next");
  const fastBtn = document.getElementById("drive-import-apply-fast");
  const confirmBtn = document.getElementById("drive-import-confirm");
  if (nextBtn) {
    nextBtn.disabled = busy;
    if (busy) nextBtn.textContent = "Importando\u2026";
    else if (driveImportState.modalStep === "review") renderReviewStep();
  }
  if (fastBtn) fastBtn.disabled = busy;
  if (confirmBtn && busy) confirmBtn.disabled = true;
  if (!busy) refreshPreview();
}

// public/js/features/drive-import-modal/drive-import-lifecycle.mjs
var modalStepHooks = { updateDocSummary };
function openDriveImportModal() {
  const rt4 = getDriveImportRuntime();
  const bd = getBackdrop();
  if (!bd) {
    rt4.showToast("Importaci\xF3n desde Drive no disponible", "error");
    return;
  }
  const ta = getTextarea();
  if (ta) ta.value = "";
  resetDriveImportSession();
  setModalStep("paste", modalStepHooks);
  syncConfirmLabel();
  refreshPreview();
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
  if (ta) ta.focus();
}
function closeDriveImportModal() {
  const bd = getBackdrop();
  if (!bd) return;
  if (driveImportState.modalStep === "review") syncCurrentReviewStepFromUi();
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
  setModalStep("paste", modalStepHooks);
  resetDriveImportSession();
}

// public/js/features/drive-import-apply.mjs
async function applyDriveImport(parsed, options) {
  return applyDriveImportInner(parsed, options);
}
function createPatientFromDriveHeader(header) {
  const h = header || {};
  const id = generatePatientId();
  const patient = {
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
  return patient;
}
async function applyDriveEventualidadesSection(patient, parsed) {
  const evRes = await applyDriveImportEventualidades(patient, parsed.eventualidades.entries || []);
  invalidateEventualidadesPanel();
  const evMount = document.getElementById("exp-pane-eventualidades");
  if (evMount && evRes.added) {
    renderEventualidadesPanel(evMount);
  }
  return evRes;
}
async function applyDriveLabSetsIfAny(patient, parsed) {
  const labSets = parsed.laboratorios && parsed.laboratorios.sets ? parsed.laboratorios.sets : [];
  if (!labSets.length) return { added: 0, skipped: 0 };
  return applyDriveImportLabSets(patient, labSets);
}
function resolveDriveImportNavigateTo(mode, parsed, labRes) {
  let navigateTo = mode === "eventos" ? "eventualidades" : "estadoActual";
  if (labRes.added && navigateTo === "eventualidades" && mode === "eventos") {
    navigateTo = "lab";
  }
  return navigateTo;
}
async function applyDriveImportInner(parsed, options) {
  const mode = options.mode || "fill";
  let patient = options.activePatient;
  let lanSyncDeferred = false;
  if (options.createNew) {
    patient = createPatientFromDriveHeader(parsed.header);
  }
  if (!patient) {
    return { ok: false, error: "no-patient" };
  }
  const evRes = await applyDriveEventualidadesSection(patient, parsed);
  if (evRes.lanDeferred) lanSyncDeferred = true;
  const labRes = await applyDriveLabSetsIfAny(patient, parsed);
  await saveState({ immediate: true });
  return {
    ok: true,
    navigateTo: resolveDriveImportNavigateTo(mode, parsed, labRes),
    evAdded: evRes.added,
    evSkipped: evRes.skipped,
    labAdded: labRes.added,
    labSkipped: labRes.skipped,
    patientId: patient.id,
    lanSyncDeferred
  };
}

// public/js/features/drive-import-modal/drive-import-run.mjs
function confirmRegistroMismatch(parsed, patient) {
  if (!patient || !parsed.header || !parsed.header.registro || !patient.registro || String(parsed.header.registro).trim() === String(patient.registro).trim()) {
    return true;
  }
  return confirmDriveImportChoice(
    "El registro del documento (" + parsed.header.registro + ") no coincide con " + patient.registro + ". \xBFContinuar de todos modos?"
  );
}
function confirmCreateWithoutName(createNew, parsed) {
  if (!createNew || parsed.header && parsed.header.nombre) return true;
  return confirmDriveImportChoice("No se detect\xF3 nombre en el encabezado. \xBFCrear paciente igualmente?");
}
async function confirmImportGuards(parsed, _opts) {
  const rt4 = getDriveImportRuntime();
  const patient = rt4.getActivePatient();
  const createNew = !patient;
  if (!confirmRegistroMismatch(parsed, patient)) return false;
  if (!confirmCreateWithoutName(createNew, parsed)) return false;
  return true;
}
function pluralSuffix(count, singular, plural) {
  return count === 1 ? singular : plural;
}
function buildEventualidadParts(result) {
  const parts = [
    (result.evAdded || 0) + " eventualidad" + pluralSuffix(result.evAdded, "", "es") + " nueva" + pluralSuffix(result.evAdded, "", "s")
  ];
  if (result.evSkipped) {
    parts.push(
      result.evSkipped + " duplicada" + pluralSuffix(result.evSkipped, "", "s") + " omitida" + pluralSuffix(result.evSkipped, "", "s")
    );
  }
  return parts;
}
function buildLabParts(result) {
  const parts = [];
  if (result.labAdded) {
    parts.push(
      result.labAdded + " fecha" + pluralSuffix(result.labAdded, "", "s") + " de laboratorio nueva" + pluralSuffix(result.labAdded, "", "s")
    );
  }
  if (result.labSkipped) {
    parts.push(
      result.labSkipped + " lab" + pluralSuffix(result.labSkipped, "", "s") + " duplicado" + pluralSuffix(result.labSkipped, "", "s") + " omitido" + pluralSuffix(result.labSkipped, "", "s")
    );
  }
  return parts;
}
function buildImportSuccessParts(result) {
  const parts = [];
  parts.push(...buildEventualidadParts(result));
  parts.push(...buildLabParts(result));
  if (result.lanSyncDeferred) {
    parts.push("sincronizaci\xF3n con la sala en segundo plano");
  }
  return parts;
}
function navigateAfterSuccessfulImport(result) {
  const rt4 = getDriveImportRuntime();
  if (result.navigateTo === "lab") {
    if (typeof rt4.switchAppTab === "function") rt4.switchAppTab("lab");
    return;
  }
  if (typeof rt4.switchAppTab === "function") rt4.switchAppTab("clinico");
  if (typeof rt4.switchInnerTab === "function") {
    rt4.switchInnerTab(result.navigateTo || "estadoActual", { forceRender: true });
  }
}
function recordImportAudit(result, mode, createNew, fromReview) {
  const rt4 = getDriveImportRuntime();
  if (typeof rt4.addAuditEntry !== "function") return;
  rt4.addAuditEntry(
    "drive-import",
    "ok",
    result.evAdded || 0,
    JSON.stringify({
      mode,
      skipped: result.evSkipped,
      labAdded: result.labAdded,
      labSkipped: result.labSkipped,
      createNew,
      reviewed: !!fromReview
    })
  );
}
async function runDriveImport(parsed, opts) {
  opts = opts || {};
  const rt4 = getDriveImportRuntime();
  const mode = getApplyMode();
  const patient = rt4.getActivePatient();
  const createNew = !patient;
  if (!await confirmImportGuards(parsed, opts)) return;
  if (typeof rt4.pushUndoSnapshot === "function") {
    rt4.pushUndoSnapshot("Importar desde Drive");
  }
  const result = await applyDriveImport(parsed, {
    mode,
    activePatient: patient,
    createNew,
    fromReview: !!opts.fromReview
  });
  if (!result.ok) {
    rt4.showToast("No se pudo aplicar la importaci\xF3n", "error");
    return;
  }
  recordImportAudit(result, mode, createNew, !!opts.fromReview);
  closeDriveImportModal();
  rt4.showToast(buildImportSuccessParts(result).join(" \xB7 "), "success");
  navigateAfterSuccessfulImport(result);
}
async function finishReviewAndImport(deps) {
  const rt4 = getDriveImportRuntime();
  deps.syncCurrentReviewStepFromUi();
  let parsed;
  try {
    parsed = getParsed();
  } catch {
    rt4.showToast("No se pudo analizar el texto", "error");
    return;
  }
  parsed = applyReviewStepsToParsed(parsed, deps.reviewSteps, { createNew: !rt4.getActivePatient() });
  if (!hasApprovedReviewContent(parsed)) {
    rt4.showToast("No hay secciones marcadas para importar", "info");
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
}

// public/js/features/drive-import-modal/drive-import-actions.mjs
var modalStepHooks2 = { updateDocSummary };
function focusReviewEditorIfVisible() {
  const editor = document.getElementById("drive-import-review-editor");
  if (editor && !editor.hidden) editor.focus();
}
function driveImportBackToPaste() {
  syncCurrentReviewStepFromUi();
  driveImportState.autoReviewPending = false;
  setModalStep("paste", modalStepHooks2);
  focusPasteTextareaEnd();
}
function driveImportReviewPrev() {
  if (driveImportState.reviewIndex <= 0) return;
  syncCurrentReviewStepFromUi();
  driveImportState.reviewIndex -= 1;
  renderReviewStep();
}
async function driveImportReviewNext() {
  if (driveImportState.importBusy) return;
  try {
    syncCurrentReviewStepFromUi();
    if (driveImportState.reviewIndex >= driveImportState.reviewSteps.length - 1) {
      setReviewImportBusy(true);
      try {
        await finishReviewAndImport({
          syncCurrentReviewStepFromUi,
          reviewSteps: driveImportState.reviewSteps
        });
      } catch (err) {
        console.error("[drive-import] import failed", err);
        const rt4 = getDriveImportRuntime();
        if (err && err.message === "import-timeout") {
          rt4.showToast("La importaci\xF3n tard\xF3 demasiado. Revisa si los datos se guardaron.", "error");
        } else {
          rt4.showToast("Error al importar desde Drive", "error");
        }
      } finally {
        setReviewImportBusy(false);
      }
      return;
    }
    driveImportState.reviewIndex += 1;
    renderReviewStep();
  } catch (err) {
    console.error("[drive-import] review next failed", err);
    getDriveImportRuntime().showToast("No se pudo completar la revisi\xF3n", "error");
    setReviewImportBusy(false);
  }
}
function startDriveImportReview() {
  const rt4 = getDriveImportRuntime();
  const ta = getTextarea();
  if (!ta || !String(ta.value || "").trim()) {
    rt4.showToast("Pega el contenido del documento", "error");
    return;
  }
  let parsed;
  try {
    parsed = getParsed();
  } catch {
    rt4.showToast("No se pudo analizar el texto", "error");
    return;
  }
  driveImportState.reviewSteps = buildDriveImportReviewSteps(parsed, getReviewBuildOpts(parsed));
  if (!driveImportState.reviewSteps.length) {
    rt4.showToast("No hay secciones para revisar en este pegado", "info");
    return;
  }
  driveImportState.reviewIndex = 0;
  driveImportState.autoReviewPending = false;
  setModalStep("review", modalStepHooks2);
  renderReviewStep();
  focusReviewEditorIfVisible();
}
async function confirmDriveImport() {
  if (driveImportState.importBusy) return;
  setReviewImportBusy(true);
  try {
    const rt4 = getDriveImportRuntime();
    const ta = getTextarea();
    if (!ta || !String(ta.value || "").trim()) {
      rt4.showToast("Pega el contenido del documento", "error");
      return;
    }
    let parsed;
    try {
      parsed = getParsed();
    } catch {
      rt4.showToast("No se pudo analizar el texto", "error");
      return;
    }
    await runDriveImport(parsed, { fromReview: false });
  } catch (err) {
    console.error("[drive-import] fast import failed", err);
    getDriveImportRuntime().showToast("Error al importar desde Drive", "error");
  } finally {
    setReviewImportBusy(false);
  }
}
function tryAutoStartReview() {
  if (driveImportState.modalStep !== "paste" || !driveImportState.autoReviewPending) return;
  driveImportState.autoReviewPending = false;
  const ta = getTextarea();
  if (!ta || !String(ta.value || "").trim()) return;
  let parsed;
  try {
    parsed = getParsed();
  } catch {
    return;
  }
  const mode = getApplyMode();
  if (!hasImportableContent(parsed, mode)) return;
  const steps = buildDriveImportReviewSteps(parsed, getReviewBuildOpts(parsed));
  if (!steps.length) return;
  driveImportState.reviewSteps = steps;
  driveImportState.reviewIndex = 0;
  setModalStep("review", modalStepHooks2);
  renderReviewStep();
  focusReviewEditorIfVisible();
}
function onPasteInputChanged() {
  const ta = getTextarea();
  const hasText = !!(ta && String(ta.value || "").trim());
  if (!hasText) {
    driveImportState.autoReviewPending = false;
    refreshPreview();
    return;
  }
  driveImportState.autoReviewPending = true;
  refreshPreview();
  if (driveImportState.debounceId) clearTimeout(driveImportState.debounceId);
  driveImportState.debounceId = setTimeout(function() {
    driveImportState.debounceId = null;
    tryAutoStartReview();
  }, 320);
}
function scheduleAutoReviewAfterModeChange() {
  if (driveImportState.modalStep !== "paste" || !driveImportState.autoReviewPending) return;
  if (driveImportState.debounceId) clearTimeout(driveImportState.debounceId);
  driveImportState.debounceId = setTimeout(function() {
    driveImportState.debounceId = null;
    tryAutoStartReview();
  }, 320);
}

// public/js/features/drive-import-modal/drive-import-wire.mjs
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
        getDriveImportRuntime().showToast("No se pudo completar la acci\xF3n de importaci\xF3n", "error");
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
      scheduleAutoReviewAfterModeChange();
    });
  });
  if (bd && !bd.dataset.driveImportWired) {
    bd.dataset.driveImportWired = "1";
    bd.addEventListener("click", function(e) {
      if (e.target === bd) closeDriveImportModal();
    });
  }
}

// public/js/features/drive-import-modal.mjs
var windowHandlers16 = {
  openDriveImportModal,
  closeDriveImportModal,
  confirmDriveImport,
  startDriveImportReview,
  driveImportBackToPaste,
  driveImportReviewPrev,
  driveImportReviewNext
};

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
function getAppRuntimeContext() {
  return rt3;
}
function registerAppRuntimeContext(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt3, ctx);
}
function buildRuntimeContextUiDeps() {
  return {
    showToast,
    navigateToEstadoActualPanel,
    refreshMedPanel: function refreshMedPanel() {
      renderMedRecetaPanel();
    },
    syncWorkContextChrome,
    renderMedRecetaPanel,
    renderProcedureAgendaPanel,
    setMedTabAttention,
    ensureParsedLabHistory,
    ensureParsedLabHistoryCached,
    splitResLabsByTipo,
    primaryTipoForLabSet,
    formatLabHistoryListMeta: function(set) {
      return formatLabHistoryListMeta(set, chartsRuntimeProxies.inferFechaLabSetFromId);
    },
    formatLabHistoryDateSelectLabel: function(set) {
      return formatLabHistoryDateSelectLabel(
        set,
        chartsRuntimeProxies.inferFechaLabSetFromId,
        primaryTipoForLabSet
      );
    },
    switchAppTab,
    renderPatientList,
    scrollActiveRondaCardIntoView,
    renderGuardiaBoard: function() {
      return renderGuardiaBoard(rt3.getSettings());
    },
    setRoundOverviewMode,
    renderPaseBoard,
    renderInnerTabs,
    invalidateInnerTabRenderCache,
    refreshExpedienteAfterPatientSelect,
    renderEstadoActualButton,
    renderEstadoActualPanel,
    renderPatientDataPane,
    renderNoteForm,
    renderIndicaForm,
    renderListadoForm,
    refreshTendenciasOrCultivosPanel,
    switchInnerTab,
    syncInnerTabVisualOnly,
    renderTodoForm,
    rpcPrefersReducedMotion,
    refreshAllTodoUIs,
    refreshTodoUIsForPatient,
    refreshTodoUIsForPatients,
    renderVpo,
    renderRecetaHu,
    pushUndoSnapshot,
    ...platformRuntimeProxies,
    applyDefaultsToNewPatient,
    applyDefaultsToNewIndicaciones,
    normalizeFechaLabHistory,
    buildLabSetDateLine,
    getRoundOverviewMode,
    saveState,
    emitLiveSyncTodoUpsert: enqueueCloudTodoUpsert,
    requestDocumentJson,
    handleDocumentGenerateResponse,
    guardMobileDocExport,
    syncSettingsLanHostDiskSection,
    closeProfileModal,
    openProfileModal,
    openAddModalFromLabPatient,
    copyToClipboardSafe,
    ...chartsRuntimeProxies,
    renderRoundOverviewPanels,
    switchConsolidatedTab
  };
}
function applyRuntimeParsedToForm(parsed, opts) {
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
      var recordedInner = document.getElementById("ea-recorded-at");
      if (recordedInner && "value" in recordedInner) {
        recordedInner.value = toDatetimeLocalValue(getDefaultRegistroRecordedAt());
      }
    }
  });
}
function buildRuntimeContextFeatureDeps() {
  return {
    getActivePatient: function() {
      var id = rt3.getActiveId();
      if (!id) return null;
      return patients.find(function(p) {
        return String(p.id) === String(id);
      }) || null;
    },
    applyParsed: applyRuntimeParsedToForm,
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
    ...settingsHelpRuntimeProxies,
    findPatientByRegistro,
    openPaseSectionInNormal,
    renderDiagramas,
    toggleLabDiagramsSection,
    syncLabDiagramsCollapseUI,
    extractParsedValues,
    ...labsRuntimeProxies,
    buildParsedBySectionFromResLabs,
    rebuildEstudiosFromLabHistory,
    dayKeyFromLabSet,
    labSetIsFromSome,
    removeAtbRisPanelsFromBody,
    wireAtbRisHoverPanels,
    isResLabChunkPureCultivo,
    buildCultivoOutputHtmlFragments,
    rebuildBulkLabPreviewBlocks: function(text) {
      return buildBulkLabPreview(text, { findPatientByRegistro });
    },
    getBulkLabPreviewSourceText,
    isBulkLabPreviewModalOpen,
    suspendLabBulkPreviewModal,
    openAddModal,
    advanceRondaPatient,
    isMobileWeb,
    ensureUniquePatientName,
    buildPatientEntry,
    onMedicionRegistered: function() {
      settingsHelpRuntimeProxies.guidedTourAdvanceAfter("estado_actual_registro");
      scheduleCloudSyncPush();
    },
    launchConfetti,
    renderEstadoActualBar
  };
}
function installAppRuntimeContextDeps() {
  bindLazyPlatformRuntimeCtx(rt3);
  bindLazySettingsRuntimeCtx(rt3);
  Object.assign(rt3, buildRuntimeContextUiDeps(), buildRuntimeContextFeatureDeps());
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
  bindLazyLabsRuntimeCtx(ctx);
  bindLazyChartsRuntimeCtx(ctx);
  bindLazyEaVitalHistoryRuntimeCtx(ctx);
  v3MigratedThisBoot = migrateToV3(rt3.getSettings());
  if (v3MigratedThisBoot) storage.saveSettings(rt3.getSettings());
  await registerLazyFeatureRuntimes(ctx);
  registerLabHistoryMaintRuntime(ctx);
  installLabHistoryAuditHook();
  registerTodosRuntime(ctx);
  const reminderScheduler = await import("/mobile/js/chunks/todos-reminder-scheduler-6QLKED32.js");
  reminderScheduler.configureTodoReminderScheduler({
    getPatientLabel: function(pid) {
      var p = patients.find(function(row) {
        return row.id === pid;
      });
      if (!p) return "Paciente";
      var nombre = String(p.nombre || p.name || "").trim();
      var cuarto = String(p.cuarto || "").trim();
      var cama = String(p.cama || "").trim();
      var bed = [cuarto && "Cto. " + cuarto, cama && "Cama " + cama].filter(Boolean).join(" ");
      if (nombre && bed) return nombre + " \xB7 " + bed;
      return nombre || bed || "Paciente";
    },
    showToast
  });
  reminderScheduler.rescheduleAllTodos();
  registerVpoRuntime(ctx);
  registerRecetaHuRuntime(ctx);
  registerCensoRuntime(
    Object.assign({}, ctx, {
      getCensusPatients: function() {
        return filterPatientsForGuardiaCensus(patients);
      }
    })
  );
  registerEventualidadesRuntime(ctx);
  registerExpedienteRuntime(ctx);
  registerNotesIndicacionesRuntime(ctx);
  registerProcedureAgendaRuntime(ctx);
  registerSoapEstadoRuntime(ctx);
  registerEstadoActualPanelRuntime(ctx);
  registerDriveImportRuntime(ctx);
  registerEstadoActualPasteModalRuntime(ctx);
  registerEstadoActualRegistroModalRuntime(ctx);
  registerLabBulkPreviewModalRuntime(ctx);
  registerLabHistoryBatchCopyRuntime(ctx);
  registerProductivityRuntime(ctx);
  configureLanPatientEntries({
    runtime: ctx,
    renderPatientListLanSilent: function() {
      if (typeof ctx.renderPatientList === "function") ctx.renderPatientList();
    }
  });
  void import("/mobile/js/chunks/cloud-mobile-lan-strip-ZXR3OTYP.js").then((mod) => {
    mod.runLanConfigRetireIfNeeded({ showToast: ctx?.showToast });
  });
  void import("/mobile/js/chunks/equipos-cloud-config-T7L3A6VI.js").then((mod) => {
    mod.runEquiposCloudBootIfNeeded();
  });
}
function runInitialFeatureBoot() {
  initChromeAppearance();
  wireEstadoActualPasteModal();
  wireDriveImportModal();
  wireEaModalDismiss();
  syncCensoExportButtonVisibility();
}

// public/js/app.js
if (typeof globalThis !== "undefined" && globalThis.__RPC_CLOUD_MOBILE__) {
  void import("/mobile/js/chunks/boot-F32OM7TE.js").then(function(mod) {
    return mod.initCloudMobileBoot();
  }).catch(function(err) {
    console.error("[R+ M\xF3vil] boot failed:", err);
    try {
      var gate = document.getElementById("rpc-cloud-mobile-gate");
      if (gate) {
        gate.hidden = true;
        gate.innerHTML = "";
      }
      document.body.classList.remove("rpc-cloud-mobile-gated");
    } catch (_e) {
      void _e;
    }
  });
}
void import("/mobile/js/chunks/perf-markers-YJ2GH5P6.js").then(function(perf) {
  perf.perfMark("app-boot-start");
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(function() {
      perf.perfMark("app-first-paint");
      perf.perfMeasure("boot-to-first-paint", "app-boot-start", "app-first-paint");
    });
  }
});
function isMobileWeb2() {
  var g = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : null;
  if (!g) return false;
  return !!(g.__RPC_MOBILE_WEB__ || typeof document !== "undefined" && document.documentElement && document.documentElement.classList.contains("rpc-mobile-web"));
}
var allWindowHandlers = Object.assign(
  {},
  dbUnlockWindowHandlers,
  windowHandlers14,
  windowHandlers9,
  windowHandlers13,
  labPanelWindowHandlersLazy,
  windowHandlers2,
  windowHandlers15,
  windowHandlers8,
  windowHandlers3,
  windowHandlers4,
  windowHandlers16,
  windowHandlers5,
  eaVitalHistoryWindowHandlersLazy,
  chartsWindowHandlersLazy,
  windowHandlers12,
  windowHandlers7,
  windowHandlers,
  productivityWindowHandlers,
  settingsHelpWindowHandlersLazy,
  platformWindowHandlersLazy,
  todosWindowHandlers,
  recetaHuWindowHandlers,
  windowHandlers6,
  commandPaletteWindowHandlersLazy,
  medicationsWindowHandlers,
  profileWindowHandlers,
  windowHandlers11,
  windowHandlers10,
  clinicalSyncModeSettingsHandlersLazy,
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
  if (isElectronDesktopShell() && !isDbMode()) {
    for (let i = 0; i < 60 && !isDbMode(); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  if (isDbMode()) {
    return loadClinicalStateFromDb();
  }
  if (isWebClinicalClient()) {
    try {
      const { wipeSessionClinicalStorage } = await import("/mobile/js/chunks/session-clinical-wipe-AFO7VSCZ.js");
      wipeSessionClinicalStorage({ includeLanSession: false });
    } catch (_wipeBoot) {
      void _wipeBoot;
    }
    clearWebSessionClinicalMemory();
  }
  initAppState();
})();
async function loadClinicalStateFromDb() {
  const unlockResult = await ensureClinicalDbUnlocked();
  if (unlockResult && unlockResult.unlocked) {
    await bootHydrateFromDb();
    try {
      const { flushPendingClinicalOpsLanSnapshot } = await import("/mobile/js/chunks/clinical-ops-lan-TZ4PXVEU.js");
      const flushed = await flushPendingClinicalOpsLanSnapshot();
      if (flushed.changed && typeof document !== "undefined") {
        document.dispatchEvent(new CustomEvent("rpc-clinical-ops-synced"));
      }
    } catch (_eOps) {
      void _eOps;
    }
    return;
  }
  const reason = unlockResult && unlockResult.reason || "locked";
  console.warn("[R+] Clinical DB not ready at boot:", reason);
  const bootMsg = describeClinicalDbBootFailure(unlockResult);
  if (bootMsg) {
    showToast(bootMsg, "error");
  }
  initAppState();
}
setSaveStateHooks({
  onSaveResult(result) {
    if (!result || result.ok) {
      if (result && result.level === "warn" && !isMobileWeb2()) {
        showToast(
          "El almacenamiento local est\xE1 casi lleno. Archiva pacientes egresados, exporta un respaldo y elimina duplicados de labs.",
          "error"
        );
      }
      return;
    }
    if (result.code === "QUOTA_EXCEEDED") {
      showToast(
        isMobileWeb2() ? "Safari no tiene espacio para ajustes locales. Cierra otras pesta\xF1as de R+ y vuelve a abrir el enlace del turno; los pacientes se resincronizan del anfitri\xF3n." : "No se pudo guardar: almacenamiento local lleno. Exporta un respaldo JSON, archiva o elimina historial de labs antes de seguir.",
        "error"
      );
    }
  }
});
void import("/mobile/js/chunks/session-clinical-wipe-AFO7VSCZ.js").then(function(mod) {
  mod.installSessionClinicalWipeOnExit();
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
registerMedicationsRuntime({
  getActiveId: function() {
    return activeId;
  },
  showToast,
  getSettings: function() {
    return settings;
  }
});
async function registerFeatureRuntimesForBoot() {
  if (isMobileWeb2()) {
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
    id: "onboarding-dynamic-import",
    async run() {
      loadSettings();
      const mod = await import("/mobile/js/chunks/clinical-onboarding-main-VNLNQA5N.js");
      if (typeof mod.showEarlySyncModeOnboardingIfNeeded === "function") {
        mod.showEarlySyncModeOnboardingIfNeeded();
      }
      if (typeof window.rpcNeedsEarlySyncModeChoice === "function" && window.rpcNeedsEarlySyncModeChoice()) {
        return;
      }
      await mod.showMainClinicalOnboarding();
    }
  },
  {
    id: "clinical-access-init",
    async run(ctx) {
      if (typeof window.rpcNeedsEarlySyncModeChoice === "function" && window.rpcNeedsEarlySyncModeChoice()) {
        return;
      }
      await initClinicalAccessRuntime(ctx.settings, ctx.getClinicalClientId());
    }
  },
  {
    id: "clinical-teams-dynamic-import",
    async run(ctx) {
      wireClinicalRotationEntryControls();
      wireClinicalTeamsControls();
      syncClinicalRotationEntryChrome();
      syncGuardiaModeButtonVisibility();
      ctx.teamsMod = await import("/mobile/js/chunks/clinical-teams-5QZLGSCY.js");
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
function isClinicalOnboardingBootActive() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("clinical-onboarding-active");
}
var deferredShellBootDone = false;
function runDeferredShellAfterOnboarding() {
  if (deferredShellBootDone) return;
  deferredShellBootDone = true;
  syncWorkContextChrome();
  syncMainAppTabA11y(activeAppTab);
  renderInnerTabs();
  initTabBarMotion();
  scheduleDeferredShellInits();
  scheduleDeferredUiInits();
  initRpcDatePicker();
  _rpcDeferInit(initSidebarAutoHide);
  _rpcDeferInit(initPatientModalEnterSave);
  syncProfileSectionVisibility();
}
function wireOnboardingFinishedBootResume(finishPatientListBoot) {
  if (document._rpcOnboardingFinishBootWired) return;
  document._rpcOnboardingFinishBootWired = true;
  document.addEventListener(
    "rpc-clinical-onboarding-finished",
    function() {
      runDeferredShellAfterOnboarding();
      finishPatientListBoot();
    },
    { once: true }
  );
}
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
      if (isClinicalOnboardingBootActive()) {
        wireOnboardingFinishedBootResume(finishPatientListBoot);
        return;
      }
      void import("/mobile/js/chunks/clinical-access-runtime-YYVZUHX5.js").then(function(mod) {
        if (typeof mod.refreshClinicalPatientListForScope === "function") {
          return mod.refreshClinicalPatientListForScope();
        }
        renderPatientList();
      }).catch(function() {
        renderPatientList();
      }).then(function() {
        if (ensureActivePatientInSidebarScope()) return;
        void ensureLabsLoaded().then(function(mod) {
          mod.renderLabHistoryPanel();
        });
      }).then(function() {
        if (globalThis.__RPC_CLOUD_MOBILE__) return;
        _rpcDeferInit(function() {
          void import("/mobile/js/chunks/autostart-BZPRM7IP.js").then(function(mod) {
            return mod.autostartCloudSyncIfConfigured({ toast: showToast });
          });
        });
      });
    };
    const onboardingBootActive = isClinicalOnboardingBootActive();
    tryMountClinicalTeamInviteBrowserGate();
    if (!onboardingBootActive && recoverPresentationPatientsOnBoot()) {
      showToast("Se restaur\xF3 tu lista de pacientes tras el modo presentaci\xF3n.", "info");
    }
    initModalDismiss();
    syncHeaderTodayDate();
    if (!window._rpcHeaderDateResizeWired) {
      window._rpcHeaderDateResizeWired = true;
      window.addEventListener("resize", syncHeaderTodayDate);
    }
    loadSettings();
    if (!onboardingBootActive) {
      runDeferredShellAfterOnboarding();
    }
    if (isDbMode()) {
      void import("/mobile/js/chunks/boot-steps-ZL3WGQMJ.js").then(function(boot) {
        return boot.runBootSteps(CLINICAL_DB_BOOT_STEPS, {
          settings,
          getClinicalClientId,
          teamsMod: null
        });
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
function runEarlyClinicalOnboarding() {
  if (typeof window.rpcMountEarlySyncModeOnboardingIfNeeded === "function") {
    window.rpcMountEarlySyncModeOnboardingIfNeeded();
    return;
  }
  if (!isDbMode()) return;
  void import("/mobile/js/chunks/clinical-onboarding-main-VNLNQA5N.js").then(function(mod) {
    if (typeof mod.showEarlySyncModeOnboardingIfNeeded === "function") {
      mod.showEarlySyncModeOnboardingIfNeeded();
    }
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function() {
    runEarlyClinicalOnboarding();
    runDomBoot();
  });
} else {
  runEarlyClinicalOnboarding();
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

// public/js/app-cloud-mobile.js
if (typeof globalThis !== "undefined") {
  globalThis.__RPC_CLOUD_MOBILE__ = true;
  globalThis.__RPC_MOBILE_WEB__ = true;
}
//# sourceMappingURL=/js/app.bundle.js.map
