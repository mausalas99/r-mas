import {
  renderPatientSidebarBodyHtml
} from "/mobile/js/chunks/chunk-VORZBJRG.js";
import {
  INTERCONSULT_SERVICES,
  hueForRequestingService
} from "/mobile/js/chunks/chunk-RSNFY6IK.js";
import {
  escTxtSafe
} from "/mobile/js/chunks/chunk-2JKGABV2.js";
import {
  buildLabRepoBulkText,
  labRepoDefaultDateRange,
  labRepoFetchRangeFromDateInputs,
  labRepoToDateInputValue
} from "/mobile/js/chunks/chunk-XZECKTNU.js";
import {
  resumeLabBulkPreviewModalIfSuspended,
  suspendLabBulkPreviewModal
} from "/mobile/js/chunks/chunk-BPF3D2MR.js";
import {
  clearPendingAddPatientCallbacks,
  commitPatientFromModal,
  commitStubPatientFromLab,
  findPatientByRegistro,
  getPendingAddPatientFromBulkPreview,
  getTourDemoAdmitDefaults,
  setPendingAddPatientFromBulkPreview,
  setPendingAddPatientSavedCallback,
  syncPatientRegistrationSalaSelect,
  wirePatientRegistrationSalaControls
} from "/mobile/js/chunks/chunk-KCX5U3HW.js";
import {
  rt
} from "/mobile/js/chunks/chunk-SOQEY2U2.js";
import {
  patientsBridge
} from "/mobile/js/chunks/chunk-IUWKNPSX.js";
import {
  assignPatientToTeamClinical,
  buildTeamSelectOptions,
  getClinicalScopeContextForEvaluate,
  hasElevatedTeamPrivileges,
  isPatientAdmissionIncomplete,
  isPatientAssignedToJoinedTeam,
  readPatientRegistrationTeamId,
  syncPatientRegistrationTeamSelect
} from "/mobile/js/chunks/chunk-SEHESZ4A.js";
import {
  isGuardiaMode
} from "/mobile/js/chunks/chunk-G2QTTDSA.js";
import {
  procesarLabs
} from "/mobile/js/chunks/chunk-7XJNQXQX.js";
import {
  getDefaultCama,
  getDefaultCuarto,
  getDefaultServicio,
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  openConfirm
} from "/mobile/js/chunks/chunk-EASTAY6S.js";
import {
  getNotes,
  getPatients,
  persistClinicalState
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import {
  storage
} from "/mobile/js/chunks/chunk-YUYECAQZ.js";
import {
  esc,
  escAttr,
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  closeModalAnimated,
  prepareModalBackdropOpen,
  shakePatientFieldsForError
} from "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-A7GKLJFV.js";

// public/js/features/patient-dashboard/consult-band.mjs
var FOLLOW_UP_STATUSES = ["pendiente", "en_curso", "resuelta"];
var FOLLOW_UP_LABELS = {
  pendiente: "Pendiente",
  en_curso: "En curso",
  resuelta: "Resuelta"
};
function getConsultInfo(patient) {
  var info = patient && patient.consultInfo;
  if (!info || typeof info !== "object") {
    return { requestingService: "", reason: "", followUpStatus: "" };
  }
  return {
    requestingService: String(info.requestingService || ""),
    reason: String(info.reason || ""),
    followUpStatus: String(info.followUpStatus || "")
  };
}
function setConsultInfo(patient, patch) {
  if (!patient) return null;
  var cur = getConsultInfo(patient);
  var p = patch || {};
  var next = {
    requestingService: "requestingService" in p ? String(p.requestingService || "") : cur.requestingService,
    reason: "reason" in p ? String(p.reason || "") : cur.reason,
    followUpStatus: "followUpStatus" in p ? String(p.followUpStatus || "") : cur.followUpStatus
  };
  patient.consultInfo = next;
  return next;
}
function renderStatusOptionsHtml(statusKey) {
  var opts = ['<option value=""' + (statusKey ? "" : " selected") + ">Sin definir</option>"];
  FOLLOW_UP_STATUSES.forEach(function(key) {
    opts.push(
      '<option value="' + key + '"' + (key === statusKey ? " selected" : "") + ">" + escHtml(FOLLOW_UP_LABELS[key]) + "</option>"
    );
  });
  return opts.join("");
}
function requestingServiceTriggerHtml(name) {
  var trimmed = String(name || "").trim();
  var svc = INTERCONSULT_SERVICES.find(function(s) {
    return s.name === trimmed;
  });
  var hue = svc ? hueForRequestingService(svc) : 220;
  return '<button type="button" class="svc" style="--h:' + hue + '" data-ic-req-trigger>' + (trimmed ? escHtml(trimmed) : "Elegir servicio") + "</button>";
}
function teamFieldHtml(teamCtx) {
  var teams = teamCtx && teamCtx.teams || [];
  if (!teams.length) return "";
  var currentTeamId = teamCtx && teamCtx.currentTeamId || "";
  return '<div class="ic-consult-field"><label class="ic-consult-label">Equipo</label><select class="ic-consult-input" data-consult-team-select><option value="">\u2014 Sin asignar \u2014</option>' + buildTeamSelectOptions(teams, currentTeamId, { groupBySala: !!(teamCtx && teamCtx.groupBySala) }) + "</select></div>";
}
function renderConsultBandHtml(info, teamCtx) {
  var c = info || {};
  var statusKey = String(c.followUpStatus || "");
  return '<div class="ic-consult-band"><div class="ic-consult-field"><label class="ic-consult-label">Servicio solicitante</label>' + requestingServiceTriggerHtml(c.requestingService) + '</div><div class="ic-consult-field ic-consult-field--reason"><label class="ic-consult-label">Motivo de consulta</label><input type="text" class="ic-consult-input" data-consult-field="reason" value="' + escAttr(c.reason) + '" placeholder="Sin dato"></div><div class="ic-consult-field"><label class="ic-consult-label">Seguimiento</label><select class="ic-consult-input ic-consult-status ic-consult-status--' + escHtml(statusKey || "sin_definir") + '" data-consult-field="followUpStatus">' + renderStatusOptionsHtml(statusKey) + "</select></div>" + teamFieldHtml(teamCtx) + "</div>";
}

// public/js/features/patients-bulk-select.mjs
var _mode = false;
var _selected = /* @__PURE__ */ new Set();
function isPatientBulkSelectMode() {
  return _mode;
}
function getPatientBulkSelectedIds() {
  return Array.from(_selected);
}
function getPatientBulkSelectedCount() {
  return _selected.size;
}
function isPatientBulkSelected(patientId) {
  return _selected.has(String(patientId || "").trim());
}
function setPatientBulkSelectMode(on) {
  _mode = !!on;
  if (!_mode) _selected.clear();
}
function togglePatientBulkSelectMode() {
  setPatientBulkSelectMode(!_mode);
  return _mode;
}
function togglePatientBulkSelected(patientId) {
  var pid = String(patientId || "").trim();
  if (!pid || pid.indexOf("demo-") === 0) return false;
  if (_selected.has(pid)) _selected.delete(pid);
  else _selected.add(pid);
  return _selected.has(pid);
}
function exitPatientBulkSelectMode() {
  setPatientBulkSelectMode(false);
}

// public/js/patient-delete-auth.mjs
function canDeletePatientChart(user, patientId, scopeContext) {
  if (!user?.user_id) return false;
  const pid = String(patientId || "").trim();
  if (!pid) return false;
  if (hasElevatedTeamPrivileges(user)) return true;
  return isPatientAssignedToJoinedTeam(pid, scopeContext, user);
}

// public/js/features/patients-card-html.mjs
function requestingServiceHue(p) {
  var name = String(getConsultInfo(p).requestingService || "").trim();
  if (!name) return null;
  var svc = INTERCONSULT_SERVICES.find(function(s) {
    return s.name === name;
  });
  return svc ? hueForRequestingService(svc) : null;
}
function renderPatientBulkCheckHtml(p) {
  if (!isPatientBulkSelectMode()) return "";
  var on = isPatientBulkSelected(p.id);
  return '<span class="patient-bulk-check' + (on ? " patient-bulk-check--on" : "") + '" aria-hidden="true">' + (on ? "\u2713" : "") + "</span>";
}
function isInterconsultaModeUi() {
  if (isModeSala(rt.getSettings())) return false;
  try {
    return !isGuardiaMode();
  } catch {
    return true;
  }
}
function renderPatientCardToolbarHtml(p, pinOn, archOn) {
  if (isPatientBulkSelectMode()) {
    return '<div class="patient-card-toolbar patient-card-toolbar--bulk">' + renderPatientBulkCheckHtml(p) + "</div>";
  }
  var pinTitle = pinOn ? "Quitar de fijados" : "Fijar paciente";
  var archTitle = archOn ? "Restaurar del archivo" : "Archivar paciente";
  var archiveIcon = archOn ? "\u21A9" : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="4" rx="1"></rect><path d="M5 8h14v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V8z"></path><path d="M10 12h4"></path></svg>';
  var canDelete = canDeletePatientChart(
    clinicalSessionContext.user,
    p.id,
    getClinicalScopeContextForEvaluate()
  );
  var deleteBtn = canDelete ? `<button type="button" class="btn-delete-card" onclick="deletePatient(event,'` + p.id + `')" aria-label="Eliminar">\xD7</button>` : "";
  var pinBtn = isInterconsultaModeUi() ? "" : '<button type="button" class="patient-toolbar-chip btn-pinned-text' + (pinOn ? " patient-toolbar-chip--on" : "") + '" title="' + pinTitle + '" aria-label="' + pinTitle + `" onclick="togglePatientPinned(event,'` + p.id + `')">` + (pinOn ? "Fijado" : "Fijar") + "</button>";
  return '<div class="patient-card-toolbar"><div class="patient-card-toolbar-left"><button type="button" class="patient-toolbar-chip patient-toolbar-chip--icon btn-archive-clean" title="' + archTitle + '" aria-label="' + archTitle + `" onclick="togglePatientArchived(event,'` + p.id + `')">` + archiveIcon + "</button>" + pinBtn + "</div>" + deleteBtn + "</div>";
}
function patientSidebarCardOpts(extra) {
  var opts = { showServicio: !isModeSala(rt.getSettings()) };
  if (extra) {
    for (var k in extra) {
      if (Object.prototype.hasOwnProperty.call(extra, k)) opts[k] = extra[k];
    }
  }
  return opts;
}
function renderPatientCardHtml(p) {
  var pinOn = !!p.pinned;
  var archOn = !!p.archived;
  var aid = rt.getActiveId();
  var bulkOn = isPatientBulkSelectMode() && isPatientBulkSelected(p.id);
  var incomplete = isPatientAdmissionIncomplete(p, rt.getSettings());
  var svcHue = requestingServiceHue(p);
  return '<div class="patient-card ' + (p.id === aid ? "active" : "") + (pinOn ? " patient-card--pinned" : "") + (archOn ? " patient-card--archived" : "") + (bulkOn ? " patient-card--bulk-selected" : "") + (incomplete ? " patient-card--incomplete" : "") + (svcHue != null ? " patient-card--svc-tint" : "") + '" data-patient-id="' + p.id + '"' + (svcHue != null ? ' style="--svc-hue:' + svcHue + '"' : "") + ' role="button" tabindex="0">' + renderPatientCardToolbarHtml(p, pinOn, archOn) + renderPatientSidebarBodyHtml(p, patientSidebarCardOpts()) + "</div>";
}
function renderPinnedSectionLabelHtml(count) {
  return '<div class="patient-list-section-label patient-list-section-label--pinned" role="group" aria-label="Pacientes fijados"><span class="patient-list-section-label__lead"><svg class="patient-list-pin-svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a3 3 0 1 0-6 0v3.76z"/></svg>Fijados</span><span class="patient-list-section-count">' + count + "</span></div>";
}
function renderActiveSectionLabelHtml(count) {
  return '<div class="patient-list-section-label" role="group" aria-label="Lista de pacientes">Pacientes <span class="patient-list-section-count">' + count + "</span></div>";
}
function renderArchivedToggleHtml(collapsed, count) {
  return '<button type="button" class="patient-list-section-toggle" onclick="toggleArchivedSection(event)" aria-expanded="' + (!collapsed ? "true" : "false") + '">Archivados <span>(' + count + ")</span> <span>" + (collapsed ? "\u25B6" : "\u25BC") + "</span></button>";
}

// public/js/features/patients-list-click.mjs
var INTERACTIVE = "button, a[href], input, textarea, select";
function eventStartNode(ev) {
  if (ev && typeof ev.composedPath === "function") {
    var path = ev.composedPath();
    if (path && path[0]) return path[0];
  }
  return ev && ev.target;
}
function elementFromNode(node) {
  if (!node) return null;
  if (node.nodeType === 3) return node.parentElement;
  if (typeof node.closest === "function") return node;
  return node.parentElement || null;
}
function patientCardIdFromEvent(ev) {
  var el = elementFromNode(eventStartNode(ev));
  if (!el) return "";
  if (el.closest(INTERACTIVE)) return "";
  var card = el.closest(".patient-card[data-patient-id]");
  if (!card) return "";
  return card.getAttribute("data-patient-id") || "";
}
function shouldHandleTouchPointerUp(ev) {
  var type = ev && ev.pointerType;
  return type === "touch" || type === "pen";
}

// public/js/patient-registro-parse.mjs
function parseRegistrosFromBulkInput(raw) {
  var parts = String(raw || "").split(/[\s,;]+|\n+/).map(function(s) {
    return String(s || "").trim();
  }).filter(Boolean);
  var seen = /* @__PURE__ */ Object.create(null);
  var out = [];
  parts.forEach(function(reg) {
    var key = reg.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    out.push(reg);
  });
  return out;
}

// public/js/patient-registro-modal-ui.mjs
var registroModalRows = [""];
var registroModalMultiMode = false;
function setElementDisplay(el, visible) {
  if (!el) return;
  el.style.display = visible ? "" : "none";
}
function registroRowsForRender() {
  if (registroModalMultiMode) {
    return registroModalRows.length ? registroModalRows.slice() : [""];
  }
  return [registroModalRows[0] || ""];
}
function renderRegistroModalListHtml() {
  var rows = registroRowsForRender();
  return rows.map(function(val, i) {
    var canRemove = registroModalMultiMode && rows.length > 1;
    var placeholder = registroModalMultiMode ? "Registro " + (i + 1) : "0000000-0";
    return '<div class="vpo-dx-row list-row"><input type="text" class="ea-input m-registro-row-input" value="' + esc(val) + '" placeholder="' + esc(placeholder) + '" oninput="onRegistroModalInput(' + i + ', this.value)" onpaste="onRegistroModalRowPaste(event, ' + i + ')"><button type="button" class="btn-remove" onclick="removeRegistroModalRow(' + i + ')"' + (canRemove ? "" : ' style="visibility:hidden"') + ' aria-label="Eliminar">\xD7</button></div>';
  }).join("");
}
function refreshRegistroModalListDom() {
  var listEl = document.getElementById("m-registro-list");
  if (!listEl) return;
  listEl.innerHTML = renderRegistroModalListHtml();
}
function initRegistroModalRows(values) {
  registroModalRows = values && values.length ? values.slice() : [""];
  if (registroModalMultiMode && !registroModalRows.length) registroModalRows = [""];
  var paste = document.getElementById("m-registro-paste");
  if (paste) paste.value = "";
  refreshRegistroModalListDom();
}
function setRegistroModalMultiMode(on) {
  registroModalMultiMode = !!on;
  setElementDisplay(document.getElementById("m-registro-toolbar"), on);
  setElementDisplay(document.getElementById("m-registro-paste-wrap"), on);
  if (!on && registroModalRows.length > 1) {
    registroModalRows = [registroModalRows[0] || ""];
  }
  refreshRegistroModalListDom();
}
function normalizeRegistroModalValues(rows) {
  return parseRegistrosFromBulkInput(
    rows.map(function(r) {
      return String(r || "").trim();
    }).filter(Boolean).join("\n")
  );
}
function expandRegistroRowsFromInput(rows, index, value) {
  var base = Array.isArray(rows) ? rows.slice() : [""];
  var idx = Math.max(0, Number(index) || 0);
  while (base.length <= idx) base.push("");
  var parsed = parseRegistrosFromBulkInput(value);
  if (parsed.length <= 1) {
    base[idx] = String(value || "");
    return base;
  }
  var before = base.slice(0, idx);
  var after = base.slice(idx + 1).filter(function(r) {
    return String(r || "").trim();
  });
  return before.concat(parsed).concat(after).concat([""]);
}
function mergeRegistroPasteIntoRows(rows, pasteRaw) {
  var parsed = parseRegistrosFromBulkInput(pasteRaw);
  if (!parsed.length) return Array.isArray(rows) ? rows.slice() : [""];
  return parsed.concat([""]);
}
function collectRegistroModalRegistros() {
  var inputs = document.querySelectorAll("#m-registro-list .m-registro-row-input");
  var values = [];
  inputs.forEach(function(input) {
    values.push(String(input.value || "").trim());
  });
  var paste = document.getElementById("m-registro-paste");
  if (paste && String(paste.value || "").trim()) {
    values = values.concat(parseRegistrosFromBulkInput(paste.value));
  }
  return normalizeRegistroModalValues(values);
}
function readRegistroModalPrimary() {
  var list = collectRegistroModalRegistros();
  return list[0] || "";
}
function focusRegistroModalFirst() {
  var inputs = document.querySelectorAll("#m-registro-list .m-registro-row-input");
  for (var i = 0; i < inputs.length; i++) {
    if (!String(inputs[i].value || "").trim()) {
      try {
        inputs[i].focus();
      } catch (_e) {
        void _e;
      }
      return;
    }
  }
  if (inputs.length) {
    try {
      inputs[0].focus();
    } catch (_e) {
      void _e;
    }
  }
}
function focusRegistroModalAny() {
  var inputs = document.querySelectorAll("#m-registro-list .m-registro-row-input");
  if (inputs.length) {
    try {
      inputs[0].focus();
    } catch (_e) {
      void _e;
    }
    return;
  }
  var legacy = document.getElementById("m-registro");
  if (legacy) {
    try {
      legacy.focus();
    } catch (_e) {
      void _e;
    }
  }
}
function onRegistroModalInput(index, value) {
  var parsed = parseRegistrosFromBulkInput(value);
  if (!registroModalMultiMode) {
    if (parsed.length > 1) {
      registroModalRows = expandRegistroRowsFromInput([""], 0, value);
      setRegistroModalMultiMode(true);
      return;
    }
    registroModalRows = [String(value || "")];
    return;
  }
  if (!Array.isArray(registroModalRows)) registroModalRows = [""];
  registroModalRows = expandRegistroRowsFromInput(registroModalRows, index, value);
  if (parsed.length > 1) refreshRegistroModalListDom();
}
function onRegistroModalRowPaste(event, index) {
  var clip = event && event.clipboardData && typeof event.clipboardData.getData === "function" ? event.clipboardData.getData("text") : "";
  if (!clip || parseRegistrosFromBulkInput(clip).length <= 1) return;
  if (event && typeof event.preventDefault === "function") event.preventDefault();
  onRegistroModalInput(index, clip);
}
function addRegistroModalRow() {
  if (!registroModalMultiMode) return;
  if (!Array.isArray(registroModalRows)) registroModalRows = [""];
  registroModalRows.push("");
  refreshRegistroModalListDom();
  var inputs = document.querySelectorAll("#m-registro-list .m-registro-row-input");
  var last = inputs[inputs.length - 1];
  if (last) {
    try {
      last.focus();
    } catch (_e) {
      void _e;
    }
  }
}
function removeRegistroModalRow(index) {
  if (!registroModalMultiMode || !Array.isArray(registroModalRows)) return;
  if (registroModalRows.length <= 1) return;
  registroModalRows.splice(index, 1);
  refreshRegistroModalListDom();
}
function splitRegistroModalPaste() {
  var ta = document.getElementById("m-registro-paste");
  if (!ta || !registroModalMultiMode) return;
  if (!parseRegistrosFromBulkInput(ta.value).length) return;
  registroModalRows = mergeRegistroPasteIntoRows(registroModalRows, ta.value);
  ta.value = "";
  refreshRegistroModalListDom();
}
function onRegistroModalPasteAreaInput() {
  var ta = document.getElementById("m-registro-paste");
  if (!ta || !registroModalMultiMode) return;
  var raw = String(ta.value || "");
  if (!raw.trim() || !/[\r\n]/.test(raw)) return;
  if (!parseRegistrosFromBulkInput(raw).length) return;
  splitRegistroModalPaste();
}
var patientRegistroModalWindowHandlers = {
  onRegistroModalInput,
  onRegistroModalRowPaste,
  addRegistroModalRow,
  removeRegistroModalRow,
  splitRegistroModalPaste,
  onRegistroModalPasteAreaInput
};

// public/js/patient-validation.mjs
function validatePatientForSave(input) {
  const nombre = String(input?.nombre || "").trim();
  const registro = String(input?.registro || "").trim();
  const edadNum = String(input?.edadNum || "").trim();
  if (!nombre) return { ok: false, error: "Falta el nombre del paciente." };
  if (edadNum) {
    const n = Number(edadNum);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: "La edad debe ser un n\xFAmero v\xE1lido." };
    }
  }
  if (!registro) return { ok: true, warning: "missing_expediente" };
  return { ok: true };
}
function buildExpedienteAdvice() {
  return {
    title: "Falta el n\xFAmero de expediente",
    body: 'No capturaste expediente. Para ingresar pacientes en un solo paso, copia el texto desde "Expediente:" hasta el final del reporte y p\xE9galo en la pesta\xF1a Laboratorio: R+ rellena nombre, expediente, edad y sexo autom\xE1ticamente.',
    confirmLabel: "Guardar sin expediente",
    cancelLabel: "Volver y completar"
  };
}

// public/js/features/patients-modal-dialogs.mjs
function normalizeName(str) {
  return (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function findDuplicatePatient(nombre, registro) {
  var nombreNorm = normalizeName(nombre);
  return getPatients().find(function(p) {
    if (p.isDemo) return false;
    if (registro && p.registro && registro === p.registro) return true;
    return normalizeName(p.nombre) === nombreNorm;
  });
}
function showDuplicateWarning(existing, onConfirm) {
  var fecha = getNotes()[existing.id] ? getNotes()[existing.id].fecha : "";
  var body = "<strong>" + esc(existing.nombre) + "</strong>";
  body += "<br>Cto. " + esc(existing.cuarto || "\u2014") + " Cama " + esc(existing.cama || "\u2014");
  if (existing.registro) body += "<br>Registro: " + esc(existing.registro);
  if (fecha) body += "<br>Ingreso: " + esc(fecha);
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = "dup-confirm-backdrop";
  backdrop.innerHTML = '<div class="lab-conflict-modal"><h3>Paciente similar encontrado</h3><p>' + body + `</p><div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;"><button onclick="document.getElementById('dup-confirm-backdrop').remove()" style="background:#F3F4F6;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;color:#1f2937;">Cancelar</button><button id="dup-confirm-btn" style="background:#065F46;color:white;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;">Agregar de todas formas</button></div></div>`;
  document.body.appendChild(backdrop);
  document.getElementById("dup-confirm-btn").onclick = function() {
    document.getElementById("dup-confirm-backdrop").remove();
    onConfirm();
  };
}
function showExpedienteAdvice(onConfirm) {
  var prev = document.getElementById("exp-advice-backdrop");
  if (prev) prev.remove();
  var advice = buildExpedienteAdvice();
  var b = document.createElement("div");
  b.className = "lab-conflict-backdrop";
  b.id = "exp-advice-backdrop";
  b.innerHTML = '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="exp-advice-title"><h3 id="exp-advice-title">' + escTxtSafe(advice.title) + "</h3><p>" + escTxtSafe(advice.body) + '</p><div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;"><button type="button" class="btn-cancel" id="exp-advice-cancel">' + escTxtSafe(advice.cancelLabel) + '</button><button type="button" class="btn-conflict-primary" id="exp-advice-confirm">' + escTxtSafe(advice.confirmLabel) + "</button></div></div>";
  document.body.appendChild(b);
  var close = function() {
    var x = document.getElementById("exp-advice-backdrop");
    if (x) x.remove();
  };
  document.getElementById("exp-advice-cancel").onclick = function() {
    close();
    focusRegistroModalAny();
  };
  document.getElementById("exp-advice-confirm").onclick = function() {
    close();
    onConfirm();
  };
}

// public/js/features/patients-modal-fields.mjs
function readPatientModalFields(isFromLab) {
  if (isFromLab) {
    return {
      nombre: (document.getElementById("m-nombre").value || "").trim().toUpperCase(),
      registro: (document.getElementById("m-registro").value || "").trim(),
      edadNum: (document.getElementById("m-edad-num").value || "").trim(),
      edadUnit: document.getElementById("m-edad-unit").value || "a\xF1os",
      sexo: document.getElementById("m-sexo-ro").value || "F"
    };
  }
  return {
    nombre: (document.getElementById("m-nombre-manual").value || "").trim().toUpperCase(),
    registro: readRegistroModalPrimary(),
    edadNum: (document.getElementById("m-edad-num-manual").value || "").trim(),
    edadUnit: document.getElementById("m-edad-unit-manual").value || "a\xF1os",
    sexo: document.getElementById("m-sexo").value
  };
}
function validatePatientAge(edadNum, isFromLab) {
  if (!edadNum) {
    rt.showToast("Ingresa la edad", "error");
    shakePatientFieldsForError("Ingresa la edad", isFromLab);
    return null;
  }
  var ageInt = parseInt(edadNum, 10);
  if (isNaN(ageInt) || ageInt < 0 || ageInt > 120) {
    rt.showToast("Edad inv\xE1lida", "error");
    shakePatientFieldsForError("Edad inv\xE1lida", isFromLab);
    return null;
  }
  return String(ageInt);
}
function readPatientLocationFields(settings) {
  var salaMode = isModeSala(settings);
  var servicio = (document.getElementById("m-servicio").value || "").trim().toUpperCase();
  var area = salaMode ? servicio : (document.getElementById("m-area").value || "").trim().toUpperCase();
  var cuarto = (document.getElementById("m-cuarto").value || "").trim();
  var cama = (document.getElementById("m-cama").value || "").trim();
  return { salaMode, servicio, area, cuarto, cama };
}
function validatePatientLocationFields(loc, isFromLab) {
  if (!loc.servicio) {
    var servicioMsg = loc.salaMode ? "Ingresa \xC1rea / Servicio" : "Ingresa servicio";
    rt.showToast(servicioMsg, "error");
    shakePatientFieldsForError(servicioMsg, isFromLab);
    return false;
  }
  if (!loc.salaMode && !loc.area) {
    rt.showToast("Ingresa \xE1rea / departamento", "error");
    shakePatientFieldsForError("Ingresa \xE1rea / departamento", isFromLab);
    return false;
  }
  if (!loc.cuarto || !loc.cama) {
    rt.showToast("Ingresa cuarto y cama", "error");
    shakePatientFieldsForError("Ingresa cuarto y cama", isFromLab);
    return false;
  }
  return true;
}

// public/js/patient-registro-tunnel.mjs
function defaultFetchRange() {
  var range = labRepoDefaultDateRange();
  return labRepoFetchRangeFromDateInputs(
    labRepoToDateInputValue(range.desde),
    labRepoToDateInputValue(range.hasta)
  );
}
function parseLabPatientFromStudies(studies, registro) {
  var text = buildLabRepoBulkText(studies);
  if (!text) return { expediente: registro, name: "" };
  try {
    var result = procesarLabs(text);
    var p = result && result.patient ? result.patient : {};
    return {
      expediente: String(p.expediente || registro || "").trim(),
      name: String(p.name || "").trim(),
      edad: p.edad,
      sexo: p.sexo
    };
  } catch (_e) {
    return { expediente: registro, name: "" };
  }
}
function removeConfirmBackdrop() {
  var el = document.getElementById("patient-registro-tunnel-backdrop");
  if (el) el.remove();
}
function showRegistroTunnelConfirm(labPatient, studyCount, onConfirm, batch, onOmit, onStopBatch) {
  removeConfirmBackdrop();
  var nombre = String(labPatient.name || "").trim() || "Sin nombre en repositorio";
  var reg = String(labPatient.expediente || "").trim();
  var batchTotal = batch && batch.total > 1 ? batch.total : 0;
  var batchIndex = batch && batch.index ? batch.index : 0;
  var title = batchTotal > 1 ? "\xBFEs este paciente? (" + batchIndex + " de " + batchTotal + ")" : "\xBFEs este paciente?";
  var omitLabel = batchTotal > 1 ? "Omitir" : "Cancelar";
  var stopBtn = batchTotal > 1 ? '<button type="button" class="btn-cancel" id="patient-registro-tunnel-stop">Detener cola</button>' : "";
  var backdrop = document.createElement("div");
  backdrop.className = "lab-conflict-backdrop";
  backdrop.id = "patient-registro-tunnel-backdrop";
  backdrop.innerHTML = '<div class="lab-conflict-modal" role="dialog" aria-modal="true"><h3>' + escHtml(title) + "</h3><p><strong>" + escHtml(nombre) + "</strong><br>Registro: " + escHtml(reg) + (studyCount ? "<br>" + studyCount + " estudio" + (studyCount === 1 ? "" : "s") + " en el rango" : "") + '</p><div class="lab-conflict-actions" style="flex-direction:row;justify-content:flex-end;gap:8px;">' + stopBtn + '<button type="button" class="btn-cancel" id="patient-registro-tunnel-cancel">' + escHtml(omitLabel) + '</button><button type="button" class="btn-conflict-primary" id="patient-registro-tunnel-confirm">Agregar al censo</button></div></div>';
  document.body.appendChild(backdrop);
  document.getElementById("patient-registro-tunnel-cancel").onclick = function() {
    removeConfirmBackdrop();
    onOmit();
  };
  var stopEl = document.getElementById("patient-registro-tunnel-stop");
  if (stopEl && onStopBatch) {
    stopEl.onclick = function() {
      removeConfirmBackdrop();
      onStopBatch();
    };
  }
  document.getElementById("patient-registro-tunnel-confirm").onclick = function() {
    removeConfirmBackdrop();
    onConfirm(labPatient);
  };
}
function toastPatientAdmitted(silent) {
  if (silent) return;
  rt.showToast("Paciente agregado al censo \u2014 completa ubicaci\xF3n", "success");
}
async function admitPatientViaRegistroTunnel(registro, opts) {
  opts = opts || {};
  var reg = String(registro || "").trim();
  if (!reg) {
    rt.showToast("Indica el registro", "error");
    return null;
  }
  var existing = findPatientByRegistro(reg);
  if (existing) {
    rt.showToast("Reg. " + reg + " ya est\xE1 en el censo", "info");
    if (typeof opts.onAdmitted === "function") opts.onAdmitted(existing);
    return existing;
  }
  if (!window.electronAPI || typeof window.electronAPI.labRepoFetch !== "function") {
    rt.showToast("Consulta por registro solo en la app de escritorio", "warn");
    return null;
  }
  var range = defaultFetchRange();
  if (!range) {
    rt.showToast("No se pudo calcular el rango de fechas", "error");
    return null;
  }
  rt.showToast("Consultando repositorio\u2026", "info");
  try {
    var res = await window.electronAPI.labRepoFetch({
      registro: reg,
      desde: range.desde.toISOString(),
      hasta: range.hasta.toISOString()
    });
    var studies = res && res.studies || [];
    var labPatient = parseLabPatientFromStudies(studies, reg);
    if (!labPatient.expediente) labPatient.expediente = reg;
    return new Promise(function(resolve) {
      var settled = false;
      function finish(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }
      showRegistroTunnelConfirm(
        labPatient,
        studies.length,
        function(confirmedPatient) {
          var patient = commitStubPatientFromLab(confirmedPatient, { teamId: opts.teamId });
          if (patient) {
            toastPatientAdmitted(opts.silentToast);
            if (typeof opts.onAdmitted === "function") opts.onAdmitted(patient);
          }
          finish(patient);
        },
        opts.batch,
        function() {
          if (typeof opts.onCancel === "function") opts.onCancel();
          finish(null);
        },
        function() {
          if (typeof opts.onStopBatch === "function") opts.onStopBatch();
          if (typeof opts.onCancel === "function") opts.onCancel();
          finish(null);
        }
      );
    });
  } catch (e) {
    console.error(e);
    rt.showToast("Error al consultar el repositorio", "error");
    return null;
  }
}
async function admitPatientsViaRegistroTunnel(rawOrList, opts) {
  opts = opts || {};
  var list = Array.isArray(rawOrList) ? parseRegistrosFromBulkInput(
    rawOrList.map(function(r) {
      return String(r || "").trim();
    }).filter(Boolean).join("\n")
  ) : parseRegistrosFromBulkInput(rawOrList);
  if (!list.length) {
    rt.showToast("Indica al menos un registro", "error");
    return { admitted: [], omitted: [] };
  }
  if (list.length === 1) {
    var one = await admitPatientViaRegistroTunnel(list[0], opts);
    return {
      admitted: one ? [one] : [],
      omitted: one ? [] : [list[0]]
    };
  }
  var admitted = [];
  var omitted = [];
  var stopped = false;
  for (var i = 0; i < list.length && !stopped; i++) {
    var reg = list[i];
    var patient = await admitPatientViaRegistroTunnel(reg, {
      teamId: opts.teamId,
      batch: { index: i + 1, total: list.length },
      silentToast: true,
      onAdmitted: opts.onAdmitted,
      onStopBatch: function() {
        stopped = true;
      }
    });
    if (patient) admitted.push(patient);
    else omitted.push(reg);
  }
  if (admitted.length) {
    rt.showToast(
      admitted.length + " paciente" + (admitted.length === 1 ? "" : "s") + " agregado" + (admitted.length === 1 ? "" : "s") + " \u2014 completa ubicaci\xF3n",
      "success"
    );
  } else if (omitted.length) {
    rt.showToast("No se agregaron pacientes", "info");
  }
  return { admitted, omitted };
}

// public/js/features/patients-modal.mjs
function _prefillServicioForSala() {
  var srv = document.getElementById("m-servicio");
  if (srv && isModeSala(rt.getSettings()) && !srv.value) srv.value = getDefaultServicio(rt.getSettings());
}
function _lastAdmissionLocationFromPatients() {
  for (var i = getPatients().length - 1; i >= 0; i--) {
    var p = getPatients()[i];
    if (!p || p.isDemo) continue;
    var cuarto = String(p.cuarto || "").trim();
    var cama = String(p.cama || "").trim();
    if (cuarto && cama) return { cuarto, cama };
  }
  return { cuarto: "", cama: "" };
}
function _resolveAdmissionLocationDefaults(registro) {
  var tour = getTourDemoAdmitDefaults(registro);
  if (tour && tour.cuarto && tour.cama) return tour;
  var st = rt.getSettings();
  var cuarto = getDefaultCuarto(st);
  var cama = getDefaultCama(st);
  if (cuarto && cama) return { cuarto, cama };
  return _lastAdmissionLocationFromPatients();
}
function _prefillCuartoCamaForSala(registro) {
  if (!isModeSala(rt.getSettings())) return;
  var loc = _resolveAdmissionLocationDefaults(registro);
  var cuartoEl = document.getElementById("m-cuarto");
  var camaEl = document.getElementById("m-cama");
  if (cuartoEl && !String(cuartoEl.value || "").trim() && loc.cuarto) cuartoEl.value = loc.cuarto;
  if (camaEl && !String(camaEl.value || "").trim() && loc.cama) camaEl.value = loc.cama;
}
function _rememberAdmissionLocation(cuarto, cama) {
  if (!isModeSala(rt.getSettings())) return;
  var st = rt.getSettings();
  if (!st) return;
  st.defaultCuarto = cuarto;
  st.defaultCama = cama;
  try {
    storage.saveSettings(st);
  } catch (e) {
    console.error("_rememberAdmissionLocation:", e && e.message);
  }
}
function _focusPatientAdmissionField(isFromLab) {
  if (!isFromLab && modalRegistroTunnelMode) {
    focusRegistroModalFirst();
    return;
  }
  var fieldIds = isFromLab ? ["m-servicio", "m-cuarto", "m-cama"] : ["m-nombre-manual", "m-servicio", "m-cuarto", "m-cama"];
  for (var i = 0; i < fieldIds.length; i++) {
    var el = document.getElementById(fieldIds[i]);
    if (!el) continue;
    if (el.closest && el.closest('[style*="display: none"]')) continue;
    if (!String(el.value || "").trim()) {
      try {
        el.focus();
      } catch (_e) {
        void _e;
      }
      return;
    }
  }
  var cama = document.getElementById("m-cama");
  if (cama) {
    try {
      cama.focus();
    } catch (_e) {
      void _e;
    }
  }
}
function _syncPatientModalModeFields() {
  var sala = isModeSala(rt.getSettings());
  var areaGroup = document.getElementById("m-area-group");
  var servicioLabel = document.getElementById("m-servicio-label");
  var servicioInput = document.getElementById("m-servicio");
  if (areaGroup) areaGroup.style.display = sala ? "none" : "";
  if (servicioLabel) servicioLabel.textContent = sala ? "\xC1rea / Servicio *" : "Servicio *";
  if (servicioInput) servicioInput.placeholder = "ej. CIRUG\xCDA GENERAL";
}
function setElementDisplay2(el, visible) {
  if (!el) return;
  el.style.display = visible ? "" : "none";
}
function bedLocationGridEl() {
  var cuarto = document.getElementById("m-cuarto");
  if (!cuarto || !cuarto.parentElement) return null;
  return cuarto.parentElement.parentElement || null;
}
function applyRegistroTunnelFieldVisibility(on) {
  var prefilled = document.getElementById("modal-prefilled");
  var manualFull = document.getElementById("modal-manual-full");
  var nombreGroup = document.getElementById("m-nombre-manual");
  if (nombreGroup && nombreGroup.parentElement) {
    setElementDisplay2(nombreGroup.parentElement, !on);
  }
  var edadGrid = document.getElementById("m-edad-num-manual");
  if (edadGrid && edadGrid.parentElement && edadGrid.parentElement.parentElement) {
    setElementDisplay2(edadGrid.parentElement.parentElement, !on);
  }
  var registroWrap = document.getElementById("m-registro-manual-wrap");
  setElementDisplay2(registroWrap, on || !modalCompleteAdmissionPatientId);
  if (prefilled) prefilled.style.display = "none";
  if (manualFull) manualFull.style.display = on || modalCompleteAdmissionPatientId ? "block" : "none";
  ["m-area-group", "m-servicio-group", "m-sala-group"].forEach(function(id) {
    setElementDisplay2(document.getElementById(id), !on && !modalCompleteAdmissionPatientId);
  });
  setElementDisplay2(bedLocationGridEl(), !on && modalCompleteAdmissionPatientId);
}
function applyRegistroTunnelSaveButtonText(on) {
  var saveBtn = document.querySelector("#modal .btn-save");
  if (!saveBtn) return;
  saveBtn.textContent = on ? "Buscar registros" : modalCompleteAdmissionPatientId ? "Guardar" : "Agregar Paciente";
}
function applyRegistroTunnelLabels(on) {
  var regLabel = document.getElementById("m-registro-manual-label");
  var regHint = document.getElementById("m-registro-manual-hint");
  setRegistroModalMultiMode(on);
  if (regLabel) regLabel.textContent = on ? "Registro(s)" : "Registro";
  setElementDisplay2(regHint, on);
}
function setModalRegistroTunnelMode(on) {
  modalRegistroTunnelMode = !!on;
  if (on) modalCompleteAdmissionPatientId = null;
  applyRegistroTunnelFieldVisibility(on);
  applyRegistroTunnelSaveButtonText(on);
  applyRegistroTunnelLabels(on);
  if (!on && !modalCompleteAdmissionPatientId) _syncPatientModalModeFields();
}
var modalCompleteAdmissionPatientId = null;
function hideCompleteAdmissionManualFields() {
  var prefilled = document.getElementById("modal-prefilled");
  var manualFull = document.getElementById("modal-manual-full");
  if (prefilled) prefilled.style.display = "none";
  if (manualFull) manualFull.style.display = "none";
  var nombreGroup = document.getElementById("m-nombre-manual");
  if (nombreGroup && nombreGroup.parentElement) setElementDisplay2(nombreGroup.parentElement, false);
  var edadGrid = document.getElementById("m-edad-num-manual");
  if (edadGrid && edadGrid.parentElement && edadGrid.parentElement.parentElement) {
    setElementDisplay2(edadGrid.parentElement.parentElement, false);
  }
  var registroWrap = document.getElementById("m-registro-manual-wrap");
  setElementDisplay2(registroWrap, false);
}
function applyCompleteAdmissionFieldVisibility(on) {
  ["m-area-group", "m-servicio-group", "m-sala-group"].forEach(function(id) {
    setElementDisplay2(document.getElementById(id), on);
  });
  setElementDisplay2(bedLocationGridEl(), on);
  var saveBtn = document.querySelector("#modal .btn-save");
  if (saveBtn) saveBtn.textContent = on ? "Guardar ubicaci\xF3n" : "Agregar Paciente";
}
function fillCompleteAdmissionLocationInputs(patient) {
  var areaEl = document.getElementById("m-area");
  var servicioEl = document.getElementById("m-servicio");
  var cuartoEl = document.getElementById("m-cuarto");
  var camaEl = document.getElementById("m-cama");
  if (areaEl) areaEl.value = String(patient.area || "");
  if (servicioEl) servicioEl.value = String(patient.servicio || "");
  if (cuartoEl) cuartoEl.value = String(patient.cuarto || "");
  if (camaEl) camaEl.value = String(patient.cama || "");
}
function prefillCompleteAdmissionPatientFields(patient) {
  fillCompleteAdmissionLocationInputs(patient);
  if (!String(patient.servicio || "").trim()) _prefillServicioForSala();
  if (!String(patient.cuarto || "").trim() || !String(patient.cama || "").trim()) {
    _prefillCuartoCamaForSala(patient.registro || "");
  }
}
function setModalCompleteAdmissionMode(on, patient) {
  if (!on) {
    modalCompleteAdmissionPatientId = null;
    return;
  }
  modalCompleteAdmissionPatientId = patient && patient.id ? String(patient.id) : null;
  modalRegistroTunnelMode = false;
  hideCompleteAdmissionManualFields();
  applyCompleteAdmissionFieldVisibility(on);
  if (on) _syncPatientModalModeFields();
  if (on && patient) prefillCompleteAdmissionPatientFields(patient);
}
function openCompleteAdmissionModal(patientId) {
  var patient = getPatients().find(function(p) {
    return p && String(p.id) === String(patientId);
  });
  if (!patient) return;
  document.getElementById("modal-title").textContent = "Completar ingreso";
  setModalCompleteAdmissionMode(true, patient);
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  setElementDisplay2(document.getElementById("m-sala-group"), false);
  prepareModalBackdropOpen(document.getElementById("modal"));
  setTimeout(function() {
    _focusPatientAdmissionField(true);
  }, 120);
}
function openAddModal() {
  document.getElementById("modal-title").textContent = "Agregar por registro";
  ["nombre-manual", "area", "servicio", "cuarto", "cama"].forEach(function(f) {
    var el = document.getElementById("m-" + f);
    if (el) el.value = "";
  });
  initRegistroModalRows([""]);
  var edadNumManual = document.getElementById("m-edad-num-manual");
  var edadUnitManual = document.getElementById("m-edad-unit-manual");
  if (edadNumManual) edadNumManual.value = "";
  if (edadUnitManual) edadUnitManual.value = "a\xF1os";
  document.getElementById("m-sexo").value = "F";
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  setModalRegistroTunnelMode(true);
  prepareModalBackdropOpen(document.getElementById("modal"));
  setTimeout(function() {
    focusRegistroModalFirst();
  }, 120);
}
function openAddModalFullManual() {
  document.getElementById("modal-title").textContent = "Nuevo Paciente";
  modalCompleteAdmissionPatientId = null;
  setModalRegistroTunnelMode(false);
  setModalCompleteAdmissionMode(false, null);
  document.getElementById("modal-prefilled").style.display = "none";
  document.getElementById("modal-manual-full").style.display = "block";
  ["nombre-manual", "area", "servicio", "cuarto", "cama"].forEach(function(f) {
    var el = document.getElementById("m-" + f);
    if (el) el.value = "";
  });
  initRegistroModalRows([""]);
  var edadNumManual = document.getElementById("m-edad-num-manual");
  var edadUnitManual = document.getElementById("m-edad-unit-manual");
  if (edadNumManual) edadNumManual.value = "";
  if (edadUnitManual) edadUnitManual.value = "a\xF1os";
  document.getElementById("m-sexo").value = "F";
  _syncPatientModalModeFields();
  _prefillServicioForSala();
  _prefillCuartoCamaForSala();
  syncPatientRegistrationTeamSelect();
  syncPatientRegistrationSalaSelect();
  wirePatientRegistrationSalaControls();
  prepareModalBackdropOpen(document.getElementById("modal"));
  setTimeout(function() {
    _focusPatientAdmissionField(false);
  }, 120);
}
var pendingAddPatientSavedCallback = null;
var pendingAddPatientFromBulkPreview = false;
var modalRegistroTunnelMode = false;
function syncPendingToCommit() {
  setPendingAddPatientSavedCallback(pendingAddPatientSavedCallback);
  setPendingAddPatientFromBulkPreview(pendingAddPatientFromBulkPreview);
}
function syncPendingCallbacksFromModal(opts) {
  pendingAddPatientSavedCallback = opts && typeof opts.onSaved === "function" ? opts.onSaved : null;
  pendingAddPatientFromBulkPreview = !!(opts && opts.fromBulkPreview);
  syncPendingToCommit();
}
function openAddModalFromLabPatientData(p, opts) {
  if (!p) {
    openAddModal();
    return;
  }
  var registro = String(p.expediente || p.registro || "").trim();
  syncPendingCallbacksFromModal(opts);
  suspendLabBulkPreviewModalIfNeeded(opts);
  void admitPatientViaRegistroTunnel(registro, {
    onAdmitted: function(patient) {
      var onSaved = pendingAddPatientSavedCallback;
      pendingAddPatientSavedCallback = null;
      pendingAddPatientFromBulkPreview = false;
      clearPendingAddPatientCallbacks();
      if (onSaved) {
        try {
          onSaved(patient);
        } catch (e) {
          console.error(e);
        }
      }
    },
    onCancel: function() {
      if (getPendingAddPatientFromBulkPreview()) resumeLabBulkPreviewModalIfSuspended();
    }
  });
}
function suspendLabBulkPreviewModalIfNeeded(opts) {
  if (opts && opts.fromBulkPreview) suspendLabBulkPreviewModal();
}
function openAddModalFromLab() {
  var lab = rt.getActiveLab && rt.getActiveLab();
  if (!lab) {
    openAddModal();
    return;
  }
  openAddModalFromLabPatientData(lab.patient);
}
function openAddModalFromLabPatient(patient, opts) {
  openAddModalFromLabPatientData(patient, opts);
}
function closeModal() {
  var wasBulkPreview = getPendingAddPatientFromBulkPreview();
  pendingAddPatientSavedCallback = null;
  pendingAddPatientFromBulkPreview = false;
  modalRegistroTunnelMode = false;
  modalCompleteAdmissionPatientId = null;
  clearPendingAddPatientCallbacks();
  closeModalAnimated(document.getElementById("modal"), function() {
    if (wasBulkPreview) resumeLabBulkPreviewModalIfSuspended();
  });
}
function confirmCloseAddPatientModal() {
  var hasData = ["m-area", "m-servicio", "m-cuarto", "m-cama"].some(function(id) {
    var el = document.getElementById(id);
    return el && el.value.trim();
  });
  if (hasData) {
    void openConfirm({
      weight: "consequence",
      title: "\xBFCerrar sin guardar?",
      confirmLabel: "Cerrar sin guardar",
      cancelLabel: "Seguir editando",
      onConfirm: closeModal
    });
    return false;
  }
  return true;
}
function saveCompleteAdmissionModal() {
  var patientId = modalCompleteAdmissionPatientId;
  if (!patientId) return false;
  var patient = getPatients().find(function(p) {
    return p && String(p.id) === String(patientId);
  });
  if (!patient) return false;
  var loc = readPatientLocationFields(rt.getSettings());
  if (!validatePatientLocationFields(loc, true)) return false;
  _rememberAdmissionLocation(loc.cuarto, loc.cama);
  patient.area = loc.area;
  patient.servicio = loc.servicio;
  patient.cuarto = loc.cuarto;
  patient.cama = loc.cama;
  patient.lanUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
  persistClinicalState();
  void assignPatientToTeamClinical(patient.id, readPatientRegistrationTeamId()).then(function() {
    patientsBridge.renderPatientList();
    rt.showToast("Ubicaci\xF3n guardada", "success");
  });
  modalCompleteAdmissionPatientId = null;
  closeModalAnimated(document.getElementById("modal"));
  return true;
}
function savePatient() {
  if (modalCompleteAdmissionPatientId) {
    saveCompleteAdmissionModal();
    return;
  }
  if (modalRegistroTunnelMode) {
    var registros = collectRegistroModalRegistros();
    if (!registros.length) {
      rt.showToast("Indica el registro", "error");
      return;
    }
    var registrationTeamId = readPatientRegistrationTeamId();
    closeModalAnimated(document.getElementById("modal"));
    modalRegistroTunnelMode = false;
    void admitPatientsViaRegistroTunnel(registros, { teamId: registrationTeamId });
    return;
  }
  var isFromLab = document.getElementById("modal-prefilled").style.display !== "none";
  var fields = readPatientModalFields(isFromLab);
  var v = validatePatientForSave(fields);
  if (!v.ok) {
    rt.showToast(v.error, "error");
    shakePatientFieldsForError(v.error, isFromLab);
    return;
  }
  var ageStr = validatePatientAge(fields.edadNum, isFromLab);
  if (!ageStr) return;
  var edad = ageStr + (fields.edadUnit && fields.edadUnit !== "a\xF1os" ? " " + fields.edadUnit : "");
  var loc = readPatientLocationFields(rt.getSettings());
  if (!validatePatientLocationFields(loc, isFromLab)) return;
  _rememberAdmissionLocation(loc.cuarto, loc.cama);
  var commit = function() {
    var dup = findDuplicatePatient(fields.nombre, fields.registro);
    if (dup) {
      showDuplicateWarning(dup, function() {
        commitPatientFromModal(
          fields.nombre,
          fields.registro,
          edad,
          fields.sexo,
          loc.area,
          loc.servicio,
          loc.cuarto,
          loc.cama,
          isFromLab
        );
      });
      return;
    }
    commitPatientFromModal(
      fields.nombre,
      fields.registro,
      edad,
      fields.sexo,
      loc.area,
      loc.servicio,
      loc.cuarto,
      loc.cama,
      isFromLab
    );
  };
  if (v.warning === "missing_expediente" && !isFromLab) {
    showExpedienteAdvice(commit);
    return;
  }
  commit();
}
function initPatientModalEnterSave() {
  var modal = document.getElementById("modal");
  if (!modal) return;
  modal.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "SELECT") savePatient();
  });
}
function focusPatientSearchInput() {
  var el = document.getElementById("patient-search");
  if (!el) return;
  try {
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch {
    try {
      el.focus();
    } catch (_e) {
      void _e;
    }
  }
}

export {
  isPatientBulkSelectMode,
  getPatientBulkSelectedIds,
  getPatientBulkSelectedCount,
  togglePatientBulkSelectMode,
  togglePatientBulkSelected,
  exitPatientBulkSelectMode,
  getConsultInfo,
  setConsultInfo,
  renderConsultBandHtml,
  canDeletePatientChart,
  renderPatientCardHtml,
  renderPinnedSectionLabelHtml,
  renderActiveSectionLabelHtml,
  renderArchivedToggleHtml,
  patientCardIdFromEvent,
  shouldHandleTouchPointerUp,
  patientRegistroModalWindowHandlers,
  openCompleteAdmissionModal,
  openAddModal,
  openAddModalFullManual,
  openAddModalFromLab,
  openAddModalFromLabPatient,
  closeModal,
  confirmCloseAddPatientModal,
  savePatient,
  initPatientModalEnterSave,
  focusPatientSearchInput
};
//# sourceMappingURL=/js/chunks/chunk-4VMY6FV6.js.map
