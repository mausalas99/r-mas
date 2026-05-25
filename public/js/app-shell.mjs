/**
 * Shell de aplicación: chrome de contexto, toast, modales, export clínico, atajos y arranque diferido.
 */
import { storage } from './storage.js';
import { isModeSala } from './mode-features.mjs';
import { parseLanJoinQuery } from './lan-join-link.mjs';
import { isMobileWeb, blockIfMobileDocExport, mobileDocExportToast } from './mobile-web.mjs';
import { resolveQuickOutputAction } from './quick-output.mjs';
import { handleOutputDirFallback } from './output-dir-fallback.mjs';
import { createModalDismissRegistry } from './modal-dismiss.mjs';
import {
  getUiDensity,
  isPaseMode,
  setUiDensity,
  syncPaseReturnHeaderBtn,
} from './features/chrome.mjs';
import {
  configureLanFromMobileJoin,
  closeConnectionDropdown,
  openConnectionDropdown,
} from './features/lan-sync.mjs';
import {
  syncHeaderAppModeChip,
  loadSettings,
  closeProfileModal,
  openProfileModal,
  toggleProfileSection,
  closeTemplatesModal,
  normalizeQuickOutputFormat,
} from './features/profile.mjs';
import {
  closeSOAPModal,
} from './features/soap-estado.mjs';
import {
  closeProcedureAgendaModal,
} from './features/agenda.mjs';
import {
  closeTendDetail,
  closeTendGroupModal,
  closeTendHiddenModal,
  closeLabDisplayPrefsModal,
  isTendGroupModalOpen,
} from './features/tendencias.mjs';
import { closeLabSomeTablesModal } from './features/lab-some-tables-modal.mjs';
import {
  closeSesionIngresoSendModal,
} from './features/sesion-ingreso-send-modal.mjs';
import {
  closeSesionIngresoTrendsSendModal,
} from './features/sesion-ingreso-trends-send-modal.mjs';
import {
  closeUnifiedSearch,
  closeExtraTemplatesManager,
  initProductivityKeyboardShortcuts,
} from './features/productivity.mjs';
import {
  resolveAppVersionForTour,
  normalizeTourVersionLabel,
  markGuidedTourVersionDone,
  syncTeamSyncHeaderButton,
  closeSettingsDropdown,
  closeQuickHelp,
  closeReleaseNotes,
  hideTourIntroModal,
  toggleSettingsDropdown,
  initGuidedTourGate,
  closeLabBulkTourHintModal,
} from './features/settings-help.mjs';
import {
  incrementPendingJobs,
  decrementPendingJobs,
  formatDateSlug,
  downloadTextPayload,
  hideUpdateModal,
  closeWipeDataModal,
  initRpcServerHealthWatch,
  initIdleLockFeature,
  initGoalGFeatures,
} from './features/platform.mjs';
import {
  renderPatientList,
  closeModal,
  confirmCloseAddPatientModal,
  renderRoundOverviewPanels,
} from './features/patients.mjs';
import {
  switchAppTab,
  openPaseSectionInNormal,
  renderPaseBoard,
} from './features/pase-board.mjs';
import { renderProcedureAgendaPanel } from './features/agenda.mjs';
import {
  generateWord,
  generateIndicaciones,
  applyProfileToNoteIfEmpty,
} from './features/notes-indicaciones.mjs';
import { generateListado } from './features/expediente.mjs';
import {
  patients,
  notes,
  indicaciones,
  listadoProblemas,
  saveState,
} from './app-state.mjs';

const shellCtx = {
  getActiveId() { return null; },
  getActiveAppTab() { return 'lab'; },
  getActiveInner() { return 'todo'; },
  getSettings() { return {}; },
};

export function registerAppShellContext(partial) {
  if (partial && typeof partial === 'object') Object.assign(shellCtx, partial);
}

function syncActivePatientContextBar() {
  /* Paciente activo solo en la barra lateral; no repetir en el header */
}

function syncMedPatientGate() {
  var empty = document.getElementById('med-empty-guided');
  var work = document.getElementById('med-work-area');
  if (!empty || !work) return;
  var showEmpty = shellCtx.getActiveAppTab() === 'med' && !shellCtx.getActiveId();
  empty.style.display = showEmpty ? 'flex' : 'none';
  work.style.display = showEmpty ? 'none' : 'flex';
}

function setMedTabAttention(on) {
  var tab = document.getElementById('apptab-med');
  if (tab) tab.classList.toggle('app-tab-attention', !!on);
}

function syncWorkContextChrome() {
  syncActivePatientContextBar();
  syncHeaderAppModeChip();
  syncMedPatientGate();
  syncPaseReturnHeaderBtn();
}





function chooseOutputDir() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) {
    showToast('Función no disponible en este entorno', 'error');
    return;
  }
  window.electronAPI.selectOutputDir().then(function(dir) {
    if (!dir) return;
    shellCtx.getSettings().outputDir = dir;
    localStorage.setItem('rpc-settings', JSON.stringify(shellCtx.getSettings()));
    loadSettings();
    showToast('Carpeta actualizada ✓', 'success');
  });
}

function saveOutputDirSelection(dir) {
  if (!dir) return;
  shellCtx.getSettings().outputDir = dir;
  localStorage.setItem('rpc-settings', JSON.stringify(shellCtx.getSettings()));
  loadSettings();
}

function requestDocumentJson(url, payload) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(function(r){ return r.json(); });
}

function getOutputDirSelector() {
  if (!window.electronAPI || !window.electronAPI.selectOutputDir) return undefined;
  return function() { return window.electronAPI.selectOutputDir(); };
}

function handleDocumentGenerateResponse(opts) {
  return handleOutputDirFallback({
    response: opts.response,
    selectOutputDir: getOutputDirSelector(),
    saveOutputDir: saveOutputDirSelection,
    retry: function(dir) {
      return requestDocumentJson(opts.url, opts.buildPayload(dir));
    },
    onSuccess: opts.onSuccess,
    onError: function(message) {
      showToast('Error: ' + message, 'error');
    },
    onPrompt: function() {
      showToast('Selecciona una carpeta para guardar el documento.', 'error');
    },
    onCancel: function() {
      showToast('No se guardó el documento: no se eligió carpeta.', 'error');
    },
  });
}


function guardMobileDocExport() {
  if (!blockIfMobileDocExport()) return false;
  mobileDocExportToast(showToast);
  return true;
}

async function initMobileWebBoot() {
  if (!isMobileWeb()) return;
  try {
    document.title = 'R+ Móvil';
  } catch (_e) {}
  syncTeamSyncHeaderButton();
  try {
    var v = await resolveAppVersionForTour();
    window.__RPC_APP_VERSION__ = normalizeTourVersionLabel(v);
    markGuidedTourVersionDone();
  } catch (_bootVer) {}
  var intro = document.getElementById('onboarding-intro-backdrop');
  if (intro) {
    intro.classList.remove('open');
    intro.setAttribute('aria-hidden', 'true');
  }
  var parsed = parseLanJoinQuery(location.search, location.origin);
  if (!parsed.teamCode) {
    setTimeout(function () {
      if (typeof openConnectionDropdown === 'function') openConnectionDropdown();
    }, 600);
    return;
  }
  var hostUrl = String(parsed.hostUrl || location.origin || '')
    .trim()
    .replace(/\/+$/, '');
  if (!hostUrl) return;
  configureLanFromMobileJoin(hostUrl, parsed.teamCode, parsed.roomId);
}



function applyDefaultsToNewPatient(patientId) {
  if (!notes[patientId]) return;
  applyProfileToNoteIfEmpty(notes[patientId]);
}

function applyDefaultsToNewIndicaciones(patientId) {
  if (!indicaciones[patientId]) return;
  if (shellCtx.getSettings().defaultDieta        && !indicaciones[patientId].dieta)        indicaciones[patientId].dieta        = shellCtx.getSettings().defaultDieta;
  if (shellCtx.getSettings().defaultCuidados     && !indicaciones[patientId].cuidados)     indicaciones[patientId].cuidados     = shellCtx.getSettings().defaultCuidados;
  if (shellCtx.getSettings().defaultMedicamentos && !indicaciones[patientId].medicamentos) indicaciones[patientId].medicamentos = shellCtx.getSettings().defaultMedicamentos;
}





function launchConfetti() {
  var colors = ['#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#fb7185'];
  for (var i = 0; i < 40; i++) {
    (function(idx) {
      setTimeout(function() {
        var el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = (Math.random() * 100) + 'vw';
        el.style.top  = '-10px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = (Math.random() * 0.5) + 's';
        el.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
        document.body.appendChild(el);
        setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 3500);
      }, idx * 40);
    })(i);
  }
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function showToast(msg, type) {
  var focused = document.activeElement;
  var t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast show' + (type ? ' '+type : '');
  if (focused && focused.tagName !== 'BODY') setTimeout(function(){ focused.focus(); }, 0);
  setTimeout(function(){ t.className = 'toast'; }, 3500);
}

function onDefaultServicioBlur() {
  var el = document.getElementById('settings-default-servicio');
  if (!el) return;
  var v = (el.value || '').trim().toUpperCase();
  el.value = v;
  shellCtx.getSettings().defaultServicio = v;
  localStorage.setItem('rpc-settings', JSON.stringify(shellCtx.getSettings()));
  var w = document.getElementById('default-servicio-warning');
  var looksAbbrev = v.length > 0 && v.length <= 3 && /^[A-Z]+$/.test(v);
  if (w) w.style.display = looksAbbrev ? 'block' : 'none';
}

function onMedicoTemplateBlur() {
  var keys = ['profesor', 'r4', 'r2', 'r1a', 'r1b'];
  var tpl = {};
  keys.forEach(function (k) {
    var inp = document.getElementById('settings-medico-' + k);
    tpl[k] = inp ? (inp.value || '').trim() : '';
  });
  shellCtx.getSettings().medicosPlantilla = tpl;
  localStorage.setItem('rpc-settings', JSON.stringify(shellCtx.getSettings()));
}

function isRpcOverlayVisible(el) {
  if (!el) return false;
  var d = window.getComputedStyle(el).display;
  return d !== 'none' && d !== '';
}

var modalDismiss = createModalDismissRegistry();

function initModalDismiss() {
  var dynamicBackdropIds = [
    'lab-dedupe-backdrop',
    'soap-confirm-backdrop',
    'dup-confirm-backdrop',
    'lab-conflict-backdrop',
    'exp-advice-backdrop'
  ];

  function el(id) {
    return document.getElementById(id);
  }

  modalDismiss.register({
    isOpen: function () {
      return dynamicBackdropIds.some(function (id) {
        return !!el(id);
      });
    },
    close: function () {
      dynamicBackdropIds.forEach(function (id) {
        var node = el(id);
        if (node) node.remove();
      });
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('update-modal-backdrop'));
    },
    close: hideUpdateModal,
    backdropEl: function () {
      return el('update-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('tend-detail-backdrop'));
    },
    close: closeTendDetail,
    backdropEl: function () {
      return el('tend-detail-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isTendGroupModalOpen();
    },
    close: closeTendGroupModal,
    backdropEl: function () {
      return el('tend-group-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('rpc-wipe-modal');
      return m && m.getAttribute('aria-hidden') === 'false';
    },
    close: closeWipeDataModal,
    backdropEl: function () {
      return el('rpc-wipe-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('soap-modal-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeSOAPModal,
    backdropEl: function () {
      return el('soap-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('procedure-agenda-modal');
      return m && m.classList.contains('open');
    },
    close: closeProcedureAgendaModal,
    backdropEl: function () {
      return el('procedure-agenda-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('modal');
      return m && m.classList.contains('open');
    },
    close: closeModal,
    confirmClose: confirmCloseAddPatientModal,
    backdropEl: function () {
      return el('modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var m = el('profile-modal');
      return m && m.classList.contains('open');
    },
    close: closeProfileModal,
    backdropEl: function () {
      return el('profile-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('templates-modal'));
    },
    close: closeTemplatesModal,
    backdropEl: function () {
      return el('templates-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      return isRpcOverlayVisible(el('extra-templates-modal'));
    },
    close: closeExtraTemplatesManager,
    backdropEl: function () {
      return el('extra-templates-modal');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('unified-search-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeUnifiedSearch,
    backdropEl: function () {
      return el('unified-search-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('help-quick-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeQuickHelp,
    backdropEl: function () {
      return el('help-quick-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('release-notes-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeReleaseNotes,
    backdropEl: function () {
      return el('release-notes-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('tend-hidden-modal-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeTendHiddenModal,
    backdropEl: function () {
      return el('tend-hidden-modal-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('lab-display-prefs-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeLabDisplayPrefsModal,
    backdropEl: function () {
      return el('lab-display-prefs-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('lab-bulk-tour-hint-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeLabBulkTourHintModal,
    backdropEl: function () {
      return el('lab-bulk-tour-hint-backdrop');
    },
    panelSelector: '.lab-bulk-tour-hint-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('lab-some-tables-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeLabSomeTablesModal,
    backdropEl: function () {
      return el('lab-some-tables-backdrop');
    },
    panelSelector: '.lab-some-tables-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('sesion-ingreso-send-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeSesionIngresoSendModal,
    backdropEl: function () {
      return el('sesion-ingreso-send-backdrop');
    },
    panelSelector: '.sesion-ingreso-send-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('sesion-ingreso-trends-send-backdrop');
      return b && b.classList.contains('open');
    },
    close: closeSesionIngresoTrendsSendModal,
    backdropEl: function () {
      return el('sesion-ingreso-trends-send-backdrop');
    },
    panelSelector: '.sesion-ingreso-send-modal',
  });

  modalDismiss.register({
    isOpen: function () {
      var b = el('onboarding-intro-backdrop');
      return b && b.classList.contains('open');
    },
    close: hideTourIntroModal,
    backdropEl: function () {
      return el('onboarding-intro-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var c = el('connection-dropdown');
      return c && c.classList.contains('open');
    },
    close: closeConnectionDropdown,
    backdropEl: function () {
      return el('connection-dropdown-backdrop');
    }
  });

  modalDismiss.register({
    isOpen: function () {
      var s = el('settings-dropdown');
      return s && s.classList.contains('open');
    },
    close: closeSettingsDropdown,
    backdropEl: function () {
      return el('settings-dropdown-backdrop');
    }
  });

  modalDismiss.init();

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || !t.classList || !t.classList.contains('lab-conflict-backdrop')) return;
    if (dynamicBackdropIds.indexOf(t.id) === -1) return;
    t.remove();
  });
}

document.addEventListener('keydown', function(e) {
  var mod = e.metaKey || e.ctrlKey;
  if (mod) {
    var key = e.key.toLowerCase();
    if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5') {
      e.preventDefault();
      if (isPaseMode()) {
        if (key === '1') openPaseSectionInNormal('labs');
        if (key === '2') openPaseSectionInNormal('expediente');
        if (key === '3') openPaseSectionInNormal('med');
        if (key === '4' || key === '5') openPaseSectionInNormal('agenda');
      } else {
        if (key === '1') switchAppTab('lab');
        if (key === '2') switchAppTab('nota');
        if (key === '3') switchAppTab('med');
        if (key === '4' || key === '5') switchAppTab('agenda');
      }
    }
    if (key === 'p' && !e.altKey) {
      e.preventDefault();
      if (e.shiftKey) toggleProfileSection();
      else setUiDensity(getUiDensity() === 'normal' ? 'pase' : 'normal');
    }
    if (e.key === ',' && !e.shiftKey && !e.altKey) {
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
      var dd = document.getElementById('settings-dropdown');
      if (dd && dd.classList.contains('open')) closeSettingsDropdown();
      else toggleSettingsDropdown();
    }
    if (e.key === ',' && e.shiftKey && !e.altKey) {
      var tag2 = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
      if (tag2 === 'INPUT' || tag2 === 'TEXTAREA' || tag2 === 'SELECT' || (e.target && e.target.isContentEditable)) return;
      e.preventDefault();
      window.__rpcPreferImportOverwrite = !window.__rpcPreferImportOverwrite;
      showToast(
        window.__rpcPreferImportOverwrite
          ? 'Importación: conflictos → sobrescribir (⌘⇧, o Ctrl+Shift+, de nuevo para apagar).'
          : 'Importación: se preguntará en cada conflicto.',
        window.__rpcPreferImportOverwrite ? 'success' : 'info'
      );
    }
  }
}, true);


function updatePatient(field, value) {
  if (shellCtx.getActiveId() == null) return;
  var pid = String(shellCtx.getActiveId());
  var p = patients.find(function (pl) {
    return String(pl.id) === pid;
  });
  if (!p) return;
  var next =
    field === 'nombre' || field === 'area' || field === 'servicio'
      ? String(value || '').toUpperCase()
      : value;
  if (String(p[field] || '') === String(next || '')) return;
  p[field] = next;
  saveState();
  renderPatientList();
  syncWorkContextChrome();
  if (isPaseMode()) {
    renderPaseBoard();
    renderRoundOverviewPanels();
    if (shellCtx.getActiveAppTab() === 'agenda') renderProcedureAgendaPanel();
  }
}

function escHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toLines(value) {
  if (Array.isArray(value)) return value.map(function(v){ return String(v || '').trim(); }).filter(Boolean);
  return String(value || '').split('\n').map(function(v){ return v.trim(); }).filter(Boolean);
}

function slugFilePart(value, fallback) {
  var base = String(value || '').trim().toLowerCase();
  var slug = base
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallback;
}

function getCurrentPatientClinicalData() {
  var patient = patients.find(function(p){ return p.id === shellCtx.getActiveId(); });
  if (!patient) return null;
  return {
    patient: patient,
    note: notes[shellCtx.getActiveId()] || {},
    indicacion: indicaciones[shellCtx.getActiveId()] || {}
  };
}

function buildClinicalTextExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || 'both';
  var blocks = [];
  blocks.push('R+ - SALIDA CLINICA');
  blocks.push('PACIENTE: ' + (patient.nombre || ''));
  blocks.push('REGISTRO: ' + (patient.registro || ''));
  blocks.push('SERVICIO: ' + (patient.servicio || ''));
  blocks.push('CUARTO/CAMA: ' + (patient.cuarto || '') + '/' + (patient.cama || ''));
  blocks.push('');
  if (mode !== 'indica') {
    blocks.push('== NOTA DE EVOLUCION ==');
    blocks.push('FECHA/HORA: ' + (note.fecha || '') + ' ' + (note.hora || ''));
    blocks.push('DIAGNOSTICOS:');
    toLines(note.diagnosticos || []).forEach(function(v, idx){ blocks.push((idx + 1) + '. ' + v); });
    if (!toLines(note.diagnosticos || []).length) blocks.push('(sin contenido)');
  }
  function pushBlock(label, value) {
    blocks.push(label + ':');
    var lines = toLines(value);
    if (!lines.length) blocks.push('(sin contenido)');
    lines.forEach(function(l){ blocks.push('- ' + l); });
  }
  if (mode !== 'indica') {
    pushBlock('INTERROGATORIO', note.interrogatorio);
    pushBlock('EXPLORACION FISICA', note.exploracion);
    pushBlock('ESTUDIOS', note.estudios);
    pushBlock('ANALISIS', note.analisis);
    pushBlock('PLAN', note.plan);
    blocks.push('SIGNOS VITALES: TA ' + (note.ta || '-') + ' | FR ' + (note.fr || '-') + ' | FC ' + (note.fc || '-') + ' | TEMP ' + (note.temp || '-') + ' | PESO ' + (note.peso || '-'));
    pushBlock('TRATAMIENTO E INDICACIONES', note.tratamiento || []);
    blocks.push('MEDICO TRATANTE: ' + (note.medico || ''));
    blocks.push('PROFESOR RESPONSABLE: ' + (note.profesor || ''));
  }
  if (mode === 'both') blocks.push('');
  if (mode !== 'note') {
    blocks.push('== INDICACIONES ==');
    blocks.push('FECHA/HORA: ' + (ind.fecha || '') + ' ' + (ind.hora || ''));
    pushBlock('MEDICOS', ind.medicos);
    pushBlock('DIETA', ind.dieta);
    pushBlock('CUIDADOS', ind.cuidados);
    pushBlock('ESTUDIOS', ind.estudios);
    pushBlock('MEDICAMENTOS', ind.medicamentos);
    pushBlock('INTERCONSULTAS', ind.interconsultas);
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (otros.length) {
      blocks.push('OTROS:');
      otros.forEach(function(item, idx) {
        if (!item || typeof item !== 'object') return;
        blocks.push((idx + 1) + '. ' + (item.titulo || 'Seccion sin titulo'));
        toLines(item.contenido || '').forEach(function(line) { blocks.push('   - ' + line); });
      });
    }
  }
  return blocks.join('\n');
}

function buildClinicalHtmlExport(bundle) {
  var patient = bundle.patient || {};
  var note = bundle.note || {};
  var ind = bundle.indicacion || {};
  var mode = bundle.mode || 'both';
  function renderList(values) {
    var lines = toLines(values);
    if (!lines.length) return '<p><em>Sin contenido</em></p>';
    return '<ul>' + lines.map(function(line){ return '<li>' + escHtml(line) + '</li>'; }).join('') + '</ul>';
  }
  function renderOtherSections() {
    var otros = Array.isArray(ind.otros) ? ind.otros : [];
    if (!otros.length) return '<p><em>Sin secciones adicionales</em></p>';
    return otros.filter(function(item) { return item && typeof item === 'object'; }).map(function(item) {
      return '<article><h4>' + escHtml(item.titulo || 'Seccion sin titulo') + '</h4>' + renderList(item.contenido || '') + '</article>';
    }).join('');
  }
  var noteHtml = '<section><h2>Nota de evolucion</h2>' +
    '<p><strong>Fecha/Hora:</strong> ' + escHtml(note.fecha || '') + ' ' + escHtml(note.hora || '') + '</p>' +
    '<h3>Diagnosticos</h3>' + renderList(note.diagnosticos || []) +
    '<h3>Interrogatorio</h3>' + renderList(note.interrogatorio) +
    '<h3>Exploracion fisica</h3>' + renderList(note.exploracion) +
    '<h3>Estudios</h3>' + renderList(note.estudios) +
    '<h3>Analisis</h3>' + renderList(note.analisis) +
    '<h3>Plan</h3>' + renderList(note.plan) +
    '<h3>Signos vitales</h3><p>TA ' + escHtml(note.ta || '-') + ' | FR ' + escHtml(note.fr || '-') + ' | FC ' + escHtml(note.fc || '-') + ' | TEMP ' + escHtml(note.temp || '-') + ' | PESO ' + escHtml(note.peso || '-') + '</p>' +
    '<h3>Tratamiento e indicaciones medicas</h3>' + renderList(note.tratamiento || []) +
    '</section>';
  var indicaHtml = '<section><h2>Indicaciones</h2>' +
    '<p><strong>Fecha/Hora:</strong> ' + escHtml(ind.fecha || '') + ' ' + escHtml(ind.hora || '') + '</p>' +
    '<h3>Medicos</h3>' + renderList(ind.medicos) +
    '<h3>Dieta</h3>' + renderList(ind.dieta) +
    '<h3>Cuidados</h3>' + renderList(ind.cuidados) +
    '<h3>Estudios</h3>' + renderList(ind.estudios) +
    '<h3>Medicamentos</h3>' + renderList(ind.medicamentos) +
    '<h3>Interconsultas</h3>' + renderList(ind.interconsultas) +
    '<h3>Otros</h3>' + renderOtherSections() +
    '</section>';
  return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:;">' +
    '<title>R+ salida clinica</title>' +
    '<style>body{font-family:Arial,sans-serif;line-height:1.45;margin:24px;color:#111}h1,h2{margin-bottom:8px}section{margin:20px 0;padding-top:8px;border-top:1px solid #ddd}h3{margin:14px 0 6px}ul{margin:0 0 8px 20px}p{margin:0 0 8px}</style>' +
    '</head><body>' +
    '<h1>R+ - Salida clinica</h1>' +
    '<p><strong>Paciente:</strong> ' + escHtml(patient.nombre || '') + ' | <strong>Registro:</strong> ' + escHtml(patient.registro || '') + '</p>' +
    '<p><strong>Servicio:</strong> ' + escHtml(patient.servicio || '') + ' | <strong>Cuarto/Cama:</strong> ' + escHtml(patient.cuarto || '') + '/' + escHtml(patient.cama || '') + '</p>' +
    (mode !== 'indica' ? noteHtml : '') +
    (mode !== 'note' ? indicaHtml : '') +
    '</body></html>';
}

function exportCurrentPatientAsText() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = shellCtx.getActiveInner() === 'indica' ? 'indica' : 'note';
  var fileName = 'R-plus-' + slugFilePart(bundle.patient.nombre, 'paciente') + '-clinico-' + formatDateSlug(new Date()) + '.txt';
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalTextExport(bundle), fileName, 'text/plain');
    showToast('Salida .txt descargada', 'success');
  } catch (e) {
    showToast('No se pudo exportar: ' + (e && e.message ? e.message : 'error'), 'error');
  } finally {
    decrementPendingJobs();
  }
}

function exportCurrentPatientAsHtml() {
  var bundle = getCurrentPatientClinicalData();
  if (!bundle) return;
  bundle.mode = shellCtx.getActiveInner() === 'indica' ? 'indica' : 'note';
  var fileName = 'R-plus-' + slugFilePart(bundle.patient.nombre, 'paciente') + '-clinico-' + formatDateSlug(new Date()) + '.html';
  incrementPendingJobs();
  try {
    downloadTextPayload(buildClinicalHtmlExport(bundle), fileName, 'text/html');
    showToast('Salida .html descargada', 'success');
  } catch (e) {
    showToast('No se pudo exportar: ' + (e && e.message ? e.message : 'error'), 'error');
  } finally {
    decrementPendingJobs();
  }
}

export function rpcPrefersReducedMotion() {
  try {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  } catch (_e) {
    return false;
  }
}

function quickExportCurrentPatient() {
  if (guardMobileDocExport()) return;
  if (!shellCtx.getActiveId()) {
    showToast('Selecciona un paciente primero', 'error');
    return;
  }
  var format = normalizeQuickOutputFormat(shellCtx.getSettings().quickOutputFormat);
  var action = resolveQuickOutputAction({
    format: format,
    appMode: isModeSala(shellCtx.getSettings()) ? 'sala' : 'interconsulta',
    activeInner: shellCtx.getActiveInner(),
    listado: listadoProblemas[shellCtx.getActiveId()] || null,
  });
  switch (action.kind) {
    case 'html':           exportCurrentPatientAsHtml(); return;
    case 'txt':            exportCurrentPatientAsText(); return;
    case 'listado':        generateListado(); return;
    case 'listado_empty':  showToast(action.message, 'error'); return;
    case 'indicaciones':   generateIndicaciones(); return;
    case 'nota':
    default:               generateWord(); return;
  }
}

export {
  showToast,
  syncWorkContextChrome,
  setMedTabAttention,
  guardMobileDocExport,
  requestDocumentJson,
  handleDocumentGenerateResponse,
  launchConfetti,
  applyDefaultsToNewPatient,
  applyDefaultsToNewIndicaciones,
  initModalDismiss,
};

export const appShellWindowHandlers = {
  onDefaultServicioBlur,
  onMedicoTemplateBlur,
  chooseOutputDir,
  updatePatient,
  quickExportCurrentPatient,
};

function _rpcDeferInit(fn) {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(
      function () {
        try {
          fn();
        } catch (e) {
          console.error('deferInit error:', e && e.message);
        }
      },
      { timeout: 1500 }
    );
  } else {
    setTimeout(function () {
      try {
        fn();
      } catch (e) {
        console.error('deferInit error:', e && e.message);
      }
    }, 200);
  }
}

export function scheduleDeferredShellInits() {
  _rpcDeferInit(initGoalGFeatures);
  _rpcDeferInit(initGuidedTourGate);
  _rpcDeferInit(initMobileWebBoot);
  _rpcDeferInit(initRpcServerHealthWatch);
  _rpcDeferInit(initIdleLockFeature);
}

export function scheduleDeferredUiInits() {
  _rpcDeferInit(initProductivityKeyboardShortcuts);
  _rpcDeferInit(initModalDismiss);
}
