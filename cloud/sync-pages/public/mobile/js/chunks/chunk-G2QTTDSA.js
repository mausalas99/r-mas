import {
  buildParsedBySectionFromResLabs,
  extractParsedValues,
  parsearSecciones
} from "/mobile/js/chunks/chunk-WEWTMUQK.js";
import {
  buildLabsGlanceForDay
} from "/mobile/js/chunks/chunk-G75IBCW4.js";
import {
  daySelectValue
} from "/mobile/js/chunks/chunk-XS2CWLHC.js";
import {
  buildEstudiosCopyLinesFromLabSets,
  extractLabDataLines,
  groupLabHistoryByDay,
  labSetParseFingerprint,
  resolveEstudiosCopyOptions
} from "/mobile/js/chunks/chunk-WF6PJVIL.js";
import {
  escTxt,
  procesarLabs,
  sanitizeResLabsChunks
} from "/mobile/js/chunks/chunk-7XJNQXQX.js";
import {
  inferFechaLabSetFromId
} from "/mobile/js/chunks/chunk-US2NRS5S.js";
import {
  isModeSala
} from "/mobile/js/chunks/chunk-BURG7PNJ.js";
import {
  getIndicaciones,
  getLabHistory,
  getListadoProblemas,
  getMedPharmProfileByPatient,
  getMedRecetaByPatient,
  getNotes,
  getPatients,
  getRecetaHuByPatient,
  getVpoByPatient,
  persistClinicalState
} from "/mobile/js/chunks/chunk-FBUYMHQK.js";
import {
  normalizeLabHistoryPatientSets,
  storage
} from "/mobile/js/chunks/chunk-YUYECAQZ.js";
import {
  areLabSetsEquivalent,
  buildRefsBySectionFromReport,
  bumpLabHistoryRevision,
  collectPriorRefsFromHistory,
  extractLabReportHora,
  findConflictingSameDateTimeGroups,
  findExactDuplicateLabGroups,
  findNormalizedSourceDuplicateGroups,
  looksLikeSomeLabReport,
  mergeGasRefs_,
  normalizeFechaLabHistory,
  normalizeHoraLabHistory,
  reprocessLabResultLines_,
  sortLabHistoryChronological
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import {
  escHtml
} from "/mobile/js/chunks/chunk-64IP3Y67.js";

// public/js/motion-mode.mjs
var MOTION_MODES = ["sobrio", "mixto", "expresivo"];
var ALL_MOTION_CLASSES = ["motion-sobrio", "motion-expresivo"];
function normalizeMotionMode(raw) {
  return MOTION_MODES.includes(raw) ? raw : "mixto";
}
function motionClassFor(mode) {
  const m = normalizeMotionMode(mode);
  return m === "mixto" ? null : "motion-" + m;
}

// public/js/features/workbench/date-popover.mjs
var WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];
var MONTH_FORMATTER = new Intl.DateTimeFormat("es", { month: "long" });
var activePopover = null;
function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, n) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function mondayIndex(d) {
  return (d.getDay() + 6) % 7;
}
function buildCalendarGridDays(monthDate) {
  const first = startOfMonth(monthDate);
  const gridStart = addDays(first, -mondayIndex(first));
  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    days.push({ date: d, inMonth: d.getMonth() === monthDate.getMonth() });
  }
  return days;
}
function buildDatePopoverQuickFilters(ctx = {}) {
  return [
    { id: "hoy", label: "Hoy", resolve: (today) => today },
    { id: "ayer", label: "Ayer", resolve: (today) => addDays(today, -1) },
    {
      id: "ultimo-pase",
      label: "\xDAltimo pase",
      resolve: () => ctx.lastPaseDate || null,
      disabled: !ctx.lastPaseDate
    },
    { id: "7-dias", label: "7 d\xEDas", resolve: (today) => addDays(today, -7), isRange: true }
  ];
}
function normalizeDayKeyForCompare(key) {
  return String(key).split("-").map((part) => String(parseInt(part, 10))).join("-");
}
function buildDatePopoverLabDaysHtml(labDays, activeKey) {
  if (!labDays || !labDays.length) return "";
  const normalizedActiveKey = activeKey ? normalizeDayKeyForCompare(activeKey) : null;
  const rows = labDays.map((d) => {
    const classes = ["wb-date-popover-labday"];
    if (d.disabled) classes.push("wb-date-popover-labday--nodata");
    if (!d.disabled && normalizedActiveKey && normalizeDayKeyForCompare(d.dayKey) === normalizedActiveKey) {
      classes.push("wb-date-popover-labday--active");
    }
    return `<button type="button" class="${classes.join(" ")}"` + (d.disabled ? " disabled" : ` data-wb-date-labday="${escHtml(d.dayKey)}"`) + `><span class="wb-date-popover-labday-label">${escHtml(d.label)}</span><span class="wb-date-popover-labday-meta">${escHtml(d.meta || "")}</span></button>`;
  }).join("");
  return '<div class="wb-date-popover-labdays"><div class="wb-date-popover-labdays-head">D\xEDas con labs</div><div class="wb-date-popover-labdays-list">' + rows + "</div></div>";
}
function buildDatePopoverHtml(state) {
  const {
    monthDate,
    selectedDate = null,
    today = /* @__PURE__ */ new Date(),
    hasData = () => true,
    loadedRangeLabel = "",
    quickFilters = [],
    activeQuickFilterId = null,
    labDays = []
  } = state;
  const todayKey = toDateKey(today);
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const headerHtml = `<div class="wb-date-popover-header"><span class="wb-date-popover-month">${escHtml(capitalize(MONTH_FORMATTER.format(monthDate)) + " " + monthDate.getFullYear())}</span><div class="wb-date-popover-nav"><button type="button" class="wb-date-popover-nav-btn" data-wb-date-prev aria-label="Mes anterior">\u2039</button><button type="button" class="wb-date-popover-nav-btn" data-wb-date-next aria-label="Mes siguiente">\u203A</button></div></div>`;
  const weekdaysHtml = '<div class="wb-date-popover-weekdays">' + WEEKDAY_LABELS.map((w) => `<span>${w}</span>`).join("") + "</div>";
  const days = buildCalendarGridDays(monthDate);
  const gridHtml = '<div class="wb-date-popover-grid">' + days.map(({ date, inMonth }) => {
    const key = toDateKey(date);
    const dayHasData = inMonth && hasData(key);
    const isToday = key === todayKey;
    const isSelected = key === selectedKey;
    const classes = ["wb-date-popover-day"];
    if (!inMonth || !dayHasData) classes.push("wb-date-popover-day--nodata");
    if (isToday) classes.push("wb-date-popover-day--today");
    if (isSelected) classes.push("wb-date-popover-day--selected");
    const clickable = inMonth && dayHasData;
    return `<button type="button" class="${classes.join(" ")}"` + (clickable ? ` data-wb-date-day="${key}"` : " disabled") + `>${date.getDate()}</button>`;
  }).join("") + "</div>";
  const chipsHtml = quickFilters.length ? '<div class="wb-date-popover-chips">' + quickFilters.map(
    (f) => `<button type="button" class="wb-date-popover-chip${f.id === activeQuickFilterId ? " wb-date-popover-chip--active" : ""}"` + (f.disabled ? " disabled" : "") + ` data-wb-date-quick="${f.id}">${escHtml(f.label)}</button>`
  ).join("") + "</div>" : "";
  const labDaysHtml = buildDatePopoverLabDaysHtml(labDays, selectedKey);
  const footerHtml = loadedRangeLabel ? `<div class="wb-date-popover-footer"><span class="wb-date-popover-range">${escHtml(loadedRangeLabel)}</span></div>` : "";
  return '<div class="wb-date-popover" role="dialog" aria-label="Calendario">' + headerHtml + weekdaysHtml + gridHtml + chipsHtml + labDaysHtml + footerHtml + "</div>";
}
function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function closeDatePopover() {
  if (!activePopover) return;
  const { el, onKeydown, onDocClick } = activePopover;
  document.removeEventListener("keydown", onKeydown);
  document.removeEventListener("mousedown", onDocClick);
  if (el.parentNode) el.parentNode.removeChild(el);
  activePopover = null;
}
function openDatePopover(anchorEl, opts = {}) {
  if (!anchorEl || typeof document === "undefined") return void 0;
  closeDatePopover();
  const today = opts.today || /* @__PURE__ */ new Date();
  const state = {
    monthDate: opts.selectedDate || today,
    selectedDate: opts.selectedDate || null,
    today,
    hasData: opts.hasData,
    loadedRangeLabel: opts.loadedRangeLabel,
    quickFilters: opts.quickFilters || [],
    activeQuickFilterId: null,
    labDays: opts.labDays || []
  };
  const wrap = document.createElement("div");
  wrap.className = "wb-date-popover-host";
  document.body.appendChild(wrap);
  function render() {
    wrap.innerHTML = buildDatePopoverHtml(state);
    positionPopover();
    wireInteractions();
  }
  function positionPopover() {
    const rect = anchorEl.getBoundingClientRect();
    wrap.style.position = "fixed";
    wrap.style.top = `${rect.bottom + 6}px`;
    wrap.style.left = `${rect.left}px`;
    wrap.style.zIndex = "1000";
  }
  function wireInteractions() {
    wrap.querySelector("[data-wb-date-prev]")?.addEventListener("click", () => {
      state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() - 1, 1);
      render();
    });
    wrap.querySelector("[data-wb-date-next]")?.addEventListener("click", () => {
      state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + 1, 1);
      render();
    });
    wrap.querySelectorAll("[data-wb-date-day]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-wb-date-day");
        if (typeof opts.onSelectDay === "function") opts.onSelectDay(key);
        closeDatePopover();
      });
    });
    wrap.querySelectorAll("[data-wb-date-quick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-wb-date-quick");
        const filter = state.quickFilters.find((f) => f.id === id);
        const resolved = filter && typeof filter.resolve === "function" ? filter.resolve(today) : null;
        if (typeof opts.onQuickFilter === "function") opts.onQuickFilter(id, resolved);
        closeDatePopover();
      });
    });
    wrap.querySelectorAll("[data-wb-date-labday]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-wb-date-labday");
        if (typeof opts.onSelectLabDay === "function") opts.onSelectLabDay(key);
        closeDatePopover();
      });
    });
  }
  render();
  const onKeydown = (ev) => {
    if (ev.key === "Escape") closeDatePopover();
  };
  const onDocClick = (ev) => {
    if (!wrap.contains(ev.target) && ev.target !== anchorEl && !anchorEl.contains(ev.target)) {
      closeDatePopover();
    }
  };
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("mousedown", onDocClick);
  activePopover = { el: wrap, onKeydown, onDocClick };
  return wrap;
}

// public/js/features/workbench/header-date-popover-model.mjs
var DAY_LABEL_FORMATTER = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" });
function dayKeyToIsoDate(dayKey) {
  const parts = String(dayKey || "").split("-");
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map((p) => parseInt(p, 10));
  if (![y, m, d].every(Number.isFinite)) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function shortDayLabel(dayKey) {
  const [y, m, d] = dayKey.split("-").map((p) => parseInt(p, 10));
  return DAY_LABEL_FORMATTER.format(new Date(y, m - 1, d)).replace(".", "");
}
function alteredCountForDay(dayKey, sets) {
  const glance = buildLabsGlanceForDay({ todayKey: dayKey, orderedSets: sets });
  return glance.envios.reduce((sum, e) => sum + e.groups.reduce((s, g2) => s + g2.chips.length, 0), 0);
}
function buildLabDaysForCalendar({ sets, todayIso } = {}) {
  const groups = groupLabHistoryByDay(sets || []).filter(
    (g2) => g2.dayKey !== "Anterior" && g2.dayKey !== "unknown"
  );
  const isoDates = /* @__PURE__ */ new Set();
  const labDays = groups.map((g2) => {
    const iso = dayKeyToIsoDate(g2.dayKey);
    if (iso) isoDates.add(iso);
    const isToday = !!iso && iso === todayIso;
    const shortLabel = shortDayLabel(g2.dayKey);
    const alteredCount = alteredCountForDay(g2.dayKey, sets);
    return {
      dayKey: g2.dayKey,
      isoDate: iso,
      label: isToday ? `Hoy \xB7 ${shortLabel}` : shortLabel,
      meta: alteredCount > 0 ? `${alteredCount} alterado${alteredCount === 1 ? "" : "s"}` : "sin alterados",
      rawFecha: g2.sets && g2.sets[0] ? g2.sets[0].fecha : null
    };
  });
  const hasData = (isoKey) => isoDates.has(isoKey);
  let loadedRangeLabel = "";
  if (groups.length) {
    const newest = shortDayLabel(groups[0].dayKey);
    const oldest = shortDayLabel(groups[groups.length - 1].dayKey);
    loadedRangeLabel = groups.length === 1 ? newest : `${oldest} \u2013 ${newest}`;
  }
  return { labDays, hasData, loadedRangeLabel };
}
function isoDateKeyLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// public/js/features/diagrams-gamble-pfh.mjs
var DIAGRAM_LINE = 'stroke="var(--diagram-line)" stroke-width="1.5"';
function diagramSpBlock(x, cy, lbl, obj, anchor) {
  anchor = anchor || "middle";
  const ax = anchor === "start" ? "start" : anchor === "end" ? "end" : "middle";
  const isAb = obj && obj.ab;
  const vc = isAb ? "var(--error)" : "var(--diagram-value)";
  const vt = obj ? escTxt(obj.val) : "\u2014";
  const dec = isAb ? ' text-decoration="underline"' : "";
  return '<g transform="translate(' + x + "," + cy + ')"><text x="0" y="-9" text-anchor="' + ax + '" dominant-baseline="middle" font-size="10" fill="var(--diagram-label)" font-family="Arial,sans-serif">' + lbl + '</text><text x="0" y="11" text-anchor="' + ax + '" dominant-baseline="middle" font-size="14" fill="' + vc + '" font-weight="bold" font-family="Arial,sans-serif"' + dec + ">" + vt + "</text></g>";
}
function diagramGambleCell(x, lbl, obj, isTop) {
  const cy = isTop ? 40 : 92;
  const vc = obj && obj.ab ? "var(--error)" : "var(--diagram-value)";
  const vt = obj ? escTxt(obj.val) : "\u2014";
  const dec = obj && obj.ab ? ' text-decoration="underline"' : "";
  return '<g transform="translate(' + x + "," + cy + ')"><text x="0" y="-10" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="var(--diagram-label)" font-family="Arial,sans-serif">' + lbl + '</text><text x="0" y="11" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="' + vc + '" font-weight="bold" font-family="Arial,sans-serif"' + dec + ">" + vt + "</text></g>";
}
function diagramPfhCell(x, lbl, obj, y_lbl) {
  const cy = y_lbl + 7.5;
  const vc = obj && obj.ab ? "var(--error)" : "var(--diagram-value)";
  const vt = obj ? escTxt(obj.val) : "\u2014";
  const dec = obj && obj.ab ? ' text-decoration="underline"' : "";
  return '<g transform="translate(' + x + "," + cy + ')"><text x="0" y="-10" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="var(--diagram-label)" font-family="Arial,sans-serif">' + lbl + '</text><text x="0" y="11" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="' + vc + '" font-weight="bold" font-family="Arial,sans-serif"' + dec + ">" + vt + "</text></g>";
}
function buildSvgGamble(secs, g2) {
  const na = g2(secs, "ESC", "Na");
  const k = g2(secs, "ESC", "K");
  const cl = g2(secs, "ESC", "Cl");
  const hco3 = g2(secs, "GASES", "Bica") || g2(secs, "ESC", "HCO3");
  const f = g2(secs, "ESC", "F");
  const ca = g2(secs, "ESC", "Ca");
  const bun = g2(secs, "QS", "BUN");
  const cr = g2(secs, "QS", "Cr");
  const glu = g2(secs, "QS", "Glu");
  if (!na && !k && !cl && !bun && !cr && !glu) return null;
  const sy = 65;
  const dT = 12;
  const dB = 118;
  const d1 = 104;
  const d2 = 192;
  const d3 = 280;
  const forkX = 365;
  const c1 = 61;
  const c2 = 148;
  const c3 = 236;
  const c4 = 323;
  return '<svg viewBox="0 0 470 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;"><line x1="18" y1="' + sy + '" x2="' + forkX + '" y2="' + sy + '" ' + DIAGRAM_LINE + '/><line x1="' + d1 + '" y1="' + dT + '" x2="' + d1 + '" y2="' + dB + '" ' + DIAGRAM_LINE + '/><line x1="' + d2 + '" y1="' + dT + '" x2="' + d2 + '" y2="' + dB + '" ' + DIAGRAM_LINE + '/><line x1="' + d3 + '" y1="' + dT + '" x2="' + d3 + '" y2="' + dB + '" ' + DIAGRAM_LINE + '/><line x1="' + forkX + '" y1="' + sy + '" x2="448" y2="18" ' + DIAGRAM_LINE + '/><line x1="' + forkX + '" y1="' + sy + '" x2="448" y2="112" ' + DIAGRAM_LINE + "/>" + diagramGambleCell(c1, "Na", na, true) + diagramGambleCell(c2, "Cl", cl, true) + diagramGambleCell(c3, "P", f, true) + diagramGambleCell(c4, "BUN", bun, true) + diagramGambleCell(c1, "K", k, false) + diagramGambleCell(c2, "HCO3", hco3, false) + diagramGambleCell(c3, "Ca", ca, false) + diagramGambleCell(c4, "Cr", cr, false) + diagramSpBlock(418, 65, "Glu", glu, "middle") + "</svg>";
}
function buildSvgPFH(secs, g2) {
  const ca = g2(secs, "ESC", "Ca");
  const ast = g2(secs, "PFHs", "AST");
  const ldh = g2(secs, "PFHs", "LDH");
  const pcr = g2(secs, "QS", "PCR");
  const alt = g2(secs, "PFHs", "ALT");
  const alb = g2(secs, "PFHs", "Alb");
  const fa = g2(secs, "PFHs", "FA");
  const bt = g2(secs, "PFHs", "BT");
  const bd = g2(secs, "PFHs", "BD");
  const bi = g2(secs, "PFHs", "BI");
  if (!ast && !alt && !fa && !bt && !alb) return null;
  const cx = 135;
  const lx = 67;
  const rx = 202;
  const midLeft = pcr || ldh;
  const midLbl = pcr ? "Prot" : "LDH";
  return '<svg viewBox="0 0 270 230" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;"><line x1="' + cx + '" y1="10" x2="' + cx + '" y2="145" ' + DIAGRAM_LINE + '/><line x1="22" y1="52" x2="248" y2="52" ' + DIAGRAM_LINE + '/><line x1="22" y1="104" x2="248" y2="104" ' + DIAGRAM_LINE + '/><line x1="22" y1="145" x2="248" y2="145" ' + DIAGRAM_LINE + '/><line x1="' + cx + '" y1="145" x2="45" y2="210" ' + DIAGRAM_LINE + '/><line x1="' + cx + '" y1="145" x2="225" y2="210" ' + DIAGRAM_LINE + "/>" + diagramPfhCell(lx, "Ca", ca, 20) + diagramPfhCell(rx, "AST", ast, 20) + (midLeft ? diagramPfhCell(lx, midLbl, midLeft, 65) : "") + diagramPfhCell(rx, "ALT", alt, 65) + diagramPfhCell(lx, "Alb", alb, 117) + diagramPfhCell(rx, "FA", fa, 117) + diagramPfhCell(cx, "BT", bt, 165) + diagramPfhCell(cx - 35, "BD", bd, 195) + diagramPfhCell(cx + 35, "BI", bi, 195) + "</svg>";
}

// public/js/features/diagrams-render.mjs
function g(secs, sec, key) {
  var s = secs[sec];
  if (!s) return null;
  var v = s[key];
  if (!v || v.val === "---") return null;
  return v;
}
var LINE = 'stroke="var(--diagram-line)" stroke-width="1.5"';
function spBlock(x, cy, lbl, obj, anchor) {
  anchor = anchor || "middle";
  var ax = anchor === "start" ? "start" : anchor === "end" ? "end" : "middle";
  var isAb = obj && obj.ab;
  var vc = isAb ? "var(--error)" : "var(--diagram-value)";
  var vt = obj ? escTxt(obj.val) : "\u2014";
  var dec = isAb ? ' text-decoration="underline"' : "";
  return '<g transform="translate(' + x + "," + cy + ')"><text x="0" y="-9" text-anchor="' + ax + '" dominant-baseline="middle" font-size="10" fill="var(--diagram-label)" font-family="Arial,sans-serif">' + lbl + '</text><text x="0" y="10" text-anchor="' + ax + '" dominant-baseline="middle" font-size="13" fill="' + vc + '" font-weight="bold" font-family="Arial,sans-serif"' + dec + ">" + vt + "</text></g>";
}
function svgBH(secs) {
  var hb = g(secs, "BH", "Hb"), hto = g(secs, "BH", "Hto");
  var leu = g(secs, "BH", "Leu"), neu = g(secs, "BH", "Neu");
  var plt = g(secs, "BH", "Plt");
  if (!hb) return null;
  return '<svg viewBox="0 0 300 192" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;"><line x1="50"  y1="18"  x2="250" y2="182" ' + LINE + '/><line x1="250" y1="18"  x2="50"  y2="182" ' + LINE + "/>" + spBlock(150, 46, "HB", hb, "middle") + spBlock(150, 155, "HCTO", hto, "middle") + spBlock(212, 100, "PLT", plt, "start") + spBlock(76, 62, "LEU", leu, "end") + '<line x1="26" y1="87" x2="86" y2="87" ' + LINE + "/>" + spBlock(76, 112, "NEU", neu, "end") + "</svg>";
}
function svgGamble(secs) {
  return buildSvgGamble(secs, g);
}
function svgPFH(secs) {
  return buildSvgPFH(secs, g);
}
function svgGases(secs) {
  var ph = g(secs, "GASES", "pH");
  var pco2 = g(secs, "GASES", "pCO2");
  var po2 = g(secs, "GASES", "pO2");
  var lac = g(secs, "GASES", "Lactato");
  var bica = g(secs, "GASES", "Bica");
  if (!ph) return null;
  var cx = 135, lx = 67, rx = 202;
  var jY = 65;
  function gcell(x, lbl, obj, y_lbl) {
    var cy = y_lbl + 7.5;
    var vc = obj && obj.ab ? "var(--error)" : "var(--diagram-value)";
    var vt = obj ? escTxt(obj.val) : "\u2014";
    var dec = obj && obj.ab ? ' text-decoration="underline"' : "";
    return '<g transform="translate(' + x + "," + cy + ')"><text x="0" y="-10" text-anchor="middle" dominant-baseline="middle" font-size="10" fill="var(--diagram-label)" font-family="Arial,sans-serif">' + lbl + '</text><text x="0" y="11" text-anchor="middle" dominant-baseline="middle" font-size="14" fill="' + vc + '" font-weight="bold" font-family="Arial,sans-serif"' + dec + ">" + vt + "</text></g>";
  }
  return '<svg viewBox="0 0 270 162" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;"><line x1="' + cx + '" y1="' + jY + '" x2="22"  y2="10" ' + LINE + '/><line x1="' + cx + '" y1="' + jY + '" x2="248" y2="10" ' + LINE + '/><line x1="' + cx + '" y1="' + jY + '" x2="' + cx + '" y2="158" ' + LINE + '/><line x1="22" y1="' + jY + '"  x2="248" y2="' + jY + '"  ' + LINE + '/><line x1="22" y1="118" x2="248" y2="118" ' + LINE + "/>" + gcell(cx, "pH", ph, 20) + gcell(lx, "pCO2", pco2, 76) + gcell(rx, "pO2", po2, 76) + gcell(lx, "Lact", lac, 126) + gcell(rx, "HCO3", bica, 126) + "</svg>";
}
function svgCoag(secs) {
  var tp = g(secs, "BH", "TP") || g(secs, "COAG", "TP");
  var ttp = g(secs, "BH", "TTP") || g(secs, "COAG", "TTP");
  var inr = g(secs, "BH", "INR") || g(secs, "COAG", "INR");
  if (!tp && !ttp && !inr) return null;
  var cx = 135, jY = 86, R = 50;
  var k = 0.8660254037844386;
  var tx = cx, ty = jY - R;
  var lx = cx - R * k, ly = jY + R * 0.5;
  var rx = cx + R * k, ry = jY + R * 0.5;
  var Jx = cx, Jy = jY;
  var uTx = 0, uTy = -1;
  var uLx = -k, uLy = 0.5;
  var uRx = k, uRy = 0.5;
  var nL = Math.sqrt((uTx + uLx) * (uTx + uLx) + (uTy + uLy) * (uTy + uLy));
  var bLx = (uTx + uLx) / nL, bLy = (uTy + uLy) / nL;
  var nR = Math.sqrt((uTx + uRx) * (uTx + uRx) + (uTy + uRy) * (uTy + uRy));
  var bRx = (uTx + uRx) / nR, bRy = (uTy + uRy) / nR;
  var rLbl = R * 0.82;
  var tpCx = Jx + rLbl * bLx, tpCy = Jy + rLbl * bLy;
  var ttpCx = Jx + rLbl * bRx, ttpCy = Jy + rLbl * bRy;
  var inrCx = cx;
  var inrCy = ly + 16;
  return '<svg viewBox="0 0 270 172" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;"><line x1="' + Jx + '" y1="' + Jy + '" x2="' + tx + '" y2="' + ty + '" ' + LINE + '/><line x1="' + Jx + '" y1="' + Jy + '" x2="' + lx + '" y2="' + ly + '" ' + LINE + '/><line x1="' + Jx + '" y1="' + Jy + '" x2="' + rx + '" y2="' + ry + '" ' + LINE + "/>" + spBlock(tpCx, tpCy, "TP", tp, "middle") + spBlock(ttpCx, ttpCy, "TTP", ttp, "middle") + spBlock(inrCx, inrCy, "INR", inr, "middle") + "</svg>";
}
function copiarDiagrama(svgStr, vw, vh, title, btn) {
  var SCALE = 2;
  var TITLE_H = 18, MARGIN = 12;
  var cw = vw + MARGIN * 2, ch = vh + TITLE_H + MARGIN * 2;
  var canvas = document.createElement("canvas");
  canvas.width = cw * SCALE;
  canvas.height = ch * SCALE;
  var ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);
  var fixedSvg = svgStr.replace(/style="width:100%;display:block;"/, 'width="' + vw + '" height="' + vh + '"');
  var blob = new Blob([fixedSvg], { type: "image/svg+xml;charset=utf-8" });
  var url = URL.createObjectURL(blob);
  var img = new Image();
  img.onload = function() {
    ctx.font = "bold 9px Arial,sans-serif";
    ctx.fillStyle = "#aaaaaa";
    ctx.textAlign = "left";
    ctx.fillText(title.toUpperCase(), MARGIN, MARGIN + 9);
    ctx.drawImage(img, MARGIN, MARGIN + TITLE_H, vw, vh);
    URL.revokeObjectURL(url);
    canvas.toBlob(function(pngBlob) {
      if (!pngBlob) return;
      if (navigator.clipboard && window.ClipboardItem) {
        navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]).then(function() {
          btn.textContent = "Copiado \u2713";
          btn.classList.add("copied");
          setTimeout(function() {
            btn.textContent = "Copiar";
            btn.classList.remove("copied");
          }, 2e3);
        }).catch(function() {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(pngBlob);
          a.download = title.replace(/\s+/g, "-").toLowerCase() + ".png";
          a.click();
        });
      } else {
        var a2 = document.createElement("a");
        a2.href = URL.createObjectURL(pngBlob);
        a2.download = title.replace(/\s+/g, "-").toLowerCase() + ".png";
        a2.click();
      }
    }, "image/png");
  };
  img.onerror = function() {
    URL.revokeObjectURL(url);
  };
  img.src = url;
}
var LAB_DIAGRAMS_COLLAPSED_KEY = "rpc-lab-diagrams-collapsed-v1";
function labDiagramsIsCollapsed() {
  try {
    return localStorage.getItem(LAB_DIAGRAMS_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}
function setLabDiagramsCollapsed(collapsed) {
  try {
    localStorage.setItem(LAB_DIAGRAMS_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch (_e) {
    void _e;
  }
  syncLabDiagramsCollapseUI();
}
function toggleLabDiagramsSection() {
  setLabDiagramsCollapsed(!labDiagramsIsCollapsed());
}
function syncLabDiagramsCollapseUI() {
  var sec = document.getElementById("lab-diagrams-section");
  var btn = document.querySelector(".lab-diagrams-toggle");
  if (!sec) return;
  var collapsed = labDiagramsIsCollapsed();
  sec.classList.toggle("is-collapsed", collapsed);
  if (btn) btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
}
function renderDiagramas(resLabs) {
  var secs = parsearSecciones(resLabs);
  var grid = document.getElementById("diagrams-grid");
  grid.innerHTML = "";
  var cards = [
    { title: "Biometr\xEDa Hem\xE1tica", svg: svgBH(secs), w: 260, vw: 300, vh: 192 },
    { title: "Coagulaci\xF3n", svg: svgCoag(secs), w: 240, vw: 270, vh: 172 },
    { title: "Electrolitos / QS", svg: svgGamble(secs), w: 480, vw: 470, vh: 130 },
    { title: "Funci\xF3n Hep\xE1tica", svg: svgPFH(secs), w: 220, vw: 270, vh: 230 },
    { title: "Gasometr\xEDa", svg: svgGases(secs), w: 240, vw: 270, vh: 162 }
  ];
  var any = false;
  cards.forEach(function(c) {
    if (!c.svg) return;
    any = true;
    var div = document.createElement("div");
    div.className = "dcard";
    div.style.width = c.w + "px";
    var btn = document.createElement("button");
    btn.className = "dcard-copy";
    btn.textContent = "Copiar";
    var svgStr = c.svg, vw = c.vw, vh = c.vh, title = c.title;
    btn.onclick = function() {
      copiarDiagrama(svgStr, vw, vh, title, btn);
    };
    div.innerHTML = '<div class="dcard-title">' + c.title + "</div>" + c.svg;
    div.appendChild(btn);
    grid.appendChild(div);
  });
  document.getElementById("lab-diagrams-section").style.display = any ? "block" : "none";
  syncLabDiagramsCollapseUI();
}

// public/js/lab-history-runtime.mjs
var maintRt = {
  getActiveId() {
    return null;
  },
  renderLabHistoryPanel() {
  },
  refreshTendenciasOrCultivosPanel() {
  },
  getSettings() {
    return null;
  }
};

// public/js/lab-history-maint.mjs
function registerLabHistoryMaintRuntime(ctx) {
  if (ctx && typeof ctx === "object") Object.assign(maintRt, ctx);
}
function resLabsFromNoteLines(noteLines) {
  var lines = noteLines || [];
  var text = lines.join("\n");
  if (looksLikeSomeLabReport(text)) {
    try {
      var parsed = procesarLabs(text);
      if (parsed && parsed.resLabs && parsed.resLabs.length) {
        return sanitizeResLabsChunks(parsed.resLabs);
      }
    } catch (_e) {
      void _e;
    }
  }
  return sanitizeResLabsChunks(extractLabDataLines(lines));
}
function applyMigratedResLabs(set, noteLines) {
  if (set.resLabs && set.resLabs.length) return false;
  if (set.id === "migrated-anterior") {
    set.resLabs = resLabsFromNoteLines(noteLines.slice(0, 3));
    return true;
  }
  if (set.id === "migrated-recent") {
    set.resLabs = resLabsFromNoteLines(noteLines.slice(3));
    return true;
  }
  return false;
}
function ensureSetBhExtras(set) {
  if (set.bhExtras || !set.sourceText) return false;
  try {
    var reParse = procesarLabs(set.sourceText);
    set.bhExtras = reParse && reParse.bhExtras ? reParse.bhExtras : {};
  } catch {
    set.bhExtras = {};
  }
  return true;
}
function setParsedBySectionIfChanged(set, pbNext) {
  var pbStr = "";
  try {
    pbStr = JSON.stringify(pbNext);
  } catch {
    set.parsedBySection = pbNext;
    return true;
  }
  if (pbStr != null && JSON.stringify(set.parsedBySection || null) !== pbStr) {
    set.parsedBySection = pbNext;
    return true;
  }
  return false;
}
function syncSetParsedFields(set) {
  var changed = false;
  var fp = labSetParseFingerprint(set);
  if (set._parseFingerprint === fp && set.parsedBySection && Object.keys(set.parsedBySection).length) {
    return { changed: false, rebuildNota: false };
  }
  var needsParse = !set.parsed || !Object.keys(set.parsed).length;
  if (needsParse) {
    if (!set.resLabs || !set.resLabs.length) {
      set.parsed = {};
    } else {
      set.parsed = extractParsedValues(set.resLabs);
    }
    changed = true;
  }
  if (set.resLabs && set.resLabs.length) {
    if (setParsedBySectionIfChanged(set, buildParsedBySectionFromResLabs(set.resLabs, set.bhExtras))) {
      changed = true;
    }
  } else if (set.parsedBySection && Object.keys(set.parsedBySection).length) {
    set.parsedBySection = {};
    changed = true;
  }
  set._parseFingerprint = labSetParseFingerprint(set);
  return { changed, rebuildNota: false };
}
function normalizeSetFechaHora(set) {
  var changed = false;
  var nf = normalizeFechaLabHistory(set.fecha);
  if (nf && nf !== set.fecha && set.fecha !== "Anterior") {
    set.fecha = nf;
    changed = true;
  }
  var nh = normalizeHoraLabHistory(set.hora);
  if (nh !== (set.hora || "")) {
    set.hora = nh;
    changed = true;
  }
  return changed;
}
function syncSetRefsAndHora(set) {
  if (!set.sourceText) return { changed: false, rebuildNota: false };
  var changed = false;
  var rebuildNota = false;
  if (!set.refsBySection || !Object.keys(set.refsBySection).length) {
    var refsNext = buildRefsBySectionFromReport(set.sourceText);
    if (refsNext && Object.keys(refsNext).length) {
      set.refsBySection = refsNext;
      changed = true;
    }
  }
  var horaFromSrc = normalizeHoraLabHistory(extractLabReportHora(set.sourceText));
  var normStoredHora = normalizeHoraLabHistory(set.hora);
  if (horaFromSrc && horaFromSrc !== normStoredHora) {
    set.hora = horaFromSrc;
    changed = true;
    rebuildNota = true;
  }
  return { changed, rebuildNota };
}
function inferSetFechaIfMissing(set) {
  if (set.fecha && String(set.fecha).trim()) return false;
  if (set.fecha === "Anterior") return false;
  var inferred = inferFechaLabSetFromId(set);
  if (!inferred) return false;
  set.fecha = inferred;
  return true;
}
function processLabHistorySet(set, noteLines) {
  if (!set) return { changed: false, rebuildNota: false };
  var changed = false;
  var rebuildNota = false;
  if (applyMigratedResLabs(set, noteLines)) changed = true;
  if (ensureSetBhExtras(set)) changed = true;
  var parsed = syncSetParsedFields(set);
  if (parsed.changed) changed = true;
  if (normalizeSetFechaHora(set)) changed = true;
  var refs = syncSetRefsAndHora(set);
  if (refs.changed) changed = true;
  if (refs.rebuildNota) rebuildNota = true;
  if (inferSetFechaIfMissing(set)) changed = true;
  return { changed, rebuildNota };
}
function persistLabHistoryPatient(patientId, history) {
  if (history.length) getLabHistory()[patientId] = history;
  else delete getLabHistory()[patientId];
}
function rebuildEstudiosFromLabHistory(patientId, options) {
  if (!patientId) return;
  if (!getNotes()[patientId]) getNotes()[patientId] = {};
  var ordered = sortLabHistoryChronological(
    ensureParsedLabHistory(patientId, {
      skipRebuildNota: true,
      readOnly: !!(options && options.readOnly)
    })
  );
  if (!ordered.length) {
    getNotes()[patientId].estudios = "";
    return;
  }
  var settings = typeof maintRt.getSettings === "function" ? maintRt.getSettings() : null;
  getNotes()[patientId].estudios = buildEstudiosCopyLinesFromLabSets(
    ordered,
    resolveEstudiosCopyOptions(ordered, settings)
  ).join("\n");
}
function ensureParsedLabHistory(patientId, options) {
  var skipRebuildNota = !!(options && options.skipRebuildNota);
  var readOnly = !!(options && options.readOnly);
  var raw = getLabHistory()[patientId];
  var history = normalizeLabHistoryPatientSets(raw);
  var changed = !Array.isArray(raw) || raw !== history;
  var rebuildNota = false;
  var noteLines = getNotes()[patientId] && getNotes()[patientId].estudios ? getNotes()[patientId].estudios.split("\n") : [];
  history.forEach(function(set) {
    var result = processLabHistorySet(set, noteLines);
    if (result.changed) changed = true;
    if (result.rebuildNota) rebuildNota = true;
  });
  if (rebuildNota && patientId && getNotes()[patientId] && !skipRebuildNota) {
    persistLabHistoryPatient(patientId, history);
    rebuildEstudiosFromLabHistory(patientId, { readOnly });
    changed = true;
  }
  if (!Array.isArray(raw) || raw !== history) {
    persistLabHistoryPatient(patientId, history);
    changed = true;
  }
  if (changed && !readOnly) persistClinicalState();
  return history;
}
function ensureParsedLabHistoryCached(patientId, options) {
  var opts = options && typeof options === "object" ? Object.assign({}, options) : {};
  if (opts.readOnly == null) opts.readOnly = true;
  return ensureParsedLabHistory(patientId, opts);
}
function refreshLabHistoryUiAfterMaint() {
  var aid = maintRt.getActiveId();
  if (aid) {
    try {
      maintRt.renderLabHistoryPanel();
    } catch (_e) {
      void _e;
    }
  }
  try {
    maintRt.refreshTendenciasOrCultivosPanel();
  } catch (_e) {
    void _e;
  }
}
function runLabHistoryPostSaveMaintenance() {
  var report = {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    reprocessedSetCount: 0,
    patientsReprocessed: [],
    exactDuplicates: [],
    sourceDuplicates: [],
    sameDateTimeConflicts: []
  };
  var changed = false;
  Object.keys(getLabHistory() || {}).forEach(function(pid) {
    if (pid.indexOf("demo-") === 0) return;
    var sets = getLabHistory()[pid];
    if (!Array.isArray(sets) || !sets.length) return;
    sets.forEach(function(set) {
      if (!set.resLabs || !set.resLabs.length) return;
      var priorRefs = collectPriorRefsFromHistory(
        sortLabHistoryChronological(sets).filter(function(s) {
          return String(s.id) !== String(set.id);
        })
      );
      var repro = sanitizeResLabsChunks(
        reprocessLabResultLines_(set.resLabs, {
          gasRefs: mergeGasRefs_(
            priorRefs.GASES,
            set.refsBySection && set.refsBySection.GASES
          )
        })
      );
      if (!repro || !repro.length) return;
      if (!areLabSetsEquivalent(set.resLabs, repro)) {
        set.resLabs = repro.slice();
        set.parsed = extractParsedValues(repro);
        set.parsedBySection = buildParsedBySectionFromResLabs(repro, set.bhExtras);
        delete set._parseFingerprint;
        changed = true;
        report.reprocessedSetCount++;
        if (report.patientsReprocessed.indexOf(pid) === -1) report.patientsReprocessed.push(pid);
      }
    });
    var ex = findExactDuplicateLabGroups(sets);
    if (ex.length) {
      report.exactDuplicates.push({ patientId: pid, groups: ex });
    }
    var src = findNormalizedSourceDuplicateGroups(sets);
    if (src.length) {
      report.sourceDuplicates.push({ patientId: pid, groups: src });
    }
    var ct = findConflictingSameDateTimeGroups(sets);
    if (ct.length) {
      report.sameDateTimeConflicts.push({ patientId: pid, groups: ct });
    }
  });
  try {
    window.__rpcLabAudit = report;
  } catch (_e) {
    void _e;
  }
  var noise = report.reprocessedSetCount > 0 || report.exactDuplicates.length > 0 || report.sourceDuplicates.length > 0 || report.sameDateTimeConflicts.length > 0;
  if (noise) {
    try {
      if (localStorage.getItem("rplus.debug-labs") === "1") {
        console.info("[R+ Laboratorio] Auditor\xEDa tras guardado \u2014 revisa window.__rpcLabAudit:", report);
      }
    } catch (_dbg) {
      void _dbg;
    }
  }
  if (changed && report.patientsReprocessed.length) {
    report.patientsReprocessed.forEach(function(pid) {
      bumpLabHistoryRevision(pid);
    });
  }
  return changed;
}
function persistAllLabStateAfterMaint() {
  storage.saveAll(
    getPatients(),
    getNotes(),
    getIndicaciones(),
    getLabHistory(),
    getMedRecetaByPatient(),
    getListadoProblemas(),
    getRecetaHuByPatient(),
    getVpoByPatient(),
    getMedPharmProfileByPatient()
  );
}
function installLabHistoryAuditHook() {
  try {
    window.runRpcLabAuditNow = function() {
      var ch = runLabHistoryPostSaveMaintenance();
      if (ch) {
        persistAllLabStateAfterMaint();
        refreshLabHistoryUiAfterMaint();
      }
      return window.__rpcLabAudit;
    };
  } catch (_e) {
    void _e;
  }
}
(function migrateLabHistory() {
  try {
    if (localStorage.getItem("rpc-labHistory")) return;
  } catch {
    return;
  }
  getPatients().forEach(function(p) {
    try {
      if (!getNotes()[p.id] || !getNotes()[p.id].estudios) return;
      var lines = getNotes()[p.id].estudios.split("\n");
      var anteriorLines = lines.slice(0, 3).filter(function(l) {
        return l.trim();
      });
      var recentLines = lines.slice(3).filter(function(l) {
        return l.trim();
      });
      var sets = [];
      if (anteriorLines.length) {
        var migratedAnteriorLabs = resLabsFromNoteLines(anteriorLines);
        sets.push({
          id: "migrated-anterior",
          fecha: "Anterior",
          hora: "",
          resLabs: migratedAnteriorLabs,
          parsed: extractParsedValues(migratedAnteriorLabs)
        });
      }
      if (recentLines.length) {
        var migratedRecentLabs = resLabsFromNoteLines(recentLines);
        sets.push({
          id: "migrated-recent",
          fecha: normalizeFechaLabHistory(recentLines[0] || getNotes()[p.id].fecha || ""),
          hora: getNotes()[p.id].hora || "",
          resLabs: migratedRecentLabs,
          parsed: extractParsedValues(migratedRecentLabs)
        });
      }
      if (sets.length) getLabHistory()[p.id] = sets;
    } catch (e) {
      console.error("migrateLabHistory patient error:", p && p.id, e && e.message);
    }
  });
  try {
    localStorage.setItem("rpc-labHistory", JSON.stringify(getLabHistory()));
  } catch (e) {
    console.error("migrateLabHistory write error:", e && e.message);
  }
})();

// public/js/features/chrome.mjs
var runtime = {
  switchAppTab() {
  },
  renderPatientList() {
  },
  scrollActiveRondaCardIntoView() {
  },
  renderProcedureAgendaPanel() {
  },
  getActiveAppTab() {
    return "nota";
  },
  getActiveInner() {
    return "resumen";
  },
  getActiveId() {
    return null;
  }
};
function registerChromeRuntime(ctx) {
  if (!ctx || typeof ctx !== "object") return;
  Object.assign(runtime, ctx);
}
var THEME_ICON_SUN = '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
var THEME_ICON_MOON = '<svg class="btn-header-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
var FONT_ZOOM_LS = "rpc-font-zoom";
var HIGH_CONTRAST_LS = "rpc-high-contrast";
var UI_DENSITY_LS = "rpc-ui-density";
var MOTION_MODE_LS = "rpc-motion-mode";
var I18N_ES = {
  "settings.appearance": "Apariencia",
  "settings.theme": "Tema",
  "settings.appearanceFoot": "\u2318G/I/S cambian modo Guardia/Inter/Sala. Tama\xF1o escala toda la interfaz. Mixto equilibra las animaciones.",
  "settings.themeGroup": "Tema de la aplicaci\xF3n",
  "settings.themeLight": "Claro",
  "settings.themeDark": "Oscuro",
  "settings.fontSize": "Tama\xF1o de texto",
  "settings.fontSizeHint": "Escala toda la interfaz (\xFAtil en pantallas peque\xF1as).",
  "settings.fontNormal": "Normal",
  "settings.fontLarge": "Grande",
  "settings.fontXLarge": "M\xE1s grande",
  "settings.uiDensity": "Modo de vista",
  "settings.uiDensityHint": "Normal: Paciente, Laboratorio, Manejo y Agenda en pesta\xF1as completas (vista Ronda centrada).",
  "settings.densityNormal": "Normal",
  "settings.highContrast": "Alto contraste",
  "settings.highContrastHint": "Aumenta el contraste de texto y bordes para mejor legibilidad.",
  "settings.hcOff": "Desactivado",
  "settings.hcOn": "Activado",
  "settings.motion": "Animaciones",
  "settings.motionHint": "Sobrio: m\xEDnimas \xB7 Mixto: equilibrado (recomendado) \xB7 Expresivo: completas.",
  "settings.motionSobrio": "Sobrio",
  "settings.motionMixto": "Mixto",
  "settings.motionExpresivo": "Expresivo",
  "settings.docsFolder": "Carpeta de documentos",
  "settings.docsFolderHint": "Los .docx generados se guardan aqu\xED (si no eliges carpeta, se usa Descargas).",
  "settings.backup": "Respaldo local",
  "settings.backupHint": "Exporta o restaura pacientes, notas e indicaciones (JSON).",
  "settings.application": "Aplicaci\xF3n",
  "settings.quickHelp": "Centro de ayuda \xB7 atajos y tours",
  "settings.version": "Versi\xF3n",
  "settings.checkUpdates": "Buscar actualizaciones\u2026",
  "settings.open": "Abrir ajustes",
  "settings.openTitle": "Ajustes",
  "settings.teamSyncAria": "Abrir conexi\xF3n LAN y LiveSync (salas)",
  "settings.teamSyncTitle": "LiveSync: crear o unirse a sala en vivo, copiar invitaci\xF3n. C\xF3digo del servidor (avanzado): Ajustes \u2192 LAN \xB7 servidor en esta computadora. Paquete sync JSON: Ajustes \u2192 Respaldos, sync y recuperaci\xF3n.",
  "theme.toggle": "Cambiar tema claro u oscuro",
  "theme.toggleTitle": "Cambiar tema",
  "appTab.lab": "Laboratorio",
  "appTab.nota": "Paciente",
  "appTab.med": "Manejo",
  "appTab.agenda": "Agenda",
  "roundMode.hint": "\u2191 / \u2193 \xB7 paciente siguiente / anterior",
  "roundMode.seenTitle": "Visto en ronda (se reinicia cada d\xEDa)",
  "roundMode.sectionNota": "Nota e indicaciones",
  "roundMode.sectionLabs": "Laboratorio reciente",
  "roundMode.sectionTodos": "Pendientes"
};
function t(key) {
  if (I18N_ES && Object.prototype.hasOwnProperty.call(I18N_ES, key)) return I18N_ES[key];
  return key;
}
function applyI18n() {
  const htmlEl = document.documentElement;
  if (htmlEl && htmlEl.getAttribute("lang") !== "es") htmlEl.setAttribute("lang", "es");
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      if (el.type === "button" || el.type === "submit" || el.type === "reset") el.value = val;
      else el.setAttribute("placeholder", val);
    } else {
      el.textContent = val;
    }
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    if (key) el.setAttribute("aria-label", t(key));
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.setAttribute("title", t(key));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.setAttribute("placeholder", t(key));
  });
}
function syncThemeSettingsButtons() {
  const isDark = document.documentElement.classList.contains("dark");
  const lightBtn = document.getElementById("settings-theme-light");
  const darkBtn = document.getElementById("settings-theme-dark");
  if (lightBtn) lightBtn.classList.toggle("active", !isDark);
  if (darkBtn) darkBtn.classList.toggle("active", isDark);
}
function syncThemeToggleIcon() {
  const themeBtn = document.getElementById("theme-toggle");
  if (!themeBtn) return;
  const isDark = document.documentElement.classList.contains("dark");
  themeBtn.innerHTML = isDark ? THEME_ICON_MOON : THEME_ICON_SUN;
}
function setThemeMode(mode) {
  const isDark = mode === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
  syncThemeToggleIcon();
  syncThemeSettingsButtons();
}
function applyFontZoom() {
  let p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || "100", 10);
  if (!Number.isFinite(p)) p = 100;
  if (p < 90) p = 90;
  if (p > 140) p = 140;
  document.documentElement.style.zoom = String(p / 100);
}
function syncFontZoomButtons() {
  let p = parseInt(localStorage.getItem(FONT_ZOOM_LS) || "100", 10);
  if (p !== 100 && p !== 110 && p !== 125) p = 100;
  ["100", "110", "125"].forEach((v) => {
    const btn = document.getElementById("settings-font-" + v);
    if (btn) btn.classList.toggle("active", p === parseInt(v, 10));
  });
}
function setFontZoom(pct) {
  localStorage.setItem(FONT_ZOOM_LS, String(pct));
  applyFontZoom();
  syncFontZoomButtons();
}
function toggleTheme() {
  setThemeMode(document.documentElement.classList.contains("dark") ? "light" : "dark");
}
function isHighContrast() {
  return localStorage.getItem(HIGH_CONTRAST_LS) === "1";
}
function applyHighContrast() {
  document.documentElement.classList.toggle("high-contrast", isHighContrast());
}
function syncHighContrastButtons() {
  const on = isHighContrast();
  const onBtn = document.getElementById("settings-hc-on");
  const offBtn = document.getElementById("settings-hc-off");
  if (onBtn) {
    onBtn.classList.toggle("active", on);
    onBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  if (offBtn) {
    offBtn.classList.toggle("active", !on);
    offBtn.setAttribute("aria-pressed", !on ? "true" : "false");
  }
}
function setHighContrast(on) {
  localStorage.setItem(HIGH_CONTRAST_LS, on ? "1" : "0");
  applyHighContrast();
  syncHighContrastButtons();
}
function toggleHighContrast() {
  setHighContrast(!isHighContrast());
}
function getMotionMode() {
  return normalizeMotionMode(localStorage.getItem(MOTION_MODE_LS));
}
function applyMotionMode() {
  const cls = motionClassFor(getMotionMode());
  ALL_MOTION_CLASSES.forEach((c) => document.documentElement.classList.remove(c));
  if (cls) document.documentElement.classList.add(cls);
}
function syncMotionButtons() {
  const mode = getMotionMode();
  ["sobrio", "mixto", "expresivo"].forEach((m) => {
    const btn = document.getElementById("settings-motion-" + m);
    if (btn) {
      btn.classList.toggle("active", m === mode);
      btn.setAttribute("aria-pressed", m === mode ? "true" : "false");
    }
  });
}
function setMotionMode(mode) {
  localStorage.setItem(MOTION_MODE_LS, normalizeMotionMode(mode));
  applyMotionMode();
  syncMotionButtons();
}
function getUiDensity() {
  const raw = localStorage.getItem(UI_DENSITY_LS);
  if (raw === "guardia") return "guardia";
  return "normal";
}
function isGuardiaMode() {
  return getUiDensity() === "guardia";
}
function getWorkMode() {
  if (isGuardiaMode()) return "guardia";
  var st = null;
  try {
    st = JSON.parse(localStorage.getItem("rpc-settings") || "null");
  } catch {
    st = null;
  }
  return isModeSala(st) ? "sala" : "interconsulta";
}
function collapseHeaderModeSeg() {
  var seg = document.getElementById("header-mode-seg");
  if (!seg) return;
  seg.classList.remove("is-expanded");
  seg.setAttribute("aria-expanded", "false");
}
function toggleHeaderModeSegExpand() {
  var seg = document.getElementById("header-mode-seg");
  if (!seg) return false;
  var next = !seg.classList.contains("is-expanded");
  seg.classList.toggle("is-expanded", next);
  seg.setAttribute("aria-expanded", next ? "true" : "false");
  return next;
}
function initHeaderModeSegInteractions() {
  if (typeof document === "undefined" || document._rpcHeaderModeSegWired) return;
  document._rpcHeaderModeSegWired = true;
  var seg = document.getElementById("header-mode-seg");
  if (!seg) return;
  seg.setAttribute("aria-expanded", "false");
  document.addEventListener("click", function(ev) {
    if (!seg.classList.contains("is-expanded")) return;
    if (seg.contains(ev.target)) return;
    collapseHeaderModeSeg();
  });
  document.addEventListener("keydown", function(ev) {
    if (ev.key === "Escape" && seg.classList.contains("is-expanded")) {
      collapseHeaderModeSeg();
    }
  });
}
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHeaderModeSegInteractions);
  } else {
    initHeaderModeSegInteractions();
  }
}
function activePatientLabSets() {
  var pid = runtime.getActiveId();
  if (!pid) return { pid: null, sets: [] };
  var raw = ensureParsedLabHistory(pid, { readOnly: true });
  return { pid, sets: sortLabHistoryChronological(raw || []) };
}
function openHeaderDatePopoverFromChrome(ev) {
  if (ev && typeof ev.preventDefault === "function") ev.preventDefault();
  var anchor = document.getElementById("today-date");
  if (!anchor) return;
  var today = /* @__PURE__ */ new Date();
  var ctx = activePatientLabSets();
  var model = buildLabDaysForCalendar({ sets: ctx.sets, todayIso: isoDateKeyLocal(today) });
  openDatePopover(anchor, {
    today,
    hasData: model.hasData,
    loadedRangeLabel: model.loadedRangeLabel,
    quickFilters: buildDatePopoverQuickFilters({}),
    labDays: model.labDays,
    onSelectLabDay: function(dayKey) {
      var picked = model.labDays.find(function(d) {
        return d.dayKey === dayKey;
      });
      if (!ctx.pid || !picked || !picked.rawFecha) return;
      runtime.switchAppTab("lab");
      var value = daySelectValue(picked.rawFecha);
      import("/mobile/js/chunks/lab-panel-history-DYZEWTWR.js").then(function(mod) {
        if (typeof mod.onLabHistoryDateChange === "function") mod.onLabHistoryDateChange(value);
        if (typeof mod.syncLabHistoryDateSelect === "function") {
          mod.syncLabHistoryDateSelect({ preferSetId: value });
        }
      });
    }
  });
}
function syncHeaderModeSeg() {
  var seg = document.getElementById("header-mode-seg");
  if (!seg) return;
  var mode = getWorkMode();
  seg.querySelectorAll(".header-mode-seg-btn").forEach(function(btn) {
    var on = btn.dataset.mode === mode;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  seg.querySelectorAll(".header-mode-seg-dot").forEach(function(dot) {
    dot.classList.toggle("is-active", dot.dataset.mode === mode);
  });
}
function toggleGuardiaMode() {
  if (isGuardiaMode()) {
    void import("/mobile/js/chunks/entrega-roster-panel-B32VGCKX.js").then(({ closeEntregaRosterPanel }) => {
      closeEntregaRosterPanel();
    });
    void import("/mobile/js/chunks/clinical-entrega-MXCLZZTE.js").then(({ endEntregaPhase }) => {
      endEntregaPhase();
    });
    void import("/mobile/js/chunks/guardia-phase-bar-IYBEW6Q6.js").then(({ teardownGuardiaPhaseBar }) => {
      teardownGuardiaPhaseBar();
    });
    setUiDensity("normal");
    return;
  }
  setUiDensity("guardia");
}
function exitGuardiaModeFromHeader() {
  if (isGuardiaMode()) setUiDensity("normal");
}
function applyUiDensity() {
  const density = getUiDensity();
  document.documentElement.classList.toggle("ui-density-normal", density === "normal");
  document.documentElement.classList.toggle("ui-density-guardia", density === "guardia");
  const rondaHint = document.getElementById("sidebar-ronda-hint");
  if (rondaHint) {
    rondaHint.setAttribute("aria-hidden", density !== "normal" ? "false" : "true");
  }
  var guardiaRoot = document.getElementById("appcontent-guardia");
  if (guardiaRoot && !isGuardiaMode()) {
    guardiaRoot.style.display = "none";
    guardiaRoot.setAttribute("aria-hidden", "true");
  }
  runtime.switchAppTab(runtime.getActiveAppTab());
  syncHeaderModeSeg();
  if (typeof runtime.renderPatientList === "function") {
    runtime.renderPatientList({ silent: true });
  }
  if (typeof runtime.renderGuardiaBoard === "function" && isGuardiaMode()) {
    runtime.renderGuardiaBoard();
  }
  if (typeof runtime.syncLabOutputChrome === "function") runtime.syncLabOutputChrome();
}
function syncUiDensityButtons() {
  const d = getUiDensity();
  const normalBtn = document.getElementById("settings-density-normal");
  if (normalBtn) {
    normalBtn.classList.toggle("active", d === "normal");
    normalBtn.setAttribute("aria-pressed", d === "normal" ? "true" : "false");
  }
}
function setUiDensity(mode) {
  let m = mode === "guardia" ? "guardia" : "normal";
  localStorage.setItem(UI_DENSITY_LS, m);
  applyUiDensity();
  syncUiDensityButtons();
  void import("/mobile/js/chunks/clinical-rotation-entry-DPKDAZ3H.js").then((mod) => {
    mod.syncClinicalRotationEntryChrome?.();
  });
  runtime.renderPatientList();
  if (runtime.getActiveId()) {
    requestAnimationFrame(() => runtime.scrollActiveRondaCardIntoView());
  }
  if (runtime.getActiveAppTab() === "agenda") runtime.renderProcedureAgendaPanel();
  if (isGuardiaMode() && typeof runtime.renderGuardiaBoard === "function") {
    runtime.renderGuardiaBoard();
  }
}
function getProcedureAgendaRowPx() {
  return getUiDensity() === "normal" ? 50 : 42;
}
function initChromeAppearance() {
  if (localStorage.getItem("theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
  if (window.electronAPI && window.electronAPI.isSoftwareRender) {
    document.documentElement.classList.add("no-blur");
  }
  syncThemeToggleIcon();
  applyHighContrast();
  applyMotionMode();
  applyUiDensity();
  syncHeaderModeSeg();
  applyI18n();
  applyFontZoom();
  syncThemeSettingsButtons();
  syncFontZoomButtons();
  syncHighContrastButtons();
  syncMotionButtons();
  syncUiDensityButtons();
}
function launchConfetti() {
  var colors = ["#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#fb7185"];
  for (var i = 0; i < 40; i++) {
    (function(idx) {
      setTimeout(function() {
        var el = document.createElement("div");
        el.className = "confetti-piece";
        el.style.left = Math.random() * 100 + "vw";
        el.style.top = "-10px";
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = Math.random() * 0.5 + "s";
        el.style.transform = "rotate(" + Math.random() * 360 + "deg)";
        document.body.appendChild(el);
        setTimeout(function() {
          if (el.parentNode) el.parentNode.removeChild(el);
        }, 3500);
      }, idx * 40);
    })(i);
  }
}
var windowHandlers = {
  toggleTheme,
  setThemeMode,
  setFontZoom,
  setUiDensity,
  setHighContrast,
  toggleHighContrast,
  setMotionMode,
  toggleGuardiaMode,
  exitGuardiaModeFromHeader,
  openHeaderDatePopoverFromChrome,
  t
};

export {
  toggleLabDiagramsSection,
  syncLabDiagramsCollapseUI,
  renderDiagramas,
  registerLabHistoryMaintRuntime,
  rebuildEstudiosFromLabHistory,
  ensureParsedLabHistory,
  ensureParsedLabHistoryCached,
  installLabHistoryAuditHook,
  registerChromeRuntime,
  syncFontZoomButtons,
  syncHighContrastButtons,
  getUiDensity,
  isGuardiaMode,
  collapseHeaderModeSeg,
  toggleHeaderModeSegExpand,
  syncHeaderModeSeg,
  toggleGuardiaMode,
  syncUiDensityButtons,
  setUiDensity,
  getProcedureAgendaRowPx,
  initChromeAppearance,
  launchConfetti,
  windowHandlers
};
//# sourceMappingURL=/js/chunks/chunk-G2QTTDSA.js.map
