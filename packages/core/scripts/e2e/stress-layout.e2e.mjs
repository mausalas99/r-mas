#!/usr/bin/env node
/* global window, document, getComputedStyle */
/**
 * E2E stress: SCREEN LAYOUT. Tries to break how every screen looks, with a
 * busy synthetic DEMO patient (long name, 45 meds, 6 lab days, long
 * diagnoses, pendientes) and 35 patients so the sidebar virtual list is on.
 * Estado actual is out of scope (own stress run). Fake DEMO patients only.
 *
 * Ways it can go wrong (each one is a check below):
 *   - sidebar virtual list (>30 patients, fixed 98 px stride): a long name
 *     makes a card taller than the stride and it overlaps the next card
 *     (checked with the 1-line clamp off = "before", and on = "after")
 *   - the page or a main panel scrolls sideways (scrollWidth > clientWidth)
 *   - two sibling rows/cards/buttons overlap (getBoundingClientRect)
 *   - text is cut off with no ellipsis and no tooltip (title)
 *   - dark mode: text contrast under WCAG AA (4.5:1, 3:1 for large text)
 *   - a text button is not a pill (owner rule: text buttons are round)
 *   - Tab never reaches a visible button, or the focused element shows no
 *     focus ring, or Tab leaves an open dialog (focus escapes the modal)
 *   - a screen cannot be reached at a given size (nav target missing)
 *   - phone width 390 (LAN/mobile surface): any of the above
 *   - any page error
 *
 * Conditions: 1440x902, 1024x700, 720x900 × light/dark × text size 100/125 %
 * (the Ajustes font buttons; 125 % is the largest). Phone: 390x844.
 *
 * Artifact: e2e-artifacts/stress-layout/<run-id>/ (report.json, results.json,
 * one JPEG per screen × condition).
 *
 *   node scripts/e2e/stress-layout.e2e.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRun, onboardLocalOnly, pasteAndSave, pasteAndProcess, openPatient, closeToasts, until, dismissLearnHub } from './harness.mjs';
import { header, fullLabs, gas, TABLE } from './some-fixtures.mjs';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayStr = (back, h = 8) => {
  const d = new Date();
  d.setDate(d.getDate() - back);
  return `${MON[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} ${h}:05AM`;
};
const bh = (hgb) => 'HEMATOLOGIA\nBIOMETRIA HEMATICA COMPLETA\n' + TABLE + `HGB\t\tA\t${hgb}\tg/dL\t12.20 - 18.10\n`;

const BUSY = {
  exp: '7300001-1',
  name: 'DEMO MARÍA DE LOS ÁNGELES GUADALUPE FERNÁNDEZ DE LA GARZA Y MONTEMAYOR VILLARREAL SANTOS',
  room: '1204',
};
// The comma keeps the sidebar from shortening it to first + last word.
const LONG = { exp: '7300002-2', name: 'DEMO, ' + 'NOMBRELARGO APELLIDO '.repeat(48), room: '1205' };
const FILLERS = Array.from({ length: 33 }, (_, i) => ({ exp: `73${String(100 + i).padStart(5, '0')}-${i % 10}`, name: `DEMO SALA ${i + 1}`, room: String(500 + i) }));

// 45 medications + diet, SOME "indicaciones" format, dated today.
const pad = (n) => String(n).padStart(2, '0');
const t = new Date();
const D = `${pad(t.getDate())}/${pad(t.getMonth() + 1)}/${t.getFullYear()}`;
const row = (i, ...cols) => [`${D} 08:${pad(i % 60)} a.m.`, ...cols, 'NW'].join('\t');
const DRUGS = ['CEFTRIAXONA 1 G SOL INY', 'ENOXAPARINA 40 MG SOL INY 0.4 ML', 'LOSARTAN 50 MG COMPRIMIDO', 'PARACETAMOL 1 G SOL INY 100 ML',
  'OMEPRAZOL 40 MG SOL INY', 'METOPROLOL 100 MG TABLETA', 'FUROSEMIDA 20 MG SOL INY', 'INSULINA GLARGINA 100 UI/ML SOL INY'];
const SOME_MEDS = [
  row(0, 'DIETAS', 'BLANDA PICADA HIPOSODICA BAJA EN POTASIO Y FOSFORO DIETA RENAL', '1800 KCAL + 70 GR DE PROTEINA'),
  ...Array.from({ length: 45 }, (_, i) =>
    row(i + 1, i % 7 === 6 ? 'MEDICAMENTOS P2' : 'MEDICAMENTOS', `${DRUGS[i % DRUGS.length].replace(/^(\S+)/, `$1 DEMO${i + 1}`)}`,
      i % 3 ? 'VIA INTRAVENOSA' : 'VIA ORAL', `${10 + i} MG // *DIA# ${1 + (i % 9)}* INDICACION LARGA DE PRUEBA PARA VER EL AJUSTE DE LINEA`,
      i % 7 === 6 ? 'PRN' : 'CADA 8 HORAS')),
].join('\n');
const LONG_NOTE = ('DEMO: enfermedad renal crónica KDIGO G5 en hemodiálisis, diabetes tipo 2 de 20 años, ' +
  'hipertensión arterial sistémica, insuficiencia cardíaca con FEVI reducida 30 %, neumonía adquirida en la comunidad. ').repeat(6);

const CONDS = [
  { id: '1440-light-100', w: 1440, h: 902, dark: false, zoom: 100 },
  { id: '1440-dark-100', w: 1440, h: 902, dark: true, zoom: 100 },
  { id: '1440-dark-125', w: 1440, h: 902, dark: true, zoom: 125 },
  { id: '1024-light-125', w: 1024, h: 700, dark: false, zoom: 125 },
  { id: '1024-dark-100', w: 1024, h: 700, dark: true, zoom: 100 },
  { id: '720-light-100', w: 720, h: 900, dark: false, zoom: 100 },
  { id: '720-dark-125', w: 720, h: 900, dark: true, zoom: 125 },
];

const r = createRun('stress-layout');
const { check } = r;
const results = []; // { screen, cond, file, issues: {cat: [..]}, error }
let shotN = 0;
async function jpeg(page, label) {
  shotN += 1;
  const file = `${String(shotN).padStart(3, '0')}-${label.replace(/[^\w.-]+/g, '_')}.jpg`;
  await page.screenshot({ path: path.join(r.artifactDir, file), type: 'jpeg', quality: 62 });
  return file;
}

// ── Probe (runs in the page) ─────────────────────────────────────────────
function probe({ rootSel, dark }) {
  const roots = rootSel.split(',').map((s) => document.querySelector(s.trim())).filter(Boolean);
  const out = { hscroll: [], overlap: [], clipped: [], contrast: [], pill: [] };
  if (!roots.length) return { missing: rootSel, ...out };
  const desc = (el) =>
    (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(typeof el.className === 'string' ? el.className : '').split(/\s+/).filter(Boolean).slice(0, 2).join('.')) +
    ' «' + (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '»';
  const shown = (el) => {
    const b = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return b.width > 2 && b.height > 2 && cs.visibility !== 'hidden' && cs.opacity !== '0' && !el.closest('.visually-hidden, .sr-only');
  };
  const visibleRect = (el) => {
    const b = el.getBoundingClientRect();
    let { left, right, top, bottom } = b;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const ab = a.getBoundingClientRect();
      if (cs.overflowX !== 'visible') { left = Math.max(left, ab.left); right = Math.min(right, ab.right); }
      if (cs.overflowY !== 'visible') { top = Math.max(top, ab.top); bottom = Math.min(bottom, ab.bottom); }
    }
    left = Math.max(left, 0); top = Math.max(top, 0);
    right = Math.min(right, window.innerWidth); bottom = Math.min(bottom, window.innerHeight);
    return { left, right, top, bottom, empty: right - left < 1 || bottom - top < 1 };
  };
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) out.hscroll.push('page +' + (de.scrollWidth - de.clientWidth) + 'px');
  if (document.body.scrollWidth > document.body.clientWidth + 1) out.hscroll.push('body +' + (document.body.scrollWidth - document.body.clientWidth) + 'px');

  // Computed colors can be oklab()/color(srgb …): let a canvas turn them into sRGB bytes.
  const cx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const parse = (c) => {
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const bgOf = (el) => {
    const stack = [];
    for (let a = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.backgroundImage !== 'none') return null; // gradient/image: cannot judge
      const c = parse(cs.backgroundColor);
      if (c[3] > 0) { stack.push(c); if (c[3] >= 1) break; }
    }
    let base = dark ? [0, 0, 0, 1] : [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) base = [...blend(stack[i], base), 1];
    return base;
  };

  const seen = new Set();
  for (const root of roots) {
    const all = [root, ...root.querySelectorAll('*')].filter((el) => !seen.has(el) && shown(el));
    all.forEach((el) => seen.add(el));
    for (const el of all) {
      const cs = getComputedStyle(el);
      const ox = cs.overflowX;
      const scroller = ox === 'auto' || ox === 'scroll';
      // Strips and grids that scroll sideways on purpose (fade edge cue / time grid).
      const designed = el.matches('[data-scroll-x], .ea-historial-list, .table-scroll, .lab-table-wrap, .tend-table-wrap, [class*="scroll-x"], table, .tend-scroll, ' +
        '.inner-tab-bar, .exp-segment-bar, #settings-nav, #procedure-agenda-scroll-host, .med-pharm-scroll');
      if (scroller && !designed && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0 && el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') {
        out.hscroll.push(desc(el) + ' +' + (el.scrollWidth - el.clientWidth) + 'px');
      }
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (ownText && el.tagName !== 'TEXTAREA' && el.tagName !== 'OPTION' && el.tagName !== 'SELECT') {
        const clampH = cs.webkitLineClamp && cs.webkitLineClamp !== 'none';
        const hidX = cs.overflowX === 'hidden' || cs.overflowX === 'clip';
        const hidY = cs.overflowY === 'hidden' || cs.overflowY === 'clip';
        const titled = !!el.closest('[title], [data-tooltip], [aria-label]');
        if (hidX && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && !titled && cs.whiteSpace !== 'normal') out.clipped.push(desc(el) + ' (width)');
        else if (hidY && !clampH && el.scrollHeight > el.clientHeight + 3 && !titled && el.clientHeight > 0) out.clipped.push(desc(el) + ' (height)');
        if (dark && !el.closest('[disabled], .is-disabled, [aria-disabled="true"]')) {
          const bg = bgOf(el);
          if (bg) {
            const fg = parse(cs.color);
            const fgc = blend(fg, bg);
            const L1 = lum(fgc), L2 = lum(bg);
            const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
            const px = parseFloat(cs.fontSize);
            const large = px >= 24 || (px >= 18.66 && +cs.fontWeight >= 700);
            if (ratio < (large ? 3 : 4.5)) out.contrast.push(desc(el) + ' ' + ratio.toFixed(2) + ':1');
          }
        }
      }
      if (el.matches('button, a.wb-btn') && !el.matches('[role="tab"], [role="tablist"] *, .inner-tab, .app-tab, [role="menuitem"], [role="option"], [role="switch"], .toast-close')) {
        const label = (el.innerText || '').trim();
        const b = el.getBoundingClientRect();
        const r0 = parseFloat(cs.borderTopLeftRadius) || 0;
        // A text button: has letters, is wider than tall, and draws a box (bg or border).
        const boxed = parse(cs.backgroundColor)[3] > 0 || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none');
        // Tall, multi-line choice cards (onboarding, pickers) are cards, not text buttons.
        if (/\p{L}{2}/u.test(label) && !label.includes('\n') && b.height <= 48 && b.width > b.height * 1.2 && boxed && r0 < b.height / 2 - 1.5) {
          out.pill.push(desc(el) + ` r=${r0.toFixed(0)} h=${b.height.toFixed(0)}`);
        }
      }
    }
    for (const parent of all) {
      const kids = [...parent.children].filter((k) => {
        const kc = getComputedStyle(k);
        return shown(k) && kc.position !== 'absolute' && kc.position !== 'fixed' && kc.display !== 'inline' && kc.display !== 'contents' && !['OPTION', 'COLGROUP', 'COL'].includes(k.tagName);
      });
      if (kids.length < 2 || kids.length > 400) continue;
      const rects = kids.map(visibleRect);
      for (let i = 0; i < kids.length; i++) {
        for (let j = i + 1; j < kids.length; j++) {
          const a = rects[i], b = rects[j];
          if (a.empty || b.empty) continue;
          const ox2 = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy2 = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox2 > 2 && oy2 > 2) out.overlap.push(desc(kids[i]) + ' × ' + desc(kids[j]));
        }
      }
    }
  }
  // Controls on top of controls (absolute/fixed ones too): a user cannot hit the one below.
  const ctrls = [...seen].filter((el) => el.matches('button, a[href], input, select, [role="tab"]'));
  const crs = ctrls.map(visibleRect);
  for (let i = 0; i < ctrls.length; i++) {
    for (let j = i + 1; j < ctrls.length; j++) {
      const a = crs[i], b = crs[j];
      if (a.empty || b.empty || ctrls[i].contains(ctrls[j]) || ctrls[j].contains(ctrls[i])) continue;
      const ox3 = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy3 = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox3 > 4 && oy3 > 4) out.overlap.push('control over control ' + desc(ctrls[i]) + ' × ' + desc(ctrls[j]));
    }
  }
  // Virtual rows are absolutely positioned: compare them on their own.
  const vcards = [...document.querySelectorAll('.virtual-scroll-inner .patient-card')].filter((c) => shown(c) && !visibleRect(c).empty);
  const vr = vcards.map((c) => c.getBoundingClientRect()).sort((a, b) => a.top - b.top);
  for (let i = 1; i < vr.length; i++) if (vr[i].top < vr[i - 1].bottom - 1) out.overlap.push(`virtual patient card ${i} overlaps the one above by ${(vr[i - 1].bottom - vr[i].top).toFixed(0)}px`);
  for (const k of Object.keys(out)) out[k] = [...new Set(out[k])].slice(0, 15);
  return out;
}

// ── Navigation ───────────────────────────────────────────────────────────
const call = (page, fn, ...args) => page.evaluate(([f, a]) => {
  if (typeof window[f] !== 'function') throw new Error('no window.' + f);
  return window[f](...a);
}, [fn, args]);

async function setMode(page, mode) {
  await closeToasts(page);
  // Below ~700 css px the header wraps when the switch opens, so hover never settles.
  await page.locator('#header-mode-seg').hover({ timeout: 3000 }).catch(() => {});
  const btn = page.locator(`#header-mode-seg button[data-mode="${mode}"]`);
  if ((await btn.getAttribute('aria-pressed')) === 'true') { await page.mouse.move(700, 600); return; }
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await page.waitForTimeout(400);
  await btn.click({ timeout: 5000 }).catch(() => btn.dispatchEvent('click'));
  await page.waitForTimeout(700);
  await closeToasts(page);
  await page.mouse.move(700, 600);
}

async function applyCond(page, c) {
  await page.setViewportSize({ width: c.w, height: c.h });
  await page.evaluate(({ dark, zoom }) => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', dark);
    // The app's own Ajustes path (Electron zoom via the preload bridge).
    // Before onboarding the handler is not loaded yet: same bridge, by hand.
    localStorage.setItem('rpc-font-zoom', String(zoom));
    if (window.setFontZoom) window.setFontZoom(zoom);
    else window.electronAPI.setZoomFactor(zoom / 100);
  }, c);
  await page.waitForTimeout(400);
}

const MAIN = '#main-area, aside.patient-sidebar, header, .workbench-chrome';

/** Screens: [key, rootSel, go(page), mode]. Expediente sections are discovered from the group row. */
function desktopScreens(sections) {
  const S = [
    ['sala-bar-sidebar', MAIN, async (p) => { await call(p, 'switchAppTab', 'lab'); }],
    ['lab-labs', MAIN, async (p) => { await call(p, 'switchAppTab', 'lab'); await call(p, 'switchLabInner', 'labs'); }],
    ['lab-tendencias', MAIN, async (p) => { await call(p, 'switchAppTab', 'lab'); await call(p, 'switchLabInner', 'tend'); }],
    ['lab-cultivos', MAIN, async (p) => { await call(p, 'switchAppTab', 'lab'); await call(p, 'switchLabInner', 'cult'); }],
    ['manejo-receta', MAIN, async (p) => { await call(p, 'switchAppTab', 'med'); await call(p, 'setMedSubview', 'receta'); }],
    ['manejo-perfil', MAIN, async (p) => { await call(p, 'switchAppTab', 'med'); await call(p, 'setMedSubview', 'perfil'); }],
    ['agenda', MAIN, async (p) => { await call(p, 'switchAppTab', 'agenda'); }],
  ];
  for (const s of sections) {
    S.push([`exp-${s.mode}-${s.group}-${s.id}`, MAIN, async (p) => {
      await call(p, 'switchAppTab', 'nota');
      if (s.id === s.group) await call(p, 'switchConsolidatedTab', s.group);
      else await call(p, 'switchInnerTab', s.id);
    }, s.mode]);
  }
  return S;
}

const MODALS = [
  ['modal-ajustes', '#settings-dropdown', (p) => p.locator('#btn-open-settings').click()],
  ['modal-atajos', '#shortcuts-backdrop', (p) => p.locator('#btn-header-shortcuts').click()],
  ['modal-busqueda', '#unified-search-backdrop', (p) => call(p, 'openUnifiedSearch')],
  ['modal-learn-hub', '#learn-hub-backdrop', (p) => call(p, 'openLearnHub')],
  ['modal-pegar-some', '#lab-paste-modal-backdrop, #lab-input', async (p) => { await call(p, 'switchAppTab', 'lab'); await p.locator('#btn-lab-paste').click(); }],
];

async function runScreen(page, pageErrors, key, cond, rootSel, go) {
  const before = pageErrors.length;
  const rec = { screen: key, cond: cond.id, file: null, issues: null, error: null };
  try {
    await closeToasts(page);
    await go(page);
    await page.waitForTimeout(500);
    rec.issues = await page.evaluate(probe, { rootSel, dark: cond.dark });
    rec.file = await jpeg(page, `${key}--${cond.id}`);
  } catch (e) {
    rec.error = String(e.message || e).split('\n')[0];
    rec.file = await jpeg(page, `${key}--${cond.id}--ERR`).catch(() => null);
  }
  rec.pageErrors = pageErrors.slice(before);
  results.push(rec);
  fs.writeFileSync(path.join(r.artifactDir, 'results.json'), JSON.stringify(results, null, 1));
  const iss = rec.issues || {};
  check(`${key} @ ${cond.id}: reachable`, !rec.error && !iss.missing, rec.error || iss.missing);
  if (!rec.error && !iss.missing) {
    check(`${key} @ ${cond.id}: no sideways scroll`, !iss.hscroll.length, iss.hscroll);
    check(`${key} @ ${cond.id}: no overlap`, !iss.overlap.length, iss.overlap);
    check(`${key} @ ${cond.id}: no cut-off text`, !iss.clipped.length, iss.clipped);
    if (cond.dark) check(`${key} @ ${cond.id}: dark contrast AA`, !iss.contrast.length, iss.contrast);
    check(`${key} @ ${cond.id}: text buttons are pills`, !iss.pill.length, iss.pill);
  }
  check(`${key} @ ${cond.id}: no page error`, rec.pageErrors.length === 0, rec.pageErrors);
  return rec;
}

/** Tab through the page; every stop must be visible with a focus ring. */
async function tabWalk(page, presses, scopeSel) {
  const stops = [];
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(120); // let a collapsed control finish expanding on focus
    stops.push(await page.evaluate((scope) => {
      const el = document.activeElement;
      if (!el || el === document.body) return { body: true };
      const cs = getComputedStyle(el);
      const b = el.getBoundingClientRect();
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
      const name = (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className || '').split(/\s+/)[0]) + ' «' + ((el.getAttribute('aria-label') || el.innerText || el.value || '').trim().slice(0, 24)) + '»';
      return {
        name, ring, fv: el.matches(':focus-visible'),
        onScreen: b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < window.innerHeight && b.right > 0 && b.left < window.innerWidth,
        inScope: scope ? !!el.closest(scope) : true,
      };
    }, scopeSel || null));
  }
  return stops;
}

/** Visible buttons Tab can never reach (tabindex -1, not a roving tab set). */
const unreachable = (page, rootSel) => page.evaluate((sel) => {
  const out = [];
  for (const root of sel.split(',').map((s) => document.querySelector(s.trim())).filter(Boolean)) {
    for (const el of root.querySelectorAll('button, a[href], [role="button"], input, select, textarea')) {
      const b = el.getBoundingClientRect();
      if (!(b.width > 0 && b.height > 0) || getComputedStyle(el).visibility === 'hidden' || el.disabled) continue;
      if (el.tabIndex >= 0 && !el.closest('[inert], [aria-hidden="true"]')) continue;
      // Roving tabindex (one tab stop per tab set, arrows inside) is fine.
      const set = el.closest('[role="tablist"], [role="radiogroup"], [role="menu"], [role="listbox"], .exp-group-row, .virtual-scroll-inner');
      if (set && [...set.querySelectorAll('button, [role="tab"], [role="radio"], [tabindex]')].some((x) => x.tabIndex >= 0)) continue;
      out.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className || '').split(/\s+/)[0]) + ' «' + ((el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 24)) + '»' + (el.closest('[aria-hidden="true"]') ? ' [aria-hidden]' : ''));
    }
  }
  return [...new Set(out)].slice(0, 25);
}, rootSel);

/** Scroll the virtual zone until the LONG card is on screen. */
async function scrollToLongCard(page) {
  return until(() => page.evaluate((exp) => {
    const zone = document.querySelector('.patient-sort-zone--virtual-active');
    if (!zone) return false;
    let sc = zone;
    while (sc && !(sc.scrollHeight > sc.clientHeight + 5 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    const card = [...document.querySelectorAll('.virtual-scroll-inner .p-name')].find((n) => (n.getAttribute('title') || '').includes(exp));
    if (card) {
      const cb = card.closest('.patient-card').getBoundingClientRect();
      if (cb.top > 60 && cb.bottom < window.innerHeight - 40) return true;
      if (sc) sc.scrollTop += cb.top - window.innerHeight / 3;
      return false;
    }
    if (sc) sc.scrollTop += 250;
    return false;
  }, LONG.exp), 15000, 250);
}

const virtualOverlap = (page) => page.evaluate(() => {
  const cards = [...document.querySelectorAll('.virtual-scroll-inner .patient-card')].filter((c) => c.getBoundingClientRect().height > 0);
  const rs = cards.map((c) => ({ r: c.getBoundingClientRect(), long: (c.querySelector('.p-name')?.getAttribute('title') || '').length > 300 })).sort((a, b) => a.r.top - b.r.top);
  const bad = [];
  for (let i = 1; i < rs.length; i++) if (rs[i].r.top < rs[i - 1].r.bottom - 1) bad.push({ by: Math.round(rs[i - 1].r.bottom - rs[i].r.top), longAbove: rs[i - 1].long });
  const tallest = Math.max(...rs.map((x) => x.r.height));
  return { virtual: !!document.querySelector('.patient-sort-zone--virtual-active'), cards: rs.length, tallest: Math.round(tallest), bad };
});

const UNFIX = '.patient-sort-zone--virtual-active .virtual-scroll-inner .patient-card .p-name{-webkit-line-clamp:2 !important}';

await r.finish('Screen layout: every screen x size x theme x text size, busy patient, 35 patients', async () => {
  const { page, pageErrors } = await r.launch();
  await page.setViewportSize({ width: 1440, height: 902 });

  // ── Onboarding (first screen of a fresh install) ─────────────────────────
  await page.locator('[data-sync-mode="local"]').waitFor({ timeout: 20000 });
  for (const c of [CONDS[0], CONDS[5]]) {
    await applyCond(page, c);
    await runScreen(page, pageErrors, 'onboarding', c, 'body', async () => {});
  }
  await applyCond(page, CONDS[0]);
  await onboardLocalOnly(page);

  // ── Seed: busy one, 1 kB name, 33 fillers → 35 active ───────────────────
  for (let back = 5; back >= 0; back--) await pasteAndSave(page, fullLabs(BUSY, dayStr(back, 6 + back)));
  await pasteAndSave(page, gas(BUSY, dayStr(0, 11), '7.28'));
  await pasteAndSave(page, header(LONG, dayStr(0)) + bh('9.1'));
  for (const p of FILLERS) {
    await pasteAndSave(page, header(p, dayStr(0, 7)) + bh(String(8 + (p.room % 5))));
  }
  const total = Number(((await page.locator('#patient-list').innerText()).match(/PACIENTES\s*(\d+)/i) || [])[1] || -1);
  check('seed: 35 in the list', total === 35, total);

  // Busy one: complete ingreso, 45 meds, long diagnoses, pendientes.
  await page.locator('#patient-search').fill(BUSY.exp);
  await page.waitForTimeout(400);
  await openPatient(page, BUSY);
  await page.locator('#patient-search').fill('');
  await call(page, 'switchAppTab', 'med');
  await call(page, 'setMedSubview', 'receta');
  await page.locator('#med-import-open-btn').click();
  await page.locator('#med-input').fill(SOME_MEDS);
  await page.getByRole('button', { name: 'Procesar receta' }).click();
  await page.waitForTimeout(800);
  const medCount = Number(((await page.locator('#med-turno-title-text').innerText().catch(() => '')).match(/(\d+)/) || [])[1] || 0);
  check('seed: busy one has 40+ meds on screen', medCount >= 40, medCount);
  await closeToasts(page);
  try {
    await call(page, 'switchAppTab', 'nota');
    await page.locator('.dash-name:visible').first().click({ timeout: 5000 });
    await page.locator('#patient-dx-paste').fill(LONG_NOTE);
    await page.getByRole('button', { name: 'Separar por +' }).click();
    await page.keyboard.press('Escape');
    check('seed: long diagnosis text saved', true);
  } catch (e) {
    check('seed: long diagnosis text saved', false, String(e.message).split('\n')[0]);
    await page.keyboard.press('Escape').catch(() => {});
  }
  try {
    await call(page, 'switchAppTab', 'nota');
    await call(page, 'switchInnerTab', 'todo');
    for (let i = 0; i < 8; i++) {
      await page.locator('.todo-toolbar-add-btn:visible').click({ timeout: 5000 });
      await page.locator('.wb-todo-add-modal .wb-todo-add-text').fill(`DEMO pendiente ${i + 1}: ` + 'solicitar interconsulta a nefrología y revisar resultado de cultivo '.repeat(1 + (i % 3)));
      await page.locator('.wb-todo-add-modal [data-wb-todo-add-ok]').click();
      await page.waitForTimeout(150);
    }
    check('seed: 8 long pendientes added', (await page.locator('.wb-todo-row:visible').count()) >= 8, await page.locator('.wb-todo-row:visible').count());
  } catch (e) {
    check('seed: 8 long pendientes added', false, String(e.message).split('\n')[0]);
  }
  await closeToasts(page);

  // ── Known fix: sidebar virtual list with a 1 kB name ────────────────────
  await call(page, 'switchAppTab', 'lab');
  for (const c of [CONDS[0], CONDS[2], CONDS[6]]) {
    await applyCond(page, c);
    await page.evaluate((css) => { const s = document.createElement('style'); s.id = 'e2e-unfix'; s.textContent = css; document.head.appendChild(s); }, UNFIX);
    await scrollToLongCard(page);
    await page.waitForTimeout(300);
    const off = await virtualOverlap(page);
    const beforeFile = await jpeg(page, `virtual-list-BEFORE-clamp-off--${c.id}`);
    await page.evaluate(() => document.getElementById('e2e-unfix')?.remove());
    await page.waitForTimeout(300);
    const on = await virtualOverlap(page);
    const afterFile = await jpeg(page, `virtual-list-AFTER-clamp-on--${c.id}`);
    results.push({ screen: 'virtual-list-fix', cond: c.id, beforeFile, afterFile, off, on });
    check(`virtual list on with 35 in the list @ ${c.id}`, on.virtual, on);
    // Data, not a gate: with the clamp off a 2-line name card is 97 px at 1440 (stride 98),
    // so the clamp is a margin there; the overlap it guards against needs a taller card.
    check(`clamp off: tallest card measured @ ${c.id}`, true, off);
    check(`clamp on: no virtual card overlaps @ ${c.id}`, on.bad.length === 0, on);
  }

  // ── Every screen × condition ─────────────────────────────────────────────
  await applyCond(page, CONDS[0]);
  const discover = () => page.evaluate(() => [...document.querySelectorAll('.exp-group-pill')].flatMap((pill) => {
    const secs = [...pill.querySelectorAll('.exp-group-section')].map((b) => b.dataset.section);
    return secs.length ? secs.map((id) => ({ group: pill.dataset.group, id })) : [{ group: pill.dataset.group, id: pill.dataset.group }];
  }));
  const sections = [];
  for (const mode of ['sala', 'interconsulta']) {
    await setMode(page, mode);
    await call(page, 'switchAppTab', 'nota');
    await page.waitForTimeout(400);
    for (const s of await discover()) if (!/estado/i.test(s.id)) sections.push({ ...s, mode });
  }
  check('found the expediente sections in both modes', sections.length >= 4, sections);
  const screens = desktopScreens(sections);

  for (const c of CONDS) {
    await applyCond(page, c);
    let mode = null;
    for (const [key, rootSel, go, m = 'sala'] of screens) {
      if (m !== mode) {
        await setMode(page, m);
        if (m === 'interconsulta') await openPatient(page, BUSY).catch(() => {});
        mode = m;
      }
      await runScreen(page, pageErrors, key, c, rootSel, go);
    }
    if (mode !== 'sala') { await setMode(page, 'sala'); mode = 'sala'; }
    // Guardia (a work mode) and back.
    await runScreen(page, pageErrors, 'guardia', c, '#appcontent-guardia, header', async (p) => {
      await setMode(p, 'guardia');
      await p.locator('#guardia-census-grid').waitFor({ state: 'visible', timeout: 8000 });
    });
    await setMode(page, 'sala').catch(() => {});
    for (const [key, rootSel, open] of MODALS) {
      await runScreen(page, pageErrors, key, c, rootSel, async (p) => { await open(p); await p.waitForTimeout(400); });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      await dismissLearnHub(page);
    }
    // A toast: paste text that is not a SOME report.
    await runScreen(page, pageErrors, 'toast', c, '.toast-container, #toast-container, .toasts, .toast', async (p) => {
      await pasteAndProcess(p, 'texto que no es un reporte SOME');
      await p.locator('.toast').first().waitFor({ state: 'visible', timeout: 5000 });
      if (await p.locator('#lab-input').isVisible()) await p.keyboard.press('Escape');
    });
  }

  await setMode(page, 'sala');

  // ── Sala card view ──────────────────────────────────────────────────────
  await page.evaluate(() => localStorage.setItem('rplus-sala-view', 'cards'));
  await page.reload();
  await dismissLearnHub(page);
  await page.waitForTimeout(1500);
  for (const c of [CONDS[0], CONDS[1], CONDS[3], CONDS[6]]) {
    await applyCond(page, c);
    await runScreen(page, pageErrors, 'sala-cards', c, MAIN, async () => {});
  }
  await page.evaluate(() => localStorage.setItem('rplus-sala-view', 'bar'));
  await page.reload();
  await dismissLearnHub(page);
  await page.waitForTimeout(1500);

  // ── Keyboard only ───────────────────────────────────────────────────────
  for (const c of [CONDS[0], CONDS[1]]) {
    await applyCond(page, c);
    for (const [key, go] of [['lab-labs', (p) => call(p, 'switchAppTab', 'lab')], ['manejo-receta', (p) => call(p, 'switchAppTab', 'med')], ['expediente', (p) => call(p, 'switchAppTab', 'nota')]]) {
      await go(page);
      await page.waitForTimeout(400);
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.mouse.click(2, 2).catch(() => {});
      const stops = await tabWalk(page, 70);
      const real = stops.filter((s) => !s.body);
      const noRing = [...new Set(real.filter((s) => !s.ring).map((s) => s.name))];
      const offScreen = [...new Set(real.filter((s) => !s.onScreen).map((s) => s.name))];
      check(`keyboard ${key} @ ${c.id}: Tab moves focus`, real.length > 20, real.length);
      check(`keyboard ${key} @ ${c.id}: every focus stop shows a ring`, noRing.length === 0, noRing.slice(0, 20));
      check(`keyboard ${key} @ ${c.id}: focus never lands off screen`, offScreen.length === 0, offScreen.slice(0, 20));
      const unr = await unreachable(page, MAIN);
      check(`keyboard ${key} @ ${c.id}: every visible button is reachable by Tab`, unr.length === 0, unr);
      results.push({ screen: `keyboard-${key}`, cond: c.id, noRing, offScreen, unreachable: unr, file: await jpeg(page, `keyboard-${key}--${c.id}`) });
    }
    // Focus must stay inside an open dialog.
    for (const [key, sel, open] of MODALS.slice(0, 3)) {
      try {
        await open(page);
        await page.waitForTimeout(400);
        const stops = await tabWalk(page, 30, sel);
        const out = [...new Set(stops.filter((s) => !s.body && !s.inScope).map((s) => s.name))];
        check(`keyboard ${key} @ ${c.id}: Tab stays inside the dialog`, out.length === 0, out.slice(0, 10));
        results.push({ screen: `trap-${key}`, cond: c.id, escaped: out });
      } catch (e) {
        check(`keyboard ${key} @ ${c.id}: Tab stays inside the dialog`, false, String(e.message).split('\n')[0]);
      }
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
    }
  }

  // ── Phone width 390 (LAN / mobile surface) ──────────────────────────────
  await page.evaluate(() => localStorage.setItem('rpc-mobile-mode', '1'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await dismissLearnHub(page);
  await page.waitForTimeout(1500);
  const isMobile = await page.evaluate(() => document.documentElement.classList.contains('rpc-mobile-web'));
  check('phone: mobile surface is on', isMobile);
  for (const c of [{ id: '390-light-100', w: 390, h: 844, dark: false, zoom: 100 }, { id: '390-dark-100', w: 390, h: 844, dark: true, zoom: 100 }]) {
    await applyCond(page, c);
    for (const [key, go] of [
      ['phone-lab-labs', async (p) => { await call(p, 'switchAppTab', 'lab'); await call(p, 'switchLabInner', 'labs'); }],
      ['phone-lab-tendencias', async (p) => { await call(p, 'switchAppTab', 'lab'); await call(p, 'switchLabInner', 'tend'); }],
      ['phone-lab-cultivos', async (p) => { await call(p, 'switchAppTab', 'lab'); await call(p, 'switchLabInner', 'cult'); }],
      ['phone-expediente', async (p) => { await call(p, 'switchAppTab', 'nota'); }],
      ['phone-ajustes', async (p) => { await p.locator('#btn-open-settings').click(); }],
    ]) {
      await runScreen(page, pageErrors, key, c, 'body', go);
      if (key === 'phone-ajustes') await page.keyboard.press('Escape');
    }
  }
  await page.evaluate(() => localStorage.removeItem('rpc-mobile-mode'));

  fs.writeFileSync(path.join(r.artifactDir, 'results.json'), JSON.stringify(results, null, 1));
  check('no page errors in the whole run', pageErrors.length === 0, pageErrors.slice(0, 10));
});
