// Cultivos antibiogram hover panels + cell HTML
import { getLabHistory } from '../../app-state.mjs';
import {
  buildAtbRisSummaryHtml,
  classifyAtbInterp,
  extractSensCrudasForGermFromSource,
} from '../../labs.js';
import { esc } from './expediente-runtime.mjs';
import { escAttr } from '../../dom-escape.mjs';
import { intrinsicMatchesIn, isAmpcOrganism } from '../../cultivo-intrinsic-resistance.mjs';
import { mechanismHintFor } from '../../cultivo-mechanism.mjs';
// Puntos de corte CLSI: módulo pesado (~40 KB de datos), carga diferida para no inflar el arranque.
var bpMod_ = null;
import('../../cultivo-breakpoints.mjs').then(function (m) {
  bpMod_ = m;
});

var AMPC_CEF_RE = /CEFTRIAXONA|CEFOTAXIMA|CEFTAZIDIMA/i;
var AMINOGLUCOSIDO_RE = /GENTAMICINA|AMIKACINA|ESTREPTOMICINA|TOBRAMICINA|KANAMICINA|NETILMICINA/i;

function atbNameCap_(med) {
  var m = String(med || '').trim().toLowerCase();
  return m.charAt(0).toUpperCase() + m.slice(1);
}

/** 'EUCAST', 'CLSI' o 'EUCAST y CLSI' a partir de los `estado` de las filas. */
function srcNames_(hits) {
  var t = [];
  hits.forEach(function (h) {
    h.estado.split('+').forEach(function (x) {
      if (t.indexOf(x) < 0) t.push(x);
    });
  });
  return t.sort().map(function (x) { return x.toUpperCase(); }).join(' y ');
}

function noteSources_(hits) {
  var f = [];
  hits.forEach(function (h) {
    h.fuentes.forEach(function (x) {
      if (f.indexOf(x) < 0) f.push(x);
    });
  });
  return f.join('; ');
}

/** Filas cuya categoría no coincide con CLSI para su CMI; las marca. [] mientras el módulo de datos no ha cargado. */
function markMism_(r, sens, marks) {
  var mism = bpMod_ ? bpMod_.flagInterpMismatch(r.organismo, sens, { orina: r.tipoKey === 'uro' }) : [];
  mism.forEach(function (m) {
    if (!marks.has(m.row)) marks.set(m.row, 'no coincide con CLSI');
  });
  return mism;
}

function mismNote_(mism) {
  var m = mism[0];
  return (
    (mism.length === 1
      ? atbNameCap_(m.row.med) + ': CMI ' + m.mic + ' da ' + m.esperada + ' en CLSI; el laboratorio informó ' + m.reportada + '.'
      : mism.length + ' antibióticos cuya CMI da otra categoría en CLSI.') + ' Revisa la edición del punto de corte.'
  );
}

/** Resistencia por especie (EUCAST/CLSI) y riesgo AmpC para un aislamiento. Siempre un objeto: marca la tarjeta de Cultivos (sin panel al pasar el cursor). */
function cultivoAtbExt(r, sens) {
  var hits = intrinsicMatchesIn(r.organismo, sens);
  var ampc = isAmpcOrganism(r.organismo);
  var intr = new Set();
  var marks = new Map();
  var doubt = [];
  var doubtHits = [];
  var intrHits = [];
  var ampcRows = [];
  hits.forEach(function (h) {
    var k = classifyAtbInterp(h.row.interp);
    if (k === 'r') {
      intr.add(h.row);
      intrHits.push(h);
    } else if (k === 's') {
      marks.set(h.row, 'inesperada');
      doubt.push(h.row);
      doubtHits.push(h);
    }
  });
  var mism = markMism_(r, sens, marks); // CMI contra CLSI
  var hint = mechanismHintFor(r.organismo, sens);
  if (hint) {
    hint.evidencia.forEach(function (e) {
      if (e.k !== 's' && !marks.has(e.row) && /^Activa/.test(e.nota)) marks.set(e.row, 'cribado BLEE');
    });
  }
  if (ampc) {
    sens.forEach(function (s) {
      if (classifyAtbInterp(s.interp) === 's' && AMPC_CEF_RE.test(String(s.med || ''))) {
        marks.set(s, 'AmpC');
        ampcRows.push(s);
      }
    });
  }
  var notes = [];
  if (ampcRows.length) {
    notes.push(
      'AmpC: ' +
        (ampcRows.length === 1 ? 'la ' + String(ampcRows[0].med).trim().toLowerCase() : 'las cefalosporinas de 3.ª generación') +
        ' puede' + (ampcRows.length === 1 ? '' : 'n') + ' fallar aunque salga' + (ampcRows.length === 1 ? '' : 'n') + ' S.'
    );
  }
  if (doubt.length) {
    notes.push(
      (doubt.length === 1 ? atbNameCap_(doubt[0].med) + ' S es inesperada.' : doubt.length + ' antibióticos con S inesperada.') +
        ' ' + srcNames_(doubtHits) + ' espera R en esta especie. Revisa la identificación y la prueba.'
    );
    if (/ENTEROCOCC/i.test(r.organismo) && doubt.some(function (s) { return AMINOGLUCOSIDO_RE.test(s.med); })) {
      notes.push('Aminoglucósido solo: se espera resistencia baja. Solo se combina con ampicilina o vancomicina.');
    }
  }
  if (mism.length) notes.push(mismNote_(mism));
  var info = intr.size ? 'Int: resistencia natural de la especie (' + srcNames_(intrHits) + '). No es resistencia adquirida.' : '';
  return { intr: intr, marks: marks, notes: notes, info: info, hint: hint, noteSource: [doubtHits.length ? noteSources_(doubtHits) : '', mism.length ? bpMod_.BREAKPOINT_SOURCE : ''].filter(Boolean).join('; ') };
}

/** Panel «Por qué el cribado de BLEE sale positivo»: details nativo, abierto. */
function mechHintHtml_(h) {
  var tiles = h.evidencia
    .map(function (e) {
      return (
        '<div class="cult-mech-tile"><span class="cult-mech-drug">' + esc(atbNameCap_(e.row.med)) +
        ' <span class="atb-chip atb-chip--' + e.k + '">' + e.k.toUpperCase() + '</span></span>' +
        '<span class="cult-mech-note">' + esc(e.nota) + '</span></div>'
      );
    })
    .join('');
  return (
    '<details class="cult-mech" open><summary class="cult-mech-title">' + esc(h.titulo) + '</summary>' +
    '<div class="cult-mech-tiles">' + tiles + '</div>' +
    '<p class="cult-mech-text">' + esc(h.texto) + '</p>' +
    '<p class="cult-mech-src">Fuente: ' + esc(h.fuente) + '.</p></details>'
  );
}

function cultivoSetAndSens(r, patientId) {
  var sets = getLabHistory()[patientId] || [];
  var set = sets.find(function (s) {
    return String(s.id) === String(r.labSetId);
  });
  var sens =
    set && set.sourceText ? extractSensCrudasForGermFromSource(set.sourceText, r.organismo) : null;
  return { set: set, sens: sens };
}

/** Huella R/I/S del antibiograma de un aislamiento ('' si no hay): dos aislamientos iguales se juntan en la tarjeta. */
export function cultivoAtbSignature(r, patientId) {
  var sens = (patientId && cultivoSetAndSens(r, patientId).sens) || [];
  return sens
    .map(function (s) {
      return String(s.med || '').trim().toUpperCase() + ':' + classifyAtbInterp(s.interp);
    })
    .sort()
    .join('|');
}

export function buildCultivoAntibiogramCellHtmlForPatient(r, patientId) {
  if (!patientId) return '<pre class="cultivos-atb-fallback">—</pre>';
  var found = cultivoSetAndSens(r, patientId);
  var set = found.set;
  var sens = found.sens;
  var copyBtn =
    set && r.labSetId != null && String(r.labSetId) !== ''
      ? '<button type="button" class="cultivos-copy-full-btn" data-onclick="copyCultivoCondensado" data-onclick-args=\'' +
        escAttr(JSON.stringify([String(r.labSetId), String(r.organismo || '')])) +
        '\' title="Copiar informe completo">Copiar</button>'
      : '';
  if (sens && sens.length) {
    var ext = cultivoAtbExt(r, sens);
    return (
      '<div class="cultivos-atb-wrap">' +
      '<div class="cultivos-atb-chips">' +
      (ext && ext.hint ? mechHintHtml_(ext.hint) : '') +
      buildAtbRisSummaryHtml(sens, ext) +
      (ext && ext.info ? '<div class="cult-atb-note cult-atb-note--info">' + esc(ext.info) + '</div>' : '') +
      (ext && ext.notes.length ? '<div class="cult-atb-note">' + esc(ext.notes.join(' ')) + '</div>' : '') +
      (ext && ext.noteSource ? '<div class="cult-atb-note cult-atb-note--info">Fuente: ' + esc(ext.noteSource) + '.</div>' : '') +
      '</div>' +
      copyBtn +
      '</div>'
    );
  }
  var fallback = r.resistencias || r.risSummary || '';
  var hasFallback = fallback && fallback !== '—';
  // Aislamiento sin antibiograma todavía (no aplica a Gram, micobacterias ni hongos).
  var missingAtb =
    !hasFallback && !r.negativo && !/CONTAMINAD|MICROBIOTA|NEGATIV/i.test(r.organismo || '') &&
    !/^(gram|myco|fungi)$/.test(r.tipoKey || '');
  return (
    '<div class="cultivos-atb-wrap">' +
    (hasFallback ? '<pre class="cultivos-atb-fallback">' + esc(fallback) + '</pre>' : '') +
    (missingAtb ? '<span class="cult-atb-missing">Antibiograma pendiente</span>' : '') +
    copyBtn +
    '</div>'
  );
}

var _atbRisScrollRootsWired = new WeakSet();
var _atbRisDelegatedHoverRoots = new WeakSet();
var ATB_RIS_HIDE_DELAY_MS = 140;

function ensureAtbRisScrollRepositionOn(el) {
  if (!el || _atbRisScrollRootsWired.has(el)) return;
  _atbRisScrollRootsWired.add(el);
  el.addEventListener('scroll', repositionOpenAtbRisPanel, { passive: true });
}

// Global listeners live only while a panel is open (addEventListener is idempotent).
function setAtbRisGlobalListeners(on) {
  var f = on ? 'addEventListener' : 'removeEventListener';
  window[f]('scroll', repositionOpenAtbRisPanel, true);
  window[f]('resize', repositionOpenAtbRisPanel);
}

function cancelHideAtbPanel(panel) {
  if (!panel || !panel._atbHideTid) return;
  clearTimeout(panel._atbHideTid);
  panel._atbHideTid = null;
}

function scheduleHideAtbPanel(panel) {
  if (!panel) return;
  cancelHideAtbPanel(panel);
  panel._atbHideTid = setTimeout(function () {
    panel._atbHideTid = null;
    hideAtbRisHoverPanel(panel);
  }, ATB_RIS_HIDE_DELAY_MS);
}

function panelAtbRisForWrap(wrap) {
  return wrap.querySelector('.atb-ris-hover-panel') || wrap._atbRisPanelEl || null;
}

function hideAtbRisHoverPanel(panel) {
  if (!panel) return;
  cancelHideAtbPanel(panel);
  panel.classList.remove('is-open');
  if (!document.querySelector('.atb-ris-hover-panel.is-open')) setAtbRisGlobalListeners(false);
  panel.style.left = '';
  panel.style.top = '';
  panel.style.visibility = '';
  var wrap = panel._atbRisOwnerWrap;
  if (wrap) {
    wrap._atbRisPanelEl = null;
  }
  panel._atbRisOwnerWrap = null;
  if (wrap && wrap.isConnected) {
    wrap.appendChild(panel);
  } else if (panel.parentNode === document.body) {
    panel.remove();
  }
}

function closeAtbRisPanelsExcept(exceptWrap) {
  document.querySelectorAll('.atb-ris-hover-panel.is-open').forEach(function (panel) {
    var w = panel._atbRisOwnerWrap || panel.closest('.cult-atb-ris-chip-wrap');
    if (w !== exceptWrap) hideAtbRisHoverPanel(panel);
  });
}

function repositionOpenAtbRisPanel() {
  var panel = document.querySelector('.atb-ris-hover-panel.is-open');
  if (!panel) return;
  var wrap = panel._atbRisOwnerWrap || panel.closest('.cult-atb-ris-chip-wrap');
  if (wrap) positionAtbRisHoverPanel(wrap);
}

function positionAtbRisHoverPanel(wrap) {
  var panel = panelAtbRisForWrap(wrap);
  var chip = wrap.querySelector('.atb-chip');
  if (!panel || !chip) return;
  closeAtbRisPanelsExcept(wrap);
  cancelHideAtbPanel(panel);
  panel._atbRisOwnerWrap = wrap;
  wrap._atbRisPanelEl = panel;
  if (panel.parentNode !== document.body) {
    document.body.appendChild(panel);
  }
  panel.classList.add('is-open');
  setAtbRisGlobalListeners(true);
  panel.style.visibility = 'hidden';
  panel.style.left = '-9999px';
  panel.style.top = '0';
  void panel.offsetWidth;
  var chipRect = chip.getBoundingClientRect();
  var pr = panel.getBoundingClientRect();
  var pw = pr.width;
  var ph = pr.height;
  var margin = 8;
  var gap = 1;
  var vh = window.innerHeight;
  var vw = window.innerWidth;
  var top = chipRect.bottom + gap;
  if (top + ph > vh - margin) {
    var aboveTop = chipRect.top - gap - ph;
    if (aboveTop >= margin) top = aboveTop;
    else top = Math.max(margin, vh - margin - ph);
  }
  var left = chipRect.left;
  if (left + pw > vw - margin) left = vw - margin - pw;
  if (left < margin) left = margin;
  panel.style.left = left + 'px';
  panel.style.top = top + 'px';
  panel.style.visibility = '';
  panel.style.zIndex = '';
}

function wireAtbRisPanelHoverListeners(panel) {
  if (panel._atbRisPanelHoverListeners) return;
  panel._atbRisPanelHoverListeners = true;
  panel.addEventListener('mouseenter', function () {
    cancelHideAtbPanel(panel);
  });
  panel.addEventListener('mouseleave', function (ev) {
    var w = panel._atbRisOwnerWrap || panel.closest('.cult-atb-ris-chip-wrap');
    var toEl = ev.relatedTarget;
    if (toEl && w && (w.contains(toEl) || panel.contains(toEl))) return;
    scheduleHideAtbPanel(panel);
  });
}

function wireAtbRisHoverPanels(rootEl) {
  if (!rootEl) return;
  ensureAtbRisScrollRepositionOn(rootEl);
  var tableWrap = rootEl.querySelector && rootEl.querySelector('.cultivos-table-wrap');
  if (tableWrap) ensureAtbRisScrollRepositionOn(tableWrap);
  var cultTab = document.getElementById('itab-content-cult');
  if (cultTab) ensureAtbRisScrollRepositionOn(cultTab);
  if (!_atbRisDelegatedHoverRoots.has(rootEl)) {
    _atbRisDelegatedHoverRoots.add(rootEl);
    rootEl.addEventListener('mouseover', function (ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains('cult-atb-ris-chip-wrap')
        ? t
        : t.closest('.cult-atb-ris-chip-wrap');
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (p) cancelHideAtbPanel(p);
      positionAtbRisHoverPanel(wrap);
    });
    rootEl.addEventListener('mouseout', function (ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains('cult-atb-ris-chip-wrap')
        ? t
        : t.closest('.cult-atb-ris-chip-wrap');
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (!p) return;
      var toEl = ev.relatedTarget;
      if (toEl && (wrap.contains(toEl) || p.contains(toEl))) return;
      scheduleHideAtbPanel(p);
    });
    rootEl.addEventListener('focusin', function (ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains('cult-atb-ris-chip-wrap')
        ? t
        : t.closest('.cult-atb-ris-chip-wrap');
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (p) cancelHideAtbPanel(p);
      positionAtbRisHoverPanel(wrap);
    });
    rootEl.addEventListener('focusout', function (ev) {
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest) return;
      var wrap = t.classList.contains('cult-atb-ris-chip-wrap')
        ? t
        : t.closest('.cult-atb-ris-chip-wrap');
      if (!wrap || !rootEl.contains(wrap)) return;
      var p = panelAtbRisForWrap(wrap);
      if (!p) return;
      var rel = ev.relatedTarget;
      if (rel && (wrap.contains(rel) || p.contains(rel))) return;
      hideAtbRisHoverPanel(p);
    });
    rootEl.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var t = ev.target;
      if (t && t.nodeType !== 1) t = t.parentElement;
      if (!t || !t.closest || !t.closest('.atb-chip')) return;
      var wrap = t.closest('.cult-atb-ris-chip-wrap');
      if (!wrap || !rootEl.contains(wrap)) return;
      ev.preventDefault();
      var p = panelAtbRisForWrap(wrap);
      if (p) cancelHideAtbPanel(p);
      positionAtbRisHoverPanel(wrap);
    });
  }
  rootEl.querySelectorAll('.atb-ris-hover-panel').forEach(wireAtbRisPanelHoverListeners);
}

/** Paneles portados a body al abrir; quitar antes de sustituir innerHTML del contenedor. */
function removeAtbRisPanelsFromBody() {
  document.querySelectorAll('body > .atb-ris-hover-panel').forEach(function (p) {
    hideAtbRisHoverPanel(p);
  });
}

export { wireAtbRisHoverPanels, removeAtbRisPanelsFromBody };
