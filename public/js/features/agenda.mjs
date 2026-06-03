// Built from app.js refactor — Agenda semanal de procedimientos + modal editor
import { storage } from "../storage.js";
import {
  mondayStartLocal,
  addDaysLocal,
  weekBoundsFromMonday,
  clipEventToDayColumn,
  assignLanesByInterval,
  AGENDA_DISPLAY_FIRST_HOUR,
  AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE,
  VISUAL_DURATION_MS,
} from "../procedure-agenda-week.mjs";
import { patients } from "../app-state.mjs";
import { getProcedureAgendaRowPx, isPaseMode } from "./chrome.mjs";
import { emitLiveSyncAgendaUpsert, emitLiveSyncAgendaDelete } from "./lan-sync.mjs";
import { mountRpcDatetimeInput } from "../rpc-date-picker.mjs";

let rt = {
  getActiveId() {
    return null;
  },
  showToast() {},
  renderPaseBoard() {},
};

export function registerProcedureAgendaRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(rt, ctx);
}

/** @type {number} -1 pasado, 0 actual, +1 siguiente (spec agenda semanal) */
var procedureAgendaWeekOffset = 0;

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function agendaEligiblePatients() {
  return patients.filter(function (p) {
    if (!p) return false;
    if (p.isDemo) return false;
    if (String(p.id).indexOf("demo-") === 0) return false;
    return true;
  });
}

function paIsoToDatetimeLocalValue(isoStr) {
  var d = new Date(String(isoStr || "").trim());
  if (isNaN(d.getTime())) return "";
  var pad = function (x) {
    return String(x).padStart(2, "0");
  };
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

function paParseDatetimeLocalValue(s) {
  var v = String(s || "").trim();
  if (!v) return null;
  var d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function getProcedureAgendaMondayAnchor() {
  var base = mondayStartLocal(new Date());
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
    var a =
      monday.toLocaleDateString("es", oWd).replace(".", "") +
      " " +
      monday.toLocaleDateString("es", oDay) +
      " " +
      monday.toLocaleDateString("es", oMon);
    var b =
      sun.toLocaleDateString("es", oWd).replace(".", "") +
      " " +
      sun.toLocaleDateString("es", oDay) +
      " " +
      sun.toLocaleDateString("es", oMon) +
      " " +
      sun.getFullYear();
    return a.charAt(0).toUpperCase() + a.slice(1) + " — " + b;
  } catch (_e) {
    return "";
  }
}

function syncProcedureAgendaNavButtons() {
  var prevBtn = document.getElementById("procedure-agenda-prev");
  var nextBtn = document.getElementById("procedure-agenda-next");
  if (prevBtn) prevBtn.disabled = procedureAgendaWeekOffset <= -1;
  if (nextBtn) nextBtn.disabled = procedureAgendaWeekOffset >= 1;
}

export function navigateProcedureAgendaWeek(delta) {
  procedureAgendaWeekOffset = Math.max(-1, Math.min(1, procedureAgendaWeekOffset + delta));
  renderProcedureAgendaPanel();
}

export function renderProcedureAgendaPanel() {
  var mount = document.getElementById("procedure-agenda-grid-mount");
  var rangeEl = document.getElementById("procedure-agenda-range");
  if (!mount || !rangeEl) return;
  syncProcedureAgendaNavButtons();
  var monday = getProcedureAgendaMondayAnchor();
  rangeEl.textContent = formatProcedureAgendaRangeLabel(monday);
  var week = weekBoundsFromMonday(monday);
  var nh = AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE - AGENDA_DISPLAY_FIRST_HOUR;
  var agendaRowPx = getProcedureAgendaRowPx();

  var elig = agendaEligiblePatients();
  var pmap = {};
  elig.forEach(function (p) {
    pmap[String(p.id)] = String(p.nombre || "").trim();
  });

  var newBtn = document.getElementById("procedure-agenda-new");
  if (newBtn) newBtn.disabled = elig.length === 0;

  var board = document.createElement("div");
  var head = document.createElement("div");
  head.className = "rpc-proc-agenda-board-head";
  var headSpacer = document.createElement("div");
  headSpacer.className = "rpc-proc-agenda-head-spacer";
  head.appendChild(headSpacer);

  var iDay;
  var colDate;
  for (iDay = 0; iDay < 7; iDay += 1) {
    colDate = addDaysLocal(monday, iDay);
    var hc = document.createElement("div");
    hc.className = "rpc-proc-agenda-head-cell";
    var wd = String(colDate.toLocaleDateString("es", { weekday: "short" })).replace(/\.$/, "");
    var dm = String(colDate.toLocaleDateString("es", { day: "numeric", month: "short" })).replace(
      ".",
      ""
    );
    wd = wd.charAt(0).toUpperCase() + wd.slice(1);
    dm = dm.charAt(0).toUpperCase() + dm.slice(1);
    hc.innerHTML = "<span>" + esc(wd) + "</span><strong>" + esc(dm) + "</strong>";
    head.appendChild(hc);
  }
  board.appendChild(head);

  var bodyRow = document.createElement("div");
  bodyRow.className = "rpc-proc-agenda-board-body";

  var timesCol = document.createElement("div");
  timesCol.className = "rpc-proc-agenda-times-col";
  for (var h = AGENDA_DISPLAY_FIRST_HOUR; h < AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE; h += 1) {
    var tsl = document.createElement("div");
    tsl.className = "rpc-proc-agenda-time-slot";
    tsl.style.height = agendaRowPx + "px";
    tsl.textContent = String(h).padStart(2, "0") + ":00";
    timesCol.appendChild(tsl);
  }
  bodyRow.appendChild(timesCol);

  var clipsByDay = [[], [], [], [], [], [], []];

  storage.getScheduledProcedures().forEach(function (ev) {
    var evtMs = Date.parse(ev.start);
    if (!Number.isFinite(evtMs)) return;
    if (evtMs >= week.endExclusive.getTime()) return;
    var evEndMs = evtMs + VISUAL_DURATION_MS;
    if (evEndMs <= week.start.getTime()) return;
    if (String(ev.patientId).indexOf("demo-") === 0) return;

    var patientLabel = pmap[ev.patientId] ? pmap[ev.patientId] : "Paciente desconocido";

    for (iDay = 0; iDay < 7; iDay += 1) {
      colDate = addDaysLocal(monday, iDay);
      colDate.setHours(0, 0, 0, 0);
      var clip = clipEventToDayColumn(evtMs, colDate.getTime());
      if (!clip) continue;
      clipsByDay[iDay].push({
        ev: ev,
        clip: clip,
        patientLabel: patientLabel,
      });
    }
  });

  for (iDay = 0; iDay < 7; iDay += 1) {
    colDate = addDaysLocal(monday, iDay);
    colDate.setHours(0, 0, 0, 0);
    var dayCol = document.createElement("div");
    dayCol.className = "rpc-proc-agenda-day-col-wrap";
    dayCol.style.height = nh * agendaRowPx + "px";

    var hl;
    for (h = AGENDA_DISPLAY_FIRST_HOUR; h < AGENDA_DISPLAY_LAST_HOUR_EXCLUSIVE; h += 1) {
      hl = document.createElement("div");
      hl.className = "rpc-proc-agenda-hour-line";
      hl.style.height = agendaRowPx + "px";
      dayCol.appendChild(hl);
    }

    var intervals = clipsByDay[iDay].map(function (x) {
      return { id: x.ev.id, topMs: x.clip.topMs, botMs: x.clip.botMs };
    });
    var laneById =
      intervals.length === 0 ? new Map() : assignLanesByInterval(intervals.slice());
    var laneCount = 1;
    if (laneById.size > 0) {
      laneById.forEach(function (ln) {
        laneCount = Math.max(laneCount, ln + 1);
      });
    }

    clipsByDay[iDay].forEach(function (cell) {
      var clip = cell.clip;
      var ev = cell.ev;
      var visStartMs = clip.visStartMs;
      var blockTopPx = ((clip.topMs - visStartMs) / (60 * 60 * 1000)) * agendaRowPx;
      var blockHtPx = Math.max(((clip.botMs - clip.topMs) / (60 * 60 * 1000)) * agendaRowPx, 18);

      var lane = laneById.get(ev.id) || 0;
      var lcLane = laneCount < 1 ? 1 : laneCount;
      var pctEach = 100 / lcLane;
      var startClock = String(
        new Date(ev.start).toLocaleTimeString("es", {
          hour: "2-digit",
          minute: "2-digit",
        })
      ).replace(".", "");

      var blk = document.createElement("button");
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
      blk.setAttribute(
        "title",
        (ev.procedure || "") + " · " + (ev.location || "") + " · " + cell.patientLabel
      );
      blk.setAttribute("aria-label", "Editar procedimiento para " + cell.patientLabel);
      if (!(ev.materialApproved && ev.anesthesiaScheduled)) blk.classList.add("rpc-proc-flag");
      blk.innerHTML =
        '<div class="rpc-proc-name">' +
        esc(String(ev.procedure || "")) +
        "</div>" +
        '<div class="rpc-proc-sub">' +
        esc(String(startClock + " · " + (ev.location || ""))) +
        "</div>" +
        '<div class="rpc-proc-pat">' +
        esc(String(cell.patientLabel)) +
        "</div>";
      blk.addEventListener("click", function (e) {
        e.preventDefault();
        openProcedureAgendaModal(ev.id);
      });
      dayCol.appendChild(blk);
    });

    bodyRow.appendChild(dayCol);
  }

  board.appendChild(bodyRow);

  mount.innerHTML = "";
  mount.appendChild(board);
  if (isPaseMode()) rt.renderPaseBoard();
}

export function openProcedureAgendaModal(editEventId) {
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
    elig.forEach(function (p) {
      var opt = document.createElement("option");
      opt.value = String(p.id);
      opt.textContent = String(p.nombre || p.id);
      sel.appendChild(opt);
    });
  }

  if (delBtn) delBtn.style.display = editEventId ? "inline-flex" : "none";

  var found;
  if (editEventId) {
    found = storage
      .getScheduledProcedures()
      .filter(function (e) {
        return e.id === editEventId;
      })[0];
    if (found && sel) {
      sel.value = String(found.patientId);
      if (sel.value !== String(found.patientId))
        sel.appendChild(new Option(found.patientId, found.patientId));
      sel.value = String(found.patientId);
    }
    if (found) {
      document.getElementById("pa-procedure").value = found.procedure || "";
      document.getElementById("pa-location").value = found.location || "";
      document.getElementById("pa-start").value = paIsoToDatetimeLocalValue(found.start);
      document.getElementById("pa-material").checked = !!found.materialApproved;
      document.getElementById("pa-anesthesia").checked = !!found.anesthesiaScheduled;
    }
  } else {
    var aid = rt.getActiveId();
    if (sel && elig.length && aid && elig.some(function (p) { return p.id === aid; })) {
      sel.value = String(aid);
    } else if (sel && elig[0]) sel.value = elig[0].id;
    document.getElementById("pa-procedure").value = "";
    document.getElementById("pa-location").value = "";
    var now = new Date();
    document.getElementById("pa-start").value = paIsoToDatetimeLocalValue(now.toISOString());
    document.getElementById("pa-material").checked = false;
    document.getElementById("pa-anesthesia").checked = false;
  }

  var paStart = document.getElementById("pa-start");
  if (paStart) {
    mountRpcDatetimeInput(paStart);
    paStart.dispatchEvent(new CustomEvent("rpc-datetime-sync"));
  }

  bd.classList.add("open");
  bd.setAttribute("aria-hidden", "false");
}

export function closeProcedureAgendaModal() {
  var bd = document.getElementById("procedure-agenda-modal");
  if (!bd) return;
  bd.classList.remove("open");
  bd.setAttribute("aria-hidden", "true");
}

export function saveProcedureAgendaFromModal() {
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

  var editId = (document.getElementById("pa-edit-id").value || "").trim();
  var patientId = String(document.getElementById("pa-patient").value || "").trim();
  var procedure = String(document.getElementById("pa-procedure").value || "").trim();
  var location = String(document.getElementById("pa-location").value || "").trim();
  var sd = paParseDatetimeLocalValue(document.getElementById("pa-start").value);
  var elig = agendaEligiblePatients();
  if (!elig.length) {
    showPaErr("No hay pacientes reales para agendar (agrega un paciente desde la barra lateral).");
    return;
  }
  if (!patientId || !elig.some(function (p) { return String(p.id) === patientId; })) {
    showPaErr("Elige un paciente válido de la lista.");
    return;
  }
  if (!procedure) {
    showPaErr("Indica el procedimiento.");
    return;
  }
  if (!location) {
    showPaErr("Indica el lugar.");
    return;
  }
  if (!sd) {
    showPaErr("Fecha u hora de inicio inválidas.");
    return;
  }

  var nowIso = new Date().toISOString();
  var arr = storage.getScheduledProcedures();
  var prev = editId ? arr.filter(function (e) { return e.id === editId; })[0] : null;
  var eventObj = {
    id:
      editId ||
      "proc-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9),
    patientId: patientId,
    procedure: procedure,
    location: location,
    materialApproved: !!document.getElementById("pa-material").checked,
    anesthesiaScheduled: !!document.getElementById("pa-anesthesia").checked,
    start: sd.toISOString(),
    createdAt: prev && prev.createdAt ? prev.createdAt : nowIso,
    updatedAt: nowIso,
  };

  var next;
  if (editId) {
    next = arr.map(function (e) {
      return e.id === editId ? eventObj : e;
    });
    if (!next.some(function (e) { return e.id === editId; })) next.push(eventObj);
  } else {
    next = arr.concat([eventObj]);
  }
  storage.saveScheduledProcedures(next);
  emitLiveSyncAgendaUpsert(eventObj);
  closeProcedureAgendaModal();
  rt.showToast("Procedimiento guardado", "success");
  renderProcedureAgendaPanel();
}

export function deleteProcedureAgendaFromModal() {
  var editId = (document.getElementById("pa-edit-id").value || "").trim();
  if (!editId) return;
  if (
    !confirm(
      "¿Eliminar este procedimiento de la agenda? No se puede deshacer desde aquí."
    )
  )
    return;
  var delAt = new Date().toISOString();
  var arr = storage.getScheduledProcedures().filter(function (e) {
    return e.id !== editId;
  });
  storage.saveScheduledProcedures(arr);
  emitLiveSyncAgendaDelete(editId, delAt);
  closeProcedureAgendaModal();
  rt.showToast("Eliminado de la agenda", "success");
  renderProcedureAgendaPanel();
}

export const windowHandlers = {
  navigateProcedureAgendaWeek,
  openProcedureAgendaModal,
  closeProcedureAgendaModal,
  saveProcedureAgendaFromModal,
  deleteProcedureAgendaFromModal,
};
