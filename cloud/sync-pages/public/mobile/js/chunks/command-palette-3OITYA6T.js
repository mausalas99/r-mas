import {
  rankItems
} from "/mobile/js/chunks/chunk-PQQMOA4J.js";
import {
  selectPatient
} from "/mobile/js/chunks/chunk-R2GBRWQ3.js";
import "/mobile/js/chunks/chunk-WPXKJVD2.js";
import "/mobile/js/chunks/chunk-C6U3A3QO.js";
import "/mobile/js/chunks/chunk-CYVNWXHE.js";
import {
  GROUP_LABELS,
  SECTION_LABELS,
  getConsolidatedTabs,
  groupSections
} from "/mobile/js/chunks/chunk-EMCMETSD.js";
import "/mobile/js/chunks/chunk-F3XP3RDZ.js";
import "/mobile/js/chunks/chunk-KBCDDKJZ.js";
import "/mobile/js/chunks/chunk-5C7JYUSB.js";
import "/mobile/js/chunks/chunk-4FVV5X45.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-UQ6RG7U2.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import "/mobile/js/chunks/chunk-WSJX2ILZ.js";
import "/mobile/js/chunks/chunk-FV54XRK2.js";
import "/mobile/js/chunks/chunk-GLHG6K2U.js";
import "/mobile/js/chunks/chunk-J6VINJP7.js";
import "/mobile/js/chunks/chunk-QIUON47E.js";
import "/mobile/js/chunks/chunk-S2GJRSU7.js";
import "/mobile/js/chunks/chunk-UPP7BGNG.js";
import "/mobile/js/chunks/chunk-4YXLG5F2.js";
import "/mobile/js/chunks/chunk-ZMCDERYV.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-GNLW4YFR.js";
import "/mobile/js/chunks/chunk-FGKC3QPA.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-W5HGKDOD.js";
import "/mobile/js/chunks/chunk-GSMC2OHE.js";
import "/mobile/js/chunks/chunk-S3TI3OAS.js";
import "/mobile/js/chunks/chunk-CE75LS7G.js";
import "/mobile/js/chunks/chunk-S6K5O6BP.js";
import "/mobile/js/chunks/chunk-TBKNEONY.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-BP4QC5UJ.js";
import "/mobile/js/chunks/chunk-2ZXFDPTM.js";
import "/mobile/js/chunks/chunk-YSBJHYC4.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-JYYMJKCB.js";
import "/mobile/js/chunks/chunk-VL5J4B3E.js";
import "/mobile/js/chunks/chunk-6OGC4PQJ.js";
import "/mobile/js/chunks/chunk-QQOJTZU6.js";
import "/mobile/js/chunks/chunk-N74FWNUD.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-LTZPVWLE.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-PEG2E4FB.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-IVOJHSUB.js";
import "/mobile/js/chunks/chunk-GTJXSHII.js";
import "/mobile/js/chunks/chunk-KPMBH6IG.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  patients
} from "/mobile/js/chunks/chunk-LUBBZBEB.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-RU5G223P.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-B4Q7USSM.js";
import "/mobile/js/chunks/chunk-T2MO3KS5.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-MGEK6PHD.js";
import "/mobile/js/chunks/chunk-GRJDNRYE.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";
import "/mobile/js/chunks/chunk-FORXNEKH.js";

// public/js/command-palette-model.mjs
var APP_TAB_ITEMS = [
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
        section: "todo",
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
  var patients2 = [];
  var sections = [];
  (items || []).forEach(function(it) {
    if (it.kind === "action") actions.push(it);
    else if (it.kind === "patient" && it.pinned) pinned.push(it);
    else if (it.kind === "patient") patients2.push(it);
    else if (it.kind === "section") sections.push(it);
  });
  var pinSlots = pinned.length ? Math.min(pinned.length, Math.min(3, Math.max(0, max - 6))) : 0;
  var actionSlice = actions.slice(0, Math.max(0, max - pinSlots));
  var pinnedSlice = pinned.slice(0, Math.max(0, max - actionSlice.length));
  var rest = Math.max(0, max - actionSlice.length - pinnedSlice.length);
  return actionSlice.concat(pinnedSlice, patients2.slice(0, rest), sections).slice(0, max);
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
  void import("/mobile/js/chunks/lazy-feature-routes-5GFDJTJG.js").then(function(routes) {
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
    void import("/mobile/js/chunks/paste-smart-CKAYQ5WP.js").then(function(mod) {
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
  var items = buildPaletteItems(settings(), patients);
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
      empty.innerHTML = '<span class="empty-state-title">Sin coincidencias</span><span class="empty-state-lead">Prueba con una acci\xF3n (exportar, labs), el nombre del paciente o una secci\xF3n.</span>';
    } else {
      empty.innerHTML = '<span class="empty-state-title">Atajos del workbench</span><span class="empty-state-lead">Escribe para buscar acciones, pacientes o secciones del expediente.</span>';
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
//# sourceMappingURL=/js/chunks/command-palette-3OITYA6T.js.map
