import {
  rankItems
} from "/mobile/js/chunks/chunk-PQQMOA4J.js";
import {
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
import {
  GROUP_LABELS,
  SECTION_LABELS,
  groupSections
} from "/mobile/js/chunks/chunk-KEFN326O.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-5DAE7PK3.js";
import "/mobile/js/chunks/chunk-6A62XDR6.js";
import "/mobile/js/chunks/chunk-MOSUQW6R.js";
import "/mobile/js/chunks/chunk-BGYDWUEW.js";
import "/mobile/js/chunks/chunk-7EPXWU6A.js";
import "/mobile/js/chunks/chunk-JIKZNXZR.js";
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
import "/mobile/js/chunks/chunk-M6MLPK4W.js";
import "/mobile/js/chunks/chunk-4QI24DFU.js";
import {
  getConsolidatedTabs
} from "/mobile/js/chunks/chunk-ZVJAFSHG.js";
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
import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-JBHSWL2Z.js";
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
import "/mobile/js/chunks/chunk-HDD2EUC6.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-VRNWC4P2.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-KZT7D6I2.js";
import "/mobile/js/chunks/chunk-3YCJDDNO.js";
import "/mobile/js/chunks/chunk-EE5CSOUC.js";
import "/mobile/js/chunks/chunk-WTVHUFEL.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-75QM3TGW.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-NPUSZB5W.js";

// public/js/command-palette-model.mjs
var APP_TAB_ITEMS = [
  { kind: "app-tab", tab: "nota", label: "Paciente", hint: "" },
  { kind: "app-tab", tab: "lab", label: "Laboratorio", hint: "" },
  { kind: "app-tab", tab: "med", label: "Manejo", hint: "" },
  { kind: "app-tab", tab: "agenda", label: "Agenda", hint: "" }
];
var ACTION_ITEMS = [
  {
    kind: "action",
    actionId: "procesar-some",
    label: "Procesar SOME",
    hint: "",
    keywords: "procesar some labs pegar portapapeles paste inteligente"
  },
  {
    kind: "action",
    actionId: "lab-repo-batch",
    label: "Actualizar labs",
    hint: "",
    keywords: "labs laboratorio repositorio batch actualizar equipo importar"
  },
  {
    kind: "action",
    actionId: "lab-manual-entry",
    label: "Labs externos",
    hint: "",
    keywords: "labs externos manual entrada celdas agregar estudio"
  },
  {
    kind: "action",
    actionId: "open-lab",
    label: "Abrir laboratorio",
    hint: "",
    keywords: "labs laboratorio some abrir"
  },
  {
    kind: "action",
    actionId: "open-eventualidades",
    label: "Abrir eventualidades",
    hint: "",
    keywords: "eventualidades nota sala abrir"
  },
  {
    kind: "action",
    actionId: "open-ea",
    label: "Abrir estado actual",
    hint: "",
    keywords: "ea estado actual monitoreo abrir"
  },
  {
    kind: "action",
    actionId: "export-note",
    label: "Exportar nota",
    hint: "",
    keywords: "exportar nota salida rapida docx quick"
  },
  {
    kind: "action",
    actionId: "new-pendiente",
    label: "Nuevo pendiente",
    hint: "",
    keywords: "pendiente todo agregar nuevo"
  },
  {
    kind: "action",
    actionId: "copy-labs",
    label: "Copiar labs SOAP",
    hint: "",
    keywords: "copiar labs soap portapapeles"
  },
  {
    kind: "action",
    actionId: "open-pase",
    label: "Abrir pase",
    hint: "",
    keywords: "pase ronda board abrir"
  }
];
function sectionEntries(settings2) {
  var out = [];
  getConsolidatedTabs(settings2 || {}).forEach(function(group) {
    if (group === "paciente") {
      out.push({
        section: "resumen",
        label: GROUP_LABELS.paciente,
        groupLabel: GROUP_LABELS.paciente
      });
      return;
    }
    groupSections(group, settings2).forEach(function(section) {
      out.push({
        section,
        label: SECTION_LABELS[section] || section,
        groupLabel: GROUP_LABELS[group] || group
      });
    });
  });
  return out;
}
function paletteItemText(it) {
  var label = String(it && it.label || "");
  var keywords = String(it && it.keywords || "").trim();
  return keywords ? label + " " + keywords : label;
}
function buildPaletteItems(settings2, patientsList) {
  var items = [];
  ACTION_ITEMS.forEach(function(it) {
    items.push({
      kind: "action",
      actionId: it.actionId,
      label: it.label,
      hint: it.hint || "Acci\xF3n",
      keywords: it.keywords || ""
    });
  });
  var secs = sectionEntries(settings2);
  secs.forEach(function(se) {
    items.push({ kind: "section", section: se.section, label: se.label, hint: se.groupLabel });
  });
  APP_TAB_ITEMS.forEach(function(it) {
    items.push({ kind: "app-tab", tab: it.tab, label: it.label, hint: "" });
  });
  (patientsList || []).forEach(function(p) {
    var name = String(p && p.nombre || "").trim();
    if (!name) return;
    var cuarto = String(p && p.cuarto || "").trim();
    var pinned = !!(p && p.pinned);
    items.push({
      kind: "patient",
      patientId: p.id,
      label: name,
      hint: pinned ? cuarto ? cuarto + " \xB7 fijado" : "Fijado" : cuarto,
      pinned
    });
    secs.forEach(function(se) {
      items.push({
        kind: "patient-section",
        patientId: p.id,
        section: se.section,
        label: se.label + " \u2014 " + name,
        hint: cuarto
      });
    });
  });
  return items;
}
function emptyPaletteRanking(items, max) {
  var actions = [];
  var pinned = [];
  var patients = [];
  var sections = [];
  (items || []).forEach(function(it) {
    if (it.kind === "action") actions.push(it);
    else if (it.kind === "patient" && it.pinned) pinned.push(it);
    else if (it.kind === "patient") patients.push(it);
    else if (it.kind === "section") sections.push(it);
  });
  var pinSlots = pinned.length ? Math.min(pinned.length, Math.min(3, Math.max(0, max - 6))) : 0;
  var actionSlice = actions.slice(0, Math.max(0, max - pinSlots));
  var pinnedSlice = pinned.slice(0, Math.max(0, max - actionSlice.length));
  var rest = Math.max(0, max - actionSlice.length - pinnedSlice.length);
  return actionSlice.concat(pinnedSlice, patients.slice(0, rest), sections).slice(0, max);
}
function rankPalette(query, items, limit) {
  var max = limit || 12;
  var q = String(query || "").trim();
  if (!q) return emptyPaletteRanking(items, max);
  return rankItems(q, items, paletteItemText).slice(0, max).map(function(r) {
    return r.item;
  });
}

// public/js/features/command-palette.mjs
var ctx = null;
var dom = null;
var results = [];
var selectedIndex = 0;
function setCommandPaletteContext(c) {
  ctx = c;
}
function settings() {
  return ctx && typeof ctx.getSettings === "function" ? ctx.getSettings() : {};
}
function callWin(name, arg) {
  var fn = typeof window !== "undefined" ? window[name] : null;
  if (typeof fn !== "function") return false;
  if (arguments.length > 1) fn(arg);
  else fn();
  return true;
}
function ensureLabsThen(exportName) {
  if (callWin(exportName)) return;
  void import("/mobile/js/chunks/lazy-feature-routes-SSSCCZIU.js").then(function(routes) {
    return routes.ensureLabsLoaded();
  }).then(function(mod) {
    if (mod && typeof mod[exportName] === "function") {
      mod[exportName]();
      return;
    }
    callWin(exportName);
  });
}
function focusTodoInput() {
  requestAnimationFrame(function() {
    var el = document.getElementById("todo-input");
    if (el && typeof el.focus === "function") el.focus();
  });
}
function goExpedienteSection(section) {
  if (typeof window.switchAppTab === "function") window.switchAppTab("nota");
  if (typeof window.switchInnerTab === "function") window.switchInnerTab(section);
}
var ACTION_HANDLERS = {
  "procesar-some": function() {
    void import("/mobile/js/chunks/paste-smart-2NBVKEOY.js").then(function(mod) {
      mod.procesarSomeFromClipboard();
    });
  },
  "lab-repo-batch": function() {
    ensureLabsThen("openLabRepoBatchModal");
  },
  "lab-manual-entry": function() {
    ensureLabsThen("openLabManualEntryModal");
  },
  "open-lab": function() {
    if (!callWin("openPaseSectionInNormal", "labs")) callWin("switchAppTab", "lab");
  },
  "open-eventualidades": function() {
    goExpedienteSection("eventualidades");
  },
  "open-ea": function() {
    goExpedienteSection("estadoActual");
  },
  "export-note": function() {
    callWin("quickExportCurrentPatient");
  },
  "new-pendiente": function() {
    if (!callWin("openPaseSectionInNormal", "pendientes")) goExpedienteSection("todo");
    focusTodoInput();
  },
  "copy-labs": function() {
    ensureLabsThen("copiarLabsAlPortapapeles");
  },
  "open-pase": function() {
    callWin("setUiDensity", "pase");
  }
};
function executeAction(item) {
  var id = item && item.actionId;
  var handler = id && ACTION_HANDLERS[id];
  if (handler) handler();
}
function ensureDom() {
  if (dom) return dom;
  var backdrop = document.createElement("div");
  backdrop.className = "cmdk-backdrop";
  backdrop.hidden = true;
  backdrop.addEventListener("click", closeCommandPalette);
  var panel = document.createElement("div");
  panel.className = "cmdk material-glass";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Ir a secci\xF3n, paciente o acci\xF3n");
  var input = document.createElement("input");
  input.className = "cmdk-input";
  input.type = "text";
  input.placeholder = "Ir a\u2026 o acci\xF3n (ej. \u201Cexportar\u201D, \u201Clabs\u201D, \u201Cpase\u201D)";
  input.setAttribute("aria-label", "Buscar secci\xF3n, paciente o acci\xF3n");
  var list = document.createElement("ul");
  list.className = "cmdk-list";
  list.setAttribute("role", "listbox");
  input.addEventListener("input", function() {
    renderResults(input.value);
  });
  input.addEventListener("keydown", function(ev) {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      moveSelection(1);
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      moveSelection(-1);
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      if (results[selectedIndex]) executeItem(results[selectedIndex]);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      closeCommandPalette();
    }
  });
  panel.appendChild(input);
  panel.appendChild(list);
  document.body.appendChild(backdrop);
  document.body.appendChild(panel);
  dom = { backdrop, panel, input, list };
  return dom;
}
function moveSelection(delta) {
  if (!results.length) return;
  selectedIndex = (selectedIndex + delta + results.length) % results.length;
  syncSelection();
}
function syncSelection() {
  if (!dom) return;
  Array.prototype.forEach.call(dom.list.children, function(li, i) {
    li.classList.toggle("is-selected", i === selectedIndex);
    li.setAttribute("aria-selected", i === selectedIndex ? "true" : "false");
  });
  var sel = dom.list.children[selectedIndex];
  if (sel && typeof sel.scrollIntoView === "function") sel.scrollIntoView({ block: "nearest" });
}
function renderResults(query) {
  var d = ensureDom();
  var items = buildPaletteItems(settings(), getPatients());
  results = rankPalette(query, items, 12);
  selectedIndex = 0;
  d.list.textContent = "";
  results.forEach(function(item, i) {
    var li = document.createElement("li");
    li.className = "cmdk-item" + (item.kind === "action" ? " cmdk-item--action" : "") + (i === 0 ? " is-selected" : "");
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", i === 0 ? "true" : "false");
    li.dataset.cmdkIndex = String(i);
    var label = document.createElement("span");
    label.className = "cmdk-item-label";
    label.textContent = item.label;
    li.appendChild(label);
    var hintText = item.hint ? String(item.hint) : "";
    if (hintText) {
      var hint = document.createElement("span");
      hint.className = "cmdk-item-hint";
      hint.textContent = hintText;
      li.appendChild(hint);
    }
    li.addEventListener("pointerenter", function() {
      if (selectedIndex === i) return;
      selectedIndex = i;
      syncSelection();
    });
    li.addEventListener("click", function() {
      executeItem(item);
    });
    d.list.appendChild(li);
  });
  if (!results.length) {
    var empty = document.createElement("li");
    empty.className = "cmdk-empty";
    empty.setAttribute("role", "status");
    if (String(query || "").trim()) {
      empty.innerHTML = '<span class="cmdk-empty-icon" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></span><span class="empty-state-title">Sin coincidencias</span><span class="empty-state-lead">Prueba con una acci\xF3n (exportar, labs), el nombre del paciente o una secci\xF3n.</span>';
    } else {
      empty.innerHTML = '<span class="cmdk-empty-icon" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg></span><span class="empty-state-title">Atajos del workbench</span><span class="empty-state-lead">Escribe para buscar acciones, pacientes o secciones del expediente.</span>';
    }
    d.list.appendChild(empty);
  }
}
function executeItem(item) {
  closeCommandPalette();
  if (item.kind === "action") {
    executeAction(item);
    return;
  }
  if (item.kind === "app-tab") {
    if (typeof window.switchAppTab === "function") window.switchAppTab(item.tab);
    return;
  }
  if (item.kind === "section") {
    if (typeof window.switchInnerTab === "function") window.switchInnerTab(item.section);
    return;
  }
  if (item.kind === "patient") {
    selectPatient(item.patientId);
    return;
  }
  if (item.kind === "patient-section") {
    selectPatient(item.patientId);
    if (typeof window.switchInnerTab === "function") window.switchInnerTab(item.section);
  }
}
function openCommandPalette() {
  if (isMobileWeb()) return;
  var d = ensureDom();
  d.backdrop.hidden = false;
  d.panel.hidden = false;
  d.input.value = "";
  renderResults("");
  d.input.focus();
}
function closeCommandPalette() {
  if (!dom) return;
  var d = dom;
  d.input.blur();
  d.backdrop.hidden = true;
  d.panel.hidden = true;
}
var windowHandlers = {
  openCommandPalette,
  closeCommandPalette
};
export {
  closeCommandPalette,
  openCommandPalette,
  setCommandPaletteContext,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/command-palette-PZRZPN2J.js.map
