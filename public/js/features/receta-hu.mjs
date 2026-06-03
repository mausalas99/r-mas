/**
 * Pestaña Receta médica HU (000-061-R-06-12) — Interconsulta.
 */
import { patients, recetaHuByPatient, saveState } from '../app-state.mjs';
import { setAsyncButtonLoading } from '../ui-motion.mjs';
import {
  buildProximaCitaText,
  buildRecetaHuGeneratePayload,
  formatRecetaHuFecha,
  normalizeRecetaHuConsultServices,
  normalizeRecetaHuDraft,
} from '../receta-hu-core.mjs';

/** @type {{
 *   getActiveId(): string|null,
 *   getActiveAppTab(): string,
 *   getActiveInner(): string,
 *   getSettings(): Record<string, unknown>,
 *   switchAppTab(tab: string): void,
 *   switchInnerTab(tab: string): void,
 *   requestDocumentJson(url: string, payload: unknown): Promise<unknown>,
 *   handleDocumentGenerateResponse(opts: unknown): Promise<unknown>,
 *   showToast(msg: string, type?: string): void,
 *   guardMobileDocExport(): boolean,
 *   isRpcOffline(): boolean,
 *   incrementPendingJobs(): void,
 *   decrementPendingJobs(): void,
 *   syncOfflineButtonStates(): void,
 * }} */
var rt = {
  getActiveId() {
    return null;
  },
  getActiveAppTab() {
    return 'lab';
  },
  getActiveInner() {
    return 'todo';
  },
  getSettings() {
    return {};
  },
  switchAppTab() {},
  switchInnerTab() {},
  requestDocumentJson() {
    return Promise.resolve(null);
  },
  handleDocumentGenerateResponse(opts) {
    return Promise.resolve(opts && opts.response);
  },
  showToast() {},
  guardMobileDocExport() {
    return false;
  },
  isRpcOffline() {
    return false;
  },
  incrementPendingJobs() {},
  decrementPendingJobs() {},
  syncOfflineButtonStates() {},
};

export function registerRecetaHuRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

function aid() {
  return rt.getActiveId();
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getDraft(pid) {
  if (!pid) return normalizeRecetaHuDraft(null);
  if (!recetaHuByPatient[pid]) {
    recetaHuByPatient[pid] = normalizeRecetaHuDraft({
      fecha: formatRecetaHuFecha(new Date()),
      meds: [],
      labs: [],
    });
  }
  return normalizeRecetaHuDraft(recetaHuByPatient[pid]);
}

function persistDraft(pid, draft) {
  if (!pid || pid.indexOf('demo-') === 0) return;
  recetaHuByPatient[pid] = normalizeRecetaHuDraft(draft);
  saveState();
}

/** Si el panel HU está montado para ese paciente, persiste fecha/cuidados antes de cambiar de paciente. */
export function flushRecetaHuDraftIfMountedFor(patientId) {
  if (!patientId || String(patientId).indexOf('demo-') === 0) return;
  var root = document.getElementById('receta-hu-container');
  if (!root || root.dataset.mounted !== '1') return;
  if (String(root.dataset.patientId || '') !== String(patientId)) return;
  var draft = getDraft(patientId);
  readStaticFieldsFromDom(draft);
  persistDraft(patientId, draft);
}

function consultServices() {
  return normalizeRecetaHuConsultServices(rt.getSettings().recetaHuConsultServices);
}

function saveConsultServices(list) {
  var st = rt.getSettings();
  st.recetaHuConsultServices = normalizeRecetaHuConsultServices(list);
  try {
    localStorage.setItem('rpc-settings', JSON.stringify(st));
  } catch (_e) {}
}

function activePatient() {
  var pid = aid();
  if (!pid) return null;
  return patients.find(function (p) {
    return p.id === pid;
  }) || null;
}

function recetaHuPanelVisible() {
  var root = document.getElementById('receta-hu-container');
  if (!root) return false;
  var r = root.getBoundingClientRect();
  return r.width > 4 && r.height > 4;
}

function ensureRecetaHuPanelVisible() {
  if (recetaHuPanelVisible()) return;
  if (typeof rt.switchInnerTab === 'function') {
    rt.switchInnerTab('recetaHu');
    return;
  }
  if (typeof rt.getActiveAppTab === 'function' && rt.getActiveAppTab() !== 'nota' && typeof rt.switchAppTab === 'function') {
    rt.switchAppTab('nota');
  }
}

function resetExportButtonState() {
  var btn = document.getElementById('btn-receta-hu-export');
  if (!btn) return;
  if (!btn.dataset.uiMotionDefaultLabel) {
    btn.dataset.uiMotionDefaultLabel = 'Exportar PDF';
  }
  delete btn.dataset.rpcOffline;
  setAsyncButtonLoading(btn, false);
  if (!(rt.isRpcOffline && rt.isRpcOffline())) {
    btn.disabled = false;
    btn.removeAttribute('aria-disabled');
  }
}

function readStaticFieldsFromDom(draft) {
  var fechaEl = document.getElementById('receta-hu-fecha');
  if (fechaEl) draft.fecha = fechaEl.value;
  var cuidadosEl = document.getElementById('receta-hu-cuidados');
  if (cuidadosEl) draft.cuidados = cuidadosEl.value;
  return draft;
}

function readDraftFromDom() {
  var pid = aid();
  var draft = getDraft(pid);
  readStaticFieldsFromDom(draft);
  return draft;
}

function renderMedList(root, meds) {
  var list = root.querySelector('#receta-hu-meds-list');
  if (!list) return;
  if (!meds.length) {
    list.innerHTML = '<p class="receta-hu-list-empty">Sin medicamentos aún.</p>';
    return;
  }
  list.innerHTML = meds
    .map(function (row, idx) {
      return (
        '<div class="receta-hu-item" data-med-idx="' +
        idx +
        '">' +
        '<div class="receta-hu-item-body">' +
        '<strong>' +
        esc(row.medicamento || '—') +
        '</strong>' +
        (row.presentacion ? '<span>' + esc(row.presentacion) + '</span>' : '') +
        (row.dosis ? '<span class="receta-hu-item-dose">' + esc(row.dosis) + '</span>' : '') +
        '</div>' +
        '<button type="button" class="btn-icon-quiet" title="Quitar" aria-label="Quitar medicamento" data-receta-hu-action="remove-med" data-med-idx="' +
        idx +
        '">×</button>' +
        '</div>'
      );
    })
    .join('');
}

function renderLabList(root, labs) {
  var list = root.querySelector('#receta-hu-labs-added');
  if (!list) return;
  var items = labs.filter(function (x) {
    return String(x || '').trim();
  });
  if (!items.length) {
    list.innerHTML = '<p class="receta-hu-list-empty">Sin estudios aún.</p>';
    return;
  }
  list.innerHTML = items
    .map(function (name, idx) {
      return (
        '<div class="receta-hu-item receta-hu-item-lab" data-lab-idx="' +
        idx +
        '">' +
        '<span class="receta-hu-item-body">' +
        esc(name) +
        '</span>' +
        '<button type="button" class="btn-icon-quiet" title="Quitar" aria-label="Quitar estudio" data-receta-hu-action="remove-lab" data-lab-idx="' +
        idx +
        '">×</button>' +
        '</div>'
      );
    })
    .join('');
}

function renderProximaCitaList(root, proximasCitas) {
  var list = root.querySelector('#receta-hu-proximas-list');
  if (!list) return;
  var items = (proximasCitas || []).filter(function (row) {
    return row && (row.texto || row.servicio || row.fecha);
  });
  if (!items.length) {
    list.innerHTML = '<p class="receta-hu-list-empty">Sin consultas de seguimiento aún.</p>';
    return;
  }
  list.innerHTML = items
    .map(function (row, idx) {
      var meta = [];
      if (row.fecha) meta.push('Fecha: ' + row.fecha);
      if (row.servicio && !row.texto) meta.push(row.servicio);
      return (
        '<div class="receta-hu-item receta-hu-item-proxima" data-proxima-idx="' +
        idx +
        '">' +
        '<div class="receta-hu-item-body">' +
        '<strong>' +
        esc(row.texto || buildProximaCitaText(row.plazo, row.servicio) || '—') +
        '</strong>' +
        (meta.length ? '<span class="receta-hu-item-dose">' + esc(meta.join(' · ')) + '</span>' : '') +
        '</div>' +
        '<button type="button" class="btn-icon-quiet" title="Quitar" aria-label="Quitar consulta" data-receta-hu-action="remove-proxima" data-proxima-idx="' +
        idx +
        '">×</button>' +
        '</div>'
      );
    })
    .join('');
}

function renderConsultServiceSelect(root, draft) {
  var sel = root.querySelector('#receta-hu-consult-servicio');
  if (!sel) return;
  var services = consultServices();
  var prev = sel.value;
  sel.innerHTML = '<option value="">— Servicio —</option>';
  services.forEach(function (s) {
    var opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
  if (prev && services.indexOf(prev) >= 0) sel.value = prev;
  var plazo = root.querySelector('#receta-hu-compose-proxima-plazo');
  if (plazo && draft.proximaPlazo) plazo.value = draft.proximaPlazo;
}

function bindRecetaHuEvents(root) {
  if (root.dataset.eventsBound === '1') return;
  root.dataset.eventsBound = '1';

  root.addEventListener('click', function (ev) {
    var actionBtn = ev.target && ev.target.closest ? ev.target.closest('[data-receta-hu-action]') : null;
    if (!actionBtn || !root.contains(actionBtn)) return;
    var action = actionBtn.getAttribute('data-receta-hu-action');
    if (action === 'export') {
      ev.preventDefault();
      exportRecetaHuPdf();
      return;
    }
    if (action === 'add-med') {
      ev.preventDefault();
      recetaHuCommitMedFromCompose();
      return;
    }
    if (action === 'add-lab') {
      ev.preventDefault();
      recetaHuCommitLabFromCompose();
      return;
    }
    if (action === 'add-proxima') {
      ev.preventDefault();
      recetaHuCommitProximaFromCompose();
      return;
    }
    if (action === 'add-service') {
      ev.preventDefault();
      recetaHuAddConsultService();
      return;
    }
    if (action === 'remove-med') {
      ev.preventDefault();
      var medIdx = parseInt(actionBtn.getAttribute('data-med-idx'), 10);
      if (!isNaN(medIdx)) recetaHuRemoveMedRow(medIdx);
      return;
    }
    if (action === 'remove-lab') {
      ev.preventDefault();
      var labIdx = parseInt(actionBtn.getAttribute('data-lab-idx'), 10);
      if (!isNaN(labIdx)) recetaHuRemoveLabRow(labIdx);
      return;
    }
    if (action === 'remove-proxima') {
      ev.preventDefault();
      var proxIdx = parseInt(actionBtn.getAttribute('data-proxima-idx'), 10);
      if (!isNaN(proxIdx)) recetaHuRemoveProximaRow(proxIdx);
      return;
    }
    if (action === 'open-profile') {
      ev.preventDefault();
      if (typeof window.openProfileModal === 'function') window.openProfileModal();
    }
  });

  root.addEventListener('input', function (ev) {
    var t = ev.target;
    if (!t || !t.closest('#receta-hu-container')) return;
    if (t.id === 'receta-hu-compose-med-n' || t.id === 'receta-hu-compose-med-p' || t.id === 'receta-hu-compose-med-d') return;
    if (t.id === 'receta-hu-compose-lab') return;
    if (
      t.id === 'receta-hu-compose-proxima-plazo' ||
      t.id === 'receta-hu-compose-proxima-texto' ||
      t.id === 'receta-hu-compose-proxima-fecha'
    ) {
      return;
    }
    var pid = aid();
    if (pid) persistDraft(pid, readDraftFromDom());
  });

  root.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t && t.id === 'receta-hu-consult-servicio') {
      recetaHuOnConsultServicePick();
      return;
    }
    if (t && t.id === 'receta-hu-compose-proxima-plazo') {
      recetaHuOnConsultServicePick();
      return;
    }
    var pid = aid();
    if (pid) persistDraft(pid, readDraftFromDom());
  });

  root.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter') return;
    var t = ev.target;
    if (!t) return;
    if (t.id === 'receta-hu-compose-lab') {
      ev.preventDefault();
      recetaHuCommitLabFromCompose();
      return;
    }
    if (t.id === 'receta-hu-compose-med-n' || t.id === 'receta-hu-compose-med-p' || t.id === 'receta-hu-compose-med-d') {
      ev.preventDefault();
      recetaHuCommitMedFromCompose();
      return;
    }
    if (
      t.id === 'receta-hu-compose-proxima-texto' ||
      t.id === 'receta-hu-compose-proxima-fecha'
    ) {
      ev.preventDefault();
      recetaHuCommitProximaFromCompose();
    }
  });
}

function ensureRecetaHuShell(root) {
  var pid = aid();
  if (root.dataset.mounted === '1' && root.dataset.patientId === pid) return;

  root.innerHTML =
    '<div class="receta-hu-root">' +
    '<div class="receta-hu-sheet">' +
    '<div class="receta-hu-head">' +
    '<div><h3 class="receta-hu-title">Receta médica HU</h3>' +
    '<p class="receta-hu-sub">Formato oficial <strong>000-061-R-06-12</strong>. Firma a mano al imprimir.</p></div>' +
    '<button type="button" class="btn-generate rpc-doc-export" id="btn-receta-hu-export" data-receta-hu-action="export">Exportar PDF</button>' +
    '</div>' +
    '<section class="receta-hu-section">' +
    '<h4 class="receta-hu-section-title">Paciente</h4>' +
    '<div class="receta-hu-meta" id="receta-hu-patient-meta"></div>' +
    '<label class="receta-hu-field"><span>Fecha</span><input type="text" class="receta-hu-input" id="receta-hu-fecha" placeholder="dd/mm/aaaa"></label>' +
    '</section>' +
    '<section class="receta-hu-section">' +
    '<h4 class="receta-hu-section-title">Medicamentos</h4>' +
    '<div class="receta-hu-compose receta-hu-compose-med">' +
    '<input type="text" class="receta-hu-input" id="receta-hu-compose-med-n" placeholder="Medicamento" aria-label="Medicamento">' +
    '<input type="text" class="receta-hu-input" id="receta-hu-compose-med-p" placeholder="Presentación" aria-label="Presentación">' +
    '<input type="text" class="receta-hu-input" id="receta-hu-compose-med-d" placeholder="Dosis" aria-label="Dosis">' +
    '<button type="button" class="btn-add-inline" data-receta-hu-action="add-med">Agregar</button>' +
    '</div>' +
    '<div id="receta-hu-meds-list" class="receta-hu-added-list"></div>' +
    '</section>' +
    '<section class="receta-hu-section">' +
    '<h4 class="receta-hu-section-title">Exámenes de laboratorio y/o gabinete</h4>' +
    '<p class="receta-hu-hint-inline">Solo el nombre del estudio — para que el paciente acuda a tomarlos.</p>' +
    '<div class="receta-hu-compose receta-hu-compose-lab">' +
    '<input type="text" class="receta-hu-input" id="receta-hu-compose-lab" placeholder="Nombre del estudio" aria-label="Estudio de laboratorio">' +
    '<button type="button" class="btn-add-inline" data-receta-hu-action="add-lab">Agregar</button>' +
    '</div>' +
    '<div id="receta-hu-labs-added" class="receta-hu-added-list"></div>' +
    '</section>' +
    '<section class="receta-hu-section">' +
    '<h4 class="receta-hu-section-title">Cuidados higiénicos dietéticos</h4>' +
    '<textarea class="receta-hu-textarea" id="receta-hu-cuidados" rows="4" placeholder="Texto libre…"></textarea>' +
    '</section>' +
    '<section class="receta-hu-section">' +
    '<h4 class="receta-hu-section-title">Consultas de seguimiento</h4>' +
    '<p class="receta-hu-hint-inline">Puedes agregar varias consultas; en el PDF aparecen una debajo de otra.</p>' +
    '<div class="receta-hu-proxima-grid receta-hu-compose-proxima">' +
    '<label class="receta-hu-field"><span>Plazo</span><input type="text" class="receta-hu-input" id="receta-hu-compose-proxima-plazo" placeholder="2 semanas"></label>' +
    '<label class="receta-hu-field"><span>Consulta de</span><select class="receta-hu-input" id="receta-hu-consult-servicio"></select></label>' +
    '<button type="button" class="btn-add-inline btn-add-inline-muted" data-receta-hu-action="add-service">+ Servicio</button>' +
    '</div>' +
    '<label class="receta-hu-field"><span>Texto en receta</span><input type="text" class="receta-hu-input" id="receta-hu-compose-proxima-texto" placeholder="Acudir en 2 semanas a consulta de Nefrología"></label>' +
    '<div class="receta-hu-compose receta-hu-compose-proxima-fecha">' +
    '<label class="receta-hu-field receta-hu-field-grow"><span>Fecha (opcional, campo derecho del PDF)</span><input type="text" class="receta-hu-input" id="receta-hu-compose-proxima-fecha" placeholder="dd/mm/aaaa"></label>' +
    '<button type="button" class="btn-add-inline" data-receta-hu-action="add-proxima">Agregar consulta</button>' +
    '</div>' +
    '<div id="receta-hu-proximas-list" class="receta-hu-added-list"></div>' +
    '</section>' +
    '<p class="receta-hu-foot">Médico y cédula se toman de <strong>Mi Perfil</strong>.</p>' +
    '</div></div>';

  root.dataset.mounted = '1';
  root.dataset.patientId = pid || '';
  root.dataset.eventsBound = '0';
  bindRecetaHuEvents(root);
}

export function renderRecetaHu() {
  var root = document.getElementById('receta-hu-container');
  if (!root) return;

  var pid = aid();
  if (!pid) {
    root.innerHTML = '<p class="receta-hu-hint">Selecciona un paciente para llenar la receta HU.</p>';
    root.dataset.mounted = '';
    return;
  }

  if (root.dataset.patientId && root.dataset.patientId !== pid) {
    root.dataset.mounted = '';
    root.dataset.eventsBound = '0';
  }

  var patient = activePatient();
  var draft = getDraft(pid);
  var st = rt.getSettings();

  ensureRecetaHuShell(root);
  bindRecetaHuEvents(root);

  var meta = root.querySelector('#receta-hu-patient-meta');
  if (meta && patient) {
    meta.innerHTML =
      '<span><strong>' +
      esc(patient.nombre) +
      '</strong></span>' +
      (patient.registro ? '<span>Reg. ' + esc(patient.registro) + '</span>' : '') +
      (patient.servicio ? '<span>Serv. ' + esc(patient.servicio) + '</span>' : '');
  }

  var fechaEl = root.querySelector('#receta-hu-fecha');
  if (fechaEl) fechaEl.value = draft.fecha || formatRecetaHuFecha(new Date());
  var cuidadosEl = root.querySelector('#receta-hu-cuidados');
  if (cuidadosEl) cuidadosEl.value = draft.cuidados;

  renderMedList(root, draft.meds);
  renderLabList(root, draft.labs);
  renderProximaCitaList(root, draft.proximasCitas);
  renderConsultServiceSelect(root, draft);

  var docHint = root.querySelector('.receta-hu-foot');
  if (docHint) {
    docHint.innerHTML =
      'Médico: <strong>' +
      esc(st.doctorName || '—') +
      '</strong> · Cédula: <strong>' +
      esc(st.cedulaProfesional || '—') +
      '</strong> (<a href="#" data-receta-hu-action="open-profile">Mi Perfil</a>)';
  }

  resetExportButtonState();
  if (typeof rt.syncOfflineButtonStates === 'function') rt.syncOfflineButtonStates();
}

function recetaHuCommitMedFromCompose() {
  var pid = aid();
  if (!pid) return;
  var nEl = document.getElementById('receta-hu-compose-med-n');
  var pEl = document.getElementById('receta-hu-compose-med-p');
  var dEl = document.getElementById('receta-hu-compose-med-d');
  var medicamento = nEl ? String(nEl.value || '').trim() : '';
  var presentacion = pEl ? String(pEl.value || '').trim() : '';
  var dosis = dEl ? String(dEl.value || '').trim() : '';
  if (!medicamento && !presentacion && !dosis) {
    rt.showToast('Escribe al menos un campo del medicamento', 'error');
    if (nEl) nEl.focus();
    return;
  }
  var draft = readDraftFromDom();
  draft.meds.push({ medicamento: medicamento, presentacion: presentacion, dosis: dosis });
  persistDraft(pid, draft);
  if (nEl) nEl.value = '';
  if (pEl) pEl.value = '';
  if (dEl) dEl.value = '';
  renderMedList(document.getElementById('receta-hu-container'), draft.meds);
  if (nEl) nEl.focus();
}

function recetaHuRemoveMedRow(idx) {
  var pid = aid();
  if (!pid) return;
  var draft = readDraftFromDom();
  draft.meds.splice(idx, 1);
  persistDraft(pid, draft);
  renderMedList(document.getElementById('receta-hu-container'), draft.meds);
}

function recetaHuCommitLabFromCompose() {
  var pid = aid();
  if (!pid) return;
  var inp = document.getElementById('receta-hu-compose-lab');
  var name = inp ? String(inp.value || '').trim() : '';
  if (!name) {
    rt.showToast('Escribe el nombre del estudio', 'error');
    if (inp) inp.focus();
    return;
  }
  var draft = readDraftFromDom();
  draft.labs.push(name);
  persistDraft(pid, draft);
  if (inp) inp.value = '';
  renderLabList(document.getElementById('receta-hu-container'), draft.labs);
  if (inp) inp.focus();
}

function recetaHuRemoveLabRow(idx) {
  var pid = aid();
  if (!pid) return;
  var draft = readDraftFromDom();
  var items = draft.labs.filter(function (x) {
    return String(x || '').trim();
  });
  items.splice(idx, 1);
  draft.labs = items;
  persistDraft(pid, draft);
  renderLabList(document.getElementById('receta-hu-container'), draft.labs);
}

function recetaHuOnConsultServicePick() {
  var sel = document.getElementById('receta-hu-consult-servicio');
  var plazoEl = document.getElementById('receta-hu-compose-proxima-plazo');
  var textoEl = document.getElementById('receta-hu-compose-proxima-texto');
  if (!sel || !textoEl) return;
  var text = buildProximaCitaText(plazoEl ? plazoEl.value : '', sel.value);
  if (text) textoEl.value = text;
}

function recetaHuCommitProximaFromCompose() {
  var pid = aid();
  if (!pid) return;
  var plazoEl = document.getElementById('receta-hu-compose-proxima-plazo');
  var sel = document.getElementById('receta-hu-consult-servicio');
  var textoEl = document.getElementById('receta-hu-compose-proxima-texto');
  var fechaEl = document.getElementById('receta-hu-compose-proxima-fecha');
  var plazo = plazoEl ? String(plazoEl.value || '').trim() : '';
  var servicio = sel ? String(sel.value || '').trim() : '';
  var texto = textoEl ? String(textoEl.value || '').trim() : '';
  var fecha = fechaEl ? String(fechaEl.value || '').trim() : '';
  if (!texto && servicio) texto = buildProximaCitaText(plazo || '2 semanas', servicio);
  if (!texto && !fecha) {
    rt.showToast('Elige servicio o escribe el texto de la consulta', 'error');
    if (sel) sel.focus();
    return;
  }
  var draft = readDraftFromDom();
  draft.proximaPlazo = plazo || draft.proximaPlazo || '2 semanas';
  draft.proximasCitas.push({
    plazo: plazo || draft.proximaPlazo || '2 semanas',
    servicio: servicio,
    texto: texto,
    fecha: fecha,
  });
  persistDraft(pid, draft);
  if (textoEl) textoEl.value = '';
  if (fechaEl) fechaEl.value = '';
  if (sel) sel.value = '';
  renderProximaCitaList(document.getElementById('receta-hu-container'), draft.proximasCitas);
  if (plazoEl) plazoEl.focus();
}

function recetaHuRemoveProximaRow(idx) {
  var pid = aid();
  if (!pid) return;
  var draft = readDraftFromDom();
  draft.proximasCitas.splice(idx, 1);
  persistDraft(pid, draft);
  renderProximaCitaList(document.getElementById('receta-hu-container'), draft.proximasCitas);
}

function recetaHuAddConsultService() {
  var sel = document.getElementById('receta-hu-consult-servicio');
  if (!sel) return;
  var name = window.prompt('Nombre del servicio para el menú (ej. Nefrología):', sel.value || '');
  if (!name) return;
  var trimmed = String(name).trim();
  if (!trimmed) return;
  var list = consultServices();
  if (list.indexOf(trimmed) < 0) {
    list.push(trimmed);
    saveConsultServices(list);
  }
  renderRecetaHu();
  var sel2 = document.getElementById('receta-hu-consult-servicio');
  if (sel2) {
    sel2.value = trimmed;
    recetaHuOnConsultServicePick();
  }
  rt.showToast('Servicio agregado al menú', 'success');
}

function exportRecetaHuPdf() {
  try {
    if (rt.guardMobileDocExport()) return;
    if (!recetaHuPanelVisible()) {
      ensureRecetaHuPanelVisible();
    }
    if (rt.isRpcOffline && rt.isRpcOffline()) {
      rt.showToast('Sin conexión con el servidor local. Reinicia R+ para generar documentos.', 'error');
      return;
    }
    var pid = aid();
    if (!pid) {
      rt.showToast('Selecciona un paciente', 'error');
      return;
    }
    var patient = activePatient();
    if (!patient) {
      rt.showToast('Paciente no encontrado', 'error');
      return;
    }
    var st = rt.getSettings();
    if (!String(st.doctorName || '').trim()) {
      rt.showToast('Configura el médico tratante en Mi Perfil', 'error');
      return;
    }
    if (!String(st.cedulaProfesional || '').trim()) {
      rt.showToast('Configura la cédula profesional en Mi Perfil', 'error');
      return;
    }

    var draft = readDraftFromDom();
    persistDraft(pid, draft);
    var body = buildRecetaHuGeneratePayload({
      patient: patient,
      draft: draft,
      doctorName: st.doctorName,
      cedulaProfesional: st.cedulaProfesional,
    });

    var btn = document.getElementById('btn-receta-hu-export');
    setAsyncButtonLoading(btn, true, { loadingText: 'Exportando…' });
    rt.incrementPendingJobs();

    function buildPayload(outputDir) {
      return {
        patient: body.patient,
        receta: {
          fecha: body.fecha,
          meds: body.meds,
          labs: body.labs,
          cuidados: body.cuidados,
          proximaCita: body.proximaCita,
          proximaCitaFecha: body.proximaCitaFecha,
        },
        doctorName: body.doctorName,
        cedulaProfesional: body.cedulaProfesional,
        outputDir: outputDir || '',
      };
    }

    rt.requestDocumentJson('/generate-receta-hu', buildPayload((st.outputDir || '').trim()))
      .then(function (response) {
        return rt.handleDocumentGenerateResponse({
          response: response,
          url: '/generate-receta-hu',
          buildPayload: buildPayload,
          onSuccess: function (data) {
            rt.showToast('Receta HU guardada: ' + (data && data.fileName ? data.fileName : 'PDF'), 'success');
          },
          onError: function (message) {
            rt.showToast('Error: ' + message, 'error');
          },
          onPrompt: function () {
            rt.showToast('Selecciona una carpeta para guardar el PDF.', 'error');
          },
          onCancel: function () {
            rt.showToast('No se guardó el PDF: no se eligió carpeta.', 'error');
          },
        });
      })
      .catch(function () {
        rt.showToast('Error de conexión al generar el PDF', 'error');
      })
      .finally(function () {
        if (btn && !btn.dataset.uiMotionDefaultLabel) {
          btn.dataset.uiMotionDefaultLabel = 'Exportar PDF';
        }
        setAsyncButtonLoading(btn, false);
        rt.decrementPendingJobs();
        if (typeof rt.syncOfflineButtonStates === 'function') rt.syncOfflineButtonStates();
      });
  } catch (err) {
    console.error('[R+] exportRecetaHuPdf:', err && err.message ? err.message : err);
    resetExportButtonState();
    rt.showToast('No se pudo exportar la receta HU', 'error');
  }
}

export const recetaHuWindowHandlers = {
  recetaHuCommitMedFromCompose,
  recetaHuRemoveMedRow,
  recetaHuCommitLabFromCompose,
  recetaHuRemoveLabRow,
  recetaHuCommitProximaFromCompose,
  recetaHuRemoveProximaRow,
  recetaHuOnConsultServicePick,
  recetaHuAddConsultService,
  exportRecetaHuPdf,
};
