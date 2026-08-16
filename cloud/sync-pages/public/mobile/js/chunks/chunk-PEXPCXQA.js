import {
  mountRpcDatetimeInput
} from "/mobile/js/chunks/chunk-BUGU4R5K.js";
import {
  getProcedureAgendaRowPx,
  isPaseMode
} from "/mobile/js/chunks/chunk-4SMSHN53.js";
import {
  enqueueCloudAgendaDelete,
  enqueueCloudAgendaUpsert
} from "/mobile/js/chunks/chunk-P7EHNYUF.js";
import {
  getPatients
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import {
  storage
} from "/mobile/js/chunks/chunk-5RUR3UQW.js";
import {
  esc
} from "/mobile/js/chunks/chunk-64IP3Y67.js";
import {
  closeModalAnimated
} from "/mobile/js/chunks/chunk-KZT7D6I2.js";

// public/js/procedure-agenda-week.mjs
var AGENDA_DISPLAY_FIRST_HOUR = 6;
var AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE = 22;
var VISUAL_DURATION_MS = 2 * 60 * 60 * 1e3;
function mondayStartLocal(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = x.getDay();
  const delta = wd === 0 ? -6 : 1 - wd;
  x.setDate(x.getDate() + delta);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDaysLocal(d, n) {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}
function weekBoundsFromMonday(monday) {
  const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 7);
  return { start, endExclusive: end };
}
function clipEventToDayColumn(evtStartMs, columnMidnightMs) {
  const col = new Date(columnMidnightMs);
  const dayEnd = new Date(col.getFullYear(), col.getMonth(), col.getDate() + 1, 0, 0, 0, 0).getTime();
  const evtEndMs = evtStartMs + VISUAL_DURATION_MS;
  if (evtEndMs <= col.getTime() || evtStartMs >= dayEnd) return null;
  const visStartMs = new Date(
    col.getFullYear(),
    col.getMonth(),
    col.getDate(),
    AGENDA_DISPLAY_FIRST_HOUR,
    0,
    0,
    0
  ).getTime();
  const visEndMs = new Date(
    col.getFullYear(),
    col.getMonth(),
    col.getDate(),
    AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE,
    0,
    0,
    0
  ).getTime();
  const topMs = Math.max(evtStartMs, col.getTime(), visStartMs);
  const botMs = Math.min(evtEndMs, dayEnd, visEndMs);
  if (botMs <= topMs) return null;
  return { topMs, botMs, visStartMs };
}
function assignLanesByInterval(items) {
  const sorted = items.slice().sort(function(a, b) {
    if (a.topMs !== b.topMs) return a.topMs - b.topMs;
    return String(a.id).localeCompare(String(b.id));
  });
  const laneEnds = [];
  const laneById = /* @__PURE__ */ new Map();
  sorted.forEach(function(it) {
    var lane = -1;
    for (var L = 0; L < laneEnds.length; L += 1) {
      if (laneEnds[L] <= it.topMs) {
        lane = L;
        break;
      }
    }
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(it.botMs);
    } else {
      laneEnds[lane] = it.botMs;
    }
    laneById.set(it.id, lane);
  });
  return laneById;
}

// public/js/features/agenda-panel-render.mjs
function buildAgendaBoardHead(monday) {
  const head = document.createElement("div");
  head.className = "rpc-proc-agenda-board-head";
  const headSpacer = document.createElement("div");
  headSpacer.className = "rpc-proc-agenda-head-spacer";
  head.appendChild(headSpacer);
  for (let iDay = 0; iDay < 7; iDay += 1) {
    const colDate = addDaysLocal(monday, iDay);
    const hc = document.createElement("div");
    hc.className = "rpc-proc-agenda-head-cell";
    let wd = String(colDate.toLocaleDateString("es", { weekday: "short" })).replace(/\.$/, "");
    let dm = String(colDate.toLocaleDateString("es", { day: "numeric", month: "short" })).replace(".", "");
    wd = wd.charAt(0).toUpperCase() + wd.slice(1);
    dm = dm.charAt(0).toUpperCase() + dm.slice(1);
    hc.innerHTML = "<span>" + esc(wd) + "</span><strong>" + esc(dm) + "</strong>";
    head.appendChild(hc);
  }
  return head;
}
function collectAgendaClipsByDay(monday, week, pmap) {
  const clipsByDay = [[], [], [], [], [], [], []];
  storage.getScheduledProcedures().forEach(function(ev) {
    const evtMs = Date.parse(ev.start);
    if (!Number.isFinite(evtMs)) return;
    if (evtMs >= week.endExclusive.getTime()) return;
    const evEndMs = evtMs + VISUAL_DURATION_MS;
    if (evEndMs <= week.start.getTime()) return;
    if (String(ev.patientId).indexOf("demo-") === 0) return;
    const patientLabel = pmap[ev.patientId] ? pmap[ev.patientId] : "Paciente desconocido";
    for (let iDay = 0; iDay < 7; iDay += 1) {
      const colDate = addDaysLocal(monday, iDay);
      colDate.setHours(0, 0, 0, 0);
      const clip = clipEventToDayColumn(evtMs, colDate.getTime());
      if (!clip) continue;
      clipsByDay[iDay].push({ ev, clip, patientLabel });
    }
  });
  return clipsByDay;
}
function buildAgendaDayColumn(iDay, monday, dayClips, onEdit) {
  const nh = AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE - AGENDA_DISPLAY_FIRST_HOUR;
  const agendaRowPx = getProcedureAgendaRowPx();
  const colDate = addDaysLocal(monday, iDay);
  colDate.setHours(0, 0, 0, 0);
  const dayCol = document.createElement("div");
  dayCol.className = "rpc-proc-agenda-day-col-wrap";
  dayCol.style.height = nh * agendaRowPx + "px";
  for (let h = AGENDA_DISPLAY_FIRST_HOUR; h < AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE; h += 1) {
    const hl = document.createElement("div");
    hl.className = "rpc-proc-agenda-hour-line";
    hl.style.height = agendaRowPx + "px";
    dayCol.appendChild(hl);
  }
  const intervals = dayClips.map(function(x) {
    return { id: x.ev.id, topMs: x.clip.topMs, botMs: x.clip.botMs };
  });
  const laneById = intervals.length === 0 ? /* @__PURE__ */ new Map() : assignLanesByInterval(intervals.slice());
  let laneCount = 1;
  laneById.forEach(function(ln) {
    laneCount = Math.max(laneCount, ln + 1);
  });
  dayClips.forEach(function(cell) {
    const clip = cell.clip;
    const ev = cell.ev;
    const visStartMs = clip.visStartMs;
    const blockTopPx = (clip.topMs - visStartMs) / (60 * 60 * 1e3) * agendaRowPx;
    const blockHtPx = Math.max((clip.botMs - clip.topMs) / (60 * 60 * 1e3) * agendaRowPx, 18);
    const lane = laneById.get(ev.id) || 0;
    const lcLane = laneCount < 1 ? 1 : laneCount;
    const pctEach = 100 / lcLane;
    const startClock = String(
      new Date(ev.start).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })
    ).replace(".", "");
    const blk = document.createElement("button");
    blk.type = "button";
    blk.className = "rpc-proc-agenda-block";
    blk.style.top = Math.max(0, blockTopPx) + "px";
    blk.style.height = blockHtPx + "px";
    if (lcLane <= 1) {
      blk.style.left = "3px";
      blk.style.width = "calc(100% - 6px)";
    } else {
      blk.style.left = "calc(" + lane * pctEach + "% + 3px)";
      blk.style.width = "calc(" + pctEach + "% - 10px)";
    }
    blk.setAttribute("title", (ev.procedure || "") + " \xB7 " + (ev.location || "") + " \xB7 " + cell.patientLabel);
    blk.setAttribute("aria-label", "Editar procedimiento para " + cell.patientLabel);
    if (!(ev.materialApproved && ev.anesthesiaScheduled)) blk.classList.add("rpc-proc-flag");
    blk.innerHTML = '<div class="rpc-proc-name">' + esc(String(ev.procedure || "")) + '</div><div class="rpc-proc-sub">' + esc(String(startClock + " \xB7 " + (ev.location || ""))) + '</div><div class="rpc-proc-pat">' + esc(String(cell.patientLabel)) + "</div>";
    blk.addEventListener("click", function(e) {
      e.preventDefault();
      onEdit(ev.id);
    });
    dayCol.appendChild(blk);
  });
  return dayCol;
}
function buildAgendaTimesColumn(_monday) {
  const agendaRowPx = getProcedureAgendaRowPx();
  const timesCol = document.createElement("div");
  timesCol.className = "rpc-proc-agenda-times-col";
  for (let h = AGENDA_DISPLAY_FIRST_HOUR; h < AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE; h += 1) {
    const tsl = document.createElement("div");
    tsl.className = "rpc-proc-agenda-time-slot";
    tsl.style.height = agendaRowPx + "px";
    tsl.textContent = String(h).padStart(2, "0") + ":00";
    timesCol.appendChild(tsl);
  }
  return timesCol;
}

// public/js/features/agenda-modal-helpers.mjs
function paIsoToDatetimeLocalValue(isoStr) {
  const d = new Date(String(isoStr || "").trim());
  if (isNaN(d.getTime())) return "";
  const pad = function(x) {
    return String(x).padStart(2, "0");
  };
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function paParseDatetimeLocalValue(s) {
  const v = String(s || "").trim();
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function fillProcedureAgendaModalForEdit(editEventId, _elig) {
  const found = storage.getScheduledProcedures().filter(function(e) {
    return e.id === editEventId;
  })[0];
  const sel = document.getElementById("pa-patient");
  if (found && sel) {
    sel.value = String(found.patientId);
    if (sel.value !== String(found.patientId)) {
      sel.appendChild(new Option(found.patientId, found.patientId));
    }
    sel.value = String(found.patientId);
  }
  if (!found) return;
  document.getElementById("pa-procedure").value = found.procedure || "";
  document.getElementById("pa-location").value = found.location || "";
  document.getElementById("pa-start").value = paIsoToDatetimeLocalValue(found.start);
  document.getElementById("pa-material").checked = !!found.materialApproved;
  document.getElementById("pa-anesthesia").checked = !!found.anesthesiaScheduled;
}
function fillProcedureAgendaModalForNew(elig, getActiveId) {
  const sel = document.getElementById("pa-patient");
  const aid = getActiveId();
  if (sel && elig.length && aid && elig.some(function(p) {
    return p.id === aid;
  })) {
    sel.value = String(aid);
  } else if (sel && elig[0]) {
    sel.value = elig[0].id;
  }
  document.getElementById("pa-procedure").value = "";
  document.getElementById("pa-location").value = "";
  document.getElementById("pa-start").value = paIsoToDatetimeLocalValue((/* @__PURE__ */ new Date()).toISOString());
  document.getElementById("pa-material").checked = false;
  document.getElementById("pa-anesthesia").checked = false;
}
function syncProcedureAgendaModalDatetime() {
  const paStart = document.getElementById("pa-start");
  if (!paStart) return;
  mountRpcDatetimeInput(paStart);
  paStart.dispatchEvent(new CustomEvent("rpc-datetime-sync"));
}
function validateProcedureAgendaForm(elig) {
  const editId = (document.getElementById("pa-edit-id").value || "").trim();
  const patientId = String(document.getElementById("pa-patient").value || "").trim();
  const procedure = String(document.getElementById("pa-procedure").value || "").trim();
  const location = String(document.getElementById("pa-location").value || "").trim();
  const sd = paParseDatetimeLocalValue(document.getElementById("pa-start").value);
  if (!elig.length) {
    return { ok: false, msg: "No hay pacientes reales para agendar (agrega un paciente desde la barra lateral)." };
  }
  if (!patientId || !elig.some(function(p) {
    return String(p.id) === patientId;
  })) {
    return { ok: false, msg: "Elige un paciente v\xE1lido de la lista." };
  }
  if (!procedure) return { ok: false, msg: "Indica el procedimiento." };
  if (!location) return { ok: false, msg: "Indica el lugar." };
  if (!sd) return { ok: false, msg: "Fecha u hora de inicio inv\xE1lidas." };
  return { ok: true, patientId, procedure, location, sd, editId };
}
function buildProcedureAgendaEvent(fields) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const arr = storage.getScheduledProcedures();
  const prev = fields.editId ? arr.filter(function(e) {
    return e.id === fields.editId;
  })[0] : null;
  return {
    id: fields.editId || "proc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9),
    patientId: fields.patientId,
    procedure: fields.procedure,
    location: fields.location,
    materialApproved: !!document.getElementById("pa-material").checked,
    anesthesiaScheduled: !!document.getElementById("pa-anesthesia").checked,
    start: fields.sd.toISOString(),
    createdAt: prev && prev.createdAt ? prev.createdAt : nowIso,
    updatedAt: nowIso
  };
}

// public/js/features/agenda.mjs
var rt = {
  getActiveId() {
    return null;
  },
  showToast() {
  },
  renderPaseBoard() {
  }
};
function registerProcedureAgendaRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}
var procedureAgendaWeekOffset = 0;
function agendaEligiblePatients() {
  return getPatients().filter(function(p) {
    if (!p) return false;
    if (p.isDemo) return false;
    if (String(p.id).indexOf("demo-") === 0) return false;
    return true;
  });
}
function getProcedureAgendaMondayAnchor() {
  var base = mondayStartLocal(/* @__PURE__ */ new Date());
  var dt = addDaysLocal(base, procedureAgendaWeekOffset * 7);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function formatProcedureAgendaRangeLabel(monday) {
  try {
    var sun = addDaysLocal(monday, 6);
    var oDay = { day: "numeric" };
    var oWd = { weekday: "short" };
    var oMon = { month: "short" };
    var a = monday.toLocaleDateString("es", oWd).replace(".", "") + " " + monday.toLocaleDateString("es", oDay) + " " + monday.toLocaleDateString("es", oMon);
    var b = sun.toLocaleDateString("es", oWd).replace(".", "") + " " + sun.toLocaleDateString("es", oDay) + " " + sun.toLocaleDateString("es", oMon) + " " + sun.getFullYear();
    return a.charAt(0).toUpperCase() + a.slice(1) + " \u2014 " + b;
  } catch {
    return "";
  }
}
function syncProcedureAgendaNavButtons() {
  var prevBtn = document.getElementById("procedure-agenda-prev");
  var nextBtn = document.getElementById("procedure-agenda-next");
  if (prevBtn) prevBtn.disabled = procedureAgendaWeekOffset <= -1;
  if (nextBtn) nextBtn.disabled = procedureAgendaWeekOffset >= 1;
}
function navigateProcedureAgendaWeek(delta) {
  procedureAgendaWeekOffset = Math.max(-1, Math.min(1, procedureAgendaWeekOffset + delta));
  renderProcedureAgendaPanel();
}
function resetProcedureAgendaWeek() {
  if (procedureAgendaWeekOffset === 0) return;
  procedureAgendaWeekOffset = 0;
  renderProcedureAgendaPanel();
}
function renderProcedureAgendaPanel() {
  var mount = document.getElementById("procedure-agenda-grid-mount");
  var rangeEl = document.getElementById("procedure-agenda-range");
  if (!mount || !rangeEl) return;
  syncProcedureAgendaNavButtons();
  var monday = getProcedureAgendaMondayAnchor();
  rangeEl.textContent = formatProcedureAgendaRangeLabel(monday);
  var week = weekBoundsFromMonday(monday);
  var elig = agendaEligiblePatients();
  var pmap = {};
  elig.forEach(function(p) {
    pmap[String(p.id)] = String(p.nombre || "").trim();
  });
  var newBtn = document.getElementById("procedure-agenda-new");
  if (newBtn) newBtn.disabled = elig.length === 0;
  var board = document.createElement("div");
  board.appendChild(buildAgendaBoardHead(monday));
  var bodyRow = document.createElement("div");
  bodyRow.className = "rpc-proc-agenda-board-body";
  bodyRow.appendChild(buildAgendaTimesColumn(monday));
  var clipsByDay = collectAgendaClipsByDay(monday, week, pmap);
  for (var iDay = 0; iDay < 7; iDay += 1) {
    bodyRow.appendChild(buildAgendaDayColumn(iDay, monday, clipsByDay[iDay], openProcedureAgendaModal));
  }
  board.appendChild(bodyRow);
  mount.innerHTML = "";
  mount.appendChild(board);
  if (isPaseMode()) rt.renderPaseBoard();
}
function openProcedureAgendaModal(editEventId) {
  var bd = document.getElementById("procedure-agenda-modal");
  if (!bd) return;
  var errEl = document.getElementById("pa-modal-error");
  var delBtn = document.getElementById("pa-btn-delete");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }
  document.getElementById("pa-edit-id").value = editEventId || "";
  var elig = agendaEligiblePatients();
  var sel = document.getElementById("pa-patient");
  if (sel) {
    sel.innerHTML = "";
    elig.forEach(function(p) {
      var opt = document.createElement("option");
      opt.value = String(p.id);
      opt.textContent = String(p.nombre || p.id);
      sel.appendChild(opt);
    });
  }
  if (delBtn) delBtn.style.display = editEventId ? "inline-flex" : "none";
  if (editEventId) fillProcedureAgendaModalForEdit(editEventId, elig);
  else fillProcedureAgendaModalForNew(elig, rt.getActiveId);
  syncProcedureAgendaModalDatetime();
  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
}
function closeProcedureAgendaModal() {
  var bd = document.getElementById("procedure-agenda-modal");
  if (!bd) return;
  closeModalAnimated(bd);
}
function saveProcedureAgendaFromModal() {
  var errEl = document.getElementById("pa-modal-error");
  function showPaErr(msg) {
    errEl.style.display = "block";
    errEl.textContent = msg;
    rt.showToast(msg, "error");
  }
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }
  var elig = agendaEligiblePatients();
  var validated = validateProcedureAgendaForm(elig);
  if (!validated.ok) {
    showPaErr(validated.msg);
    return;
  }
  var eventObj = buildProcedureAgendaEvent(validated);
  var arr = storage.getScheduledProcedures();
  var next;
  if (validated.editId) {
    next = arr.map(function(e) {
      return e.id === validated.editId ? eventObj : e;
    });
    if (!next.some(function(e) {
      return e.id === validated.editId;
    })) next.push(eventObj);
  } else {
    next = arr.concat([eventObj]);
  }
  storage.saveScheduledProcedures(next);
  enqueueCloudAgendaUpsert(eventObj);
  closeProcedureAgendaModal();
  rt.showToast("Procedimiento guardado", "success");
  renderProcedureAgendaPanel();
}
function deleteProcedureAgendaFromModal() {
  var editId = (document.getElementById("pa-edit-id").value || "").trim();
  if (!editId) return;
  if (!confirm(
    "\xBFEliminar este procedimiento de la agenda? No se puede deshacer desde aqu\xED."
  ))
    return;
  var delAt = (/* @__PURE__ */ new Date()).toISOString();
  var arr = storage.getScheduledProcedures().filter(function(e) {
    return e.id !== editId;
  });
  storage.saveScheduledProcedures(arr);
  enqueueCloudAgendaDelete(editId, delAt);
  closeProcedureAgendaModal();
  rt.showToast("Eliminado de la agenda", "success");
  renderProcedureAgendaPanel();
}
var windowHandlers = {
  navigateProcedureAgendaWeek,
  resetProcedureAgendaWeek,
  openProcedureAgendaModal,
  closeProcedureAgendaModal,
  saveProcedureAgendaFromModal,
  deleteProcedureAgendaFromModal
};

export {
  registerProcedureAgendaRuntime,
  navigateProcedureAgendaWeek,
  resetProcedureAgendaWeek,
  renderProcedureAgendaPanel,
  openProcedureAgendaModal,
  closeProcedureAgendaModal,
  saveProcedureAgendaFromModal,
  deleteProcedureAgendaFromModal,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-PEXPCXQA.js.map
