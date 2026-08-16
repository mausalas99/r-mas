import {
  foldText
} from "/mobile/js/chunks/chunk-PQQMOA4J.js";
import {
  procesarRecetaFromText,
  selectPatient
} from "/mobile/js/chunks/chunk-46QO3ZUY.js";
import "/mobile/js/chunks/chunk-IXAK2IU3.js";
import "/mobile/js/chunks/chunk-AIIT754E.js";
import "/mobile/js/chunks/chunk-CXMRZLXS.js";
import "/mobile/js/chunks/chunk-AS6TAICA.js";
import "/mobile/js/chunks/chunk-K45GC3VK.js";
import "/mobile/js/chunks/chunk-VOW7QFKJ.js";
import "/mobile/js/chunks/chunk-RJIPR6CF.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import "/mobile/js/chunks/chunk-2VZA33PI.js";
import "/mobile/js/chunks/chunk-EPFF77ND.js";
import "/mobile/js/chunks/chunk-UTZ3BFGA.js";
import "/mobile/js/chunks/chunk-3RXBEWAZ.js";
import "/mobile/js/chunks/chunk-XS64SPAO.js";
import "/mobile/js/chunks/chunk-LOGJB72W.js";
import "/mobile/js/chunks/chunk-44QBSWO4.js";
import "/mobile/js/chunks/chunk-KEFN326O.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-5DAE7PK3.js";
import "/mobile/js/chunks/chunk-6A62XDR6.js";
import "/mobile/js/chunks/chunk-MOSUQW6R.js";
import "/mobile/js/chunks/chunk-BGYDWUEW.js";
import "/mobile/js/chunks/chunk-7EPXWU6A.js";
import {
  buildBulkLabPreview,
  shouldShowBulkLabPreview
} from "/mobile/js/chunks/chunk-JIKZNXZR.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-TR2JMMVG.js";
import "/mobile/js/chunks/chunk-23D7ZB6I.js";
import "/mobile/js/chunks/chunk-AYK2RJF5.js";
import "/mobile/js/chunks/chunk-7TWBBTNK.js";
import "/mobile/js/chunks/chunk-AA7ORONM.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-YUEMH3I3.js";
import "/mobile/js/chunks/chunk-IGOCX3DQ.js";
import {
  findPatientByRegistro
} from "/mobile/js/chunks/chunk-M6MLPK4W.js";
import "/mobile/js/chunks/chunk-4QI24DFU.js";
import "/mobile/js/chunks/chunk-ZVJAFSHG.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-AVZ5WV63.js";
import "/mobile/js/chunks/chunk-NPWWQWKW.js";
import "/mobile/js/chunks/chunk-KESF4FLC.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-3PL7T3ZN.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-7FIP2ETS.js";
import "/mobile/js/chunks/chunk-CZ2M277B.js";
import "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-JBHSWL2Z.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-BUGU4R5K.js";
import "/mobile/js/chunks/chunk-4SMSHN53.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-P7EHNYUF.js";
import "/mobile/js/chunks/chunk-S2E4QGRL.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import {
  getPatients
} from "/mobile/js/chunks/chunk-NC6VRD7M.js";
import "/mobile/js/chunks/chunk-5RUR3UQW.js";
import "/mobile/js/chunks/chunk-C4OBKXWW.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-6CYAI7OE.js";
import "/mobile/js/chunks/chunk-VVADIT4K.js";
import {
  looksLikeSomeIndicacionesPaste
} from "/mobile/js/chunks/chunk-HDD2EUC6.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-VRNWC4P2.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import {
  cancelOverlayClose,
  closeOverlayAnimated
} from "/mobile/js/chunks/chunk-KZT7D6I2.js";
import "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-EE5CSOUC.js";
import "/mobile/js/chunks/chunk-WTVHUFEL.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-75QM3TGW.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-NPUSZB5W.js";

// public/js/features/paste-smart-model.mjs
var NAME_STOP = /* @__PURE__ */ Object.create(null);
["de", "del", "la", "las", "los", "y", "e", "da", "do", "dos", "das"].forEach(function(w) {
  NAME_STOP[w] = true;
});
function extractSomeNombreFromReport(textoBruto) {
  var m = String(textoBruto || "").match(/Nombre:\s*([^\n\r]+)/i);
  if (!m) return "";
  var raw = m[1].split(/\t+/)[0].split(/\s{2,}/)[0].trim();
  return raw.split(/\s+(?:Fecha|Sexo|Edad|Ubicaci)/i)[0].trim();
}
function significantNameTokens(name) {
  return foldText(name).split(/[^a-z0-9]+/).filter(function(t) {
    return t.length >= 3 && !NAME_STOP[t];
  });
}
function scoreNombreAgainstPatient(reportName, patientName) {
  var a = foldText(reportName);
  var b = foldText(patientName);
  if (!a || !b) return -Infinity;
  if (a === b) return 1e3;
  var ta = significantNameTokens(a);
  var tb = significantNameTokens(b);
  if (!ta.length || !tb.length) return -Infinity;
  var setB = /* @__PURE__ */ Object.create(null);
  tb.forEach(function(t) {
    setB[t] = true;
  });
  var hits = 0;
  ta.forEach(function(t) {
    if (setB[t]) hits += 1;
  });
  if (hits < 2 && !(hits === 1 && ta.length === 1 && tb.length === 1)) {
    return -Infinity;
  }
  var coverage = hits / Math.max(ta.length, tb.length);
  return hits * 10 + coverage * 5 - Math.abs(ta.length - tb.length) * 0.5;
}
function matchPatientsByNombre(nombre, patients, opts) {
  var minScore = opts && typeof opts.minScore === "number" ? opts.minScore : 15;
  var limit = opts && opts.limit ? opts.limit : 8;
  var out = [];
  (patients || []).forEach(function(p) {
    if (!p || p.id == null) return;
    var score = scoreNombreAgainstPatient(nombre, p.nombre || "");
    if (score < minScore || score === -Infinity) return;
    out.push({ patient: p, score });
  });
  out.sort(function(a, b) {
    return b.score - a.score;
  });
  return out.slice(0, limit);
}
function matchPatientByRegistro(registro, patients) {
  var r = String(registro || "").trim();
  if (!r) return null;
  return (patients || []).find(function(p) {
    return p && String(p.registro || "").trim() === r;
  }) || null;
}
function enrichBlockWithNombreMatches(block, patients) {
  var nombre = block && block.reports && block.reports[0] && block.reports[0].nombre || extractSomeNombreFromReport(
    block && block.reports && block.reports[0] && block.reports[0].reportText ? block.reports[0].reportText : ""
  );
  if (!nombre) return { candidates: [], best: null, ambiguous: false };
  var ranked = matchPatientsByNombre(nombre, patients);
  var candidates = ranked.map(function(r) {
    return r.patient;
  });
  if (!candidates.length) return { candidates: [], best: null, ambiguous: false };
  if (candidates.length === 1) {
    return { candidates, best: candidates[0], ambiguous: false };
  }
  var top = ranked[0].score;
  var second = ranked[1].score;
  if (top - second >= 8) {
    return { candidates, best: candidates[0], ambiguous: false };
  }
  return { candidates, best: null, ambiguous: true };
}
function assignPatientToBulkBlock(block, patient) {
  if (!block || !patient) return block;
  var next = Object.assign({}, block, {
    patient,
    patientName: patient.nombre || "Sin nombre",
    primaryExpediente: String(patient.registro || block.primaryExpediente || "").trim(),
    status: "ok",
    canProcess: !!(block.okReportCount > 0)
  });
  return next;
}
function looksLikeIndicasPasteCandidate(text) {
  return looksLikeSomeIndicacionesPaste(text);
}
function appTabForSmartPasteKind(kind) {
  if (kind === "indicas") return "med";
  return null;
}
function planSmartPaste(text, opts) {
  var sourceText = String(text || "").trim();
  var patients = opts && opts.patients || [];
  var findByReg = resolveFindByRegistro(opts, patients);
  if (!sourceText) return emptyPlan("empty", "Pega un reporte SOME primero");
  if (looksLikeIndicasPasteCandidate(sourceText)) {
    return Object.assign(emptyPlan("indicas", ""), { sourceText });
  }
  var blocks = buildBulkLabPreview(sourceText, { findPatientByRegistro: findByReg });
  var totalOk = sumOkReports(blocks);
  if (!totalOk) {
    return Object.assign(emptyPlan("not-some", "No parece un reporte SOME (copia desde \xABExpediente:\xBB)"), {
      sourceText,
      blocks
    });
  }
  var resolved = resolveBlocksWithNombre(blocks, patients);
  var processable = filterProcessableBlocks(resolved.blocks);
  var needsPreview = shouldShowBulkLabPreview(resolved.blocks, totalOk, {
    quickLabOutput: !!(opts && opts.quickLabOutput)
  });
  return decideSmartPastePlan({
    sourceText,
    resolved,
    processable,
    totalOk,
    needsPreview
  });
}
function resolveFindByRegistro(opts, patients) {
  if (opts && typeof opts.findPatientByRegistro === "function") return opts.findPatientByRegistro;
  return function(reg) {
    return matchPatientByRegistro(reg, patients);
  };
}
function filterProcessableBlocks(blocks) {
  return (blocks || []).filter(function(b) {
    return b && b.canProcess && b.patient && b.okReportCount > 0;
  });
}
function processablePatients(processable) {
  return processable.map(function(b) {
    return b.patient;
  }).filter(Boolean);
}
function planResult(kind, sourceText, blocks, totalOk, primary, candidates, needsPreview, message) {
  return {
    kind,
    sourceText,
    blocks,
    totalOkReports: totalOk,
    primaryPatient: primary || null,
    candidates: candidates || [],
    needsPreview: !!needsPreview,
    message: message || ""
  };
}
function decideSmartPastePlan(ctx) {
  var sourceText = ctx.sourceText;
  var blocks = ctx.resolved.blocks;
  var totalOk = ctx.totalOk;
  var processable = ctx.processable;
  var needsPreview = ctx.needsPreview;
  var amb = ctx.resolved.ambiguousCandidates;
  var pending = ctx.resolved.pendingConfirm;
  if (amb && amb.length) {
    return planResult("ambiguous", sourceText, blocks, totalOk, null, amb, true, "Varios pacientes coinciden \u2014 elige uno");
  }
  if (pending && pending.multi) {
    return planResult(
      "preview",
      sourceText,
      blocks,
      totalOk,
      processable[0] && processable[0].patient,
      processablePatients(processable),
      true,
      "Varios pacientes en el pegado"
    );
  }
  if (pending && pending.patient) {
    return planResult(
      "confirm-single",
      sourceText,
      blocks,
      totalOk,
      pending.patient,
      [pending.patient],
      needsPreview,
      "\xBFProcesar labs de " + (pending.patient.nombre || "este paciente") + "?"
    );
  }
  if (!processable.length) {
    return planResult("preview", sourceText, blocks, totalOk, null, [], true, "Revisa coincidencias antes de procesar");
  }
  if (needsPreview || processable.length > 1) {
    return planResult(
      "preview",
      sourceText,
      blocks,
      totalOk,
      processable[0].patient,
      processablePatients(processable),
      true,
      processable.length > 1 ? "Varios pacientes en el pegado" : "Confirmar laboratorios"
    );
  }
  return planResult(
    "ready",
    sourceText,
    blocks,
    totalOk,
    processable[0].patient,
    [processable[0].patient].filter(Boolean),
    false,
    ""
  );
}
function looksLikeSmartPasteCandidate(text) {
  var s = String(text || "");
  if (s.length < 40) return false;
  if (looksLikeIndicasPasteCandidate(s)) return true;
  if (!/Expediente\s*:/i.test(s)) return false;
  return /Nombre\s*:/i.test(s) || /GASOMETR|BIOMETRIA|QUIMICA|HEMOGLOBINA|BH\b|EGO\b/i.test(s);
}
function shouldSkipGlobalSmartPaste(target) {
  if (!target || typeof target !== "object") return false;
  var el = (
    /** @type {HTMLElement} */
    target
  );
  if (el.id === "lab-input" || el.id === "med-input") return true;
  if (el.closest && el.closest("#lab-input, .lab-input-wrap, #med-receta-paste-modal, #db-unlock-modal, #clinical-login-modal")) {
    return true;
  }
  var tag = String(el.tagName || "").toUpperCase();
  if (tag === "INPUT") {
    var type = String(
      /** @type {HTMLInputElement} */
      el.type || ""
    ).toLowerCase();
    if (type === "password") return true;
  }
  return false;
}
function sumOkReports(blocks) {
  return (blocks || []).reduce(function(acc, b) {
    return acc + (b && b.okReportCount ? b.okReportCount : 0);
  }, 0);
}
function emptyPlan(kind, message) {
  return {
    kind,
    sourceText: "",
    blocks: [],
    totalOkReports: 0,
    primaryPatient: null,
    candidates: [],
    needsPreview: false,
    message: message || ""
  };
}
function resolveBlocksWithNombre(blocks, patients) {
  var ambiguousCandidates = [];
  var pendingConfirm = null;
  var nextBlocks = (blocks || []).map(function(block) {
    if (!block || block.canProcess || !(block.okReportCount > 0)) return block;
    if (block.status !== "no-patient") return block;
    var enrich = enrichBlockWithNombreMatches(block, patients);
    if (enrich.ambiguous) {
      pushUniquePatients(ambiguousCandidates, enrich.candidates);
      return block;
    }
    if (enrich.best) {
      pendingConfirm = mergePendingConfirm(pendingConfirm, enrich.best, block.blockIndex);
      return assignPatientToBulkBlock(block, enrich.best);
    }
    return block;
  });
  return {
    blocks: nextBlocks,
    ambiguousCandidates,
    pendingConfirm
  };
}
function pushUniquePatients(list, candidates) {
  (candidates || []).forEach(function(c) {
    if (!c || c.id == null) return;
    if (list.some(function(x) {
      return String(x.id) === String(c.id);
    })) {
      return;
    }
    list.push(c);
  });
}
function mergePendingConfirm(pending, patient, blockIndex) {
  if (!patient) return pending;
  if (!pending) return { patient, blockIndex };
  if (pending.multi) return pending;
  if (String(pending.patient.id) !== String(patient.id)) return { multi: true };
  return pending;
}

// public/js/features/paste-smart.mjs
var wired = false;
var confirmDom = null;
function showToast(msg, type) {
  if (typeof window.showToast === "function") window.showToast(msg, type);
}
function switchToLabTab() {
  if (typeof window.switchAppTab === "function") window.switchAppTab("lab");
}
function switchToMedTab() {
  if (typeof window.switchAppTab === "function") window.switchAppTab("med");
}
function fillLabInput(text) {
  var ta = document.getElementById("lab-input");
  if (ta) ta.value = String(text || "");
}
function getQuickLabOutput() {
  try {
    var raw = localStorage.getItem("labOutputPrefs");
    if (!raw) return false;
    var prefs = JSON.parse(raw);
    return !!(prefs && prefs.quickLabOutput);
  } catch (err) {
    void err;
    return false;
  }
}
function loadLabPasteRuntime() {
  return import("/mobile/js/chunks/lazy-feature-routes-SSSCCZIU.js").then(function(routes) {
    return routes.ensureLabsLoaded();
  }).then(function() {
    return Promise.all([
      import("/mobile/js/chunks/lab-bulk-preview-modal-I7CHQTRO.js"),
      import("/mobile/js/chunks/lab-panel-workbench-B6CMR2HR.js")
    ]);
  }).then(function(mods) {
    return {
      openLabBulkPreviewModal: mods[0].openLabBulkPreviewModal,
      finalizeBulkLabPaste: mods[1].finalizeBulkLabPaste
    };
  });
}
function processSmartPaste(text, opts) {
  var plan = planSmartPaste(text, {
    patients: getPatients(),
    findPatientByRegistro,
    quickLabOutput: getQuickLabOutput()
  });
  if (plan.kind === "empty" || plan.kind === "not-some") {
    if (opts && opts.force) showToast(plan.message || "No hay reporte SOME", "error");
    return plan;
  }
  if (plan.kind === "indicas") {
    if (appTabForSmartPasteKind(plan.kind) === "med") switchToMedTab();
    procesarRecetaFromText(plan.sourceText);
    return plan;
  }
  if (plan.kind === "ambiguous" || plan.kind === "confirm-single") {
    openSmartPasteConfirm(plan, plan.kind);
    return plan;
  }
  void executeSmartPastePlan(plan);
  return plan;
}
function procesarSomeFromClipboard() {
  return readClipboardText().then(function(text) {
    if (!String(text || "").trim()) {
      showToast("Copia un reporte SOME al portapapeles primero", "error");
      return null;
    }
    return processSmartPaste(text, { force: true });
  });
}
function initPasteSmart() {
  if (wired || typeof document === "undefined") return;
  wired = true;
  document.addEventListener("paste", onDocumentPaste, true);
}
function onDocumentPaste(ev) {
  if (!ev || !ev.clipboardData) return;
  if (shouldSkipGlobalSmartPaste(ev.target)) return;
  var text = "";
  try {
    text = ev.clipboardData.getData("text/plain") || "";
  } catch (err) {
    void err;
    return;
  }
  if (!looksLikeSmartPasteCandidate(text)) return;
  ev.preventDefault();
  ev.stopPropagation();
  processSmartPaste(text, { force: true });
}
function executeSmartPastePlan(plan, chosenPatient) {
  var blocks = (plan.blocks || []).slice();
  var sourceText = plan.sourceText || "";
  if (chosenPatient) {
    blocks = blocks.map(function(b) {
      if (b && b.okReportCount > 0 && (!b.canProcess || !b.patient)) {
        return assignPatientToBulkBlock(b, chosenPatient);
      }
      return b;
    });
  }
  var primary = chosenPatient || plan.primaryPatient || blocks[0] && blocks[0].patient || null;
  if (primary && primary.id != null) selectPatient(primary.id);
  switchToLabTab();
  fillLabInput(sourceText);
  var totalOk = plan.totalOkReports || 0;
  var needsPreview = !!plan.needsPreview || plan.kind === "preview";
  return loadLabPasteRuntime().then(function(rt) {
    if (needsPreview) {
      rt.openLabBulkPreviewModal({
        blocks,
        sourceText,
        onConfirm: function() {
          rt.finalizeBulkLabPaste(sourceText, blocks, totalOk);
        }
      });
      return;
    }
    rt.finalizeBulkLabPaste(sourceText, blocks, totalOk);
  });
}
function openSmartPasteConfirm(plan, mode) {
  var d = ensureConfirmDom();
  cancelOverlayClose(d.backdrop, { panelEl: d.panel });
  d.backdrop.hidden = false;
  d.panel.hidden = false;
  d.title.textContent = mode === "ambiguous" ? "\xBFA qu\xE9 paciente pertenece?" : "Confirmar paciente";
  d.lead.textContent = mode === "ambiguous" ? "El reporte coincide con m\xE1s de un paciente del censo. Elige uno para procesar." : plan.message || "Confirma antes de guardar en el expediente.";
  d.list.textContent = "";
  var list = mode === "ambiguous" ? plan.candidates : plan.candidates.slice(0, 1);
  list.forEach(function(p) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "paste-smart-choice ui-approval-option";
    var nameEl = document.createElement("span");
    nameEl.className = "paste-smart-choice-name";
    nameEl.textContent = p.nombre || "Sin nombre";
    var hintEl = document.createElement("span");
    hintEl.className = "paste-smart-choice-hint";
    hintEl.textContent = patientHint(p);
    btn.appendChild(nameEl);
    btn.appendChild(hintEl);
    btn.addEventListener("click", function() {
      closeSmartPasteConfirm();
      void executeSmartPastePlan(plan, p);
    });
    d.list.appendChild(btn);
  });
  d.cancel.focus();
}
function patientHint(p) {
  var parts = [];
  if (p.registro) parts.push("Exp " + p.registro);
  var bed = [p.cuarto, p.cama].filter(Boolean).join("-");
  if (bed) parts.push(bed);
  return parts.join(" \xB7 ") || "Sin registro";
}
function closeSmartPasteConfirm() {
  if (!confirmDom) return;
  var d = confirmDom;
  closeOverlayAnimated(
    d.backdrop,
    function() {
      d.backdrop.hidden = true;
      d.panel.hidden = true;
    },
    { panelEl: d.panel }
  );
}
function ensureConfirmDom() {
  if (confirmDom) return confirmDom;
  var backdrop = document.createElement("div");
  backdrop.className = "paste-smart-backdrop";
  backdrop.id = "paste-smart-backdrop";
  backdrop.hidden = true;
  backdrop.addEventListener("click", function(ev) {
    if (ev.target === backdrop) closeSmartPasteConfirm();
  });
  var panel = document.createElement("div");
  panel.className = "paste-smart-modal ui-approval-modal";
  panel.id = "paste-smart-modal";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "paste-smart-title");
  var head = document.createElement("div");
  head.className = "paste-smart-head";
  var title = document.createElement("h3");
  title.id = "paste-smart-title";
  var lead = document.createElement("p");
  lead.className = "paste-smart-lead";
  head.appendChild(title);
  head.appendChild(lead);
  var list = document.createElement("div");
  list.className = "paste-smart-list ui-approval-options";
  list.setAttribute("role", "list");
  var actions = document.createElement("div");
  actions.className = "paste-smart-actions";
  var cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "btn-med-secondary";
  cancel.textContent = "Cancelar";
  cancel.addEventListener("click", closeSmartPasteConfirm);
  actions.appendChild(cancel);
  panel.appendChild(head);
  panel.appendChild(list);
  panel.appendChild(actions);
  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  confirmDom = { backdrop, panel, title, lead, list, cancel };
  return confirmDom;
}
function readClipboardText() {
  if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
    return navigator.clipboard.readText().catch(function() {
      return "";
    });
  }
  return Promise.resolve("");
}
function isSmartPasteConfirmOpen() {
  return !!(confirmDom && confirmDom.panel && !confirmDom.panel.hidden);
}
function closeSmartPasteConfirmIfOpen() {
  if (isSmartPasteConfirmOpen()) closeSmartPasteConfirm();
}
var windowHandlers = {
  processSmartPaste,
  procesarSomeFromClipboard,
  closeSmartPasteConfirm
};
export {
  closeSmartPasteConfirmIfOpen,
  initPasteSmart,
  isSmartPasteConfirmOpen,
  procesarSomeFromClipboard,
  processSmartPaste,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/paste-smart-2NBVKEOY.js.map
