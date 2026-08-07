import {
  loadSettings
} from "/mobile/js/chunks/chunk-ATYYITK5.js";
import "/mobile/js/chunks/chunk-RU3FUJKX.js";
import "/mobile/js/chunks/chunk-V53FQ62F.js";
import "/mobile/js/chunks/chunk-SUGQA2SQ.js";
import {
  patientsVisibleInSidebar
} from "/mobile/js/chunks/chunk-22EGFI47.js";
import "/mobile/js/chunks/chunk-M6MLNBYK.js";
import "/mobile/js/chunks/chunk-6CNOONJK.js";
import "/mobile/js/chunks/chunk-L3CKDTC6.js";
import "/mobile/js/chunks/chunk-KZBMNVUA.js";
import "/mobile/js/chunks/chunk-NYBHLPTK.js";
import "/mobile/js/chunks/chunk-O6MGPFMZ.js";
import "/mobile/js/chunks/chunk-6IT4VYWH.js";
import "/mobile/js/chunks/chunk-ZZBRT7YV.js";
import "/mobile/js/chunks/chunk-XMYM463C.js";
import "/mobile/js/chunks/chunk-42YTZX7Z.js";
import "/mobile/js/chunks/chunk-UMBBYMHN.js";
import "/mobile/js/chunks/chunk-H7RKMMBY.js";
import "/mobile/js/chunks/chunk-GDLXCT65.js";
import "/mobile/js/chunks/chunk-74QUVIPX.js";
import "/mobile/js/chunks/chunk-F22TO3UT.js";
import "/mobile/js/chunks/chunk-GYM4L4N4.js";
import "/mobile/js/chunks/chunk-LZJH44EB.js";
import "/mobile/js/chunks/chunk-RL7MVLBF.js";
import "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-47DFSCNL.js";
import "/mobile/js/chunks/chunk-BYJGS6YL.js";
import "/mobile/js/chunks/chunk-ETN66DDX.js";
import "/mobile/js/chunks/chunk-RB43CK2I.js";
import "/mobile/js/chunks/chunk-ZOXS3A7B.js";
import "/mobile/js/chunks/chunk-C6UFSJCE.js";
import "/mobile/js/chunks/chunk-XGNJZCRR.js";
import "/mobile/js/chunks/chunk-7R6RY2VN.js";
import "/mobile/js/chunks/chunk-AZX47ZAL.js";
import {
  getClinicalScopeContextForEvaluate,
  isPatientAssignedToJoinedTeam,
  renderEventualidadesPanel
} from "/mobile/js/chunks/chunk-4RWHEAJO.js";
import "/mobile/js/chunks/chunk-T5MFACW3.js";
import "/mobile/js/chunks/chunk-L6DKKZAW.js";
import "/mobile/js/chunks/chunk-UYGGXIVE.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-3WHKYJ7V.js";
import "/mobile/js/chunks/chunk-4ZYP54QF.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-5OEZNMAY.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-WVWWVYPL.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-AUDHCP7J.js";
import {
  labHistory,
  normalizeFechaLabHistory,
  notes
} from "/mobile/js/chunks/chunk-2VPNV3XW.js";
import "/mobile/js/chunks/chunk-MWUHDPML.js";
import "/mobile/js/chunks/chunk-S2OQTBTO.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import {
  storage
} from "/mobile/js/chunks/chunk-IFN2KBEN.js";
import "/mobile/js/chunks/chunk-K4LYOQAP.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-FXT4EGAN.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-VFWQPPKQ.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-J2US57NE.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-TRTQ4CW2.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-LSPMPOB5.js";
import "/mobile/js/chunks/chunk-SWAB7HBB.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-SUI526FO.js";
import "/mobile/js/chunks/chunk-W6RRSTLS.js";
import "/mobile/js/chunks/chunk-CCQC427D.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-ZWVJD7AP.js";
import "/mobile/js/chunks/chunk-AETSFPDT.js";
import "/mobile/js/chunks/chunk-YYAEPGIH.js";
import "/mobile/js/chunks/chunk-2VO3CNBC.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/features/doc-queue-model.mjs
function formatLocalTodayFecha(d) {
  var date = d instanceof Date ? d : /* @__PURE__ */ new Date();
  var pad = function(n) {
    return String(n).padStart(2, "0");
  };
  return pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + "/" + date.getFullYear();
}
function countOpenTodos(todos) {
  var n = 0;
  (todos || []).forEach(function(t) {
    if (t && !t.completed) n += 1;
  });
  return n;
}
function hasLabSetsOnFecha(labSets, todayFecha, normalizeFecha) {
  var today = String(todayFecha || "").trim();
  if (!today) return false;
  var norm = typeof normalizeFecha === "function" ? normalizeFecha : function(raw) {
    return String(raw || "").trim();
  };
  return (labSets || []).some(function(set) {
    if (!set) return false;
    var f = norm(set.fecha) || String(set.fecha || "").trim();
    return f === today;
  });
}
function hasNewLabsNeedingDocs(note, labSets, todayFecha, normalizeFecha) {
  if (!hasLabSetsOnFecha(labSets, todayFecha, normalizeFecha)) return false;
  var estudios = String(note && note.estudios || "").trim();
  if (!estudios) return true;
  var noteFecha = String(note && note.fecha || "").trim();
  var norm = typeof normalizeFecha === "function" ? normalizeFecha : function(raw) {
    return String(raw || "").trim();
  };
  var noteNorm = norm(noteFecha) || noteFecha;
  return noteNorm !== String(todayFecha || "").trim();
}
function primaryCtaForReasons(reasons) {
  var hasLabs = (reasons || []).indexOf("labs") !== -1;
  var hasPend = (reasons || []).indexOf("pendientes") !== -1;
  if (hasLabs && hasPend) return "nota";
  if (hasLabs) return "labs";
  return "pendientes";
}
function docQueueStatusLine(reasons, openTodoCount) {
  var hasLabs = (reasons || []).indexOf("labs") !== -1;
  var hasPend = (reasons || []).indexOf("pendientes") !== -1;
  var n = Number(openTodoCount) || 0;
  if (hasLabs && hasPend) {
    return "Labs de hoy sin nota \xB7 " + n + " pendiente" + (n === 1 ? "" : "s") + " abierto" + (n === 1 ? "" : "s");
  }
  if (hasLabs) return "Labs de hoy \u2014 a\xFAn no est\xE1n en la nota";
  if (n === 1) return "1 pendiente abierto";
  return n + " pendientes abiertos";
}
function buildDocQueueRows(patients2, opts) {
  var o = opts || {};
  var todayFecha = String(o.todayFecha || formatLocalTodayFecha()).trim();
  var normalizeFecha = typeof o.normalizeFecha === "function" ? o.normalizeFecha : function(raw) {
    return String(raw || "").trim();
  };
  var labHistoryByPatient = o.labHistoryByPatient || {};
  var notesByPatient = o.notesByPatient || {};
  var todosByPatient = o.todosByPatient || {};
  var rows = [];
  (patients2 || []).forEach(function(p) {
    if (!p || p.id == null || !String(p.id)) return;
    var id = String(p.id);
    var openTodoCount = countOpenTodos(todosByPatient[id]);
    var reasons = [];
    if (hasNewLabsNeedingDocs(notesByPatient[id], labHistoryByPatient[id], todayFecha, normalizeFecha)) {
      reasons.push("labs");
    }
    if (openTodoCount > 0) reasons.push("pendientes");
    if (!reasons.length) return;
    rows.push({
      id,
      nombre: String(p.nombre || "").trim() || "Sin nombre",
      hint: bedHint(p),
      reasons,
      openTodoCount,
      primaryCta: primaryCtaForReasons(reasons)
    });
  });
  rows.sort(function(a, b) {
    var score = function(r) {
      return (r.reasons.indexOf("labs") !== -1 ? 2 : 0) + (r.reasons.indexOf("pendientes") !== -1 ? 1 : 0);
    };
    var d = score(b) - score(a);
    if (d) return d;
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
  return rows;
}
function bedHint(p) {
  var cuarto = String(p && p.cuarto || "").trim();
  var cama = String(p && p.cama || "").trim();
  if (cuarto && cama) return cuarto + " \xB7 " + cama;
  return cuarto || cama || "";
}

// public/js/features/doc-queue-panel.mjs
var currentRows = [];
var wired = false;
function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function teamPatients() {
  var user = clinicalSessionContext.user;
  var scope = getClinicalScopeContextForEvaluate();
  if (!user || !user.user_id) return [];
  var userId = String(user.user_id);
  var census = patientsVisibleInSidebar() || [];
  return census.filter(function(p) {
    return p && isPatientAssignedToJoinedTeam(String(p.id), scope, userId);
  });
}
function collectTodosByPatient(patients2) {
  var out = /* @__PURE__ */ Object.create(null);
  (patients2 || []).forEach(function(p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    out[id] = storage.getTodos(id) || [];
  });
  return out;
}
function buildRows() {
  var team = teamPatients();
  return buildDocQueueRows(team, {
    todayFecha: formatLocalTodayFecha(),
    normalizeFecha: normalizeFechaLabHistory,
    labHistoryByPatient: labHistory,
    notesByPatient: notes,
    todosByPatient: collectTodosByPatient(team)
  });
}
function effectiveNavTarget(row) {
  var cta = String(row && row.primaryCta || "nota");
  if (cta === "pendientes") return "pendientes";
  if (!isModeSala(loadSettings())) {
    return cta === "labs" ? "labs" : "nota";
  }
  if (cta === "labs" || cta === "nota") return "eventualidades";
  return "eventualidades";
}
function primaryActionLabelForTarget(target) {
  if (target === "labs") return "Abrir laboratorio";
  if (target === "pendientes") return "Abrir pendientes";
  if (target === "eventualidades") return "Abrir Labs";
  return "Abrir nota";
}
function secondaryLinksHtml(row, primaryTarget) {
  var sala = isModeSala(loadSettings());
  var links = [];
  var push = function(nav, label) {
    if (nav === primaryTarget) return;
    links.push(
      '<button type="button" class="doc-queue-link" data-doc-queue-nav="' + esc(nav) + '" data-patient-id="' + esc(row.id) + '">' + esc(label) + "</button>"
    );
  };
  push("labs", "Laboratorio");
  if (sala) push("eventualidades", "Eventualidades");
  else push("nota", "Nota");
  push("pendientes", "Pendientes");
  if (!links.length) return "";
  return '<div class="doc-queue-row-links"><span class="doc-queue-row-links-label">Tambi\xE9n</span>' + links.join('<span class="doc-queue-row-links-sep" aria-hidden="true">\xB7</span>') + "</div>";
}
function renderList() {
  var list = document.getElementById("doc-queue-list");
  var meta = document.getElementById("doc-queue-meta");
  if (!list) return;
  currentRows = buildRows();
  if (meta) {
    meta.textContent = currentRows.length ? currentRows.length + " paciente" + (currentRows.length === 1 ? "" : "s") + " de tu equipo \xB7 toca Abrir" : "Nada pendiente en tu equipo";
  }
  if (!currentRows.length) {
    list.innerHTML = '<p class="doc-queue-empty">Todo al d\xEDa en tu equipo. Cuando haya labs de hoy sin nota o pendientes abiertos, aparecen aqu\xED.</p>';
    return;
  }
  list.innerHTML = currentRows.map(function(r) {
    var target = effectiveNavTarget(r);
    var status = esc(docQueueStatusLine(r.reasons, r.openTodoCount));
    var primaryLabel = esc(primaryActionLabelForTarget(target));
    return '<article class="doc-queue-row" data-patient-id="' + esc(r.id) + '"><div class="doc-queue-row-body"><div class="doc-queue-row-text"><p class="doc-queue-row-name">' + esc(r.nombre) + "</p>" + (r.hint ? '<p class="doc-queue-row-bed">' + esc(r.hint) + "</p>" : "") + '<p class="doc-queue-row-status">' + status + '</p></div><button type="button" class="btn-generate doc-queue-primary" data-doc-queue-nav="' + esc(target) + '" data-doc-queue-primary-cta="' + esc(r.primaryCta || "") + '" data-patient-id="' + esc(r.id) + '">' + primaryLabel + "</button></div>" + secondaryLinksHtml(r, target) + "</article>";
  }).join("");
}
function refreshDocQueueBadge() {
  var badge = document.getElementById("doc-queue-badge");
  var btn = document.getElementById("btn-doc-queue");
  if (!badge && !btn) return;
  if (badge) {
    badge.hidden = true;
    badge.textContent = "";
  }
  if (btn) {
    btn.setAttribute("title", "Falta documentar");
    btn.setAttribute("aria-label", "Falta documentar");
  }
  var modal = document.getElementById("doc-queue-modal");
  if (modal && modal.classList.contains("open")) {
    renderList();
  }
}
function tryRenderEventualidadesPanel() {
  var mount = typeof document !== "undefined" ? document.getElementById("exp-pane-eventualidades") : null;
  if (!mount) return false;
  renderEventualidadesPanel(mount);
  return true;
}
function openEventualidadesPanel() {
  if (typeof window.switchAppTab === "function") window.switchAppTab("nota");
  if (typeof window.switchInnerTab === "function") window.switchInnerTab("eventualidades");
  if (!tryRenderEventualidadesPanel()) {
    setTimeout(tryRenderEventualidadesPanel, 80);
  }
  setTimeout(function() {
    var el = document.getElementById("eventualidades-input");
    if (el && typeof el.focus === "function") el.focus();
  }, 0);
}
function navigateDocQueue(patientId, cta, primaryCta) {
  void primaryCta;
  var id = String(patientId || "");
  if (!id) return;
  var target = String(cta || "nota");
  if (target === "nota" && isModeSala(loadSettings())) {
    target = "eventualidades";
  }
  closeDocQueuePanel();
  if (typeof window.selectPatient === "function") {
    window.selectPatient(id);
  }
  if (target === "eventualidades") {
    openEventualidadesPanel();
    return;
  }
  var section = target === "labs" ? "labs" : target === "pendientes" ? "pendientes" : "nota";
  if (typeof window.openPaseSectionInNormal === "function") {
    window.openPaseSectionInNormal(section);
  }
}
function onListClick(e) {
  var t = e.target;
  if (!t || !t.closest) return;
  var btn = t.closest("[data-doc-queue-nav]");
  if (!btn) return;
  e.preventDefault();
  navigateDocQueue(
    btn.getAttribute("data-patient-id"),
    btn.getAttribute("data-doc-queue-nav"),
    btn.getAttribute("data-doc-queue-primary-cta")
  );
}
function wireOnce() {
  if (wired) return;
  wired = true;
  var list = document.getElementById("doc-queue-list");
  if (list) list.addEventListener("click", onListClick);
  var cancel = document.getElementById("doc-queue-close");
  if (cancel) {
    cancel.addEventListener("click", function() {
      closeDocQueuePanel();
    });
  }
  var backdrop = document.getElementById("doc-queue-modal");
  if (backdrop) {
    backdrop.addEventListener("click", function(ev) {
      if (ev.target === backdrop) closeDocQueuePanel();
    });
  }
}
function openDocQueuePanel() {
  var modal = document.getElementById("doc-queue-modal");
  if (!modal) return;
  wireOnce();
  renderList();
  refreshDocQueueBadge();
  modal.hidden = false;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  var firstPrimary = modal.querySelector(".doc-queue-primary");
  var focusEl = firstPrimary || document.getElementById("doc-queue-close");
  if (focusEl && typeof focusEl.focus === "function") {
    try {
      focusEl.focus();
    } catch {
    }
  }
}
function closeDocQueuePanel() {
  var modal = document.getElementById("doc-queue-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modal.hidden = true;
}
var windowHandlers = {
  openDocQueuePanel,
  closeDocQueuePanel,
  refreshDocQueueBadge
};
export {
  closeDocQueuePanel,
  openDocQueuePanel,
  refreshDocQueueBadge,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/doc-queue-panel-TTDYNSLX.js.map
