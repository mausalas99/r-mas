import {
  loadSettings
} from "/mobile/js/chunks/chunk-4SIVR4SA.js";
import "/mobile/js/chunks/chunk-BKJ6JOGZ.js";
import "/mobile/js/chunks/chunk-DPCWCVTP.js";
import "/mobile/js/chunks/chunk-SCSVSR4P.js";
import {
  patientsVisibleInSidebar
} from "/mobile/js/chunks/chunk-TTFM7EP4.js";
import "/mobile/js/chunks/chunk-OOMYDHTA.js";
import "/mobile/js/chunks/chunk-55V5O62J.js";
import "/mobile/js/chunks/chunk-NHHUSR52.js";
import "/mobile/js/chunks/chunk-YEWIPCRL.js";
import "/mobile/js/chunks/chunk-2TSPDBVD.js";
import "/mobile/js/chunks/chunk-PKYRHIWH.js";
import "/mobile/js/chunks/chunk-6DPIGF5S.js";
import "/mobile/js/chunks/chunk-OSPRJYRJ.js";
import "/mobile/js/chunks/chunk-7PDTCWFA.js";
import "/mobile/js/chunks/chunk-GUZBLPYB.js";
import "/mobile/js/chunks/chunk-YQNA53YU.js";
import "/mobile/js/chunks/chunk-RAQX5OVN.js";
import "/mobile/js/chunks/chunk-3QVHQ4QK.js";
import "/mobile/js/chunks/chunk-CV62ZWIZ.js";
import "/mobile/js/chunks/chunk-HEEVLY4I.js";
import "/mobile/js/chunks/chunk-7R6RY2VN.js";
import "/mobile/js/chunks/chunk-UMBBYMHN.js";
import "/mobile/js/chunks/chunk-KZBMNVUA.js";
import "/mobile/js/chunks/chunk-CA3QXIB4.js";
import "/mobile/js/chunks/chunk-5ULB7V7I.js";
import "/mobile/js/chunks/chunk-6IT4VYWH.js";
import "/mobile/js/chunks/chunk-WMJDFKKN.js";
import "/mobile/js/chunks/chunk-J7SG2LGN.js";
import "/mobile/js/chunks/chunk-RXNYNYIW.js";
import {
  getClinicalScopeContextForEvaluate,
  isCultureTableHeaderLine,
  isPatientAssignedToJoinedTeam,
  listActiveProcedimientos,
  normalizePendientesJson,
  parseCultureBlockFromLineArray,
  splitResLabsByTipo
} from "/mobile/js/chunks/chunk-OJH7L2CJ.js";
import "/mobile/js/chunks/chunk-YREK4H2V.js";
import "/mobile/js/chunks/chunk-HVHVRFSH.js";
import "/mobile/js/chunks/chunk-6RH7YMAM.js";
import "/mobile/js/chunks/chunk-K7TUQM3L.js";
import "/mobile/js/chunks/chunk-NW6K73WP.js";
import "/mobile/js/chunks/chunk-KW6FOZVD.js";
import "/mobile/js/chunks/chunk-F55OGCCZ.js";
import "/mobile/js/chunks/chunk-NCZWUFAX.js";
import "/mobile/js/chunks/chunk-C6TP3H7V.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-AUDHCP7J.js";
import "/mobile/js/chunks/chunk-OJF7SMWI.js";
import "/mobile/js/chunks/chunk-LE7F4H7F.js";
import "/mobile/js/chunks/chunk-FHXLE36S.js";
import "/mobile/js/chunks/chunk-VN3HHLWO.js";
import "/mobile/js/chunks/chunk-GHZK4QF3.js";
import "/mobile/js/chunks/chunk-GJUAH75C.js";
import "/mobile/js/chunks/chunk-WOP35WT6.js";
import "/mobile/js/chunks/chunk-JDDA5EVO.js";
import "/mobile/js/chunks/chunk-IP6FUZQW.js";
import "/mobile/js/chunks/chunk-ALW2M5BA.js";
import "/mobile/js/chunks/chunk-XYU7ZICQ.js";
import "/mobile/js/chunks/chunk-MBEH6ZUQ.js";
import "/mobile/js/chunks/chunk-LYZOIXV3.js";
import {
  labHistory,
  patients
} from "/mobile/js/chunks/chunk-JZ2SPQIK.js";
import "/mobile/js/chunks/chunk-KHHZMCJO.js";
import "/mobile/js/chunks/chunk-NIMNG7BY.js";
import "/mobile/js/chunks/chunk-H45VYIPQ.js";
import "/mobile/js/chunks/chunk-4GV7J2JY.js";
import "/mobile/js/chunks/chunk-A56TUI2P.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-IAZG4W3U.js";
import "/mobile/js/chunks/chunk-I4VH6GH2.js";
import "/mobile/js/chunks/chunk-5TQC2RCD.js";
import {
  storage
} from "/mobile/js/chunks/chunk-76D6GOCM.js";
import "/mobile/js/chunks/chunk-TY4AHNM4.js";
import "/mobile/js/chunks/chunk-YAGCGSLT.js";
import "/mobile/js/chunks/chunk-WONKP6NU.js";
import "/mobile/js/chunks/chunk-3ADS2QIW.js";
import "/mobile/js/chunks/chunk-VTSC3E5H.js";
import "/mobile/js/chunks/chunk-LSPMPOB5.js";
import "/mobile/js/chunks/chunk-AOKU4GNB.js";
import "/mobile/js/chunks/chunk-CYJ7ZDIE.js";
import "/mobile/js/chunks/chunk-WVOQEB7T.js";
import "/mobile/js/chunks/chunk-S4JF4KS2.js";
import "/mobile/js/chunks/chunk-XO7Z5S3R.js";
import "/mobile/js/chunks/chunk-GWKS66VB.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-6VYBWSQE.js";
import "/mobile/js/chunks/chunk-BRT2MMPP.js";
import "/mobile/js/chunks/chunk-HMTHREEE.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";
import "/mobile/js/chunks/chunk-OEEP3MSI.js";
import {
  clinicalSessionContext
} from "/mobile/js/chunks/chunk-LMOJUVZ4.js";

// lib/entrega/entrega-prep-checklist.mjs
function formatLocalTodayKey(d) {
  var date = d instanceof Date ? d : /* @__PURE__ */ new Date();
  var pad = function(n) {
    return String(n).padStart(2, "0");
  };
  return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
}
function isSavedAtLocalToday(iso, now) {
  var raw = String(iso || "").trim();
  if (!raw) return false;
  var d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;
  return formatLocalTodayKey(d) === formatLocalTodayKey(now instanceof Date ? now : /* @__PURE__ */ new Date());
}
function needsHcDraft(hcData) {
  if (!hcData || typeof hcData !== "object") return true;
  var motivo = String(hcData.motivoConsulta || "").trim();
  var pad = String(hcData.padecimientoActual || "").trim();
  return !motivo && !pad;
}
function needsEaSaved(textoGuardado, now) {
  if (!textoGuardado || typeof textoGuardado !== "object") return true;
  var savedAt = textoGuardado.savedAt;
  if (!isSavedAtLocalToday(savedAt, now)) return true;
  return !String(textoGuardado.text || "").trim();
}
function countOverdueTodos(todos, now) {
  var ref = now instanceof Date ? now : /* @__PURE__ */ new Date();
  var n = 0;
  (todos || []).forEach(function(t) {
    if (!t || t.completed) return;
    var dueRaw = t.dueDate;
    if (dueRaw == null || dueRaw === "") return;
    var due = dueRaw instanceof Date ? dueRaw : new Date(dueRaw);
    if (Number.isNaN(due.getTime())) return;
    if (due.getTime() < ref.getTime()) n += 1;
  });
  return n;
}
function countDueProcedimientos(items, now) {
  var ref = now instanceof Date ? now : /* @__PURE__ */ new Date();
  var n = 0;
  (items || []).forEach(function(it) {
    if (!it || it.completedAt) return;
    var raw = it.scheduledAt;
    if (raw == null || raw === "") return;
    var d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    if (d.getTime() < ref.getTime()) n += 1;
  });
  return n;
}
function cultivoNeedsFollowUp(row) {
  if (!row || typeof row !== "object") return false;
  if (row.negativo) return false;
  var org = String(row.organismo || "").replace(/\s+/g, " ").trim().toUpperCase();
  if (!org || org === "\u2014" || org === "-") return false;
  if (/PENDIENTE/.test(org)) return true;
  var res = String(row.resistencias || "").replace(/\s+/g, " ").trim();
  if (!res || res === "\u2014" || res === "-") return true;
  return false;
}
function countCultivosNeedingFollowUp(rows) {
  var n = 0;
  (rows || []).forEach(function(r) {
    if (cultivoNeedsFollowUp(r)) n += 1;
  });
  return n;
}
function primaryCtaForGaps(gaps) {
  var list = gaps || [];
  if (list.indexOf("pendientes") !== -1) return "pendientes";
  if (list.indexOf("ea") !== -1) return "ea";
  if (list.indexOf("hc") !== -1) return "hc";
  return "cultivos";
}
function entregaPrepStatusLine(gaps, counts) {
  var c = counts || {};
  var parts = [];
  (gaps || []).forEach(function(g) {
    if (g === "hc") parts.push("HC incompleta");
    if (g === "ea") parts.push("EA sin guardar hoy");
    if (g === "pendientes") {
      var overdue = Number(c.overdueTodoCount) || 0;
      var procs = Number(c.dueProcedimientoCount) || 0;
      var total = overdue + procs;
      if (total === 1) parts.push("1 pendiente vencido");
      else parts.push(total + " pendientes vencidos");
    }
    if (g === "cultivos") {
      var n = Number(c.cultivoFollowUpCount) || 0;
      if (n === 1) parts.push("1 cultivo sin seguimiento");
      else parts.push(n + " cultivos sin seguimiento");
    }
  });
  return parts.join(" \xB7 ");
}
function entregaPrepPrimaryActionLabel(cta) {
  if (cta === "hc") return "Abrir historia";
  if (cta === "ea") return "Abrir estado actual";
  if (cta === "pendientes") return "Abrir pendientes";
  return "Abrir cultivos";
}
function buildEntregaPrepRows(patients2, opts) {
  var o = opts || {};
  var now = o.now instanceof Date ? o.now : /* @__PURE__ */ new Date();
  var hcByPatient = o.hcByPatient || {};
  var eaByPatient = o.eaByPatient || {};
  var todosByPatient = o.todosByPatient || {};
  var procedimientosByPatient = o.procedimientosByPatient || {};
  var cultivosByPatient = o.cultivosByPatient || {};
  var rows = [];
  (patients2 || []).forEach(function(p) {
    if (!p || p.id == null || !String(p.id)) return;
    var id = String(p.id);
    var overdueTodoCount = countOverdueTodos(todosByPatient[id], now);
    var dueProcedimientoCount = countDueProcedimientos(procedimientosByPatient[id], now);
    var cultivoFollowUpCount = countCultivosNeedingFollowUp(cultivosByPatient[id]);
    var gaps = [];
    if (needsHcDraft(hcByPatient[id])) gaps.push("hc");
    if (needsEaSaved(eaByPatient[id], now)) gaps.push("ea");
    if (overdueTodoCount > 0 || dueProcedimientoCount > 0) gaps.push("pendientes");
    if (cultivoFollowUpCount > 0) gaps.push("cultivos");
    if (!gaps.length) return;
    rows.push({
      id,
      nombre: String(p.nombre || "").trim() || "Sin nombre",
      hint: bedHint(p),
      gaps,
      overdueTodoCount,
      dueProcedimientoCount,
      cultivoFollowUpCount,
      primaryCta: primaryCtaForGaps(gaps)
    });
  });
  rows.sort(function(a, b) {
    var score = function(r) {
      return (r.gaps.indexOf("pendientes") !== -1 ? 8 : 0) + (r.gaps.indexOf("ea") !== -1 ? 4 : 0) + (r.gaps.indexOf("hc") !== -1 ? 2 : 0) + (r.gaps.indexOf("cultivos") !== -1 ? 1 : 0);
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

// public/js/features/entrega-prep-panel.mjs
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
function patientById(id) {
  var pid = String(id || "");
  var list = patients || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i] && String(list[i].id) === pid) return list[i];
  }
  return null;
}
function collectHcByPatient(team) {
  var out = /* @__PURE__ */ Object.create(null);
  (team || []).forEach(function(p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    var full = patientById(id) || p;
    var data = full.historiaClinica && full.historiaClinica.data;
    out[id] = data && typeof data === "object" ? data : null;
  });
  return out;
}
function collectEaByPatient(team) {
  var out = /* @__PURE__ */ Object.create(null);
  (team || []).forEach(function(p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    var full = patientById(id) || p;
    var mon = full.monitoreo;
    out[id] = mon && mon.textoGuardado ? mon.textoGuardado : null;
  });
  return out;
}
function collectTodosByPatient(team) {
  var out = /* @__PURE__ */ Object.create(null);
  (team || []).forEach(function(p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    out[id] = storage.getTodos(id) || [];
  });
  return out;
}
function collectProcedimientosByPatient(team) {
  var out = /* @__PURE__ */ Object.create(null);
  var map = clinicalSessionContext.guardiasMap;
  (team || []).forEach(function(p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    var g = map && typeof map.get === "function" ? map.get(id) : null;
    if (!g || !g.pendientes_json) {
      out[id] = [];
      return;
    }
    out[id] = listActiveProcedimientos(normalizePendientesJson(g.pendientes_json));
  });
  return out;
}
function cultivoRowsFromLabSets(sets) {
  var rows = [];
  var seq = 0;
  (sets || []).forEach(function(set) {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    var cult = splitResLabsByTipo(set.resLabs).cultivo;
    cult.forEach(function(chunk) {
      var sections = String(chunk || "").split(/\n\n+/).map(function(s) {
        return s.trim();
      }).filter(Boolean);
      sections.forEach(function(sec) {
        var lines = sec.split(/\r?\n/).map(function(l) {
          return l.replace(/\*+$/g, "").trim();
        }).filter(Boolean);
        if (!lines.length || !isCultureTableHeaderLine(lines[0])) return;
        rows.push(parseCultureBlockFromLineArray(lines, set, seq++).row);
      });
    });
  });
  return rows;
}
function collectCultivosByPatient(team) {
  var out = /* @__PURE__ */ Object.create(null);
  (team || []).forEach(function(p) {
    if (!p || p.id == null) return;
    var id = String(p.id);
    out[id] = cultivoRowsFromLabSets(labHistory[id] || []);
  });
  return out;
}
function buildRows() {
  var team = teamPatients();
  return buildEntregaPrepRows(team, {
    hcByPatient: collectHcByPatient(team),
    eaByPatient: collectEaByPatient(team),
    todosByPatient: collectTodosByPatient(team),
    procedimientosByPatient: collectProcedimientosByPatient(team),
    cultivosByPatient: collectCultivosByPatient(team)
  });
}
function navTargetForCta(cta) {
  var t = String(cta || "pendientes");
  if (t === "pendientes") return "pendientes";
  if (t === "cultivos") return "cultivos";
  if (t === "ea") return "estadoActual";
  if (t === "hc") return isModeSala(loadSettings()) ? "historia" : "nota";
  return "pendientes";
}
function gapKeyForNav(nav) {
  if (nav === "estadoActual") return "ea";
  if (nav === "historia" || nav === "nota") return "hc";
  if (nav === "cultivos") return "cultivos";
  return "pendientes";
}
function secondaryLinksHtml(row, primaryTarget) {
  var gaps = row.gaps || [];
  var candidates = [
    ["pendientes", "Pendientes"],
    ["estadoActual", "Estado actual"],
    ["cultivos", "Cultivos"]
  ];
  var links = [];
  candidates.forEach(function(pair) {
    var nav = pair[0];
    var label = pair[1];
    if (nav === primaryTarget) return;
    if (gaps.indexOf(gapKeyForNav(nav)) === -1) return;
    links.push(
      '<button type="button" class="entrega-prep-link" data-entrega-prep-nav="' + esc(nav) + '" data-patient-id="' + esc(row.id) + '">' + esc(label) + "</button>"
    );
  });
  if (!links.length) return "";
  return '<div class="entrega-prep-row-links"><span class="entrega-prep-row-links-label">Tambi\xE9n</span>' + links.join('<span class="entrega-prep-row-links-sep" aria-hidden="true">\xB7</span>') + "</div>";
}
function renderList() {
  var list = document.getElementById("entrega-prep-list");
  var meta = document.getElementById("entrega-prep-meta");
  if (!list) return;
  currentRows = buildRows();
  if (meta) {
    meta.textContent = currentRows.length ? currentRows.length + " paciente" + (currentRows.length === 1 ? "" : "s") + " de tu equipo \xB7 toca Abrir" : "Nada incompleto en tu equipo";
  }
  if (!currentRows.length) {
    list.innerHTML = '<p class="entrega-prep-empty">Listo para entrega: HC, EA de hoy, pendientes al d\xEDa y cultivos con seguimiento.</p>';
    return;
  }
  list.innerHTML = currentRows.map(function(r) {
    var target = navTargetForCta(r.primaryCta);
    var status = esc(
      entregaPrepStatusLine(r.gaps, {
        overdueTodoCount: r.overdueTodoCount,
        dueProcedimientoCount: r.dueProcedimientoCount,
        cultivoFollowUpCount: r.cultivoFollowUpCount
      })
    );
    var primaryLabel = esc(entregaPrepPrimaryActionLabel(r.primaryCta));
    return '<article class="entrega-prep-row" data-patient-id="' + esc(r.id) + '"><div class="entrega-prep-row-body"><div class="entrega-prep-row-text"><p class="entrega-prep-row-name">' + esc(r.nombre) + "</p>" + (r.hint ? '<p class="entrega-prep-row-bed">' + esc(r.hint) + "</p>" : "") + '<p class="entrega-prep-row-status">' + status + '</p></div><button type="button" class="btn-generate entrega-prep-primary" data-entrega-prep-nav="' + esc(target) + '" data-patient-id="' + esc(r.id) + '">' + primaryLabel + "</button></div>" + secondaryLinksHtml(r, target) + "</article>";
  }).join("");
}
function refreshEntregaPrepBadge() {
  var badge = document.getElementById("entrega-prep-badge");
  var btn = document.getElementById("btn-entrega-prep");
  if (!badge && !btn) return;
  if (badge) {
    badge.hidden = true;
    badge.textContent = "";
  }
  if (btn) {
    btn.setAttribute("title", "Preparar entrega");
    btn.setAttribute("aria-label", "Preparar entrega");
  }
  var modal = document.getElementById("entrega-prep-modal");
  if (modal && modal.classList.contains("open")) {
    renderList();
  }
}
function navigateEntregaPrep(patientId, nav) {
  var id = String(patientId || "");
  if (!id) return;
  var target = String(nav || "pendientes");
  closeEntregaPrepPanel();
  if (typeof window.selectPatient === "function") {
    window.selectPatient(id);
  }
  if (target === "estadoActual" || target === "historia") {
    if (typeof window.switchAppTab === "function") window.switchAppTab("nota");
    if (typeof window.switchInnerTab === "function") window.switchInnerTab(target);
    return;
  }
  if (target === "nota") {
    if (typeof window.openPaseSectionInNormal === "function") {
      window.openPaseSectionInNormal("nota");
    }
    return;
  }
  var section = target === "cultivos" ? "cultivos" : target === "pendientes" ? "pendientes" : "nota";
  if (typeof window.openPaseSectionInNormal === "function") {
    window.openPaseSectionInNormal(section);
  }
}
function onListClick(e) {
  var t = e.target;
  if (!t || !t.closest) return;
  var btn = t.closest("[data-entrega-prep-nav]");
  if (!btn) return;
  e.preventDefault();
  navigateEntregaPrep(
    btn.getAttribute("data-patient-id"),
    btn.getAttribute("data-entrega-prep-nav")
  );
}
function wireOnce() {
  if (wired) return;
  wired = true;
  var list = document.getElementById("entrega-prep-list");
  if (list) list.addEventListener("click", onListClick);
  var cancel = document.getElementById("entrega-prep-close");
  if (cancel) {
    cancel.addEventListener("click", function() {
      closeEntregaPrepPanel();
    });
  }
  var backdrop = document.getElementById("entrega-prep-modal");
  if (backdrop) {
    backdrop.addEventListener("click", function(ev) {
      if (ev.target === backdrop) closeEntregaPrepPanel();
    });
  }
}
function openEntregaPrepPanel() {
  var modal = document.getElementById("entrega-prep-modal");
  if (!modal) return;
  wireOnce();
  renderList();
  refreshEntregaPrepBadge();
  modal.hidden = false;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  var firstPrimary = modal.querySelector(".entrega-prep-primary");
  var focusEl = firstPrimary || document.getElementById("entrega-prep-close");
  if (focusEl && typeof focusEl.focus === "function") {
    try {
      focusEl.focus();
    } catch (err) {
      void err;
    }
  }
}
function closeEntregaPrepPanel() {
  var modal = document.getElementById("entrega-prep-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modal.hidden = true;
}
var windowHandlers = {
  openEntregaPrepPanel,
  closeEntregaPrepPanel,
  refreshEntregaPrepBadge
};
export {
  closeEntregaPrepPanel,
  openEntregaPrepPanel,
  refreshEntregaPrepBadge,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/entrega-prep-panel-X6JGKA5Y.js.map
