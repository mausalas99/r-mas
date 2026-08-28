import {
  addProblema,
  emptyListado,
  removeProblema
} from "/mobile/js/chunks/chunk-MZJL4LWP.js";
import {
  syncClinicalRotationEntryChrome
} from "/mobile/js/chunks/chunk-PBVEVCIQ.js";
import {
  syncIdleLockSelectUi,
  syncPreimportBackupUi
} from "/mobile/js/chunks/chunk-FTJYBXY2.js";
import {
  buildLoadSettingsSnapshot,
  getLastLoadSettingsSnapshot,
  getProfileRuntime,
  invalidateLoadSettingsSnapshot,
  normalizeQuickOutputFormat,
  persistSettingsToLocalStorage,
  setLastLoadSettingsSnapshot,
  settingsRef,
  syncAppModeRadioControls
} from "/mobile/js/chunks/chunk-Y7GW6JFZ.js";
import {
  applyDraftToSettings,
  applyProfileToNoteIfEmpty,
  clearFormatsEditMode,
  ensureProfileTemplateDefaults,
  exportWithOutputDirFallback,
  getFormatsEditMode,
  guardDocExportBlocked,
  loadDraftFromSettings,
  renderIndicaForm,
  renderNotaEvolucionPrimaryTab,
  renderNoteForm,
  renderPatientList,
  resetDraftToBlank,
  resetProfileTemplatesToBlank,
  saveOutputDirSelection,
  setFormatsEditMode,
  syncApprovedOutputDir,
  updateDefaultFormatField
} from "/mobile/js/chunks/chunk-LWJYIL7E.js";
import {
  applyBatchStudyGroups,
  classifyLabRepoBatchFetch
} from "/mobile/js/chunks/chunk-SNRF4L5F.js";
import {
  labRepoFetchRangeFromDateInputs,
  labRepoToDateInputValue
} from "/mobile/js/chunks/chunk-XZECKTNU.js";
import {
  syncSettingsLanHostDiskSection
} from "/mobile/js/chunks/chunk-TFMD4PO7.js";
import {
  buildPatientSalaFieldHtml
} from "/mobile/js/chunks/chunk-KCX5U3HW.js";
import {
  patientDatosModalWindowHandlers
} from "/mobile/js/chunks/chunk-GXFOOQYK.js";
import {
  migrateGranularInner
} from "/mobile/js/chunks/chunk-2MXQFCGD.js";
import {
  buildCensusPayload,
  buildPatientTeamAssignSectionHtml,
  classifyCensoTableLine,
  formatCamaCellLabel,
  formatCensoMedsFromReceta,
  parseCamaCellForCenso,
  patientTeamAssignWindowHandlers,
  renderEstadoActualButton,
  resolveCensoFimiLabel,
  resolveGlobalFn,
  syncHardwareAccelerationUI,
  syncUpdateChannelUI,
  syncUpdateTelemetryUI,
  wirePatientTeamAssignRefresh
} from "/mobile/js/chunks/chunk-SEHESZ4A.js";
import {
  collapseHeaderModeSeg,
  isGuardiaMode,
  syncFontZoomButtons,
  syncHeaderModeSeg,
  syncHighContrastButtons,
  syncUiDensityButtons,
  toggleGuardiaMode,
  toggleHeaderModeSegExpand
} from "/mobile/js/chunks/chunk-G2QTTDSA.js";
import {
  syncDbSecuritySectionUi
} from "/mobile/js/chunks/chunk-77VTEV4X.js";
import {
  findCultivoChunkInSet,
  isCultureTableHeaderLine,
  parseCultureBlockFromLineArray,
  splitResLabsByTipo
} from "/mobile/js/chunks/chunk-WF6PJVIL.js";
import {
  buildAtbRisSummaryHtml,
  extractSensCrudasForGermFromSource,
  formatCultivoCondensedForCopy,
  insertSpaceAfterCultivoKeyword_,
  isParsedCultivoHeaderLine,
  parseCuentaFromCultivoChunkLines,
  renderEntry
} from "/mobile/js/chunks/chunk-7XJNQXQX.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-4V75H66Y.js";
import {
  refreshRpcDateFields
} from "/mobile/js/chunks/chunk-QLSLJE42.js";
import {
  getLabHistory,
  getListadoProblemas,
  getMedRecetaByPatient,
  getNotes,
  getPatients,
  getVpoByPatient,
  persistClinicalState,
  scheduleIdle
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import {
  storage
} from "/mobile/js/chunks/chunk-YUYECAQZ.js";
import {
  TREND_REFRESH_DEBOUNCE_MS,
  accesoFechaToDateInputValue,
  applyPatientDiagnosticosList,
  ensurePatientAccesos,
  ensurePatientDiagnosticos,
  getLabHistoryRevision,
  migratePatientDiagnosticosFromVpo,
  normalizeFechaLabHistory,
  normalizeLabLine,
  parseDiagnosticosText,
  parseFechaLabToMs,
  sortLabHistoryChronological,
  stampCensoFieldsClock,
  syncLegacyAccesoFields
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  esc,
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  closeModalAnimated,
  setAsyncButtonLoading
} from "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import {
  closeClinicoUnlockModal,
  confirmClinicoUnlock
} from "/mobile/js/chunks/chunk-K5SBVD6P.js";
import {
  isDbMode
} from "/mobile/js/chunks/chunk-7CF6AX3C.js";

// public/js/censo-table-columns.mjs
var CENSO_COL_WEIGHTS = [
  { key: "num", title: "#", weight: 20 },
  { key: "cama", title: "Cama", weight: 22 },
  { key: "paciente", title: "Paciente", weight: 70 },
  { key: "dx", title: "Dx", weight: 54 },
  { key: "meds", title: "ATB / Meds", weight: 64 },
  { key: "labs", title: "Labs", weight: 138 },
  { key: "signos", title: "Signos", weight: 88 },
  { key: "io", title: "I / E / B", weight: 72 },
  { key: "accesos", title: "Accesos", weight: 28 },
  { key: "cultivos", title: "Cultivos", weight: 58 },
  { key: "pend", title: "Pend.", weight: 78 }
];
var CENSO_OPTIONAL_COL_KEYS = ["accesos", "cultivos", "pend"];
var OPTIONAL_FREED_WEIGHT_SHARE = {
  paciente: 0.35,
  labs: 0.45,
  signos: 0.12,
  dx: 0.08
};
function censoCellHasContent(value) {
  var s = String(value || "").replace(/\r/g, "").split("\n").map(function(l) {
    return l.trim();
  }).filter(Boolean).join(" ").trim();
  return !!s && s !== "\u2014";
}
function censoRowColumnText(row, key) {
  if (!row) return "";
  if (key === "pend") return String(row.pendientes || "").trim();
  if (key === "paciente") {
    return [row.pacienteNombre, row.pacienteMeta].filter(Boolean).join("\n");
  }
  if (key === "signos") return String(row.signosCol || row.signos || "").trim();
  if (key === "io") return String(row.ioCol || "").trim();
  var direct = row[key];
  if (direct) return String(direct).trim();
  var labelByKey = {
    dx: "Diagn\xF3sticos",
    meds: "ATB / Medicamentos",
    labs: "Laboratorios",
    accesos: "Accesos",
    cultivos: "Cultivos",
    pend: "Pendientes"
  };
  var label = labelByKey[key];
  if (!label) return "";
  var sec = (row.sections || []).find(function(s) {
    return s.label === label;
  });
  return sec ? sec.lines.join("\n").trim() : "";
}
function resolveCensoColWeights(rows) {
  var optionalHidden = {};
  CENSO_OPTIONAL_COL_KEYS.forEach(function(key) {
    optionalHidden[key] = !(rows || []).some(function(row) {
      return censoCellHasContent(censoRowColumnText(row, key));
    });
  });
  var freed = 0;
  var base = CENSO_COL_WEIGHTS.filter(function(col) {
    if (optionalHidden[col.key]) {
      freed += col.weight;
      return false;
    }
    return true;
  });
  if (!freed) return base.slice();
  var recipientSum = Object.keys(OPTIONAL_FREED_WEIGHT_SHARE).reduce(function(s, key) {
    return base.some(function(col) {
      return col.key === key;
    }) ? s + OPTIONAL_FREED_WEIGHT_SHARE[key] : s;
  }, 0);
  return base.map(function(col) {
    var share = OPTIONAL_FREED_WEIGHT_SHARE[col.key];
    if (!share || !recipientSum) return { key: col.key, title: col.title, weight: col.weight };
    var extra = Math.round(freed * share / recipientSum);
    return { key: col.key, title: col.title, weight: col.weight + extra };
  });
}
function censoColumnPercents(weights) {
  var source = weights && weights.length ? weights : CENSO_COL_WEIGHTS;
  var sum = source.reduce(function(s, c) {
    return s + c.weight;
  }, 0);
  var cols = source.map(function(c) {
    return {
      key: c.key,
      title: c.title,
      pct: c.weight / sum * 100
    };
  });
  var total = cols.reduce(function(s, c) {
    return s + c.pct;
  }, 0);
  var drift = 100 - total;
  if (drift !== 0) cols[cols.length - 1].pct += drift;
  return cols;
}
function censoColClass(key) {
  if (key === "paciente") return "pac";
  if (key === "meds") return "med";
  if (key === "labs") return "lab";
  return key;
}
function censoColgroupCssRules(weights) {
  return censoColumnPercents(weights).map(function(c) {
    return "col." + censoColClass(c.key) + "{width:" + c.pct.toFixed(3) + "%}";
  }).join("");
}
function censoColgroupHtml(weights) {
  return censoColumnPercents(weights).map(function(c) {
    return '<col class="' + censoColClass(c.key) + '">';
  }).join("");
}
function censoTheadRowHtml(weights) {
  return censoColumnPercents(weights).map(function(c) {
    var bold = c.key === "dx" || c.key === "cama" ? " censo-bold" : "";
    return '<th class="censo-th' + bold + '">' + c.title + "</th>";
  }).join("");
}

// public/js/censo-preview-html-render.mjs
function censoLineClass(role) {
  if (role === "muted") return "censo-line censo-line--muted";
  if (role === "emphasis") return "censo-line censo-line--emphasis";
  if (role === "lab-date") return "censo-line censo-line--lab-date";
  if (role === "lab-panel") return "censo-line censo-line--lab-panel";
  if (role === "label-led") return "censo-line censo-line--label-led";
  return "censo-line";
}
function renderCensoLines(text, colKey) {
  var raw = String(text || "").trim();
  if (!raw) {
    if (colKey === "accesos" || colKey === "cultivos" || colKey === "pendientes") return "";
    return '<span class="censo-line censo-line--empty">\u2014</span>';
  }
  return raw.split("\n").map(function(l) {
    return l.trim();
  }).filter(Boolean).map(function(l, i) {
    var role = classifyCensoTableLine(l, colKey, i);
    return '<span class="' + censoLineClass(role) + '">' + escHtml(l) + "</span>";
  }).join("");
}
function renderCensoPacienteCell(row) {
  var lines = [String(row.pacienteNombre || "\u2014").trim() || "\u2014"];
  String(row.pacienteMeta || "").split("\n").map(function(l) {
    return l.trim();
  }).filter(Boolean).forEach(function(l) {
    lines.push(l);
  });
  return lines.map(function(l, i) {
    var role = classifyCensoTableLine(l, "paciente", i);
    var cls = censoLineClass(role);
    if (i === 0) cls += " censo-paciente-nombre";
    return '<span class="' + cls + '">' + escHtml(l) + "</span>";
  }).join("");
}
function renderCensoCamaCell(camaText) {
  var label = formatCamaCellLabel(parseCamaCellForCenso(camaText));
  if (label === "\u2014") return "\u2014";
  return '<span class="censo-cama-vline">' + escHtml(label) + "</span>";
}
function renderCensoSectionCell(row, key, fallbackLabel) {
  var v = row[key];
  if (v) return renderCensoLines(v, key);
  var sec = (row.sections || []).find(function(s) {
    return s.label === fallbackLabel;
  });
  if (!sec) {
    if (key === "accesos" || key === "cultivos" || key === "pendientes") return "";
    return '<span class="censo-line censo-line--empty">\u2014</span>';
  }
  return renderCensoLines(sec.lines.join("\n"), key);
}
function renderCensoColMultiline(row, key) {
  var v = String(row[key] || "").trim();
  if (!v) return "";
  return renderCensoLines(v, key);
}
function censoPreviewCellClass(key) {
  if (key === "paciente") return "censo-paciente";
  if (key === "dx") return "censo-dx";
  if (key === "meds") return "censo-meds";
  if (key === "labs") return "censo-labs";
  if (key === "signos") return "censo-signos";
  if (key === "io") return "censo-io";
  if (key === "accesos") return "censo-acc";
  if (key === "cultivos") return "censo-cult";
  if (key === "pend") return "censo-pend";
  if (key === "num") return "censo-num";
  if (key === "cama") return "censo-cama";
  return key;
}
function renderCensoPreviewCell(row, key) {
  if (key === "num") {
    return '<td class="censo-data-cell censo-center censo-bold censo-num"><span class="censo-num-val">' + escHtml(row.num) + "</span></td>";
  }
  if (key === "cama") {
    return '<td class="censo-data-cell censo-center censo-bold censo-cama">' + renderCensoCamaCell(row.cama) + "</td>";
  }
  if (key === "paciente") {
    return '<td class="censo-data-cell censo-center censo-paciente">' + renderCensoPacienteCell(row) + "</td>";
  }
  if (key === "dx") {
    return '<td class="censo-data-cell censo-center censo-dx">' + renderCensoSectionCell(row, "dx", "Diagn\xF3sticos") + "</td>";
  }
  if (key === "meds") {
    return '<td class="censo-data-cell censo-center censo-meds">' + renderCensoSectionCell(row, "meds", "ATB / Medicamentos") + "</td>";
  }
  if (key === "labs") {
    return '<td class="censo-data-cell censo-labs">' + renderCensoSectionCell(row, "labs", "Laboratorios") + "</td>";
  }
  if (key === "signos") {
    return '<td class="censo-data-cell censo-signos">' + renderCensoColMultiline(row, "signosCol") + "</td>";
  }
  if (key === "io") {
    return '<td class="censo-data-cell censo-io">' + renderCensoColMultiline(row, "ioCol") + "</td>";
  }
  if (key === "accesos") {
    return '<td class="censo-data-cell censo-acc">' + renderCensoSectionCell(row, "accesos", "Accesos") + "</td>";
  }
  if (key === "cultivos") {
    return '<td class="censo-data-cell censo-cult">' + renderCensoSectionCell(row, "cultivos", "Cultivos") + "</td>";
  }
  if (key === "pend") {
    return '<td class="censo-data-cell censo-pend">' + renderCensoSectionCell(row, "pendientes", "Pendientes") + "</td>";
  }
  return '<td class="censo-data-cell ' + censoPreviewCellClass(key) + '"></td>';
}
function buildCensoPreviewBodyHtml(rows, weights) {
  var cols = resolveCensoColWeights(rows || []);
  if (weights && weights.length) cols = weights;
  return (rows || []).map(function(row, idx) {
    return '<tr class="' + (idx % 2 ? "alt" : "") + '">' + cols.map(function(col) {
      return renderCensoPreviewCell(row, col.key);
    }).join("") + "</tr>";
  }).join("");
}
var CENSO_PREVIEW_STYLES = '@page{size:legal landscape;margin:10mm}body{font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:10px;line-height:1.35;color:#1a2332;margin:0;padding:12px 14px;background:#fff}h1{margin:0 0 2px;font-size:15px;font-weight:700;letter-spacing:-0.01em}.sub{color:#5c6778;font-size:8.5px;margin-bottom:10px;line-height:1.4}.mes{text-align:center;font-weight:700;color:var(--color-accent);font-size:11px;margin:-24px 0 10px;letter-spacing:0.04em}table{width:100%;max-width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #d4dae3;padding:5px 6px;word-wrap:break-word;overflow-wrap:anywhere}th.censo-th{background:#eef1f6;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-ink-muted);vertical-align:middle;text-align:center;white-space:nowrap;line-height:1.2;padding:6px 4px}th.censo-th.censo-bold{font-weight:800}tbody td.censo-data-cell{vertical-align:middle}tr.alt td{background:#f7f8fb}.censo-line{display:block;line-height:1.28;margin:0}.censo-line + .censo-line{margin-top:1px}.censo-line--empty{color:#9aa3b2;font-weight:400}td.censo-center .censo-line{text-align:center;margin-left:auto;margin-right:auto}.censo-line--muted{color:#5c6778;font-size:8px;font-weight:400}.censo-line--emphasis{font-weight:700;color:#1a2332}.censo-line--lab-date{font-weight:700;color:var(--color-accent);font-size:8px;margin-bottom:2px}.censo-line--lab-panel{font-weight:600;font-size:7.5px;font-family:"IBM Plex Mono",ui-monospace,monospace;letter-spacing:-0.01em}.censo-line--label-led{font-size:8px;font-weight:600}td.censo-labs .censo-line{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:7.5px;line-height:1.28}td.censo-signos,td.censo-io,td.censo-pend,td.censo-acc,td.censo-cult{font-size:8px;text-align:left}td.censo-paciente,td.censo-dx,td.censo-meds{text-align:center}td.censo-paciente{font-size:8.5px}td.censo-dx{font-weight:700;font-size:8px;line-height:1.25}td.censo-meds{font-size:7.5px;line-height:1.28}td.censo-acc,td.censo-cult{font-size:8px}.censo-center{text-align:center;vertical-align:middle}.censo-bold{font-weight:700}td.censo-num,td.censo-cama{padding:4px 2px;text-align:center;vertical-align:middle}td.censo-num .censo-num-val{color:var(--color-accent);font-weight:700}td.censo-cama .censo-cama-vline{display:block;margin:0 auto}.censo-cama-vline{font-weight:700;font-size:9px;color:var(--color-accent);writing-mode:vertical-rl;text-orientation:mixed;line-height:1;white-space:nowrap}.censo-paciente-nombre,.censo-line--emphasis.censo-paciente-nombre{font-weight:700;color:#1a2332}';
function buildCensoPreviewStyles(weights) {
  return CENSO_PREVIEW_STYLES + censoColgroupCssRules(weights);
}
function buildCensoPreviewDocumentHtml(header, bodyHtml, rows) {
  var weights = resolveCensoColWeights(rows || []);
  var titleLine = header.titleLine || "Censo de Sala";
  var equipoLine = header.equipoLine || "";
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Censo ' + escHtml(header.fecha) + "</title><style>" + buildCensoPreviewStyles(weights) + "</style></head><body><h1>" + escHtml(titleLine) + "</h1>" + (header.mes ? '<div class="mes">' + escHtml(header.mes) + "</div>" : "") + '<div class="sub">' + (equipoLine ? escHtml(equipoLine) : "") + (equipoLine && header.fecha ? " \xB7 " : "") + (header.fecha ? escHtml(header.fecha) : "") + "</div><table><colgroup>" + censoColgroupHtml(weights) + "</colgroup><thead><tr>" + censoTheadRowHtml(weights) + "</tr></thead><tbody>" + bodyHtml + "</tbody></table></body></html>";
}

// public/js/censo-preview-html.mjs
function renderCensoPreviewHtml(payload) {
  var header = payload.header || {};
  var rows = payload.rows || [];
  return buildCensoPreviewDocumentHtml(header, buildCensoPreviewBodyHtml(rows), rows);
}
function ensureCensoPreviewModal() {
  var existing = document.getElementById("censo-preview-backdrop");
  if (existing) return existing;
  var backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop censo-preview-backdrop";
  backdrop.id = "censo-preview-backdrop";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.innerHTML = '<div class="modal censo-preview-modal" role="dialog" aria-modal="true" aria-labelledby="censo-preview-title"><div class="censo-preview-modal-head"><h3 id="censo-preview-title" class="modal-title">Vista previa del censo</h3><p class="profile-hint censo-preview-hint">As\xED se ver\xE1 el PDF. Usa Imprimir para guardar como PDF desde el sistema.</p></div><iframe id="censo-preview-frame" class="censo-preview-frame" title="Vista previa del censo"></iframe><div class="modal-actions"><button type="button" class="btn-med-secondary" id="censo-preview-close">Cerrar</button><button type="button" class="btn-generate" id="censo-preview-print">Imprimir</button></div></div>';
  document.body.appendChild(backdrop);
  if (!ensureCensoPreviewModal._wired) {
    ensureCensoPreviewModal._wired = true;
    backdrop.addEventListener("click", function(e) {
      if (e.target === backdrop) closeCensoPreviewModal();
    });
    document.getElementById("censo-preview-close")?.addEventListener("click", closeCensoPreviewModal);
    document.getElementById("censo-preview-print")?.addEventListener("click", function() {
      var frame = document.getElementById("censo-preview-frame");
      try {
        frame?.contentWindow?.print();
      } catch {
      }
    });
    document.addEventListener("keydown", function(e) {
      if (e.key !== "Escape") return;
      var el = document.getElementById("censo-preview-backdrop");
      if (el?.classList.contains("open")) closeCensoPreviewModal();
    });
  }
  return backdrop;
}
function closeCensoPreviewModal() {
  var backdrop = document.getElementById("censo-preview-backdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
  backdrop.setAttribute("aria-hidden", "true");
  document.documentElement.classList.remove("censo-preview-open");
  var frame = document.getElementById("censo-preview-frame");
  if (frame) frame.removeAttribute("srcdoc");
}
function openCensoPreviewInApp(payload) {
  var html = renderCensoPreviewHtml(payload);
  var backdrop = ensureCensoPreviewModal();
  var frame = document.getElementById("censo-preview-frame");
  if (!frame) return false;
  frame.srcdoc = html;
  backdrop.classList.add("open");
  backdrop.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("censo-preview-open");
  return true;
}

// public/js/censo-export.mjs
var rt = {
  getSettings() {
    return {};
  },
  showToast() {
  },
  requestDocumentJson() {
    return Promise.resolve(null);
  },
  handleDocumentGenerateResponse() {
    return Promise.resolve(null);
  },
  incrementPendingJobs() {
  },
  decrementPendingJobs() {
  },
  syncOfflineButtonStates() {
  },
  guardMobileDocExport() {
    return false;
  },
  isRpcOffline() {
    return false;
  }
};
function registerCensoRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(rt, ctx);
}
var CENSO_EXPORT_BUTTON_IDS = [
  "btn-export-censo-header",
  "btn-export-censo-sidebar",
  "btn-export-censo-settings",
  "btn-export-censo"
];
function syncCensoExportButtonVisibility() {
  var show = isModeSala(rt.getSettings()) && !isMobileWeb();
  CENSO_EXPORT_BUTTON_IDS.forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    if (id === "btn-export-censo-settings") return;
    if (!show) {
      btn.style.display = "none";
      return;
    }
    btn.style.display = id === "btn-export-censo-header" ? "inline-flex" : "";
  });
  var settingsRow = document.getElementById("btn-export-censo-settings-row");
  if (settingsRow) settingsRow.style.display = show ? "" : "none";
  var wrap = document.getElementById("sidebar-censo-export-wrap");
  if (wrap) wrap.style.display = show ? "" : "none";
}
function censoExportLoadingButtons() {
  ensureCensoModal();
  var confirm = document.getElementById("censo-export-confirm");
  return confirm ? [confirm] : [];
}
function buildTodosMap() {
  var map = /* @__PURE__ */ Object.create(null);
  getPatients().forEach(function(p) {
    if (!p || !p.id) return;
    map[p.id] = storage.getTodos(p.id);
  });
  return map;
}
function preparePatientsForCensus() {
  getPatients().forEach(function(p) {
    if (!p) return;
    migratePatientDiagnosticosFromVpo(p, getVpoByPatient()[p.id]);
  });
  persistClinicalState();
}
function patientsForCensoExport() {
  if (typeof rt.getCensusPatients === "function") {
    return rt.getCensusPatients();
  }
  return getPatients();
}
function ensureCensoModal() {
  var existing = document.getElementById("censo-export-modal");
  if (existing) return existing;
  var backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.id = "censo-export-modal";
  backdrop.setAttribute("aria-hidden", "true");
  backdrop.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="censo-export-title"><h3 id="censo-export-title" class="modal-title">Exportar censo (PDF)</h3><p class="profile-hint" id="censo-export-fecha-label"></p><p class="profile-hint" id="censo-export-mes-label"></p><p class="profile-hint">Diagn\xF3sticos: m\xE1x. 3 primeros \xB7 filas seg\xFAn contenido (labs largos \u2192 m\xE1s altura).</p><label class="profile-radio" style="display:flex;gap:8px;margin:12px 0;"><input type="checkbox" id="censo-export-archived"> Incluir pacientes archivados</label><div class="modal-actions"><button type="button" class="btn-med-secondary" id="censo-export-cancel">Cancelar</button><button type="button" class="btn-med-secondary" id="censo-export-preview">Vista previa</button><button type="button" class="btn-generate" id="censo-export-confirm">Generar PDF</button></div></div>';
  document.body.appendChild(backdrop);
  return backdrop;
}
function openCensoExportDialog() {
  if (!isModeSala(rt.getSettings())) return;
  if (rt.guardMobileDocExport()) return;
  var modal = ensureCensoModal();
  var now = /* @__PURE__ */ new Date();
  var fechaEl = document.getElementById("censo-export-fecha-label");
  var mesEl = document.getElementById("censo-export-mes-label");
  if (fechaEl) {
    fechaEl.textContent = "Fecha: " + String(now.getDate()).padStart(2, "0") + "/" + String(now.getMonth() + 1).padStart(2, "0") + "/" + now.getFullYear();
  }
  if (mesEl) {
    mesEl.textContent = "Mes: " + now.toLocaleString("es-MX", { month: "long" }).toUpperCase() + " " + now.getFullYear();
  }
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}
function closeCensoModal() {
  var modal = document.getElementById("censo-export-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}
function exportCensoPdf(includeArchived) {
  if (!isModeSala(rt.getSettings())) return;
  if (rt.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt.isRpcOffline, showToast: rt.showToast })) return;
  preparePatientsForCensus();
  var censusPatients = patientsForCensoExport();
  var payload = buildCensusPayload({
    settings: rt.getSettings(),
    patients: censusPatients,
    includeArchived: !!includeArchived,
    labHistoryByPatient: getLabHistory(),
    medRecetaByPatient: getMedRecetaByPatient(),
    todosByPatient: buildTodosMap()
  });
  if (!payload.rows.length) {
    rt.showToast("Sin pacientes para el censo", "error");
    return;
  }
  var exportBtns = censoExportLoadingButtons();
  exportBtns.forEach(function(btn) {
    setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: "Exportando\u2026" });
  });
  rt.incrementPendingJobs();
  function buildBody() {
    return {
      header: payload.header,
      rows: payload.rows,
      servicio: payload.servicio
    };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
      return Promise.resolve(void 0);
    }
    return window.electronAPI.selectOutputDir();
  }
  return exportWithOutputDirFallback({
    url: "/generate-censo",
    buildPayload: buildBody,
    defaultFileName: "Censo.pdf",
    selectOutputDir,
    saveOutputDir: function(dir) {
      saveOutputDirSelection(dir, {
        getSettings: rt.getSettings,
        loadSettings: rt.loadSettings
      });
    },
    onSuccess: function(data) {
      var name = data && (data.fileName || data.path) ? data.fileName || String(data.path).split(/[/\\]/).pop() : "PDF";
      rt.showToast("Censo guardado: " + name, "success");
    },
    onPrompt: function() {
      rt.showToast("Selecciona una carpeta para guardar el PDF.", "error");
    },
    onCancel: function() {
      rt.showToast("No se guard\xF3 el PDF: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(message) {
      rt.showToast("Error: " + message, "error");
    }
  }).catch(function() {
    rt.showToast("Error de conexi\xF3n al generar el censo", "error");
  }).finally(function() {
    exportBtns.forEach(function(btn) {
      setAsyncButtonLoading(btn, false);
    });
    rt.decrementPendingJobs();
    if (typeof rt.syncOfflineButtonStates === "function") rt.syncOfflineButtonStates();
  });
}
function exportCensoPdfFromHelp() {
  openCensoExportDialog();
}
function previewCenso(includeArchived) {
  if (!isModeSala(rt.getSettings())) return;
  preparePatientsForCensus();
  var censusPatients = patientsForCensoExport();
  var payload = buildCensusPayload({
    settings: rt.getSettings(),
    patients: censusPatients,
    includeArchived: !!includeArchived,
    labHistoryByPatient: getLabHistory(),
    medRecetaByPatient: getMedRecetaByPatient(),
    todosByPatient: buildTodosMap()
  });
  if (!payload.rows.length) {
    rt.showToast("Sin pacientes para el censo", "error");
    return;
  }
  openCensoPreviewInApp(payload);
}
function wireCensoModalOnce() {
  if (wireCensoModalOnce._done) return;
  wireCensoModalOnce._done = true;
  document.addEventListener("click", function(e) {
    if (e.target.id === "censo-export-cancel") {
      closeCensoModal();
      return;
    }
    if (e.target.id === "censo-export-preview") {
      var archivedPreview = !!document.getElementById("censo-export-archived")?.checked;
      previewCenso(archivedPreview);
      return;
    }
    if (e.target.id === "censo-export-confirm") {
      var archived = !!document.getElementById("censo-export-archived")?.checked;
      closeCensoModal();
      exportCensoPdf(archived);
      return;
    }
    var modal = document.getElementById("censo-export-modal");
    if (modal && e.target === modal) closeCensoModal();
  });
}
if (typeof document !== "undefined") {
  wireCensoModalOnce();
}

// public/js/features/expediente/expediente-runtime.mjs
var rt2 = {
  getActiveId() {
    return null;
  },
  getActiveAppTab() {
    return "lab";
  },
  getActiveInner() {
    return "todo";
  },
  getSettings() {
    return (
      /** @type {any} */
      {}
    );
  },
  showToast() {
  },
  renderTendencias() {
  },
  splitResLabsByTipo(rows) {
    void rows;
    return { labs: [], cultivo: [] };
  },
  buildLabSetDateLine(set) {
    void set;
    return "";
  },
  ensureParsedLabHistory(pid) {
    void pid;
    return [];
  },
  isRpcOffline() {
    return false;
  },
  requestDocumentJson() {
    return Promise.resolve(null);
  },
  handleDocumentGenerateResponse() {
    return Promise.resolve(null);
  },
  incrementPendingJobs() {
  },
  decrementPendingJobs() {
  },
  syncOfflineButtonStates() {
  },
  copyToClipboardSafe(_t) {
    return Promise.resolve(false);
  },
  guardMobileDocExport() {
    return false;
  }
};
function registerExpedienteRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt2, ctx);
}
function aid() {
  return rt2.getActiveId();
}

// public/js/features/expediente/expediente-cultivos-parse.mjs
var CULTIVO_TIPO_LABELS = {
  hemo: "Hemocultivo",
  uro: "Urocultivo",
  cateter: "Cultivo de cat\xE9ter",
  gram: "Tinci\xF3n Gram",
  fungi: "Fungicultivo",
  otro: "Otros cultivos"
};
function isCultureTableHeaderLine2(t) {
  return isParsedCultivoHeaderLine(t);
}
function classifyCultureTipoKeyFromHeaderLine(rawLine) {
  var s = String(rawLine || "").replace(/\s+/g, " ").trim();
  var beforeColon = (s.split(":")[0] || s).toUpperCase();
  if (/^HEMOCULTIVO/.test(beforeColon)) return "hemo";
  if (/^UROCULTIVO/.test(beforeColon)) return "uro";
  if (/^FUNGICULTIVO/.test(beforeColon)) return "fungi";
  if (/^TINCION(\s+DE)?\s+GRAM\b/.test(beforeColon)) return "gram";
  if (/^CATETER\b/.test(beforeColon)) return "cateter";
  return "otro";
}
function completePartialFechaForCultivo(dm, set) {
  if (!dm) return "";
  var parts = String(dm).trim().split("/");
  if (parts.length === 3) {
    var y3 = parts[2].length === 2 ? "20" + parts[2] : parts[2];
    var joined = parts[0].padStart(2, "0") + "/" + parts[1].padStart(2, "0") + "/" + y3;
    return normalizeFechaLabHistory(joined) || joined;
  }
  if (parts.length !== 2) return dm;
  var y = (/* @__PURE__ */ new Date()).getFullYear();
  if (set && set.fecha && set.fecha !== "Anterior") {
    var fd = normalizeFechaLabHistory(set.fecha) || String(set.fecha);
    var ms = parseFechaLabToMs(fd, "");
    if (typeof ms === "number" && isFinite(ms)) y = new Date(ms).getFullYear();
  }
  return parts[0].padStart(2, "0") + "/" + parts[1].padStart(2, "0") + "/" + y;
}
function cultureBlockLooksNegative(left, right) {
  var L = (left + " " + right).toUpperCase();
  if (!String(right || "").trim()) return true;
  return /NEGATIVO|NO HAY CRECIMIENTO|SIN AISLAMIENTO|AUSENCIA(\s+DE)?\s+CRECIMIENTO|NO SE AISL|ESCASA FLORA|CONTAMINACI(O|Ó)N|SIN CRECIMIENTO/i.test(L);
}
function parseCultureHeaderFields(rawHeader, set) {
  var line = String(rawHeader || "").replace(/\s+/g, " ").trim();
  var colon = line.indexOf(":");
  var left = colon >= 0 ? line.slice(0, colon).trim() : line;
  var right = colon >= 0 ? line.slice(colon + 1).trim() : "";
  var fechaMuestra = "";
  var sitio = left;
  var dm = left.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*$/);
  if (dm) {
    fechaMuestra = completePartialFechaForCultivo(dm[1], set);
    sitio = left.slice(0, dm.index).trim() || left.replace(/\s*\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s*$/, "").trim();
  }
  return { line, left, right, fechaMuestra, sitio };
}
function resolveCultureOrganismo(left, right) {
  var organismo = right.replace(/\s+/g, " ").trim();
  var negativo = cultureBlockLooksNegative(left, right);
  if (negativo && !organismo) organismo = "Negativo";
  else if (negativo && /^NEGATIVO$/i.test(organismo)) organismo = "Negativo";
  else if (!organismo) organismo = "\u2014";
  return { organismo, negativo };
}
function buildCultureRowObject(set, seq, tipoKey, studyDate, sortMs, header, org, cuenta, resStr) {
  var sortKeyMs = sortMs;
  if (header.fechaMuestra) {
    var fmNorm = normalizeFechaLabHistory(header.fechaMuestra) || header.fechaMuestra;
    var fmParsed = parseFechaLabToMs(fmNorm, "");
    if (typeof fmParsed === "number" && isFinite(fmParsed)) sortKeyMs = fmParsed;
  }
  return {
    row: {
      studyDate,
      fechaMuestra: header.fechaMuestra || "\u2014",
      sitio: header.sitio || "\u2014",
      organismo: org.organismo,
      cuenta: cuenta || "",
      resistencias: resStr || (org.negativo ? "\u2014" : ""),
      negativo: org.negativo,
      sortMs,
      sortKeyMs,
      tipoKey,
      tipoLabel: CULTIVO_TIPO_LABELS[tipoKey] || CULTIVO_TIPO_LABELS.otro,
      labSetId: set && set.id != null ? set.id : "",
      _seq: typeof seq === "number" ? seq : 0
    }
  };
}
function parseCultureBlockFromLineArray2(lines, set, seq) {
  var rawHeader = insertSpaceAfterCultivoKeyword_(String(lines[0] || ""));
  var tipoKey = classifyCultureTipoKeyFromHeaderLine(rawHeader);
  var studyDate = rt2.buildLabSetDateLine(set) || "\u2014";
  var sortMs = parseFechaLabToMs(set.fecha, set.hora);
  if (typeof sortMs !== "number" || !isFinite(sortMs)) sortMs = 0;
  var header = parseCultureHeaderFields(rawHeader, set);
  var org = resolveCultureOrganismo(header.left, header.right);
  var bodyLines = lines.slice(1);
  var cuenta = parseCuentaFromCultivoChunkLines(bodyLines);
  var resStr = bodyLines.filter(function(ln) {
    var t = String(ln || "").trim();
    if (!t || /^Cuenta:/i.test(t)) return false;
    if (/^USER\b/i.test(t)) return false;
    if (/\bLabo\s*-?\d+/i.test(t) && /\b(DJEG|UANL|Campo|Feme)\b/i.test(t)) return false;
    return true;
  }).join("\n").trim();
  return buildCultureRowObject(set, seq, tipoKey, studyDate, sortMs, header, org, cuenta, resStr);
}
function cultivoChunkMatchesQuery(gq, q) {
  if (gq === q || gq.indexOf(q) !== -1 || q.indexOf(gq) !== -1) return true;
  var gTok = gq.split(/\s+/).filter(Boolean)[0] || "";
  var qTok = q.split(/\s+/).filter(Boolean)[0] || "";
  return gTok.length > 3 && qTok.length > 3 && (gTok === qTok || gq.indexOf(qTok) === 0 || q.indexOf(gTok) === 0);
}
function findCultivoChunkInSet2(set, organismoQuery) {
  if (!set || !set.resLabs) return null;
  var q = String(organismoQuery || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (!q || q === "\u2014") return null;
  var cult = rt2.splitResLabsByTipo(set.resLabs).cultivo;
  for (var ei = 0; ei < cult.length; ei++) {
    var chunks = String(cult[ei] || "").split(/\n\n+/).map(function(s) {
      return s.trim();
    }).filter(Boolean);
    for (var ci = 0; ci < chunks.length; ci++) {
      var head = chunks[ci].split(/\n/)[0] || "";
      var gq = germQueryFromCultivoChunkHead(head).replace(/\s+/g, " ").trim().toUpperCase();
      if (!gq) continue;
      if (cultivoChunkMatchesQuery(gq, q)) return chunks[ci];
    }
  }
  return null;
}
function copyCultivoCondensado(setId, organismo) {
  var pid = aid();
  if (!pid) {
    rt2.showToast("Selecciona un paciente", "error");
    return;
  }
  var sets = getLabHistory()[pid] || [];
  var set = sets.find(function(s) {
    return String(s.id) === String(setId);
  });
  if (!set) {
    rt2.showToast("No se encontr\xF3 el env\xEDo en historial", "error");
    return;
  }
  var chunk = findCultivoChunkInSet2(set, organismo);
  if (!chunk) {
    rt2.showToast("No hay resumen de cultivo procesado para copiar", "error");
    return;
  }
  var t = formatCultivoCondensedForCopy(chunk, rt2.buildLabSetDateLine(set) || "");
  if (!t.trim()) {
    rt2.showToast("No hay texto para copiar", "error");
    return;
  }
  var p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(t) : Promise.reject(new Error("no clipboard"));
  p.then(
    function() {
      rt2.showToast("Cultivo condensado copiado", "success");
    },
    function() {
      rt2.showToast("No se pudo copiar al portapapeles", "error");
    }
  );
}
function germHintFromCultivoHeadLine(headLine) {
  var line = String(headLine || "").replace(/\s+/g, " ").trim();
  var colon = line.lastIndexOf(":");
  if (colon >= 0) {
    var right = line.slice(colon + 1).trim();
    if (right) return right;
  }
  return line;
}
function germQueryFromCultivoChunkHead(headLine) {
  var h = germHintFromCultivoHeadLine(headLine);
  var base = h.split(/\s*·\s*/)[0].trim();
  return base || h;
}
function isResLabChunkPureCultivo(text) {
  var sp = rt2.splitResLabsByTipo([text]);
  if (sp.labs.length) return false;
  return sp.cultivo.some(function(r) {
    return String(r || "").trim();
  });
}
function buildCultivoOutputHtmlFragments(text, sourceText) {
  var raw = String(text || "");
  var chunks = raw.split(/\n\n+/).map(function(s) {
    return s.trim();
  }).filter(Boolean);
  if (!chunks.length) return "";
  var parts = [];
  chunks.forEach(function(chunk) {
    var lines = chunk.split(/\n/);
    if (lines.length) lines[0] = insertSpaceAfterCultivoKeyword_(lines[0]);
    var germQuery = germQueryFromCultivoChunkHead(lines[0] || "");
    var sens = sourceText ? extractSensCrudasForGermFromSource(sourceText, germQuery) : null;
    lines.forEach(function(lineRaw) {
      var t = String(lineRaw || "").trim();
      if (!t) return;
      if (/^USER\b/i.test(t)) return;
      if (/\bLabo\s*-?\d+/i.test(t) && /\b(DJEG|UANL|Campo|Feme)\b/i.test(t)) return;
      if (/^ATB\b/i.test(t) && sens && sens.length) {
        parts.push(
          '<div class="out-line cultivos-atb-chips lab-out-atb">' + buildAtbRisSummaryHtml(sens) + "</div>"
        );
        return;
      }
      renderEntry(lineRaw).forEach(function(html, idx) {
        parts.push('<div class="' + (idx === 0 ? "out-line" : "out-indent") + '">' + html + "</div>");
      });
    });
  });
  return parts.join("");
}

// public/js/features/expediente/expediente-cultivos-atb-ui.mjs
function buildCultivoAntibiogramCellHtmlForPatient(r, patientId) {
  if (!patientId) return '<pre class="cultivos-atb-fallback">\u2014</pre>';
  var sets = getLabHistory()[patientId] || [];
  var set = sets.find(function(s) {
    return String(s.id) === String(r.labSetId);
  });
  var sens = set && set.sourceText ? extractSensCrudasForGermFromSource(set.sourceText, r.organismo) : null;
  var copyBtn = set && r.labSetId != null && String(r.labSetId) !== "" ? `<button type="button" class="cultivos-copy-full-btn" onclick='copyCultivoCondensado(` + JSON.stringify(String(r.labSetId)) + "," + JSON.stringify(String(r.organismo || "")) + ")'>Copiar informe completo</button>" : "";
  if (sens && sens.length) {
    return '<div class="cultivos-atb-wrap"><div class="cultivos-atb-chips" role="list">' + buildAtbRisSummaryHtml(sens) + "</div>" + copyBtn + "</div>";
  }
  return '<div class="cultivos-atb-wrap"><pre class="cultivos-atb-fallback">' + esc(r.resistencias || r.risSummary || "\u2014") + "</pre>" + copyBtn + "</div>";
}
var _atbRisScrollResizeWired = false;
var _atbRisScrollRootsWired = /* @__PURE__ */ new WeakSet();
var _atbRisDelegatedHoverRoots = /* @__PURE__ */ new WeakSet();
var ATB_RIS_HIDE_DELAY_MS = 140;
function ensureAtbRisScrollRepositionOn(el) {
  if (!el || _atbRisScrollRootsWired.has(el)) return;
  _atbRisScrollRootsWired.add(el);
  el.addEventListener("scroll", repositionOpenAtbRisPanel, { passive: true });
}
function cancelHideAtbPanel(panel) {
  if (!panel || !panel._atbHideTid) return;
  clearTimeout(panel._atbHideTid);
  panel._atbHideTid = null;
}
function scheduleHideAtbPanel(panel) {
  if (!panel) return;
  cancelHideAtbPanel(panel);
  panel._atbHideTid = setTimeout(function() {
    panel._atbHideTid = null;
    hideAtbRisHoverPanel(panel);
  }, ATB_RIS_HIDE_DELAY_MS);
}
function panelAtbRisForWrap(wrap) {
  return wrap.querySelector(".atb-ris-hover-panel") || wrap._atbRisPanelEl || null;
}
function hideAtbRisHoverPanel(panel) {
  if (!panel) return;
  cancelHideAtbPanel(panel);
  panel.classList.remove("is-open");
  panel.style.left = "";
  panel.style.top = "";
  panel.style.visibility = "";
  var wrap = panel._atbRisOwnerWrap;
  if (wrap) {
    wrap._atbRisPanelEl = null;
  }
  panel._atbRisOwnerWrap = null;
  if (wrap && wrap.isConnected) {
    wrap.appendChild(panel);
  } else if (panel.parentNode === document.body) {
    panel.remove();
  }
}
function closeAtbRisPanelsExcept(exceptWrap) {
  document.querySelectorAll(".atb-ris-hover-panel.is-open").forEach(function(panel) {
    var w = panel._atbRisOwnerWrap || panel.closest(".cult-atb-ris-chip-wrap");
    if (w !== exceptWrap) hideAtbRisHoverPanel(panel);
  });
}
function repositionOpenAtbRisPanel() {
  var panel = document.querySelector(".atb-ris-hover-panel.is-open");
  if (!panel) return;
  var wrap = panel._atbRisOwnerWrap || panel.closest(".cult-atb-ris-chip-wrap");
  if (wrap) positionAtbRisHoverPanel(wrap);
}
function positionAtbRisHoverPanel(wrap) {
  var panel = panelAtbRisForWrap(wrap);
  var chip = wrap.querySelector(".atb-chip");
  if (!panel || !chip) return;
  closeAtbRisPanelsExcept(wrap);
  cancelHideAtbPanel(panel);
  panel._atbRisOwnerWrap = wrap;
  wrap._atbRisPanelEl = panel;
  if (panel.parentNode !== document.body) {
    document.body.appendChild(panel);
  }
  panel.classList.add("is-open");
  panel.style.visibility = "hidden";
  panel.style.left = "-9999px";
  panel.style.top = "0";
  void panel.offsetWidth;
  var chipRect = chip.getBoundingClientRect();
  var pr = panel.getBoundingClientRect();
  var pw = pr.width;
  var ph = pr.height;
  var margin = 8;
  var gap = 1;
  var vh = window.innerHeight;
  var vw = window.innerWidth;
  var top = chipRect.bottom + gap;
  if (top + ph > vh - margin) {
    var aboveTop = chipRect.top - gap - ph;
    if (aboveTop >= margin) top = aboveTop;
    else top = Math.max(margin, vh - margin - ph);
  }
  var left = chipRect.left;
  if (left + pw > vw - margin) left = vw - margin - pw;
  if (left < margin) left = margin;
  panel.style.left = left + "px";
  panel.style.top = top + "px";
  panel.style.visibility = "";
  panel.style.zIndex = "";
}
function wireAtbRisPanelHoverListeners(panel) {
  if (panel._atbRisPanelHoverListeners) return;
  panel._atbRisPanelHoverListeners = true;
  panel.addEventListener("mouseenter", function() {
    cancelHideAtbPanel(panel);
  });
  panel.addEventListener("mouseleave", function(ev) {
    var w = panel._atbRisOwnerWrap || panel.closest(".cult-atb-ris-chip-wrap");
    var toEl = ev.relatedTarget;
    if (toEl && w && (w.contains(toEl) || panel.contains(toEl))) return;
    scheduleHideAtbPanel(panel);
  });
}
function wireAtbRisHoverPanels(rootEl) {
  if (!rootEl) return;
  if (!_atbRisScrollResizeWired) {
    _atbRisScrollResizeWired = true;
    window.addEventListener("scroll", repositionOpenAtbRisPanel, true);
    window.addEventListener("resize", repositionOpenAtbRisPanel);
  }
  ensureAtbRisScrollRepositionOn(rootEl);
  var tableWrap = rootEl.querySelector && rootEl.querySelector(".cultivos-table-wrap");
  if (tableWrap) ensureAtbRisScrollRepositionOn(tableWrap);
  var cultTab = document.getElementById("itab-content-cult");
  if (cultTab) ensureAtbRisScrollRepositionOn(cultTab);
  if (!_atbRisDelegatedHoverRoots.has(rootEl)) {
    _atbRisDelegatedHoverRoots.add(rootEl);
    rootEl.addEventListener("mouseover", function(ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains("cult-atb-ris-chip-wrap") ? t : t.closest(".cult-atb-ris-chip-wrap");
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (p) cancelHideAtbPanel(p);
      positionAtbRisHoverPanel(wrap);
    });
    rootEl.addEventListener("mouseout", function(ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains("cult-atb-ris-chip-wrap") ? t : t.closest(".cult-atb-ris-chip-wrap");
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (!p) return;
      var toEl = ev.relatedTarget;
      if (toEl && (wrap.contains(toEl) || p.contains(toEl))) return;
      scheduleHideAtbPanel(p);
    });
    rootEl.addEventListener("focusin", function(ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains("cult-atb-ris-chip-wrap") ? t : t.closest(".cult-atb-ris-chip-wrap");
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (p) cancelHideAtbPanel(p);
      positionAtbRisHoverPanel(wrap);
    });
    rootEl.addEventListener("focusout", function(ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains("cult-atb-ris-chip-wrap") ? t : t.closest(".cult-atb-ris-chip-wrap");
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (!p) return;
      var rel = ev.relatedTarget;
      if (rel && (wrap.contains(rel) || p.contains(rel))) return;
      hideAtbRisHoverPanel(p);
    });
  }
  rootEl.querySelectorAll(".atb-ris-hover-panel").forEach(wireAtbRisPanelHoverListeners);
}
function removeAtbRisPanelsFromBody() {
  document.querySelectorAll("body > .atb-ris-hover-panel").forEach(function(p) {
    hideAtbRisHoverPanel(p);
  });
}

// public/js/features/cultivo-queue-model.mjs
function chunkHasAntibiograma(chunkText) {
  var t = String(chunkText || "");
  if (!t.trim()) return false;
  if (/^ATB\b.*:/im.test(t)) return true;
  var up = t.toUpperCase();
  var idx = up.indexOf("ANTIBIOGRAMA");
  if (idx === -1) return false;
  var after = t.slice(idx + "ANTIBIOGRAMA".length);
  if (!String(after).replace(/[\s*]+/g, "")) return false;
  return /\b(SENSIBLE|RESISTENTE|INTERMED|SUSCEPTIBLE|INDETER)\b/i.test(after) || /\b[SIR]\b/.test(after.toUpperCase()) || /^\s*[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s./-]{2,}\s*$/im.test(after);
}
function cultivoNeedsAtbFollowUp(row, chunkText) {
  if (!row || row.negativo) return false;
  if (chunkHasAntibiograma(chunkText)) return false;
  return true;
}
function sectionLines(sec) {
  return String(sec || "").split(/\r?\n/).map(function(l) {
    return l.replace(/\*+$/g, "").trim();
  }).filter(Boolean);
}
function splitCultivoSections(chunkEntry) {
  return String(chunkEntry || "").split(/\n\n+/).map(function(s) {
    return s.trim();
  }).filter(Boolean);
}
function candidateFecha(row, set) {
  if (row.fechaMuestra && row.fechaMuestra !== "\u2014") return row.fechaMuestra;
  return normalizeFechaLabHistory(set.fecha) || String(set.fecha || "").trim() || "\u2014";
}
function candidateFromSection(set, sec, seq, setById) {
  var lines = sectionLines(sec);
  if (!lines.length || !isCultureTableHeaderLine(lines[0])) return null;
  var parsed = parseCultureBlockFromLineArray(lines, set, seq);
  var row = parsed && parsed.row;
  if (!row || row.negativo) return null;
  var fullSet = setById[String(row.labSetId)] || set;
  var chunk = findCultivoChunkInSet(fullSet, row.organismo) || sec;
  return {
    sitio: String(row.sitio || "\u2014"),
    organismo: String(row.organismo || "\u2014"),
    fecha: candidateFecha(row, set),
    negativo: !!row.negativo,
    sortKeyMs: row.sortKeyMs != null ? row.sortKeyMs : row.sortMs || 0,
    labSetId: String(row.labSetId || ""),
    chunk: String(chunk || "")
  };
}
function extractCultivoFollowUpCandidates(labHistory) {
  var rows = [];
  var seq = 0;
  var setById = /* @__PURE__ */ Object.create(null);
  sortLabHistoryChronological(labHistory || []).forEach(function(set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    if (set.id != null) setById[String(set.id)] = set;
    splitResLabsByTipo(set.resLabs).cultivo.forEach(function(chunkEntry) {
      splitCultivoSections(chunkEntry).forEach(function(sec) {
        var cand = candidateFromSection(set, sec, seq++, setById);
        if (cand) rows.push(cand);
      });
    });
  });
  return rows;
}
function classifyCultivoFollowUps(candidates, _note, _normalizeFecha) {
  var items = [];
  (candidates || []).forEach(function(c) {
    if (!c || c.negativo) return;
    var reasons = [];
    if (cultivoNeedsAtbFollowUp(c, c.chunk)) reasons.push("atb_pendiente");
    if (!reasons.length) return;
    items.push({
      sitio: c.sitio,
      organismo: c.organismo,
      fecha: c.fecha,
      reasons
    });
  });
  items.sort(function(a, b) {
    return String(b.fecha).localeCompare(String(a.fecha), "es");
  });
  return items;
}

// public/js/features/cultivo-queue-refresh.mjs
function cultivoFechaToIsoDay(fechaStr) {
  var ms = parseFechaLabToMs(fechaStr, "");
  if (ms == null || !isFinite(ms)) return null;
  return labRepoToDateInputValue(new Date(ms));
}
function cultureDateRangeFromItems(items) {
  var days = [];
  (items || []).forEach(function(it) {
    var iso = cultivoFechaToIsoDay(it && it.fecha);
    if (iso) days.push(iso);
  });
  if (!days.length) return null;
  days.sort();
  return { desde: days[0], hasta: days[days.length - 1] };
}
function patientById(patientId) {
  var pid = String(patientId || "").trim();
  if (!pid) return null;
  var list = getPatients() || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && String(list[i].id) === pid) return list[i];
  }
  return null;
}
function findPatientByRegistro(registro) {
  var reg = String(registro || "").trim();
  if (!reg) return null;
  var list = getPatients() || [];
  for (var i = 0; i < list.length; i++) {
    var p = list[i];
    if (p && String(p.registro || "").trim() === reg) return p;
  }
  return null;
}
function pendingAtbCultivoItemsForPatient(patientId, historyByPatient) {
  var pid = String(patientId || "").trim();
  if (!pid) return [];
  var map = historyByPatient || getLabHistory();
  var candidates = extractCultivoFollowUpCandidates(map[pid] || []);
  return classifyCultivoFollowUps(candidates, null, normalizeFechaLabHistory);
}
async function refreshPatientCultivoLabsFromRepo(patientId) {
  var items = pendingAtbCultivoItemsForPatient(patientId);
  if (!items.length) return { ok: false, reason: "no-pending" };
  return refreshCultivoLabsForPatient(patientId, items);
}
function resolveCultivoRefreshInputs(patientId, items) {
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== "function") {
    return { reason: "desktop-only" };
  }
  var p = patientById(patientId);
  var registro = p && p.registro ? String(p.registro).trim() : "";
  if (!registro) return { reason: "no-registro" };
  var dayRange = cultureDateRangeFromItems(items);
  if (!dayRange) return { reason: "no-fecha" };
  var range = labRepoFetchRangeFromDateInputs(dayRange.desde, dayRange.hasta);
  if (!range) return { reason: "bad-range" };
  return { registro, range };
}
function outcomeFromLabRepoFetchKind(kind) {
  if (kind === "connection") return { ok: false, kind: "connection" };
  if (kind === "error") return { ok: false, kind: "error" };
  if (kind === "empty") return { ok: true, kind: "empty" };
  return null;
}
async function applyCultivoLabRepoBatch(patientId, registro, studies, errors) {
  await import("/mobile/js/chunks/lazy-feature-routes-SNUITVIW.js").then(function(routes) {
    return routes.ensureLabsLoaded();
  });
  applyBatchStudyGroups(
    [{ row: { id: String(patientId), registro }, studies, errors }],
    { findPatientByRegistro }
  );
}
async function refreshCultivoLabsForPatient(patientId, items) {
  var inputs = resolveCultivoRefreshInputs(patientId, items);
  if ("reason" in inputs) return { ok: false, reason: inputs.reason };
  var registro = inputs.registro;
  var range = inputs.range;
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString()
    });
    var studies = res && res.studies || [];
    var errors = res && res.errors || [];
    var kind = classifyLabRepoBatchFetch(studies, errors);
    var early = outcomeFromLabRepoFetchKind(kind);
    if (early) return early;
    await applyCultivoLabRepoBatch(patientId, registro, studies, errors);
    return { ok: true, kind: "imported" };
  } catch (_err) {
    void _err;
    return { ok: false, kind: "throw" };
  }
}
function cultivoRefreshOutcomeMessage(outcome) {
  var o = outcome || {};
  if (o.reason === "no-pending") {
    return { toast: "No hay cultivos con ATB pendiente en este paciente", type: "info" };
  }
  if (o.reason === "desktop-only") {
    return { toast: "Actualizar cultivos solo en la app de escritorio", type: "warn" };
  }
  if (o.reason === "no-registro") {
    return { toast: "Paciente sin registro \u2014 no se puede consultar el repositorio", type: "error" };
  }
  if (o.reason === "no-fecha" || o.reason === "bad-range") {
    return { toast: "Sin fecha de cultivo para consultar", type: "error" };
  }
  if (o.kind === "connection") {
    return { toast: "No se pudo conectar al repositorio de laboratorio", type: "error" };
  }
  if (o.kind === "empty") {
    return { toast: "Sin resultados nuevos en esa fecha", type: "info" };
  }
  if (o.kind === "error" || o.kind === "throw" || !o.ok) {
    return { toast: "Error al consultar el repositorio", type: "error" };
  }
  return { toast: "Labs actualizados \u2014 revisa si ya sali\xF3 el antibiograma", type: "ok" };
}

// public/js/features/expediente/expediente-cultivos-table.mjs
var CULTIVO_TIPO_ORDER = ["hemo", "uro", "cateter", "gram", "fungi", "otro"];
var CULTIVO_TIPO_LABELS2 = {
  hemo: "Hemocultivo",
  uro: "Urocultivo",
  cateter: "Cultivo de cat\xE9ter",
  gram: "Tinci\xF3n Gram",
  fungi: "Fungicultivo",
  otro: "Otros cultivos"
};
function cultivoOrganismoCellHtml(r) {
  var html = esc(r.organismo);
  if (r.cuenta && !r.negativo) {
    html += '<div class="cultivos-cuenta">' + esc(r.cuenta) + "</div>";
  }
  return html;
}
function cultivoAntibiogramCellHtml(r) {
  return buildCultivoAntibiogramCellHtmlForPatient(r, aid());
}
function cultivoRowDedupeKey_(row) {
  return [
    row.tipoKey || "",
    normalizeLabLine(row.fechaMuestra || ""),
    normalizeLabLine(row.organismo || ""),
    normalizeLabLine(row.cuenta || "")
  ].join("");
}
function cultivoRowIsBetter_(candidate, current) {
  var cSortMs = candidate.sortMs || 0;
  var kSortMs = current.sortMs || 0;
  if (cSortMs !== kSortMs) return cSortMs > kSortMs;
  var cHasSrc = !!candidate._hasSourceText;
  var kHasSrc = !!current._hasSourceText;
  if (cHasSrc !== kHasSrc) return cHasSrc;
  return (candidate._updatedAtMs || 0) >= (current._updatedAtMs || 0);
}
function extractCultivoTableRowsFromHistory(patientId) {
  var history = sortLabHistoryChronological(rt2.ensureParsedLabHistory(patientId));
  var byKey = /* @__PURE__ */ Object.create(null);
  var order = [];
  var seq = 0;
  history.forEach(function(set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = rt2.splitResLabsByTipo(set.resLabs).cultivo;
    cult.forEach(function(chunk) {
      var sections = String(chunk || "").split(/\n\n+/).map(function(s) {
        return s.trim();
      }).filter(Boolean);
      sections.forEach(function(sec) {
        var lines = sec.split(/\r?\n/).map(function(l) {
          return l.replace(/\*+$/g, "").trim();
        }).filter(function(l) {
          return l;
        });
        if (!lines.length) return;
        if (!isCultureTableHeaderLine2(lines[0])) return;
        var row = parseCultureBlockFromLineArray2(lines, set, seq++).row;
        row._hasSourceText = !!(set.sourceText && String(set.sourceText).trim());
        row._updatedAtMs = set.updatedAt ? Date.parse(set.updatedAt) || 0 : 0;
        var key = cultivoRowDedupeKey_(row);
        if (!byKey[key] || cultivoRowIsBetter_(row, byKey[key])) {
          if (!byKey[key]) order.push(key);
          byKey[key] = row;
        }
      });
    });
  });
  return order.map(function(key) {
    return byKey[key];
  });
}
function groupCultivoRowsByTipoChronologic(rows) {
  var byKey = /* @__PURE__ */ Object.create(null);
  rows.forEach(function(r) {
    var k = r.tipoKey || "otro";
    if (!byKey[k]) byKey[k] = [];
    byKey[k].push(r);
  });
  CULTIVO_TIPO_ORDER.forEach(function(k) {
    if (!byKey[k]) return;
    byKey[k].sort(function(a, b) {
      var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
      var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
      if (da !== db) return db - da;
      return (b._seq || 0) - (a._seq || 0);
    });
  });
  return CULTIVO_TIPO_ORDER.filter(function(k) {
    return byKey[k] && byKey[k].length;
  }).map(function(k) {
    return {
      key: k,
      label: CULTIVO_TIPO_LABELS2[k] || CULTIVO_TIPO_LABELS2.otro,
      rows: byKey[k]
    };
  });
}
var _cultivosTableCacheKey = "";
var CULTIVOS_CHUNK_ROWS = 40;
var _cultivoRefreshBusy = false;
var _cultivoToolbarWired = false;
function buildCultivosToolbarHtml(patientId) {
  var pending = pendingAtbCultivoItemsForPatient(patientId).length;
  var title = pending > 0 ? "Buscar antibiograma en el repositorio para " + pending + " cultivo" + (pending === 1 ? "" : "s") + " con ATB pendiente" : "Consultar repositorio (no hay cultivos con ATB pendiente)";
  var btnClass = "tend-toolbar-btn cultivo-refresh-repo-btn";
  if (pending === 0) btnClass += " cultivo-refresh-idle";
  return '<div class="cultivos-toolbar"><button type="button" class="' + btnClass + '"' + (_cultivoRefreshBusy ? ' disabled aria-busy="true"' : "") + ' title="' + esc(title) + '">Actualizar</button><p class="cultivos-table-hint">Por categor\xEDa (tipo de estudio), orden cronol\xF3gico de m\xE1s reciente a m\xE1s antiguo.</p></div>';
}
function wireCultivosToolbarOnce() {
  if (_cultivoToolbarWired) return;
  var container = document.getElementById("cultivos-table-container");
  if (!container) return;
  _cultivoToolbarWired = true;
  container.addEventListener("click", function(ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest(".cultivo-refresh-repo-btn") : null;
    if (!btn || btn.disabled) return;
    ev.preventDefault();
    void handleCultivoRefreshClick();
  });
}
async function handleCultivoRefreshClick() {
  var pid = aid();
  if (!pid || _cultivoRefreshBusy) return;
  _cultivoRefreshBusy = true;
  invalidateCultivosTableCache();
  renderCultivosTable();
  try {
    var outcome = await refreshPatientCultivoLabsFromRepo(pid);
    var msg = cultivoRefreshOutcomeMessage(outcome);
    rt2.showToast(msg.toast, msg.type);
  } finally {
    _cultivoRefreshBusy = false;
    invalidateCultivosTableCache();
    renderCultivosTable();
  }
}
function invalidateCultivosTableCache() {
  _cultivosTableCacheKey = "";
}
var CULTIVOS_CHUNKED_THRESHOLD = 72;
function renderCultivosTableBodyChunked(container, shellHtml, rowChunks, onDone) {
  container.innerHTML = shellHtml;
  var tbody = container.querySelector(".cultivos-table tbody");
  if (!tbody || !rowChunks.length) {
    onDone();
    return;
  }
  var i = 0;
  function appendChunk() {
    var end = Math.min(i + CULTIVOS_CHUNK_ROWS, rowChunks.length);
    for (; i < end; i += 1) {
      tbody.insertAdjacentHTML("beforeend", rowChunks[i]);
    }
    if (i < rowChunks.length) {
      scheduleIdle(appendChunk, 12);
      return;
    }
    onDone();
  }
  scheduleIdle(appendChunk, 0);
}
function rowFechaDisplay(r) {
  if (r.fechaMuestra && r.fechaMuestra !== "\u2014") return r.fechaMuestra;
  return r.studyDate || "\u2014";
}
function buildCultivosNegStrip(negs) {
  if (!negs.length) return "";
  var chips = negs.map(function(r) {
    var fd = rowFechaDisplay(r);
    var sitio = r.sitio || "\u2014";
    return '<li class="cultivos-neg-chip"><span class="cultivos-neg-chip-tipo">' + esc(r.tipoLabel || "") + "</span> \xB7 " + esc(fd) + " \xB7 " + esc(sitio) + "</li>";
  }).join("");
  return '<div class="cultivos-neg-strip" role="status"><div class="cultivos-neg-header"><strong>Cultivos negativos</strong><span class="cultivos-neg-count">' + negs.length + '</span></div><p class="cultivos-neg-hint">En la tabla, por tipo y fecha</p><ul class="cultivos-neg-chips">' + chips + "</ul></div>";
}
function collectCultivoTableRowChunks(groups, rowFechaDisplayFn) {
  var rowChunks = [];
  var totalRows = 0;
  groups.forEach(function(g) {
    rowChunks.push('<tr class="cultivos-section-row"><td colspan="4">' + esc(g.label) + "</td></tr>");
    g.rows.forEach(function(r) {
      totalRows += 1;
      rowChunks.push(
        '<tr class="' + (r.negativo ? "cultivos-row-neg" : "") + '"><td>' + esc(rowFechaDisplayFn(r)) + "</td><td>" + esc(r.sitio) + '</td><td class="cultivos-cell-org">' + cultivoOrganismoCellHtml(r) + '</td><td class="cultivos-cell-atb">' + cultivoAntibiogramCellHtml(r) + "</td></tr>"
      );
    });
  });
  return { rowChunks, totalRows };
}
function renderCultivosTable() {
  var container = document.getElementById("cultivos-table-container");
  if (!container) return;
  wireCultivosToolbarOnce();
  var pid = aid();
  if (pid) {
    var cultKey = String(pid) + "|L" + getLabHistoryRevision(pid);
    if (_cultivosTableCacheKey === cultKey && container.querySelector(".cultivos-table")) {
      return;
    }
    _cultivosTableCacheKey = cultKey;
  } else {
    _cultivosTableCacheKey = "";
  }
  removeAtbRisPanelsFromBody();
  if (!aid()) {
    container.innerHTML = '<p class="tend-empty">Selecciona un paciente.</p>';
    return;
  }
  var flatRows = extractCultivoTableRowsFromHistory(aid());
  if (!flatRows.length) {
    container.innerHTML = '<p class="tend-empty">No hay cultivos en el historial. Aparecen urocultivos, hemocultivos, tinci\xF3n Gram y cultivos de cat\xE9ter enviados desde Laboratorio.</p>';
    return;
  }
  var groups = groupCultivoRowsByTipoChronologic(flatRows);
  var negs = flatRows.filter(function(r) {
    return r.negativo;
  }).sort(function(a, b) {
    var oa = CULTIVO_TIPO_ORDER.indexOf(a.tipoKey || "otro");
    var ob = CULTIVO_TIPO_ORDER.indexOf(b.tipoKey || "otro");
    if (oa !== ob) return oa - ob;
    var da = a.sortKeyMs != null ? a.sortKeyMs : a.sortMs || 0;
    var db = b.sortKeyMs != null ? b.sortKeyMs : b.sortMs || 0;
    if (da !== db) return db - da;
    return (b._seq || 0) - (a._seq || 0);
  });
  var negStrip = buildCultivosNegStrip(negs);
  var toolbar = buildCultivosToolbarHtml(aid());
  var thead = "<thead><tr><th>Fecha</th><th>Sitio / muestra</th><th>Organismo</th><th>Antibiograma</th></tr></thead>";
  var built = collectCultivoTableRowChunks(groups, rowFechaDisplay);
  var finishTable = function() {
    wireAtbRisHoverPanels(container);
  };
  if (built.totalRows > CULTIVOS_CHUNKED_THRESHOLD) {
    var shellHtml = negStrip + toolbar + '<div class="cultivos-table-wrap"><table class="cultivos-table">' + thead + "<tbody></tbody></table></div>";
    renderCultivosTableBodyChunked(container, shellHtml, built.rowChunks, finishTable);
    return;
  }
  container.innerHTML = negStrip + toolbar + '<div class="cultivos-table-wrap"><table class="cultivos-table">' + thead + "<tbody>" + built.rowChunks.join("") + "</tbody></table></div>";
  finishTable();
}
var _tendRefreshTimer = null;
function refreshTendenciasOrCultivosPanel() {
  if (rt2.getActiveAppTab() !== "nota" && rt2.getActiveAppTab() !== "lab") return;
  if (_tendRefreshTimer) clearTimeout(_tendRefreshTimer);
  _tendRefreshTimer = setTimeout(function() {
    _tendRefreshTimer = null;
    if (rt2.getActiveInner() === "tend") rt2.renderTendencias();
    else if (rt2.getActiveInner() === "cult") renderCultivosTable();
  }, TREND_REFRESH_DEBOUNCE_MS);
}

// public/js/features/profile-load-fields.mjs
function resolveCensoSalaValue(st) {
  var ubic = st.censoSala || "";
  if (!ubic && st.censoTorre) ubic = "torre";
  if (/^torre/i.test(ubic) && ubic !== "torre") ubic = "torre";
  return ubic;
}
function syncProfileToggleLabel(st) {
  var lbl = document.getElementById("profile-toggle-label");
  var profileTitle = "Mi Perfil";
  if (!lbl) return profileTitle;
  if (st.doctorName || st.grado) {
    var parts = [];
    if (st.doctorName) parts.push(st.doctorName);
    if (st.grado) parts.push(st.grado);
    profileTitle = parts.join(" \xB7 ");
  }
  lbl.textContent = profileTitle;
  var profileBtn = document.getElementById("profile-toggle-btn");
  if (profileBtn) {
    profileBtn.setAttribute("title", profileTitle);
    profileBtn.setAttribute("aria-label", profileTitle);
  }
  return profileTitle;
}
function populateProfileIdentityFields(st) {
  var fields = [
    ["profile-doctor", st.doctorName],
    ["profile-cedula", st.cedulaProfesional],
    ["profile-profesor", st.profesorName],
    ["profile-r2", st.residenteR2],
    ["profile-r1a", st.residenteR1a || st.residenteR1],
    ["profile-r1b", st.residenteR1b],
    ["profile-maestro", st.profesorName],
    ["profile-censo-fimi-label", st.censoFimiLabel],
    ["profile-grado", st.grado]
  ];
  fields.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) el.value = pair[1] || "";
  });
  var censoSalaEl = document.getElementById("profile-censo-sala");
  if (censoSalaEl) censoSalaEl.value = resolveCensoSalaValue(st);
  syncAppModeRadioControls();
  var srvEl = document.getElementById("settings-default-servicio");
  if (srvEl) srvEl.value = st.defaultServicio || "";
  var medTpl = st.medicosPlantilla || {};
  ["profesor", "r4", "r2", "r1a", "r1b"].forEach(function(k) {
    var el = document.getElementById("settings-medico-" + k);
    if (el) el.value = medTpl[k] || "";
  });
  syncProfileToggleLabel(st);
}
function populateProfileOutputFields(st) {
  var dirEl = document.getElementById("settings-output-dir");
  if (dirEl) {
    if (st.outputDir) {
      var pathParts = st.outputDir.replace(/\\/g, "/").split("/");
      dirEl.textContent = pathParts[pathParts.length - 1] || st.outputDir;
      dirEl.title = st.outputDir;
    } else {
      dirEl.textContent = "Descargas (predeterminado)";
      dirEl.title = "";
    }
    syncApprovedOutputDir(st.outputDir || "");
  }
  var quickFormatEl = document.getElementById("settings-quick-output-format");
  if (quickFormatEl) quickFormatEl.value = normalizeQuickOutputFormat(st.quickOutputFormat);
}

// public/js/features/profile-load-platform.mjs
function populateProfileVersionBlock() {
  var verEl = document.getElementById("settings-app-version");
  if (!verEl) return;
  if (!window.electronAPI || typeof window.electronAPI.getAppVersion !== "function") {
    verEl.textContent = "Web / desarrollo";
    return;
  }
  window.electronAPI.getAppVersion().then(async function(v) {
    verEl.textContent = v || "\u2014";
    var LAST_SEEN_VERSION_KEY = "rplus-last-seen-app-version";
    var prev = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    if (prev) window.__RPC_PREV_APP_VERSION__ = prev;
    var versionChanged = !!(prev && v && prev !== v);
    if (versionChanged) {
      getProfileRuntime().showToast(
        "Actualizado a v" + v + ". Consulta Ajustes o el men\xFA para buscar actualizaciones.",
        "success"
      );
    }
    if (versionChanged || window.__RPC_RELEASE_NOTES_DEV__) {
      var notes = await import("/mobile/js/chunks/release-notes-VP4WCV6G.js");
      if (notes.RELEASE_NOTES_DEV_FORCE_SHOW) {
        notes.initReleaseNotesDevPreviewIfEnabled(v);
      } else if (versionChanged) {
        notes.maybeShowReleaseNotesFor(v, prev);
      }
    }
    if (v) localStorage.setItem(LAST_SEEN_VERSION_KEY, v);
  }).catch(function() {
    verEl.textContent = "\u2014";
  });
}
function populateProfileUserDataBlock() {
  var hintEl = document.getElementById("settings-updates-hint");
  if (hintEl) hintEl.classList.toggle("is-visible", !!window.electronAPI);
  var udEl = document.getElementById("settings-user-data-path");
  var udHint = document.getElementById("settings-userdata-web-hint");
  var udBtn = document.getElementById("settings-open-userdata-btn");
  if (window.electronAPI && typeof window.electronAPI.getUserDataPath === "function") {
    if (udHint) udHint.classList.remove("is-visible");
    if (udBtn) udBtn.disabled = false;
    window.electronAPI.getUserDataPath().then(function(p) {
      if (udEl) {
        udEl.textContent = p || "\u2014";
        udEl.title = p || "";
      }
    }).catch(function() {
      if (udEl) udEl.textContent = "\u2014";
    });
    return;
  }
  if (udEl) udEl.textContent = "Navegador / modo desarrollo";
  if (udHint) udHint.classList.add("is-visible");
  if (udBtn) udBtn.disabled = true;
}

// public/js/patient-data-accesos-ui.mjs
function activePatient(patientId) {
  return getPatients().find(function(p) {
    return String(p.id) === String(patientId);
  });
}
function accesoRows(patient) {
  ensurePatientAccesos(patient);
  var list = (patient.accesosList || []).slice();
  return list.length ? list : [{ via: "", fecha: "" }];
}
function viaSelectHtml(index, via) {
  var v = String(via || "");
  return '<select class="ea-input patient-acceso-via" onchange="onPatientAccesoVia(' + index + ',this.value)" aria-label="V\xEDa de acceso"><option value=""' + (!v ? " selected" : "") + '>\u2014 V\xEDa \u2014</option><option value="periferica"' + (v === "periferica" ? " selected" : "") + '>EV perif\xE9rica</option><option value="cvc"' + (v === "cvc" ? " selected" : "") + '>CVC / cat\xE9ter central</option><option value="picc"' + (v === "picc" ? " selected" : "") + ">PICC</option></select>";
}
function renderAccesosListHtml(patient) {
  var rows = accesoRows(patient);
  return rows.map(function(row, i) {
    var canRemove = rows.length > 1;
    return '<div class="patient-acceso-row list-row"><div class="field-group" style="margin:0;">' + viaSelectHtml(i, row.via) + '</div><div class="field-group" style="margin:0;"><input type="date" class="rpc-date-input patient-acceso-fecha" value="' + esc(accesoFechaToDateInputValue(row.fecha)) + '" oninput="onPatientAccesoFecha(' + i + ',this.value)" aria-label="Fecha acceso"></div><button type="button" class="btn-remove" onclick="removePatientAccesoRow(' + i + ')"' + (canRemove ? "" : ' style="visibility:hidden"') + ' aria-label="Quitar acceso">\xD7</button></div>';
  }).join("");
}
function buildPatientAccesosSectionHtml(patient) {
  ensurePatientAccesos(patient);
  return '<div class="patient-accesos-block"><div class="vpo-toolbar" style="margin-top:2px;"><span class="ea-label" style="flex:1;">Accesos</span><button type="button" class="btn-add-row" onclick="addPatientAccesoRow()">+ Agregar acceso</button></div><div class="patient-accesos-list" id="patient-accesos-list">' + renderAccesosListHtml(patient) + "</div></div>";
}
function refreshAccesosListDom(patientId) {
  var patient = activePatient(patientId);
  var listEl = document.getElementById("patient-accesos-list");
  if (!patient || !listEl) return;
  listEl.innerHTML = renderAccesosListHtml(patient);
  refreshRpcDateFields(listEl);
}
function currentPatientId() {
  var wrap = document.getElementById("patient-data-form");
  return wrap && wrap.dataset.patientId ? wrap.dataset.patientId : null;
}
function touchAccesos(patient, mutator) {
  if (!patient) return;
  ensurePatientAccesos(patient);
  mutator(patient);
  syncLegacyAccesoFields(patient);
  persistClinicalState();
}
function onPatientAccesoVia(index, value) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  touchAccesos(patient, function(p) {
    p.accesosList[index].via = String(value || "").trim();
  });
}
function onPatientAccesoFecha(index, value) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  touchAccesos(patient, function(p) {
    p.accesosList[index].fecha = String(value || "").trim();
  });
}
function addPatientAccesoRow() {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient) return;
  touchAccesos(patient, function(p) {
    p.accesosList.push({ via: "", fecha: "" });
  });
  refreshAccesosListDom(pid);
}
function removePatientAccesoRow(index) {
  var pid = currentPatientId();
  var patient = activePatient(pid);
  if (!patient || !Array.isArray(patient.accesosList)) return;
  if (patient.accesosList.length <= 1) return;
  touchAccesos(patient, function(p) {
    p.accesosList.splice(index, 1);
    ensurePatientAccesos(p);
  });
  refreshAccesosListDom(pid);
}
var patientDataAccesosWindowHandlers = {
  onPatientAccesoVia,
  onPatientAccesoFecha,
  addPatientAccesoRow,
  removePatientAccesoRow
};

// public/js/patient-data-censo-ui.mjs
function activePatient2(patientId) {
  return getPatients().find(function(p) {
    return String(p.id) === String(patientId);
  });
}
function dxRows(patient) {
  var list = (patient.diagnosticosList || []).slice();
  return list.length ? list : [""];
}
function renderDxListHtml(patient) {
  var rows = dxRows(patient);
  return rows.map(function(dx, i) {
    var canRemove = rows.length > 1;
    return '<div class="vpo-dx-row list-row"><input type="text" class="ea-input" value="' + esc(dx) + '" placeholder="Diagn\xF3stico ' + (i + 1) + '" oninput="onPatientDxInput(' + i + ', this.value)" style="text-transform:uppercase;"><button type="button" class="btn-remove" onclick="removePatientDxRow(' + i + ')"' + (canRemove ? "" : ' style="visibility:hidden"') + ' aria-label="Eliminar">\xD7</button></div>';
  }).join("");
}
function buildPatientCensoDatosSectionsHtml(patient) {
  migratePatientDiagnosticosFromVpo(patient, getVpoByPatient()[patient.id]);
  ensurePatientDiagnosticos(patient);
  return '<div class="card" style="margin-top:10px;"><div class="card-header">Diagn\xF3sticos (censo)</div><div class="card-body"><div class="vpo-toolbar"><button type="button" class="btn-add-row" onclick="addPatientDxRow()">+ Agregar diagn\xF3stico</button></div><div class="vpo-dx-list" id="patient-dx-list">' + renderDxListHtml(patient) + '</div><div class="vpo-dx-paste" style="margin-top:8px;"><span class="ea-label">Pegar con \xAB + \xBB entre diagn\xF3sticos</span><textarea class="ea-input" id="patient-dx-paste" rows="2" placeholder="DX1 + DX2\u2026"></textarea><button type="button" class="btn-med-secondary" onclick="splitPatientDxPaste()">Separar por +</button></div></div></div><div class="card" style="margin-top:10px;"><div class="card-header">Censo \u2014 ATB / Medicamentos</div><div class="card-body"><div class="vpo-toolbar"><button type="button" class="btn-med-secondary" onclick="censoTomarDeMedicamentos()">Tomar de Medicamentos</button></div><textarea class="ea-input" id="patient-censo-meds" rows="6" placeholder="Texto para columna ATB/Meds del PDF\u2026" oninput="updatePatientCensoMeds(this.value)">' + esc(patient.censoMedsText || "") + "</textarea></div></div>";
}
function refreshDxListDom(patientId) {
  var patient = activePatient2(patientId);
  var listEl = document.getElementById("patient-dx-list");
  if (!patient || !listEl) return;
  listEl.innerHTML = renderDxListHtml(patient);
}
function currentPatientId2() {
  var wrap = document.getElementById("patient-data-form");
  return wrap && wrap.dataset.patientId ? wrap.dataset.patientId : null;
}
function onPatientDxInput(index, value) {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient) return;
  if (!Array.isArray(patient.diagnosticosList)) patient.diagnosticosList = [""];
  patient.diagnosticosList[index] = String(value || "").toUpperCase();
  ensurePatientDiagnosticos(patient);
  stampCensoFieldsClock(patient);
  persistClinicalState();
}
function addPatientDxRow() {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient) return;
  if (!Array.isArray(patient.diagnosticosList)) patient.diagnosticosList = [""];
  patient.diagnosticosList.push("");
  stampCensoFieldsClock(patient);
  persistClinicalState();
  refreshDxListDom(pid);
}
function removePatientDxRow(index) {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient || !Array.isArray(patient.diagnosticosList)) return;
  if (patient.diagnosticosList.length <= 1) return;
  patient.diagnosticosList.splice(index, 1);
  applyPatientDiagnosticosList(patient, patient.diagnosticosList);
  stampCensoFieldsClock(patient);
  persistClinicalState();
  refreshDxListDom(pid);
}
function splitPatientDxPaste() {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  var ta = document.getElementById("patient-dx-paste");
  if (!patient || !ta) return;
  var parsed = parseDiagnosticosText(ta.value);
  if (!parsed.length) return;
  applyPatientDiagnosticosList(patient, parsed.concat([""]));
  stampCensoFieldsClock(patient);
  persistClinicalState();
  refreshDxListDom(pid);
}
function updatePatientCensoMeds(value) {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient) return;
  patient.censoMedsText = String(value || "");
  stampCensoFieldsClock(patient);
  persistClinicalState();
}
function censoTomarDeMedicamentos() {
  var pid = currentPatientId2();
  var patient = activePatient2(pid);
  if (!patient) return;
  var text = formatCensoMedsFromReceta(getMedRecetaByPatient()[pid]);
  patient.censoMedsText = text;
  stampCensoFieldsClock(patient);
  var ta = document.getElementById("patient-censo-meds");
  if (ta) ta.value = text;
  persistClinicalState();
}
var patientDataCensoWindowHandlers = {
  onPatientDxInput,
  addPatientDxRow,
  removePatientDxRow,
  splitPatientDxPaste,
  updatePatientCensoMeds,
  censoTomarDeMedicamentos
};

// public/js/listado-problemas-ai-prompt.mjs
var LISTADO_PROBLEMAS_AI_PROMPT = `prompt:
LISTADO DE PROBLEMAS
CON BASE EN TODOS LOS DATOS CL\xCDNICOS PROPORCIONADOS, GENERA UN LISTADO DE
PROBLEMAS DIVIDIDO EN ACTIVOS E INACTIVOS. S\xC9 CONCISO. EL OUTPUT COMPLETO
NO DEBE EXCEDER DOS HOJAS.

--- PROBLEMAS ACTIVOS ---
(INCLUYE: DIAGN\xD3STICO PRINCIPAL, ENFERMEDADES DE BASE, COMPLICACIONES ACTIVAS,
CONDICIONES EN CURSO)

PROBLEMA X: [NOMBRE] \u2192 [ESCALA/CLASIFICACI\xD3N/ESTADIO SI APLICA]
A) CL\xCDNICA: [S\xCDNTOMAS RELEVANTES]
B) EXPLORACI\xD3N F\xCDSICA: [HALLAZGOS PERTINENTES]
C) PARACL\xCDNICA: [SOLO RESULTADOS ALTERADOS CON VALOR E INTERPRETACI\xD3N]
D) IMAGEN: [HALLAZGO RELEVANTE]

--- PROBLEMAS INACTIVOS ---
(INCLUYE: ANTECEDENTES RESUELTOS, TABAQUISMO/ALCOHOLISMO SUSPENDIDO,
CIRUG\xCDAS PREVIAS, ENFERMEDADES YA RESUELTAS)

PROBLEMA X: [NOMBRE]
A) [DESCRIPCI\xD3N BREVE DEL ANTECEDENTE]

REGLAS DE FORMATO:

SI UN INCISO NO APLICA O NO HAY DATOS, OMITIRLO COMPLETAMENTE.
EJEMPLO: SI NO HAY IMAGEN, NO PONER D). SI NO HAY PARACL\xCDNICA ALTERADA,
NO PONER C).
SOLO RESULTADOS ALTERADOS EN PARACL\xCDNICA, NUNCA VALORES NORMALES.
EL PROBLEMA 1 ACTIVO SIEMPRE ES EL DIAGN\xD3STICO PRINCIPAL.
SI HAY GASOMETR\xCDA: CALCULAR ANI\xD3N GAP, WINTERS Y ESTADO DE COMPENSACI\xD3N
DENTRO DEL INCISO C) DEL PROBLEMA CORRESPONDIENTE.
AL FINAL INDICAR "DIAGN\xD3STICOS A CONFIRMAR:" SI ALGUNO ES DUDOSO.
SIN TRATAMIENTO, SIN MANEJO, SIN TEXTO INNECESARIO.
TODO EN MAY\xDASCULAS.
REGLAS DE AGRUPACI\xD3N:

NO SEPARAR LO QUE ES PARTE DEL MISMO PROCESO CL\xCDNICO. SI UN HALLAZGO ES
CONSECUENCIA DIRECTA Y ESPERABLE DEL PROBLEMA PRINCIPAL, VA DENTRO DE ESE
PROBLEMA EN EL INCISO CORRESPONDIENTE, NO COMO PROBLEMA APARTE.
EJEMPLO: NEUMON\xCDA CON HIPOXEMIA \u2192 LA HIPOXEMIA VA DENTRO DE LA NEUMON\xCDA.
SOLO SEPARAR COMO PROBLEMA DISTINTO SI TIENE ENTIDAD PROPIA, MANEJO
INDEPENDIENTE O ETIOLOG\xCDA DIFERENTE.
INTENTAR LIGAR CADA PROBLEMA AL PRINCIPAL. SI NO SE PUEDE, LISTARLO COMO
PROBLEMA SEPARADO SIN ETIQUETA ADICIONAL.
REGLAS DE ETIOLOG\xCDA:

CORRELACIONAR SIEMPRE LA ETIOLOG\xCDA CON EL PERFIL DEL PACIENTE: EDAD, SEXO,
ANTECEDENTES Y CONTEXTO CL\xCDNICO.
SI LA ETIOLOG\xCDA NO ENCAJA CON EL PERFIL, NO ASIGNARLA. MARCARLA COMO
"ETIOLOG\xCDA A DETERMINAR" Y LISTAR ALTERNATIVAS DIAGN\xD3STICAS PERTINENTES.
EJEMPLO: BLOQUEO AV TERCER GRADO EN PACIENTE DE 45 A\xD1OS \u2192 NO ASUMIR
DEGENERATIVO. CONSIDERAR: LYME, SARCOIDOSIS, MIOCARDITIS, ISQUEMIA,
F\xC1RMACOS, CHAGAS.
ESTA REGLA APLICA TAMBI\xC9N EN PLANES INICIALES.
PLANES INICIALES
REDACTAR UN P\xC1RRAFO ESTRUCTURADO POR CADA UNO DE LOS SIGUIENTES EJES, TODO EN
MAY\xDASCULAS, SIN INVENTAR DATOS, BAS\xC1NDOSE \xDANICAMENTE EN LO MENCIONADO EN EL
INTERROGATORIO Y EXPEDIENTE. CADA EJE DEBE SER CONSISTENTE CON LOS PROBLEMAS
ACTIVOS E INACTIVOS YA IDENTIFICADOS EN EL LISTADO DE PROBLEMAS, SIN
CONTRADICCIONES NI REPETICIONES INNECESARIAS:

EXPLICAR LA CAUSA DE BASE DE LA ENFERMEDAD
PRINCIPAL Y EL MECANISMO FISIOPATOL\xD3GICO QUE LLEV\xD3 AL CUADRO ACTUAL,
REFERENCIANDO LOS PROBLEMAS ACTIVOS CORRESPONDIENTES.

DESCRIBIR LOS ELEMENTOS CL\xCDNICOS, BIOQU\xCDMICOS, RADIOL\xD3GICOS
Y/O PATOL\xD3GICOS QUE SUSTENTAN EL DIAGN\xD3STICO PRINCIPAL Y LOS DIAGN\xD3STICOS
ASOCIADOS, SIENDO CONSISTENTE CON LA CLASIFICACI\xD3N Y ESTADIO YA ESTABLECIDOS
EN EL LISTADO DE PROBLEMAS.

DETALLAR EL TRATAMIENTO INSTAURADO EN EL SERVICIO, INCLUYENDO PROCEDIMIENTOS REALIZADOS, ESQUEMAS FARMACOL\xD3GICOS Y RESPUESTA CL\xCDNICA DOCUMENTADA.

ESTABLECER EL PRON\xD3STICO PARA LA FUNCI\xD3N DEL \xD3RGANO O SISTEMA AFECTADO PRINCIPAL Y EL PRON\xD3STICO VITAL, VINCUL\xC1NDOLO A LAS CONDICIONES CL\xCDNICAS ACTUALES, COMPLICACIONES POTENCIALES Y PROBLEMAS ACTIVOS IDENTIFICADOS.`;

// public/js/features/profile-modal.mjs
function openProfileModal() {
  if (isMobileWeb()) return;
  var modal = document.getElementById("profile-modal");
  if (!modal) return;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  queueMicrotask(function() {
    loadSettings();
    var first = document.getElementById("app-mode-sala") || document.getElementById("profile-doctor");
    if (first) {
      try {
        first.focus({ preventScroll: true });
      } catch {
      }
    }
  });
}
function closeProfileModal() {
  closeModalAnimated(document.getElementById("profile-modal"));
}
function toggleProfileSection() {
  var modal = document.getElementById("profile-modal");
  if (!modal) return;
  if (modal.classList.contains("open")) closeProfileModal();
  else openProfileModal();
}
function syncProfileSectionVisibility() {
}
function openProfileFromHeader(ev) {
  if (ev) ev.preventDefault();
  openProfileModal();
}

// public/js/features/profile-app-mode.mjs
function syncInterconsultaModeChrome() {
  import("/mobile/js/chunks/interconsulta-mode-chrome-UZYTOZA5.js").then(function(mod) {
    mod.syncInterconsultaModeChrome();
  });
}
function reconcileActiveInnerForAppMode(nowSala) {
  var settings = settingsRef();
  var getActiveInnerTabFn = resolveGlobalFn("getActiveInnerTab");
  var switchInnerTabFn = resolveGlobalFn("switchInnerTab");
  var current = (getActiveInnerTabFn ? getActiveInnerTabFn() : null) || "todo";
  var migrated = migrateGranularInner(current, settings);
  if (migrated !== current) {
    if (switchInnerTabFn) switchInnerTabFn(migrated, { forceRender: true });
    return;
  }
  if (nowSala && (current === "notas" || current === "indica")) {
    if (switchInnerTabFn) switchInnerTabFn("estadoActual", { forceRender: true });
  } else if (!nowSala && current === "listado") {
    if (switchInnerTabFn) switchInnerTabFn("recetaHu", { forceRender: true });
  }
}
function applyAppModeSwitchEffects() {
  var nowSala = isModeSala(settingsRef());
  try {
    reconcileActiveInnerForAppMode(nowSala);
    syncAppModeRadioControls();
    var refreshExpedienteFn = resolveGlobalFn("refreshExpedienteForAppModeChange");
    if (refreshExpedienteFn) refreshExpedienteFn();
    renderEstadoActualButton();
    syncCensoExportButtonVisibility();
    syncHeaderModeSeg();
    var rt3 = getProfileRuntime();
    if (rt3.getActiveId()) {
      if (typeof rt3.rebuildEstudiosFromLabHistory === "function") {
        rt3.rebuildEstudiosFromLabHistory(rt3.getActiveId());
      }
      if (!nowSala) {
        var renderNotaFn = resolveGlobalFn("renderNotaEvolucionPrimaryTab");
        if (renderNotaFn) renderNotaFn();
      }
      var getActiveInnerTabFn2 = resolveGlobalFn("getActiveInnerTab");
      var inner = getActiveInnerTabFn2 ? getActiveInnerTabFn2() : null;
      if (inner === "datos" || inner === "todo") renderPatientDataPane();
    }
    rt3.syncWorkContextChrome();
    renderPatientList();
    syncInterconsultaModeChrome();
    rt3.showToast("Modo cambiado a " + (nowSala ? "Sala" : "Interconsulta"), "success");
  } catch (err) {
    console.error("[R+] applyAppModeSwitchEffects:", err);
    getProfileRuntime().showToast("No se pudo actualizar la vista al cambiar de modo.", "error");
  }
}
function onAppModeChange() {
  var sala = document.getElementById("app-mode-sala");
  var st = settingsRef();
  st.appMode = sala && sala.checked ? "sala" : "interconsulta";
  invalidateLoadSettingsSnapshot();
  syncProfileModalLayout();
  persistSettingsToLocalStorage();
  applyAppModeSwitchEffects();
}
function toggleHeaderWorkMode() {
  var st = settingsRef();
  st.appMode = isModeSala(st) ? "interconsulta" : "sala";
  invalidateLoadSettingsSnapshot();
  syncAppModeRadioControls();
  applyAppModeSwitchEffects();
  persistSettingsToLocalStorage();
}
function setWorkModeFromHeader(mode) {
  var st = settingsRef();
  var current = isGuardiaMode() ? "guardia" : isModeSala(st) ? "sala" : "interconsulta";
  if (mode === current) {
    toggleHeaderModeSegExpand();
    syncHeaderModeSeg();
    syncInterconsultaModeChrome();
    return;
  }
  if (mode === "guardia") {
    toggleGuardiaMode();
    collapseHeaderModeSeg();
    syncHeaderModeSeg();
    syncInterconsultaModeChrome();
    return;
  }
  if (isGuardiaMode()) toggleGuardiaMode();
  var wantSala = mode === "sala";
  if (wantSala !== isModeSala(st)) {
    st.appMode = wantSala ? "sala" : "interconsulta";
    invalidateLoadSettingsSnapshot();
    syncAppModeRadioControls();
    applyAppModeSwitchEffects();
    persistSettingsToLocalStorage();
  }
  collapseHeaderModeSeg();
  syncHeaderModeSeg();
  syncInterconsultaModeChrome();
}

// public/js/features/profile-save.mjs
function readProfileField(id) {
  return (document.getElementById(id)?.value || "").trim();
}
function applyProfileFormToSettings(st) {
  st.doctorName = readProfileField("profile-doctor");
  st.cedulaProfesional = readProfileField("profile-cedula");
  st.profesorName = readProfileField("profile-profesor");
  st.residenteR2 = readProfileField("profile-r2");
  st.residenteR1a = readProfileField("profile-r1a");
  st.residenteR1b = readProfileField("profile-r1b");
  st.residenteR1 = st.residenteR1a;
  st.censoSala = readProfileField("profile-censo-sala");
  st.censoTorre = st.censoSala === "torre" ? "Torre HU" : "";
  st.censoFimiLabel = readProfileField("profile-censo-fimi-label");
  st.profesorName = readProfileField("profile-maestro") || readProfileField("profile-profesor");
  st.grado = readProfileField("profile-grado");
  st.quickOutputFormat = normalizeQuickOutputFormat(st.quickOutputFormat);
}
function saveSettings() {
  var st = settingsRef();
  applyProfileFormToSettings(st);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  var backfill = false;
  Object.keys(getNotes()).forEach(function(pid) {
    if (getNotes()[pid] && applyProfileToNoteIfEmpty(getNotes()[pid])) backfill = true;
  });
  if (backfill) persistClinicalState();
  loadSettings();
  if (getProfileRuntime().getActiveId()) renderNotaEvolucionPrimaryTab();
  getProfileRuntime().showToast("Perfil guardado \u2713", "success");
}
function saveQuickOutputFormat(format) {
  var st = settingsRef();
  st.quickOutputFormat = normalizeQuickOutputFormat(format);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  getProfileRuntime().showToast("Formato de salida r\xE1pida actualizado", "success");
}

// public/js/features/profile-formats.mjs
function ensureInterconsultaModeForFormats() {
  var st = settingsRef();
  if (!isModeSala(st)) return;
  st.appMode = "interconsulta";
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  var modeSalaEl = document.getElementById("app-mode-sala");
  var modeInterEl = document.getElementById("app-mode-inter");
  if (modeInterEl) modeInterEl.checked = true;
  if (modeSalaEl) modeSalaEl.checked = false;
  var renderInnerTabsFn = resolveGlobalFn("renderInnerTabs");
  if (renderInnerTabsFn) renderInnerTabsFn();
  syncHeaderModeSeg();
  getProfileRuntime().syncWorkContextChrome();
}
function syncDraftFromFormatEditorDom() {
  var map = [
    ["fmt-default-nota-evolucion", "notaEvolucion"],
    ["fmt-default-nota-estudios", "notaEstudios"],
    ["fmt-default-ind-dieta", "dieta"],
    ["fmt-default-ind-cuidados", "cuidados"],
    ["fmt-default-ind-medicamentos", "medicamentos"],
    ["fmt-default-ind-estudios", "estudios"],
    ["fmt-default-ind-interconsultas", "interconsultas"]
  ];
  map.forEach(function(pair) {
    var el = document.getElementById(pair[0]);
    if (el) updateDefaultFormatField(pair[1], el.value);
  });
}
function scrollFormatsEditorIntoView() {
  requestAnimationFrame(function() {
    var root = getFormatsEditMode() === "indica" ? document.getElementById("indica-form") : document.getElementById("note-form");
    if (root) root.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
function openNoteFormatsFromProfile() {
  closeProfileModal();
  var st = settingsRef();
  ensureProfileTemplateDefaults(st);
  ensureInterconsultaModeForFormats();
  loadDraftFromSettings(st);
  setFormatsEditMode("nota");
  var switchAppTabFn = resolveGlobalFn("switchAppTab");
  if (switchAppTabFn) switchAppTabFn("nota");
  var switchInnerTabFn = resolveGlobalFn("switchInnerTab");
  if (switchInnerTabFn) switchInnerTabFn("notas");
  renderNoteForm();
  scrollFormatsEditorIntoView();
}
function openIndicaFormatsFromProfile() {
  closeProfileModal();
  var st = settingsRef();
  ensureProfileTemplateDefaults(st);
  ensureInterconsultaModeForFormats();
  loadDraftFromSettings(st);
  setFormatsEditMode("indica");
  var switchAppTabFn = resolveGlobalFn("switchAppTab");
  if (switchAppTabFn) switchAppTabFn("nota");
  var switchInnerTabFn = resolveGlobalFn("switchInnerTab");
  if (switchInnerTabFn) switchInnerTabFn("indica");
  renderIndicaForm();
  scrollFormatsEditorIntoView();
}
function openTemplatesModal() {
  openNoteFormatsFromProfile();
}
function closeTemplatesModal() {
  var m = document.getElementById("templates-modal");
  if (m) m.style.display = "none";
}
function saveTemplates() {
  saveDefaultFormatsFromEditor();
}
function saveDefaultFormatsFromEditor() {
  syncDraftFromFormatEditorDom();
  var st = settingsRef();
  applyDraftToSettings(st);
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  getProfileRuntime().showToast("Formatos guardados \u2713", "success");
}
function exitFormatsEditor() {
  var was = getFormatsEditMode();
  clearFormatsEditMode();
  if (was === "nota") {
    var renderNotaFn = resolveGlobalFn("renderNotaEvolucionPrimaryTab");
    if (renderNotaFn) renderNotaFn();
  } else if (was === "indica") renderIndicaForm();
}
function resetProfileTemplates() {
  var st = settingsRef();
  resetProfileTemplatesToBlank(st);
  resetDraftToBlank();
  localStorage.setItem("rpc-settings", JSON.stringify(st));
  loadSettings();
  var mode = getFormatsEditMode();
  if (mode === "nota") {
    var renderNotaFn = resolveGlobalFn("renderNotaEvolucionPrimaryTab");
    if (renderNotaFn) renderNotaFn();
  } else if (mode === "indica") renderIndicaForm();
  getProfileRuntime().showToast("Formatos restablecidos (plantillas en blanco)", "success");
}

// public/js/features/profile.mjs
function hydrateProfileSettings(st) {
  if (!st || typeof st !== "object") return st;
  ensureProfileTemplateDefaults(st);
  if (st.hideListadoProblemasAiPrompt === void 0) {
    st.hideListadoProblemasAiPrompt = true;
  }
  return st;
}
var profileWindowHandlers = {
  toggleProfileSection,
  openProfileFromHeader,
  openProfileModal,
  closeProfileModal,
  onAppModeChange,
  toggleHeaderWorkMode,
  setWorkModeFromHeader,
  saveQuickOutputFormat,
  setHideManejoSection,
  setHideClinicoTab,
  setHideListadoProblemasAiPrompt,
  closeClinicoUnlockModal,
  confirmClinicoUnlock,
  openTemplatesModal,
  openNoteFormatsFromProfile,
  openIndicaFormatsFromProfile,
  saveDefaultFormatsFromEditor,
  exitFormatsEditor,
  updateDefaultFormatField,
  resetProfileTemplates,
  saveSettings,
  closeTemplatesModal,
  saveTemplates
};

// public/js/features/expediente/expediente-listado.mjs
var _listadoSortables = [];
function getMedicosForListado(lst) {
  var tpl = (rt2.getSettings() || {}).medicosPlantilla || {};
  var override = lst && lst.medicos || {};
  function pick(k) {
    return override[k] && override[k].trim() ? override[k] : tpl[k] || "";
  }
  return {
    profesor: pick("profesor"),
    r4: pick("r4"),
    r2: pick("r2"),
    r1a: pick("r1a"),
    r1b: pick("r1b")
  };
}
function updateListadoMedico(field, value) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  if (!lst.medicos) lst.medicos = {};
  lst.medicos[field] = value;
  persistClinicalState();
}
function _todayDDMMYYYY() {
  var d = /* @__PURE__ */ new Date();
  return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
}
function _nowHHMM() {
  var d = /* @__PURE__ */ new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function ensureListadoForActive() {
  if (!aid()) return null;
  if (!getListadoProblemas()[aid()]) {
    getListadoProblemas()[aid()] = emptyListado(_todayDDMMYYYY(), _nowHHMM());
  }
  var l = getListadoProblemas()[aid()];
  if (!Array.isArray(l.activos)) l.activos = [];
  if (!Array.isArray(l.inactivos)) l.inactivos = [];
  return l;
}
function _autoGrowTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 240) + "px";
}
function bindListadoTextareaPointerIsolation(root) {
  var scope = root || document;
  scope.querySelectorAll(".listado-row textarea").forEach(function(ta) {
    if (ta.dataset.listadoPointerBound === "1") return;
    ta.dataset.listadoPointerBound = "1";
    ["mousedown", "touchstart", "pointerdown"].forEach(function(type) {
      ta.addEventListener(type, function(e) {
        e.stopPropagation();
      });
    });
  });
}
function _renderListadoRow(seccion, p, idx) {
  return '<div class="listado-row" data-id="' + esc(p.id) + '" data-seccion="' + seccion + '"><div class="listado-num listado-drag-handle" title="Arrastra para reordenar" aria-label="Arrastrar para reordenar">' + (idx + 1) + '</div><input type="date" class="rpc-date-input" value="' + esc(p.fecha || "") + `" oninput="updateProblemaField('` + seccion + "','" + esc(p.id) + `','fecha',this.value)" aria-label="Fecha del problema"><textarea rows="1" placeholder="Descripci\xF3n del problema" oninput="updateProblemaField('` + seccion + "','" + esc(p.id) + `','descripcion',this.value); _autoGrowTextarea(this)" aria-label="Descripci\xF3n">` + esc(p.descripcion || "") + `</textarea><button class="btn-remove-listado" onclick="removeProblemaUI('` + seccion + "','" + esc(p.id) + `')" aria-label="Quitar problema" title="Quitar">\xD7</button></div>`;
}
function _renderListadoSeccion(seccion, label, lst) {
  var arr = lst[seccion] || [];
  var rows = arr.length ? arr.map(function(p, i) {
    return _renderListadoRow(seccion, p, i);
  }).join("") : '<div class="listado-empty">Sin problemas ' + label.toLowerCase() + ".</div>";
  return '<div class="listado-section"><div class="listado-section-header ' + seccion + '"><span>' + label + " (" + arr.length + ')</span></div><div class="listado-section-body listado-sort-zone" data-seccion-rows="' + seccion + '">' + rows + `</div><div class="listado-section-body" style="padding-top:0;"><button class="listado-add-row" onclick="addProblemaUI('` + seccion + `')">+ Agregar problema ` + label.toLowerCase() + "</button></div></div>";
}
function destroyListadoSortables() {
  _listadoSortables.forEach(function(s) {
    try {
      if (s && typeof s.destroy === "function") s.destroy();
    } catch (_e) {
      void _e;
    }
  });
  _listadoSortables = [];
}
function syncListadoOrderFromDom(seccion) {
  var lst = ensureListadoForActive();
  if (!lst || !seccion) return;
  var zone = document.querySelector(
    '#listado-form [data-seccion-rows="' + seccion + '"]'
  );
  if (!zone) return;
  var arr = (lst[seccion] || []).slice();
  var byId = /* @__PURE__ */ Object.create(null);
  for (var i = 0; i < arr.length; i++) byId[arr[i].id] = arr[i];
  var newArr = [];
  zone.querySelectorAll(".listado-row[data-id]").forEach(function(row) {
    var id = row.getAttribute("data-id");
    if (id && byId[id]) newArr.push(byId[id]);
  });
  if (!newArr.length || newArr.length !== arr.length) return;
  getListadoProblemas()[aid()] = Object.assign({}, lst, { [seccion]: newArr });
}
function refreshListadoRowNumbers(seccion) {
  var zone = document.querySelector(
    '#listado-form [data-seccion-rows="' + seccion + '"]'
  );
  if (!zone) return;
  zone.querySelectorAll(".listado-row").forEach(function(row, idx) {
    var num = row.querySelector(".listado-num");
    if (num) num.textContent = String(idx + 1);
  });
}
function mountListadoSortables() {
  destroyListadoSortables();
  var SortableCtor = typeof globalThis !== "undefined" ? globalThis.Sortable : null;
  if (!SortableCtor || typeof SortableCtor.create !== "function") return;
  var scrollRoot = document.getElementById("listado-form");
  document.querySelectorAll("#listado-form [data-seccion-rows]").forEach(function(zone) {
    var seccion = zone.getAttribute("data-seccion-rows");
    if (!seccion || !zone.querySelector(".listado-row")) return;
    var sortable = SortableCtor.create(zone, {
      animation: 200,
      easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      draggable: ".listado-row",
      handle: ".listado-drag-handle",
      filter: "textarea, input, button, a[href], select",
      preventOnFilter: true,
      delay: 0,
      delayOnTouchOnly: true,
      direction: "vertical",
      forceFallback: true,
      fallbackClass: "listado-drag-hovercard",
      fallbackOnBody: true,
      fallbackTolerance: 4,
      swapThreshold: 0.65,
      invertedSwapThreshold: 0.58,
      scroll: scrollRoot || true,
      bubbleScroll: true,
      scrollSensitivity: 54,
      scrollSpeed: 9,
      onEnd: function(evt) {
        if (evt.oldIndex === evt.newIndex && evt.from === evt.to) return;
        syncListadoOrderFromDom(seccion);
        refreshListadoRowNumbers(seccion);
        persistClinicalState();
      }
    });
    _listadoSortables.push(sortable);
  });
}
function renderListadoForm() {
  var c = document.getElementById("listado-form");
  if (!c) return;
  destroyListadoSortables();
  if (!aid()) {
    c.innerHTML = "";
    return;
  }
  var patient = getPatients().find(function(p) {
    return p.id === aid();
  });
  if (!patient) {
    c.innerHTML = "";
    return;
  }
  var lst = ensureListadoForActive();
  c.innerHTML = '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr 1fr;gap:10px;align-items:end;"><div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + '" class="field-readonly" readonly></div><div class="field-group"><label>Registro</label><input type="text" value="' + esc(patient.registro) + '" class="field-readonly" readonly></div><div class="field-group"><label>Edad/Sexo</label><input type="text" value="' + esc(patient.edad) + " / " + esc(patient.sexo) + '" class="field-readonly" readonly></div><div class="field-group"><label>Cuarto</label><input type="text" value="' + esc(patient.cuarto) + '" class="field-readonly" readonly></div><div class="field-group"><label>Cama</label><input type="text" value="' + esc(patient.cama) + '" class="field-readonly" readonly></div></div></div></div><div class="card"><div class="card-header card-header--tone-slate"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Fecha y Hora del Listado</div><div class="card-body"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="field-group"><label>Fecha</label><input type="text" value="' + esc(lst.fecha) + `" placeholder="DD/MM/AAAA" oninput="updateListadoMeta('fecha',this.value)"></div><div class="field-group"><label>Hora</label><input type="text" value="` + esc(lst.hora) + `" placeholder="HH:MM" oninput="updateListadoMeta('hora',this.value)"></div></div></div></div>` + _renderListadoSeccion("activos", "Activos", lst) + _renderListadoSeccion("inactivos", "Inactivos", lst) + _renderListadoMedicosCard(lst) + '<div class="action-bar"><button type="button" class="btn-med-secondary rpc-doc-export" onclick="quickExportCurrentPatient()" id="btn-quick-export-listado"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M5 21h14"/></svg>Salida r\xE1pida</button>' + (isHideListadoProblemasAiPromptEnabled() ? "" : '<button type="button" class="btn-med-secondary" onclick="copyListadoProblemasAiPrompt()" title="Copia el prompt para usar en un chat de IA"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>Copiar prompt IA</button>') + '<button type="button" class="btn-generate rpc-doc-export" onclick="generateListado()" id="btn-gen-listado"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Generar Listado de Problemas (.docx)</button></div>';
  refreshRpcDateFields(c);
  c.querySelectorAll(".listado-row textarea").forEach(_autoGrowTextarea);
  bindListadoTextareaPointerIsolation(c);
  mountListadoSortables();
}
function updateListadoMeta(field, value) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  lst[field] = value;
  persistClinicalState();
}
function updateProblemaField(seccion, id, field, value) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  var arr = lst[seccion] || [];
  var p = arr.find(function(x) {
    return x.id === id;
  });
  if (!p) return;
  p[field] = value;
  persistClinicalState();
}
function addProblemaUI(seccion) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  getListadoProblemas()[aid()] = addProblema(lst, seccion, { fecha: "", descripcion: "" });
  persistClinicalState();
  renderListadoForm();
  setTimeout(function() {
    var rows = document.querySelectorAll('[data-seccion-rows="' + seccion + '"] .listado-row textarea');
    if (rows.length) rows[rows.length - 1].focus();
  }, 0);
}
function removeProblemaUI(seccion, id) {
  var lst = ensureListadoForActive();
  if (!lst) return;
  getListadoProblemas()[aid()] = removeProblema(lst, seccion, id);
  persistClinicalState();
  renderListadoForm();
}
function _renderListadoMedicosCard(lst) {
  var meds = getMedicosForListado(lst);
  function row(key, label) {
    return '<div class="field-group"><label>' + label + '</label><input type="text" value="' + esc(meds[key] || "") + `" oninput="updateListadoMedico('` + key + `', this.value)"></div>`;
  }
  return '<div class="card"><div class="card-header card-header--tone-teal-md card-header-row"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>M\xE9dicos (firma)<span class="card-header-subhint">Pre-llena desde Mi Perfil. Edita aqu\xED para este paciente.</span></div><div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' + row("profesor", "Profesor") + row("r4", "R4") + row("r2", "R2") + row("r1a", "R1 (1)") + row("r1b", "R1 (2)") + "</div></div>";
}
async function copyListadoProblemasAiPrompt() {
  var ok = await rt2.copyToClipboardSafe(LISTADO_PROBLEMAS_AI_PROMPT);
  rt2.showToast(ok ? "Prompt copiado al portapapeles \u2713" : "No se pudo copiar el prompt", ok ? "success" : "error");
}
function generateListado() {
  if (rt2.guardMobileDocExport()) return;
  if (guardDocExportBlocked({ isRpcOffline: rt2.isRpcOffline, showToast: rt2.showToast })) return;
  if (!aid()) {
    rt2.showToast("Selecciona un paciente primero", "error");
    return;
  }
  var patient = getPatients().find(function(p) {
    return p.id === aid();
  });
  if (!patient) return;
  var lst = ensureListadoForActive();
  if (!lst) return;
  var hasProblems = lst.activos && lst.activos.length || lst.inactivos && lst.inactivos.length;
  if (!hasProblems) {
    rt2.showToast("Agrega al menos un problema antes de generar.", "error");
    return;
  }
  var medicos = getMedicosForListado(lst);
  var btn = document.getElementById("btn-gen-listado");
  setAsyncButtonLoading(btn, true, { showElapsed: true, loadingText: "Generando\u2026" });
  rt2.incrementPendingJobs();
  function buildPayload() {
    return { patient, listado: lst, medicos };
  }
  function selectOutputDir() {
    if (!window.electronAPI || !window.electronAPI.selectOutputDir) return Promise.resolve(void 0);
    return window.electronAPI.selectOutputDir();
  }
  function saveOutputDir(dir) {
    if (!dir) return;
    var st = rt2.getSettings() || {};
    st.outputDir = dir;
    localStorage.setItem("rpc-settings", JSON.stringify(st));
    syncApprovedOutputDir(dir);
  }
  exportWithOutputDirFallback({
    url: "/generate-listado",
    buildPayload,
    defaultFileName: "listado.docx",
    selectOutputDir,
    saveOutputDir,
    onSuccess: function(data) {
      var name = data && (data.fileName || data.path) ? data.fileName || String(data.path).split(/[/\\]/).pop() : "listado.docx";
      rt2.showToast("Listado guardado: " + name, "success");
    },
    onPrompt: function() {
      rt2.showToast("Selecciona una carpeta para guardar el documento.", "error");
    },
    onCancel: function() {
      rt2.showToast("No se guard\xF3 el documento: no se eligi\xF3 carpeta.", "error");
    },
    onError: function(msg) {
      rt2.showToast("Error: " + msg, "error");
    }
  }).catch(function() {
    rt2.showToast("Error de conexi\xF3n", "error");
  }).finally(function() {
    setAsyncButtonLoading(document.getElementById("btn-gen-listado"), false);
    rt2.decrementPendingJobs();
    rt2.syncOfflineButtonStates();
  });
}

// public/js/patient-data-ingreso-ui.mjs
function buildPatientIngresoFechasHtml(patient, settings) {
  var fimiLabel = resolveCensoFimiLabel(settings || {});
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="field-group"><label>FIUX (urgencias)</label><input type="date" class="rpc-date-input" value="' + esc(accesoFechaToDateInputValue(patient.fiuxFecha)) + `" oninput="updatePatient('fiuxFecha',this.value)" aria-label="FIUX ingreso urgencias"></div><div class="field-group"><label>` + esc(fimiLabel) + ' (servicio)</label><input type="date" class="rpc-date-input" value="' + esc(accesoFechaToDateInputValue(patient.fimiFecha)) + `" oninput="updatePatient('fimiFecha',this.value)" aria-label="` + esc(fimiLabel) + ' ingreso servicio"></div></div>';
}

// public/js/features/expediente/expediente-datos.mjs
function buildPatientDemographicsFieldsHtml(patient) {
  return '<div style="display:flex;flex-direction:column;gap:10px;">' + buildPatientTeamAssignSectionHtml(patient) + buildPatientSalaFieldHtml(patient) + '<div class="field-group"><label>Nombre</label><input type="text" value="' + esc(patient.nombre) + `" oninput="updatePatient('nombre',this.value)" style="text-transform:uppercase;"></div><div style="display:grid;grid-template-columns:1fr 100px 60px;gap:10px;"><div class="field-group"><label>Registro</label><input type="text" value="` + esc(patient.registro) + `" oninput="updatePatient('registro',this.value)"></div><div class="field-group"><label>Edad</label><input type="text" value="` + esc(patient.edad) + `" oninput="updatePatient('edad',this.value)"></div><div class="field-group"><label>Sexo</label><select onchange="updatePatient('sexo',this.value)"><option value="M"` + (patient.sexo === "M" ? " selected" : "") + '>M</option><option value="F"' + (patient.sexo === "F" ? " selected" : "") + ">F</option></select></div></div>" + buildPatientIngresoFechasHtml(patient, rt2.getSettings()) + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="field-group"><label>Peso (kg)</label><input type="text" inputmode="decimal" value="' + esc(patient.peso || "") + `" placeholder="60" oninput="updatePatient('peso',this.value)"></div><div class="field-group"><label>Talla (m)</label><input type="text" inputmode="decimal" value="` + esc(patient.talla || "") + `" placeholder="1.60" oninput="updatePatient('talla',this.value)"></div></div>` + buildPatientAccesosSectionHtml(patient) + '<div class="field-group"><label>\xC1rea</label><input type="text" value="' + esc(patient.area) + `" oninput="updatePatient('area',this.value)" style="text-transform:uppercase;"></div><div class="field-group"><label>Servicio</label><input type="text" value="` + esc(patient.servicio) + `" oninput="updatePatient('servicio',this.value)" style="text-transform:uppercase;"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"><div class="field-group"><label>Cuarto</label><input type="text" value="` + esc(patient.cuarto) + `" oninput="updatePatient('cuarto',this.value)"></div><div class="field-group"><label>Cama</label><input type="text" value="` + esc(patient.cama) + `" oninput="updatePatient('cama',this.value)"></div></div>` + (isModeSala(rt2.getSettings()) ? buildPatientCensoDatosSectionsHtml(patient) : "") + "</div>";
}
function buildPatientDemographicsCardHtml(patient, opts) {
  var fields = buildPatientDemographicsFieldsHtml(patient);
  if (opts && opts.embedded) {
    return '<div class="exp-datos-fields">' + fields + "</div>";
  }
  return '<div class="card"><div class="card-header"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Datos del Paciente</div><div class="card-body">' + fields + "</div></div>";
}
function renderPatientDataPane(patientIdOverride) {
  var wrap = document.getElementById("patient-data-form");
  if (!wrap) return;
  var targetId = patientIdOverride != null && patientIdOverride !== "" ? patientIdOverride : aid();
  if (!targetId) {
    wrap.innerHTML = "";
    return;
  }
  var patient = getPatients().find(function(p) {
    return String(p.id) === String(targetId);
  });
  if (!patient) {
    wrap.innerHTML = "";
    return;
  }
  wrap.dataset.patientId = String(patient.id);
  var datosMount = wrap.closest(".exp-datos-modal-body") || wrap.closest("#exp-datos-modal-mount");
  if (datosMount) datosMount.dataset.patientId = String(patient.id);
  wrap.innerHTML = buildPatientDemographicsCardHtml(patient, { embedded: true });
  refreshRpcDateFields(wrap);
  wirePatientTeamAssignRefresh();
}

// public/js/features/expediente.mjs
var windowHandlers = Object.assign(
  {
    copyCultivoCondensado,
    updateListadoMeta,
    updateProblemaField,
    addProblemaUI,
    removeProblemaUI,
    copyListadoProblemasAiPrompt,
    generateListado,
    _autoGrowTextarea,
    renderPatientDataPane,
    updateListadoMedico
  },
  patientDataCensoWindowHandlers,
  patientDataAccesosWindowHandlers,
  patientTeamAssignWindowHandlers,
  patientDatosModalWindowHandlers
);

// public/js/features/profile-prefs.mjs
function syncHideManejoSectionUI() {
  var row = document.getElementById("settings-hide-manejo-section")?.closest("label") || document.getElementById("settings-hide-clinico-tab")?.closest("label");
  if (row) row.style.display = "none";
}
function syncHideClinicoTabUI() {
  syncHideManejoSectionUI();
}
function ensureClinicoTabConsistency() {
  var settings = settingsRef();
  var getActiveInnerTabFn = resolveGlobalFn("getActiveInnerTab");
  var current = getActiveInnerTabFn ? getActiveInnerTabFn() : null;
  if (!current) return;
  var migrated = migrateGranularInner(current, settings);
  if (migrated !== current) {
    var switchInnerTabFn = resolveGlobalFn("switchInnerTab");
    if (switchInnerTabFn) switchInnerTabFn(migrated);
  }
}
function setHideManejoSection(_enabled) {
  syncHideManejoSectionUI();
}
function setHideClinicoTab(enabled) {
  setHideManejoSection(enabled);
}
function isHideListadoProblemasAiPromptEnabled() {
  var st = settingsRef();
  if (!st || st.hideListadoProblemasAiPrompt === void 0) return true;
  return !!st.hideListadoProblemasAiPrompt;
}
function syncHideListadoProblemasAiPromptUI() {
  var cb = document.getElementById("settings-hide-listado-ai-prompt");
  if (cb) cb.checked = isHideListadoProblemasAiPromptEnabled();
}
function setHideListadoProblemasAiPrompt(enabled) {
  var st = settingsRef();
  st.hideListadoProblemasAiPrompt = !!enabled;
  persistSettingsToLocalStorage();
  syncHideListadoProblemasAiPromptUI();
  renderListadoForm();
  getProfileRuntime().showToast(
    enabled ? "Bot\xF3n \xABCopiar prompt IA\xBB oculto en listado de problemas." : "Bot\xF3n \xABCopiar prompt IA\xBB visible en listado de problemas.",
    "success"
  );
}

// public/js/features/profile-load-sync.mjs
function syncProfileModalLayout() {
  var st = settingsRef();
  var sala = isModeSala(st);
  var salida = document.getElementById("profile-salida-section");
  var bridge = document.getElementById("profile-clinical-bridge");
  var servicioWrap = document.getElementById("profile-default-servicio-wrap");
  if (salida) salida.hidden = !sala;
  if (bridge) bridge.hidden = !isDbMode();
  if (servicioWrap) servicioWrap.hidden = !sala;
}
function syncProfileLoadedSections(full) {
  syncFontZoomButtons();
  syncHighContrastButtons();
  syncUiDensityButtons();
  syncUpdateChannelUI();
  syncUpdateTelemetryUI();
  syncHideClinicoTabUI();
  syncHideListadoProblemasAiPromptUI();
  ensureClinicoTabConsistency();
  if (typeof syncSettingsLanHostDiskSection === "function") syncSettingsLanHostDiskSection();
  syncAppModeRadioControls();
  syncCensoExportButtonVisibility();
  syncClinicalRotationEntryChrome();
  syncProfileModalLayout();
  if (full) {
    syncHardwareAccelerationUI();
    syncIdleLockSelectUi();
    syncDbSecuritySectionUi();
    syncPreimportBackupUi();
  }
  getProfileRuntime().syncWorkContextChrome();
}

// public/js/features/profile-load.mjs
function loadSettings() {
  var snapshot = buildLoadSettingsSnapshot();
  var snapshotUnchanged = getLastLoadSettingsSnapshot() !== null && getLastLoadSettingsSnapshot() === snapshot;
  setLastLoadSettingsSnapshot(snapshot);
  if (snapshotUnchanged) {
    syncProfileLoadedSections(false);
    return;
  }
  var st = settingsRef();
  populateProfileIdentityFields(st);
  populateProfileOutputFields(st);
  populateProfileVersionBlock();
  populateProfileUserDataBlock();
  syncProfileLoadedSections(true);
}

export {
  registerExpedienteRuntime,
  wireAtbRisHoverPanels,
  removeAtbRisPanelsFromBody,
  isResLabChunkPureCultivo,
  buildCultivoOutputHtmlFragments,
  registerCensoRuntime,
  syncCensoExportButtonVisibility,
  exportCensoPdfFromHelp,
  invalidateCultivosTableCache,
  renderCultivosTable,
  refreshTendenciasOrCultivosPanel,
  loadSettings,
  openProfileModal,
  closeProfileModal,
  toggleProfileSection,
  syncProfileSectionVisibility,
  applyAppModeSwitchEffects,
  setWorkModeFromHeader,
  closeTemplatesModal,
  hydrateProfileSettings,
  profileWindowHandlers,
  renderListadoForm,
  generateListado,
  renderPatientDataPane,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-TKNVHQ4M.js.map
