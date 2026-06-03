/**
 * Entrega modal — procedimientos list, add form, plantillas.
 */
import {
  canDeletePendienteItem,
  createProcedimientoItem,
  normalizePendientesJson,
  pendingRequirementBadges,
} from '../../../lib/entrega/entrega-pendientes.mjs';
import { clinicalSessionContext } from '../clinical-access-runtime.mjs';

const BADGE_LABELS = {
  consentimiento: 'Consent',
  anestesia: 'Anest',
  familiar: 'Familiar',
};

/** @type {object[]} */
let draftItems = [];
/** @type {{ role: 'diurno'|'guardia', userId?: string, rank?: string }|null} */
let draftActor = null;
/** @type {{ user: object[], team: object[] }} */
let templateCatalog = { user: [], team: [] };
/** @type {string} */
let draftSourceTeamId = '';

let uiWired = false;

function dbApi() {
  if (typeof window === 'undefined') return null;
  return window.rplusDb || window.electronAPI || null;
}

function toast(msg, type = 'info') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast(msg, type);
  }
}

/** @param {string|null|undefined} scheduledAt */
function formatHHmm(scheduledAt) {
  if (!scheduledAt) return '';
  const d = new Date(scheduledAt);
  if (!Number.isNaN(d.getTime())) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const m = String(scheduledAt).match(/(\d{1,2}:\d{2})/);
  return m ? m[1] : '';
}

/** @param {string} hhmm */
function scheduledAtFromTimeInput(hhmm) {
  const t = String(hhmm || '').trim();
  if (!t) return null;
  const [h, m] = t.split(':').map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/**
 * @param {object|null|undefined} currentUser
 * @param {object|null|undefined} existingGuardia
 */
export function resolveEntregaActorRole(currentUser, existingGuardia) {
  const hasGuardia =
    !!(existingGuardia?.guardia_id || existingGuardia?.guardiaId);
  return {
    role: hasGuardia ? 'guardia' : 'diurno',
    userId: String(currentUser?.user_id || currentUser?.userId || ''),
    rank: String(currentUser?.rank || ''),
  };
}

/** @returns {object[]} */
export function getEntregaDraftItems() {
  return draftItems.slice();
}

export function resetEntregaModalUi() {
  draftItems = [];
  draftActor = null;
  templateCatalog = { user: [], team: [] };
  draftSourceTeamId = '';
  const list = document.getElementById('entrega-proc-list');
  const formWrap = document.getElementById('entrega-proc-form');
  if (list) list.innerHTML = '';
  if (formWrap) {
    formWrap.innerHTML = '';
    formWrap.classList.add('hidden');
    formWrap.setAttribute('aria-hidden', 'true');
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBadgeChips(item) {
  const badges = pendingRequirementBadges(item);
  if (!badges.length) return '';
  return badges
    .map(
      (b) =>
        `<span class="entrega-proc-chip entrega-proc-chip--req">${escapeHtml(BADGE_LABELS[b] || b)}</span>`
    )
    .join('');
}

function renderStatusChips(item) {
  const chips = [];
  if (item.comentado) chips.push('<span class="entrega-proc-chip">Comentado</span>');
  if (item.autorizado) chips.push('<span class="entrega-proc-chip">Autorizado</span>');
  if (item.agendado) chips.push('<span class="entrega-proc-chip">Agendado</span>');
  if (item.lockedBase) chips.push('<span class="entrega-proc-chip entrega-proc-chip--lock">Base</span>');
  return chips.join('');
}

function renderProcList() {
  const list = document.getElementById('entrega-proc-list');
  if (!list || !draftActor) return;

  if (!draftItems.length) {
    list.innerHTML = '<li class="entrega-proc-empty">Sin procedimientos. Usa + Agregar.</li>';
    return;
  }

  list.innerHTML = draftItems
    .map((item) => {
      if (item.type === 'legacy_text') {
        const canDel = canDeletePendienteItem(item, draftActor);
        return `<li class="entrega-proc-card entrega-proc-card--legacy" data-item-id="${escapeHtml(item.id)}">
          <div class="entrega-proc-card-main">
            <span class="entrega-proc-label">${escapeHtml(item.text || '')}</span>
            <span class="entrega-proc-meta">Texto legado</span>
          </div>
          ${
            canDel
              ? `<button type="button" class="btn-secondary entrega-proc-delete" data-action="delete">Eliminar</button>`
              : ''
          }
        </li>`;
      }

      if (item.type !== 'procedimiento') return '';

      const time = formatHHmm(item.scheduledAt);
      const canDel = canDeletePendienteItem(item, draftActor);
      const kindLabel = item.kind === 'imagen' ? 'Imagen' : 'Otro';

      const flagRow = `
        <div class="entrega-proc-flags">
          <label><input type="checkbox" data-flag="comentado" ${item.comentado ? 'checked' : ''}> Comentado</label>
          <label><input type="checkbox" data-flag="autorizado" ${item.autorizado ? 'checked' : ''}> Autorizado</label>
          <label><input type="checkbox" data-flag="agendado" ${item.agendado ? 'checked' : ''}> Agendado</label>
        </div>`;

      return `<li class="entrega-proc-card" data-item-id="${escapeHtml(item.id)}">
        <div class="entrega-proc-card-main">
          <div class="entrega-proc-title-row">
            <span class="entrega-proc-label">${escapeHtml(item.label)}</span>
            ${time ? `<span class="entrega-proc-time">${escapeHtml(time)}</span>` : ''}
            <span class="entrega-proc-kind">${escapeHtml(kindLabel)}</span>
          </div>
          <div class="entrega-proc-chips">${renderStatusChips(item)}${renderBadgeChips(item)}</div>
          ${flagRow}
        </div>
        ${
          canDel
            ? `<button type="button" class="btn-secondary entrega-proc-delete" data-action="delete">Eliminar</button>`
            : ''
        }
      </li>`;
    })
    .join('');
}

function updateItemFlags(itemId, flag, checked) {
  draftItems = draftItems.map((it) => {
    if (it.id !== itemId || it.type !== 'procedimiento') return it;
    return {
      ...it,
      [flag]: !!checked,
      updatedAt: new Date().toISOString(),
    };
  });
  renderProcList();
}

function deleteItem(itemId) {
  const item = draftItems.find((it) => it.id === itemId);
  if (!item || !draftActor || !canDeletePendienteItem(item, draftActor)) {
    toast('No puedes eliminar este procedimiento.', 'error');
    return;
  }
  draftItems = draftItems.filter((it) => it.id !== itemId);
  renderProcList();
}

function readFormFields(formEl) {
  const kind = formEl.querySelector('[name="entrega-proc-kind"]')?.value === 'imagen' ? 'imagen' : 'otro';
  const label = String(formEl.querySelector('[name="entrega-proc-label"]')?.value || '').trim();
  const time = String(formEl.querySelector('[name="entrega-proc-time"]')?.value || '').trim();
  return {
    kind,
    label,
    scheduledAt: scheduledAtFromTimeInput(time),
    comentado: !!formEl.querySelector('[name="entrega-proc-comentado"]')?.checked,
    autorizado: !!formEl.querySelector('[name="entrega-proc-autorizado"]')?.checked,
    agendado: !!formEl.querySelector('[name="entrega-proc-agendado"]')?.checked,
    requires: {
      familiar: !!formEl.querySelector('[name="entrega-req-familiar"]')?.checked,
      consentimiento: !!formEl.querySelector('[name="entrega-req-consentimiento"]')?.checked,
      anestesia: !!formEl.querySelector('[name="entrega-req-anestesia"]')?.checked,
    },
  };
}

function buildAddFormMarkup(prefill = null) {
  const p = prefill || {};
  const timeVal = p.scheduledAt ? formatHHmm(p.scheduledAt) : '';
  return `
    <fieldset class="entrega-proc-form-inner">
      <legend>Agregar procedimiento</legend>
      <div class="entrega-proc-form-row">
        <label>Tipo
          <select name="entrega-proc-kind" class="profile-input">
            <option value="imagen" ${p.kind === 'imagen' ? 'selected' : ''}>Imagen</option>
            <option value="otro" ${p.kind !== 'imagen' ? 'selected' : ''}>Otro</option>
          </select>
        </label>
        <label>Etiqueta
          <input name="entrega-proc-label" class="profile-input" type="text" required value="${escapeHtml(p.label || '')}">
        </label>
        <label>Hora
          <input name="entrega-proc-time" class="profile-input" type="time" value="${escapeHtml(timeVal)}">
        </label>
      </div>
      <div class="entrega-proc-form-row entrega-proc-form-checks">
        <label><input type="checkbox" name="entrega-proc-comentado" ${p.comentado ? 'checked' : ''}> Comentado</label>
        <label><input type="checkbox" name="entrega-proc-autorizado" ${p.autorizado ? 'checked' : ''}> Autorizado</label>
        <label><input type="checkbox" name="entrega-proc-agendado" ${p.agendado ? 'checked' : ''}> Agendado</label>
      </div>
      <div class="entrega-proc-form-row entrega-proc-form-checks">
        <span class="entrega-proc-req-label">Requiere:</span>
        <label><input type="checkbox" name="entrega-req-familiar" ${p.requires?.familiar ? 'checked' : ''}> Familiar</label>
        <label><input type="checkbox" name="entrega-req-consentimiento" ${p.requires?.consentimiento ? 'checked' : ''}> Consentimiento</label>
        <label><input type="checkbox" name="entrega-req-anestesia" ${p.requires?.anestesia ? 'checked' : ''}> Anestesia</label>
      </div>
      <div class="entrega-proc-form-actions">
        <button type="button" class="btn-secondary" data-action="cancel-form">Cancelar</button>
        <button type="button" class="btn-secondary" data-action="save-template">Guardar plantilla</button>
        <button type="button" class="btn-save" data-action="add-item">Añadir a lista</button>
      </div>
    </fieldset>`;
}

function showAddForm(prefill = null) {
  const wrap = document.getElementById('entrega-proc-form');
  if (!wrap) return;
  wrap.innerHTML = buildAddFormMarkup(prefill);
  wrap.classList.remove('hidden');
  wrap.setAttribute('aria-hidden', 'false');
  wrap.querySelector('[name="entrega-proc-label"]')?.focus();
}

function hideAddForm() {
  const wrap = document.getElementById('entrega-proc-form');
  if (!wrap) return;
  wrap.innerHTML = '';
  wrap.classList.add('hidden');
  wrap.setAttribute('aria-hidden', 'true');
}

function payloadFromFormFields(fields) {
  return {
    kind: fields.kind,
    label: fields.label,
    requires: fields.requires,
    comentado: fields.comentado,
    autorizado: fields.autorizado,
    agendado: fields.agendado,
  };
}

async function saveTemplateFromForm(formEl) {
  const fields = readFormFields(formEl);
  if (!fields.label) {
    toast('Indica la etiqueta del procedimiento.', 'error');
    return;
  }
  const name = typeof window.prompt === 'function' ? window.prompt('Nombre de la plantilla:') : '';
  if (!name || !String(name).trim()) return;

  const scope =
    typeof window.confirm === 'function' &&
    window.confirm('¿Guardar como plantilla del equipo? (Cancelar = solo para ti)')
      ? 'team'
      : 'user';

  const api = dbApi();
  const userId = String(clinicalSessionContext.user?.user_id || '');
  const payload = payloadFromFormFields(fields);

  try {
    if (scope === 'team') {
      const teamId = draftSourceTeamId;
      if (!teamId) {
        toast('Selecciona equipo de origen para plantilla de equipo.', 'error');
        return;
      }
      if (!api?.dbEntregaTemplateSaveTeam) throw new Error('Plantillas no disponibles');
      await api.dbEntregaTemplateSaveTeam({
        teamId,
        createdBy: userId,
        name: String(name).trim(),
        payload,
      });
    } else {
      if (!api?.dbEntregaTemplateSaveUser) throw new Error('Plantillas no disponibles');
      await api.dbEntregaTemplateSaveUser({
        userId,
        name: String(name).trim(),
        payload,
      });
    }
    toast('Plantilla guardada.', 'success');
    await refreshTemplateCatalog(userId);
  } catch (err) {
    toast(err?.message || 'No se guardó la plantilla', 'error');
  }
}

async function refreshTemplateCatalog(userId) {
  const api = dbApi();
  if (!api?.dbEntregaTemplateList) {
    templateCatalog = { user: [], team: [] };
    return;
  }
  const teamIds = draftSourceTeamId ? [draftSourceTeamId] : [];
  const res = await api.dbEntregaTemplateList({ userId, teamIds });
  templateCatalog = {
    user: Array.isArray(res?.user) ? res.user : [],
    team: Array.isArray(res?.team) ? res.team : [],
  };
}

function showTemplatePicker() {
  const all = [
    ...templateCatalog.user.map((t) => ({ ...t, scopeLabel: 'Mis plantillas' })),
    ...templateCatalog.team.map((t) => ({ ...t, scopeLabel: 'Del equipo' })),
  ];
  if (!all.length) {
    toast('No hay plantillas guardadas.', 'info');
    return;
  }

  const wrap = document.getElementById('entrega-proc-form');
  if (!wrap) return;

  const options = all
    .map(
      (t, i) =>
        `<option value="${i}">[${escapeHtml(t.scopeLabel)}] ${escapeHtml(t.name)}</option>`
    )
    .join('');

  wrap.innerHTML = `
    <fieldset class="entrega-proc-form-inner">
      <legend>Aplicar plantilla</legend>
      <label>Plantilla
        <select id="entrega-template-pick" class="profile-input">${options}</select>
      </label>
      <div class="entrega-proc-form-actions">
        <button type="button" class="btn-secondary" data-action="cancel-form">Cancelar</button>
        <button type="button" class="btn-save" data-action="apply-template">Prefill formulario</button>
      </div>
    </fieldset>`;
  wrap.classList.remove('hidden');
  wrap.setAttribute('aria-hidden', 'false');

  wrap.querySelector('[data-action="apply-template"]')?.addEventListener('click', () => {
    const idx = parseInt(wrap.querySelector('#entrega-template-pick')?.value || '0', 10);
    const picked = all[idx];
    if (!picked?.payload) return;
    const prefill = {
      ...picked.payload,
      scheduledAt: null,
    };
    showAddForm(prefill);
  });
}

function addItemFromForm(formEl) {
  if (!draftActor) return;
  const fields = readFormFields(formEl);
  if (!fields.label) {
    toast('Indica la etiqueta del procedimiento.', 'error');
    return;
  }
  const item = createProcedimientoItem({
    ...fields,
    lockedBase: draftActor.role === 'diurno',
    createdBy: draftActor.userId
      ? { userId: draftActor.userId, rank: draftActor.rank || '' }
      : null,
  });
  draftItems.push(item);
  hideAddForm();
  renderProcList();
}

function wireProcUiOnce() {
  if (uiWired) return;
  uiWired = true;

  document.getElementById('btn-entrega-add-proc')?.addEventListener('click', () => {
    showAddForm();
  });

  document.getElementById('btn-entrega-apply-template')?.addEventListener('click', () => {
    showTemplatePicker();
  });

  const list = document.getElementById('entrega-proc-list');
  if (list) {
    list.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-action="delete"]');
      if (!btn) return;
      const card = btn.closest('[data-item-id]');
      const id = card?.getAttribute('data-item-id');
      if (id) deleteItem(id);
    });

    list.addEventListener('change', (ev) => {
      const input = ev.target;
      if (!(input instanceof HTMLInputElement) || !input.dataset.flag) return;
      const card = input.closest('[data-item-id]');
      const id = card?.getAttribute('data-item-id');
      if (id) updateItemFlags(id, input.dataset.flag, input.checked);
    });
  }

  const formWrap = document.getElementById('entrega-proc-form');
  if (formWrap) {
    formWrap.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const inner = formWrap.querySelector('.entrega-proc-form-inner');
      if (action === 'cancel-form') {
        hideAddForm();
        return;
      }
      if (!inner) return;
      if (action === 'add-item') addItemFromForm(inner);
      if (action === 'save-template') saveTemplateFromForm(inner);
    });
  }

  document.getElementById('entrega-source-team')?.addEventListener('change', (ev) => {
    draftSourceTeamId = String(ev.target?.value || '');
    const userId = String(clinicalSessionContext.user?.user_id || '');
    refreshTemplateCatalog(userId).catch(() => {});
  });
}

/**
 * @param {{
 *   actor: { role: 'diurno'|'guardia', userId?: string, rank?: string },
 *   pendientesJson?: string|null,
 *   sourceTeamId?: string,
 * }} opts
 */
export async function mountEntregaPendientesUi(opts) {
  wireProcUiOnce();
  draftActor = opts.actor;
  draftSourceTeamId = String(opts.sourceTeamId || '');
  const doc = normalizePendientesJson(opts.pendientesJson || '');
  draftItems = doc.items.slice();
  hideAddForm();
  renderProcList();

  const userId = String(clinicalSessionContext.user?.user_id || '');
  await refreshTemplateCatalog(userId);
}
