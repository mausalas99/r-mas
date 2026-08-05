import {
  autosendLabsToEventualidad,
  loadSettings
} from "/mobile/js/chunks/chunk-QL57ZKQA.js";
import "/mobile/js/chunks/chunk-FWK2O4R2.js";
import "/mobile/js/chunks/chunk-RJLBJZKC.js";
import "/mobile/js/chunks/chunk-DARJ7CZO.js";
import {
  patientsVisibleInSidebar
} from "/mobile/js/chunks/chunk-HXTMJLJE.js";
import "/mobile/js/chunks/chunk-BNYDNQ6F.js";
import "/mobile/js/chunks/chunk-NL2VNSHZ.js";
import "/mobile/js/chunks/chunk-N73M5IKZ.js";
import "/mobile/js/chunks/chunk-UMBBYMHN.js";
import "/mobile/js/chunks/chunk-KZBMNVUA.js";
import "/mobile/js/chunks/chunk-KGLMT7Q7.js";
import "/mobile/js/chunks/chunk-5ULB7V7I.js";
import "/mobile/js/chunks/chunk-6IT4VYWH.js";
import "/mobile/js/chunks/chunk-XELKF6FU.js";
import "/mobile/js/chunks/chunk-TNKRXUWD.js";
import "/mobile/js/chunks/chunk-YNMUOR4Q.js";
import "/mobile/js/chunks/chunk-LBCUQ32L.js";
import "/mobile/js/chunks/chunk-U44PD5PR.js";
import "/mobile/js/chunks/chunk-KE5KLMVD.js";
import "/mobile/js/chunks/chunk-KY3W2VTY.js";
import "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-E2YV5EEU.js";
import "/mobile/js/chunks/chunk-HQZG5N6A.js";
import "/mobile/js/chunks/chunk-3QVHQ4QK.js";
import "/mobile/js/chunks/chunk-CV62ZWIZ.js";
import "/mobile/js/chunks/chunk-GGQQKZC2.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import "/mobile/js/chunks/chunk-7R6RY2VN.js";
import "/mobile/js/chunks/chunk-X4LAKGL3.js";
import "/mobile/js/chunks/chunk-ZRPAKVXD.js";
import "/mobile/js/chunks/chunk-LSPMPOB5.js";
import "/mobile/js/chunks/chunk-AOKU4GNB.js";
import {
  getClinicalScopeContextForEvaluate,
  isPatientAssignedToJoinedTeam,
  renderEventualidadesPanel,
  selectEventualidadesLabsMode
} from "/mobile/js/chunks/chunk-GQ4IO4LN.js";
import "/mobile/js/chunks/chunk-OWLZMO5A.js";
import "/mobile/js/chunks/chunk-N7COVD6D.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-URSGTGGU.js";
import "/mobile/js/chunks/chunk-N73GQSRB.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-4FTQ7XEU.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-34AJGDKI.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-XAKSV4LG.js";
import {
  labHistory,
  normalizeFechaLabHistory,
  notes,
  patients
} from "/mobile/js/chunks/chunk-CLJUGM4X.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-RQRXI24X.js";
import "/mobile/js/chunks/chunk-64JY3O3H.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-2NLWSG7O.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-DIWJYISZ.js";
import "/mobile/js/chunks/chunk-IBKESWFJ.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import {
  storage
} from "/mobile/js/chunks/chunk-JFY46RJV.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-YAGCGSLT.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-UW56GTLS.js";
import "/mobile/js/chunks/chunk-PXDCZYH3.js";
import "/mobile/js/chunks/chunk-GWKS66VB.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-IRC74J3Z.js";
import "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-HMTHREEE.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-TYH5ME2D.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-TSLGFHIE.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";

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

// public/js/features/doc-queue-nav.mjs
function eventualidadesPaneForDocQueueNav(navTarget, primaryCta) {
  if (String(navTarget) !== "eventualidades") return null;
  if (String(primaryCta || "") === "labs") return "labs";
  return "labs";
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
function openEventualidadesPanel(opts) {
  if (typeof window.switchAppTab === "function") window.switchAppTab("nota");
  if (typeof window.switchInnerTab === "function") window.switchInnerTab("eventualidades");
  if (!tryRenderEventualidadesPanel()) {
    setTimeout(tryRenderEventualidadesPanel, 80);
  }
  var pane = opts && opts.pane;
  if (pane === "labs") {
    selectEventualidadesLabsMode();
    setTimeout(function() {
      var el = document.getElementById("eventualidades-labs");
      if (el && typeof el.focus === "function") el.focus();
    }, 0);
  }
}
function findPatientById(patientId) {
  var id = String(patientId || "");
  return (patients || []).find(function(p) {
    return p && String(p.id) === id;
  });
}
async function openEventualidadesWithLabAutoSend(patientId, pane) {
  openEventualidadesPanel({ pane: pane || "labs" });
  var patient = findPatientById(patientId);
  if (!patient) {
    if (typeof window.showToast === "function") {
      window.showToast("Paciente no encontrado.", "error");
    }
    return;
  }
  var sets = labHistory[String(patientId)] || [];
  var out = await autosendLabsToEventualidad(patient, sets, {
    filterToday: true,
    todayFecha: formatLocalTodayFecha()
  });
  tryRenderEventualidadesPanel();
  if (out && out.ok) {
    if (out.skipped === "dup") return;
    if (typeof window.showToast === "function") {
      window.showToast("Labs en la l\xEDnea de tiempo.", "success");
    }
    return;
  }
  if (typeof window.showToast === "function") {
    window.showToast(
      out && out.reason === "empty" ? "Sin labs de hoy para la l\xEDnea de tiempo." : "No se pudo guardar la interpretaci\xF3n de labs.",
      out && out.reason === "empty" ? "info" : "error"
    );
  }
}
function navigateDocQueue(patientId, cta, primaryCta) {
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
    var pane = eventualidadesPaneForDocQueueNav(target, primaryCta || cta);
    void openEventualidadesWithLabAutoSend(id, pane || "labs");
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
//# sourceMappingURL=/js/chunks/doc-queue-panel-NFCHPMT6.js.map
