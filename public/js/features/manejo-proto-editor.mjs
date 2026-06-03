/**
 * Modal editor para plantillas SOME (infusiones) — agregar / editar / override local.
 */
import {
  addCustomProtocol,
  hasProtocolOverride,
  removeProtocolOverride,
  saveProtocolOverride,
  updateCustomProtocol,
} from '../manejo-custom-protocols.mjs';
import { MANEJO_PATHOLOGIES } from '../manejo-pathology-catalog.mjs';
import { enrichProtocolEntry } from '../manejo-protocol-links.mjs';
import { MANEJO_PROTOCOL_CATEGORIES } from '../manejo-protocols-catalog.mjs';
import { formatSomeBlock } from '../electrolyte-manejo.mjs';
import { buildSomeOrder, protocolToSomeOrder } from '../manejo-some-format.mjs';

/** @type {{ showToast(msg: string, type?: string): void }} */
var rt = {
  showToast() {},
};

export function registerManejoProtoEditorRuntime(ctx) {
  if (ctx && typeof ctx === 'object') Object.assign(rt, ctx);
}

function protocolPatchFromSomeFields(fields, category) {
  var order = buildSomeOrder(fields || {});
  var block = formatSomeBlock(order);
  var patch = {
    title: String(order.medication || '').trim() || 'Infusión',
    indicationText: block,
    copyTemplate: block,
    someFields: {
      medication: order.medication,
      route: order.route,
      doseValue: order.doseValue,
      doseUnit: order.doseUnit,
      dilution: order.dilution,
      frequency: order.frequency,
      infusionRateMlHr: order.infusionRateMlHr,
      comments: order.comments,
    },
  };
  if (category) patch.category = category;
  return patch;
}

function buildManejoProtoFormInput(type, className, placeholder) {
  var el = document.createElement('input');
  el.type = type || 'text';
  if (className) el.className = className;
  if (placeholder) el.placeholder = placeholder;
  return el;
}

function buildManejoProtoFormField(labelText, controlEl, opts) {
  opts = opts || {};
  var wrap = document.createElement('label');
  wrap.className = 'manejo-proto-editor-field' + (opts.full ? ' manejo-proto-editor-field--full' : '');
  var span = document.createElement('span');
  span.className = 'manejo-proto-editor-label';
  span.textContent = labelText;
  wrap.appendChild(span);
  wrap.appendChild(controlEl);
  return wrap;
}

function buildManejoProtoEditorSection(titleText) {
  var sec = document.createElement('section');
  sec.className = 'manejo-proto-editor-section';
  var h = document.createElement('h4');
  h.className = 'manejo-proto-editor-section-title';
  h.textContent = titleText;
  sec.appendChild(h);
  var grid = document.createElement('div');
  grid.className = 'manejo-proto-editor-grid';
  sec.appendChild(grid);
  return { section: sec, grid: grid };
}

/**
 * Modal para agregar o editar plantillas SOME (sin window.prompt — no funciona en Electron).
 * @param {{ mode?: 'add'|'edit', entry?: object, onSaved?: () => void }} opts
 * @param {{ renderManejo?: () => void, setProtoCategoryFilter?: (id: string) => void }} deps
 */
export function openManejoProtocolEditorModal(opts, deps) {
  opts = opts || {};
  deps = deps || {};
  var renderManejo = deps.renderManejo;
  var setProtoCategoryFilter = deps.setProtoCategoryFilter;

  var existingBackdrop = document.querySelector('.manejo-proto-editor-backdrop');
  if (existingBackdrop) existingBackdrop.remove();

  var mode = opts.mode === 'edit' ? 'edit' : 'add';
  var entry = opts.entry || null;
  var isCustom = !!(entry && entry.isCustom);
  var canRestore = mode === 'edit' && entry && !isCustom && hasProtocolOverride(entry.id);

  var seed = entry ? protocolToSomeOrder(entry, null) : buildSomeOrder({ route: 'IV' });

  var backdrop = document.createElement('div');
  backdrop.className = 'manejo-proto-editor-backdrop';
  backdrop.setAttribute('role', 'presentation');

  var modal = document.createElement('div');
  modal.className = 'manejo-proto-editor';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'manejo-proto-editor-title');
  modal.tabIndex = -1;

  var head = document.createElement('header');
  head.className = 'manejo-proto-editor-head';

  var headText = document.createElement('div');
  headText.className = 'manejo-proto-editor-head-text';

  var title = document.createElement('h3');
  title.id = 'manejo-proto-editor-title';
  title.className = 'manejo-proto-editor-title';
  title.textContent = mode === 'add' ? 'Nueva infusión SOME' : 'Editar plantilla SOME';
  headText.appendChild(title);

  var hint = document.createElement('p');
  hint.className = 'manejo-proto-editor-subtitle';
  hint.textContent =
    mode === 'add'
      ? 'Se guardará en tus infusiones personalizadas.'
      : isCustom
        ? 'Cambios en tu biblioteca local.'
        : 'Override local — no modifica el catálogo base.';
  headText.appendChild(hint);
  head.appendChild(headText);

  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'manejo-proto-editor-close';
  closeBtn.setAttribute('aria-label', 'Cerrar');
  closeBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  head.appendChild(closeBtn);
  modal.appendChild(head);

  var body = document.createElement('div');
  body.className = 'manejo-proto-editor-body';

  var medSec = buildManejoProtoEditorSection('Medicamento');
  var medInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'Ej. Noradrenalina');
  medInp.value = seed.medication || (entry && entry.title) || '';
  medSec.grid.appendChild(buildManejoProtoFormField('Nombre', medInp, { full: true }));

  var doseValInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', '16');
  doseValInp.value = seed.doseValue != null ? String(seed.doseValue) : '';
  medSec.grid.appendChild(buildManejoProtoFormField('Dosis', doseValInp));

  var doseUnitInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'MG, MCG, MEQ…');
  doseUnitInp.value = seed.doseUnit || '';
  medSec.grid.appendChild(buildManejoProtoFormField('Unidad', doseUnitInp));
  body.appendChild(medSec.section);

  var adminSec = buildManejoProtoEditorSection('Administración');
  var routeInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'IV');
  routeInp.value = seed.route || 'IV';
  adminSec.grid.appendChild(buildManejoProtoFormField('Vía', routeInp));

  var rateInp = buildManejoProtoFormInput('number', 'manejo-proto-editor-input', 'ml/h');
  rateInp.min = '0';
  rateInp.step = 'any';
  if (seed.infusionRateMlHr != null && seed.infusionRateMlHr !== '') {
    rateInp.value = String(seed.infusionRateMlHr);
  }
  adminSec.grid.appendChild(buildManejoProtoFormField('Velocidad', rateInp));

  var dilInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'EN NaCl 0.9% 1000 ML');
  dilInp.value = seed.dilution || '';
  adminSec.grid.appendChild(buildManejoProtoFormField('Dilución', dilInp, { full: true }));

  var freqInp = buildManejoProtoFormInput('text', 'manejo-proto-editor-input', 'CONTINUO, CADA 8 H…');
  freqInp.value = seed.frequency || '';
  adminSec.grid.appendChild(buildManejoProtoFormField('Frecuencia', freqInp, { full: true }));
  body.appendChild(adminSec.section);

  var notesSec = buildManejoProtoEditorSection('Comentarios');
  var commentsTa = document.createElement('textarea');
  commentsTa.className = 'manejo-proto-editor-input manejo-proto-editor-textarea';
  commentsTa.rows = 3;
  commentsTa.placeholder = 'Titular, vigilancia, metas clínicas…';
  commentsTa.value = seed.comments || '';
  notesSec.grid.appendChild(buildManejoProtoFormField('Notas SOME', commentsTa, { full: true }));
  body.appendChild(notesSec.section);

  var pathSec = buildManejoProtoEditorSection('Patologías vinculadas');
  var pathHint = document.createElement('p');
  pathHint.className = 'manejo-hint manejo-proto-editor-path-hint';
  pathHint.textContent =
    'Opcional. Aparecerá enlazada en esas patologías y podrás abrirla desde la wiki clínica.';
  pathSec.section.insertBefore(pathHint, pathSec.grid);
  var pathGrid = document.createElement('div');
  pathGrid.className = 'manejo-proto-editor-path-grid';
  pathGrid.setAttribute('role', 'group');
  pathGrid.setAttribute('aria-label', 'Patologías vinculadas');
  var pathChecks = {};
  var selectedPaths = entry ? (enrichProtocolEntry(entry).linkedPathologyIds || []) : [];
  MANEJO_PATHOLOGIES.slice()
    .sort(function (a, b) {
      return a.title.localeCompare(b.title, 'es');
    })
    .forEach(function (p) {
      var lbl = document.createElement('label');
      lbl.className = 'manejo-proto-editor-path-check';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = p.id;
      cb.checked = selectedPaths.indexOf(p.id) >= 0;
      pathChecks[p.id] = cb;
      var span = document.createElement('span');
      span.textContent = p.title;
      lbl.appendChild(cb);
      lbl.appendChild(span);
      pathGrid.appendChild(lbl);
    });
  pathSec.grid.appendChild(pathGrid);
  body.appendChild(pathSec.section);

  var catSelect = null;
  if (mode === 'add' || isCustom) {
    var catSec = buildManejoProtoEditorSection('Clasificación');
    catSelect = document.createElement('select');
    catSelect.className = 'manejo-proto-editor-input manejo-proto-editor-select';
    MANEJO_PROTOCOL_CATEGORIES.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.label;
      catSelect.appendChild(opt);
    });
    var catId = (entry && entry.category) || 'otros';
    catSelect.value = MANEJO_PROTOCOL_CATEGORIES.some(function (c) { return c.id === catId; })
      ? catId
      : 'otros';
    catSec.grid.appendChild(buildManejoProtoFormField('Categoría', catSelect, { full: true }));
    body.appendChild(catSec.section);
  }

  modal.appendChild(body);

  var errEl = document.createElement('p');
  errEl.className = 'manejo-proto-editor-error';
  errEl.hidden = true;
  modal.appendChild(errEl);

  var foot = document.createElement('footer');
  foot.className = 'manejo-proto-editor-foot';

  var secondary = document.createElement('div');
  secondary.className = 'manejo-proto-editor-foot-secondary';

  function closeModal() {
    backdrop.classList.remove('open');
    setTimeout(function () {
      backdrop.remove();
    }, 180);
    document.removeEventListener('keydown', onKey);
  }

  function onKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeModal();
    }
  }

  closeBtn.addEventListener('click', closeModal);

  var cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'manejo-proto-editor-btn manejo-proto-editor-btn--ghost';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.addEventListener('click', closeModal);
  secondary.appendChild(cancelBtn);

  if (canRestore) {
    var restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.className = 'manejo-proto-editor-btn manejo-proto-editor-btn--ghost';
    restoreBtn.textContent = 'Restaurar original';
    restoreBtn.addEventListener('click', function () {
      removeProtocolOverride(entry.id);
      rt.showToast('Plantilla restaurada', 'success');
      closeModal();
      if (typeof opts.onSaved === 'function') opts.onSaved();
      else if (typeof renderManejo === 'function') renderManejo();
    });
    secondary.appendChild(restoreBtn);
  }

  var saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'manejo-proto-editor-btn manejo-proto-editor-btn--primary';
  saveBtn.textContent = 'Guardar plantilla';
  saveBtn.addEventListener('click', function () {
    var medication = medInp.value.trim();
    if (!medication) {
      errEl.textContent = 'Indica el medicamento.';
      errEl.hidden = false;
      medInp.focus();
      return;
    }
    errEl.hidden = true;

    var rateRaw = rateInp.value.trim();
    var rateNum = rateRaw ? Number(rateRaw) : null;
    var category = catSelect ? catSelect.value : entry && entry.category;

    var patch = protocolPatchFromSomeFields(
      {
        medication: medication,
        doseValue: doseValInp.value.trim(),
        doseUnit: doseUnitInp.value.trim(),
        route: routeInp.value.trim() || 'IV',
        dilution: dilInp.value.trim(),
        frequency: freqInp.value.trim(),
        infusionRateMlHr: rateNum != null && Number.isFinite(rateNum) ? rateNum : null,
        comments: commentsTa.value.trim(),
      },
      category
    );
    patch.linkedPathologyIds = Object.keys(pathChecks).filter(function (id) {
      return pathChecks[id].checked;
    });

    if (mode === 'add') {
      addCustomProtocol(patch);
      if (typeof setProtoCategoryFilter === 'function') setProtoCategoryFilter('otros');
      rt.showToast('Infusión guardada en Otros', 'success');
    } else if (isCustom) {
      updateCustomProtocol(entry.id, patch);
      rt.showToast('Infusión actualizada', 'success');
    } else {
      saveProtocolOverride(entry.id, patch);
      rt.showToast('Plantilla actualizada', 'success');
    }

    closeModal();
    if (typeof opts.onSaved === 'function') opts.onSaved();
    else if (typeof renderManejo === 'function') renderManejo();
  });

  foot.appendChild(secondary);
  foot.appendChild(saveBtn);
  modal.appendChild(foot);

  backdrop.appendChild(modal);
  backdrop.addEventListener('click', function (e) {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
  void backdrop.offsetHeight;
  backdrop.classList.add('open');
  requestAnimationFrame(function () {
    try {
      medInp.focus({ preventScroll: true });
    } catch (_e) {}
  });
}
