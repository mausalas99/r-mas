import {
  patientsVisibleInSidebar
} from "/mobile/js/chunks/chunk-22EGFI47.js";
import "/mobile/js/chunks/chunk-GDLXCT65.js";
import {
  findCultivoChunkInSet,
  getClinicalScopeContextForEvaluate,
  isCultureTableHeaderLine,
  isPatientAssignedToJoinedTeam,
  parseCultureBlockFromLineArray,
  splitResLabsByTipo
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
import "/mobile/js/chunks/chunk-AUDHCP7J.js";
import {
  labHistory,
  normalizeFechaLabHistory,
  notes,
  parseFechaLabToMs,
  sortLabHistoryChronological
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
import "/mobile/js/chunks/chunk-IFN2KBEN.js";
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

// public/js/features/cultivo-queue-model.mjs
function chunkHasAntibiograma(chunkText) {
  var t = String(chunkText || "");
  if (!t.trim()) return false;
  if (/^ATB\b/im.test(t) && /ATB\s*:.+/i.test(t)) return true;
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
function upperCompact(raw) {
  return String(raw || "").replace(/\s+/g, " ").trim().toUpperCase();
}
function noteMentionsOrganismo(blob, org) {
  if (!org || org === "\u2014" || org === "NEGATIVO") return false;
  if (blob.indexOf(org) !== -1) return true;
  var tok = org.split(/\s+/).filter(Boolean)[0] || "";
  return tok.length > 4 && blob.indexOf(tok) !== -1;
}
function noteMentionsSitioCultivo(blob, sitio) {
  return !!sitio && sitio.length > 4 && blob.indexOf(sitio) !== -1 && /\b(CULTIVO|UROCULTIVO|HEMOCULTIVO|ANTIBIOGRAMA|ATB)\b/.test(blob);
}
function noteMentionsCultivo(noteText, item) {
  var blob = upperCompact(noteText);
  if (!blob) return false;
  var org = upperCompact(item && item.organismo);
  if (noteMentionsOrganismo(blob, org)) return true;
  return noteMentionsSitioCultivo(blob, upperCompact(item && item.sitio));
}
function resolveFechaNorm(normalizeFecha) {
  if (typeof normalizeFecha === "function") return normalizeFecha;
  return function(raw) {
    return normalizeFechaLabHistory(raw) || String(raw || "").trim();
  };
}
function cultResultMs(item, cultFecha) {
  if (item && typeof item.sortKeyMs === "number" && isFinite(item.sortKeyMs)) {
    return item.sortKeyMs;
  }
  return parseFechaLabToMs(cultFecha, "");
}
function finiteMs(ms) {
  return typeof ms === "number" && isFinite(ms) ? ms : null;
}
function noteFechaNorm(note, norm) {
  return norm(note && note.fecha || "") || String(note && note.fecha || "").trim();
}
function itemFechaNorm(item, norm) {
  var f = norm(item && item.fecha || "") || String(item && item.fecha || "").trim();
  return f && f !== "\u2014" ? f : "";
}
function noteCoversCultivoResult(note, item, normalizeFecha) {
  var norm = resolveFechaNorm(normalizeFecha);
  var noteBlob = [note && note.estudios, note && note.evolucion].filter(Boolean).join("\n");
  if (noteMentionsCultivo(noteBlob, item)) return true;
  var noteFecha = noteFechaNorm(note, norm);
  var cultFecha = itemFechaNorm(item, norm);
  if (!noteFecha || !cultFecha) return false;
  var noteMs = finiteMs(parseFechaLabToMs(noteFecha, ""));
  var cultMs = finiteMs(cultResultMs(item, cultFecha));
  return noteMs != null && cultMs != null && noteMs >= cultMs;
}
function cultivoQueueReasonLabels(reasons) {
  var parts = [];
  (reasons || []).forEach(function(r) {
    if (r === "atb_pendiente") parts.push("ATB pendiente");
    if (r === "sin_nota") parts.push("Sin nota");
  });
  return parts.join(" \xB7 ");
}
function cultivoQueueStatusLine(reasons, itemCount) {
  var n = Number(itemCount) || 0;
  var labels = cultivoQueueReasonLabels(reasons);
  if (n <= 1) return labels || "Seguimiento de cultivo";
  return n + " cultivos \xB7 " + (labels || "seguimiento");
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
function extractCultivoFollowUpCandidates(labHistory2) {
  var rows = [];
  var seq = 0;
  var setById = /* @__PURE__ */ Object.create(null);
  sortLabHistoryChronological(labHistory2 || []).forEach(function(set) {
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
function classifyCultivoFollowUps(candidates, note, normalizeFecha) {
  var items = [];
  (candidates || []).forEach(function(c) {
    if (!c || c.negativo) return;
    var reasons = [];
    if (cultivoNeedsAtbFollowUp(c, c.chunk)) reasons.push("atb_pendiente");
    if (!noteCoversCultivoResult(note, c, normalizeFecha)) reasons.push("sin_nota");
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
function uniqReasons(reasons) {
  var seen = /* @__PURE__ */ Object.create(null);
  var out = [];
  (reasons || []).forEach(function(r) {
    if (!r || seen[r]) return;
    seen[r] = true;
    out.push(r);
  });
  return out;
}
function bedHint(p) {
  var cuarto = String(p && p.cuarto || "").trim();
  var cama = String(p && p.cama || "").trim();
  if (cuarto && cama) return cuarto + " \xB7 " + cama;
  return cuarto || cama || "";
}
function buildCultivoQueueRows(patients, opts) {
  var o = opts || {};
  var normalizeFecha = typeof o.normalizeFecha === "function" ? o.normalizeFecha : function(raw) {
    return normalizeFechaLabHistory(raw) || String(raw || "").trim();
  };
  var labHistoryByPatient = o.labHistoryByPatient || {};
  var notesByPatient = o.notesByPatient || {};
  var rows = [];
  (patients || []).forEach(function(p) {
    if (!p || p.id == null || !String(p.id)) return;
    var id = String(p.id);
    var candidates = extractCultivoFollowUpCandidates(labHistoryByPatient[id]);
    var items = classifyCultivoFollowUps(candidates, notesByPatient[id], normalizeFecha);
    if (!items.length) return;
    var reasons = uniqReasons(
      items.reduce(
        function(acc, it) {
          return acc.concat(it.reasons || []);
        },
        /** @type {CultivoQueueReason[]} */
        []
      )
    );
    rows.push({
      id,
      nombre: String(p.nombre || "").trim() || "Sin nombre",
      hint: bedHint(p),
      reasons,
      items,
      primaryCta: "cultivos"
    });
  });
  rows.sort(function(a, b) {
    var score = function(r) {
      return (r.reasons.indexOf("atb_pendiente") !== -1 ? 2 : 0) + (r.reasons.indexOf("sin_nota") !== -1 ? 1 : 0) + Math.min(r.items.length, 3);
    };
    var d = score(b) - score(a);
    if (d) return d;
    return String(a.nombre).localeCompare(String(b.nombre), "es");
  });
  return rows;
}

// public/js/features/cultivo-queue-panel.mjs
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
function buildRows() {
  return buildCultivoQueueRows(teamPatients(), {
    normalizeFecha: normalizeFechaLabHistory,
    labHistoryByPatient: labHistory,
    notesByPatient: notes
  });
}
function itemDetailLine(row) {
  var items = row && row.items || [];
  if (!items.length) return "";
  var first = items[0];
  var head = (first.sitio && first.sitio !== "\u2014" ? first.sitio + ": " : "") + (first.organismo || "\u2014") + (first.fecha && first.fecha !== "\u2014" ? " \xB7 " + first.fecha : "");
  if (items.length === 1) return head;
  return head + " (+" + (items.length - 1) + " m\xE1s)";
}
function renderList() {
  var list = document.getElementById("cultivo-queue-list");
  var meta = document.getElementById("cultivo-queue-meta");
  if (!list) return;
  currentRows = buildRows();
  if (meta) {
    meta.textContent = currentRows.length > 0 ? currentRows.length + " paciente" + (currentRows.length === 1 ? "" : "s") + " de tu equipo con cultivo por seguir." : "De tu equipo: cultivos positivos sin antibiograma, o sin nota desde el resultado.";
  }
  if (!currentRows.length) {
    list.innerHTML = '<p class="doc-queue-empty">Sin cultivos pendientes de seguimiento en tu equipo.</p>';
    return;
  }
  list.innerHTML = currentRows.map(function(r) {
    var status = esc(cultivoQueueStatusLine(r.reasons, r.items.length));
    var detail = esc(itemDetailLine(r));
    return '<article class="doc-queue-row" data-patient-id="' + esc(r.id) + '"><div class="doc-queue-row-body"><div class="doc-queue-row-text"><p class="doc-queue-row-name">' + esc(r.nombre) + "</p>" + (r.hint ? '<p class="doc-queue-row-bed">' + esc(r.hint) + "</p>" : "") + '<p class="doc-queue-row-status">' + status + "</p>" + (detail ? '<p class="doc-queue-row-bed">' + detail + "</p>" : "") + '</div><button type="button" class="btn-generate doc-queue-primary" data-cultivo-queue-nav="cultivos" data-patient-id="' + esc(r.id) + '">Abrir cultivos</button></div></article>';
  }).join("");
}
function refreshCultivoQueueBadge() {
  var badge = document.getElementById("cultivo-queue-badge");
  var btn = document.getElementById("btn-cultivo-queue");
  if (!badge && !btn) return;
  if (badge) {
    badge.hidden = true;
    badge.textContent = "";
  }
  if (btn) {
    btn.setAttribute("title", "Cultivos por seguir");
    btn.setAttribute("aria-label", "Cultivos por seguir");
  }
  var modal = document.getElementById("cultivo-queue-modal");
  if (modal && modal.classList.contains("open")) {
    renderList();
  }
}
function navigateCultivoQueue(patientId) {
  var id = String(patientId || "");
  if (!id) return;
  closeCultivoQueuePanel();
  if (typeof window.selectPatient === "function") {
    window.selectPatient(id);
  }
  if (typeof window.openPaseSectionInNormal === "function") {
    window.openPaseSectionInNormal("cultivos");
  } else if (typeof window.switchInnerTab === "function") {
    if (typeof window.switchAppTab === "function") window.switchAppTab("nota");
    window.switchInnerTab("cult");
  }
}
function onListClick(e) {
  var t = e.target;
  if (!t || !t.closest) return;
  var btn = t.closest("[data-cultivo-queue-nav]");
  if (!btn) return;
  e.preventDefault();
  navigateCultivoQueue(btn.getAttribute("data-patient-id"));
}
function wireOnce() {
  if (wired) return;
  wired = true;
  var list = document.getElementById("cultivo-queue-list");
  if (list) list.addEventListener("click", onListClick);
  var cancel = document.getElementById("cultivo-queue-close");
  if (cancel) {
    cancel.addEventListener("click", function() {
      closeCultivoQueuePanel();
    });
  }
  var backdrop = document.getElementById("cultivo-queue-modal");
  if (backdrop) {
    backdrop.addEventListener("click", function(ev) {
      if (ev.target === backdrop) closeCultivoQueuePanel();
    });
  }
}
function openCultivoQueuePanel() {
  var modal = document.getElementById("cultivo-queue-modal");
  if (!modal) return;
  wireOnce();
  renderList();
  refreshCultivoQueueBadge();
  modal.hidden = false;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  var firstPrimary = modal.querySelector(".doc-queue-primary");
  var focusEl = firstPrimary || document.getElementById("cultivo-queue-close");
  if (focusEl && typeof focusEl.focus === "function") {
    try {
      focusEl.focus();
    } catch (_err) {
      void _err;
    }
  }
}
function closeCultivoQueuePanel() {
  var modal = document.getElementById("cultivo-queue-modal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modal.hidden = true;
}
var windowHandlers = {
  openCultivoQueuePanel,
  closeCultivoQueuePanel,
  refreshCultivoQueueBadge
};
export {
  closeCultivoQueuePanel,
  openCultivoQueuePanel,
  refreshCultivoQueueBadge,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/cultivo-queue-panel-JY5H2B7U.js.map
