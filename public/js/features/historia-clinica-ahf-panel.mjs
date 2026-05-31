import { AHF_RELATIVES } from '../../../lib/historia-clinica/ahf-relatives.mjs';
import { syncAhfConditionsFromEntries } from '../../../lib/historia-clinica/compile-ahf.mjs';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function catalogOptions(map) {
  return Object.keys(map || {}).map(function (id) {
    return { id, label: map[id] };
  });
}

function defaultAhf() {
  return {
    conditions: [],
    customConditions: [],
    entries: [],
    descripcionDetallada: '',
  };
}

function ensureAhf(ahf) {
  return syncAhfConditionsFromEntries(Object.assign(defaultAhf(), ahf || {}));
}

function newEntryId() {
  return 'ahf_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function conditionLabel(id, catalog, customConditions) {
  if (catalog && catalog[id]) return catalog[id];
  const c = (customConditions || []).find(function (row) {
    return row && row.id === id;
  });
  return (c && c.label) || id;
}

function entriesForCondition(ahf, conditionId) {
  return (ahf.entries || []).filter(function (e) {
    return e && e.conditionId === conditionId;
  });
}

function relativeSelectHtml(entryId, value) {
  let html =
    '<select class="hc-ahf-relative" data-entry-id="' +
    esc(entryId) +
    '">';
  html += '<option value="">— Familiar —</option>';
  AHF_RELATIVES.forEach(function (rel) {
    html +=
      '<option value="' +
      esc(rel.id) +
      '"' +
      (value === rel.id ? ' selected' : '') +
      '>' +
      esc(rel.label) +
      '</option>';
  });
  return html + '</select>';
}

function entryRowHtml(entry) {
  const e = entry || {};
  const id = e.id || newEntryId();
  const vital = e.vitalStatus || 'desconocido';
  const deadFields = vital === 'fallecido';
  return (
    '<div class="hc-ahf-entry" data-entry-id="' +
    esc(id) +
    '">' +
    '<div class="field-group"><label>Familiar</label>' +
    relativeSelectHtml(id, e.relativeId) +
    '</div>' +
    '<div class="field-group"><label>Diagnóstico</label>' +
    '<input type="text" data-ahf-field="diagnosis" value="' +
    esc(e.diagnosis || '') +
    '"></div>' +
    '<div class="field-group"><label>Tratamiento</label>' +
    '<input type="text" data-ahf-field="treatment" value="' +
    esc(e.treatment || '') +
    '"></div>' +
    '<div class="field-group"><label>Estado</label>' +
    '<select data-ahf-field="vitalStatus">' +
    '<option value="vivo"' +
    (vital === 'vivo' ? ' selected' : '') +
    '>Vivo/a</option>' +
    '<option value="fallecido"' +
    (vital === 'fallecido' ? ' selected' : '') +
    '>Fallecido/a</option>' +
    '<option value="desconocido"' +
    (vital === 'desconocido' ? ' selected' : '') +
    '>No especificado</option>' +
    '</select></div>' +
    '<div class="hc-ahf-death-fields' +
    (deadFields ? '' : ' hc-ahf-death-fields--hidden') +
    '">' +
    '<div class="field-group"><label>Edad al fallecer</label>' +
    '<input type="number" min="0" max="120" data-ahf-field="ageAtDeath" value="' +
    esc(e.ageAtDeath != null ? e.ageAtDeath : '') +
    '"></div>' +
    '<div class="field-group"><label>Causa de muerte</label>' +
    '<input type="text" data-ahf-field="causeOfDeath" value="' +
    esc(e.causeOfDeath || '') +
    '"></div></div>' +
    '<button type="button" class="btn-remove" data-ahf-remove aria-label="Quitar familiar">×</button>' +
    '</div>'
  );
}

/**
 * @param {HTMLElement} container
 * @param {object} ahf
 * @param {Record<string,string>} catalog
 * @param {(next: object) => void} onChange
 */
export function mountHistoriaAhfPanel(container, ahf, catalog, onChange) {
  if (!container) return;
  ahf = ensureAhf(ahf);
  catalog = catalog || {};
  const options = catalogOptions(catalog);
  const activeIds = new Set(ahf.conditions || []);

  let html = '<div class="hc-ahf-panel">';

  html += '<div class="hc-checklist-options hc-checklist-options--grid">';
  options.forEach(function (opt) {
    const checked = activeIds.has(opt.id) ? ' checked' : '';
    html +=
      '<label class="hc-check-chip"><input type="checkbox" class="hc-check-chip-input" data-ahf-cond="' +
      esc(opt.id) +
      '"' +
      checked +
      '><span class="hc-check-chip-label">' +
      esc(opt.label) +
      '</span></label>';
  });
  html += '</div>';

  html +=
    '<div class="hc-app-custom-row">' +
    '<div class="field-group" style="flex:1"><label>Otra enfermedad familiar</label>' +
    '<input type="text" id="hc-ahf-custom-label" placeholder="Nombre de la enfermedad"></div>' +
    '<button type="button" class="btn-med-secondary" id="hc-ahf-add-custom">Agregar</button></div>';

  const positiveIds = (ahf.conditions || []).slice();
  if (positiveIds.length) {
    html += '<div class="hc-ahf-conditions-detail">';
    positiveIds.forEach(function (cid) {
      const entries = entriesForCondition(ahf, cid);
      html +=
        '<details class="card hc-ahf-cond-card" open data-cond-id="' +
        esc(cid) +
        '"><summary class="card-header">' +
        esc(conditionLabel(cid, catalog, ahf.customConditions)) +
        '</summary><div class="card-body hc-ahf-entries" data-cond-id="' +
        esc(cid) +
        '">';
      if (entries.length) {
        entries.forEach(function (entry) {
          html += entryRowHtml(entry);
        });
      } else {
        html += '<p class="profile-hint">Agrega al menos un familiar para esta enfermedad.</p>';
      }
      html +=
        '</div><button type="button" class="btn-add-row" data-ahf-add-relative="' +
        esc(cid) +
        '">+ Agregar familiar</button></details>';
    });
    html += '</div>';
  }

  html +=
    '<div class="field-group"><label>Notas adicionales</label>' +
    '<textarea rows="3" data-ahf-field="descripcionDetallada">' +
    esc(ahf.descripcionDetallada) +
    '</textarea></div></div>';

  container.innerHTML = html;

  function emit() {
    onChange(ensureAhf(ahf));
  }

  function findEntry(id) {
    return (ahf.entries || []).find(function (e) {
      return e && e.id === id;
    });
  }

  container.querySelectorAll('.hc-check-chip-input[data-ahf-cond]').forEach(function (el) {
    el.addEventListener('change', function () {
      const cid = el.getAttribute('data-ahf-cond');
      if (el.checked) {
        if ((ahf.conditions || []).indexOf(cid) < 0) {
          ahf.conditions = (ahf.conditions || []).concat([cid]);
        }
        if (!entriesForCondition(ahf, cid).length) {
          ahf.entries = ahf.entries || [];
          ahf.entries.push({
            id: newEntryId(),
            conditionId: cid,
            relativeId: '',
            diagnosis: '',
            treatment: '',
            vitalStatus: 'desconocido',
          });
        }
      } else {
        ahf.conditions = (ahf.conditions || []).filter(function (id) {
          return id !== cid;
        });
        ahf.entries = (ahf.entries || []).filter(function (e) {
          return e.conditionId !== cid;
        });
      }
      mountHistoriaAhfPanel(container, ahf, catalog, onChange);
      emit();
    });
  });

  const addCustom = container.querySelector('#hc-ahf-add-custom');
  if (addCustom) {
    addCustom.onclick = function () {
      const input = container.querySelector('#hc-ahf-custom-label');
      const label = input && input.value ? input.value.trim() : '';
      if (!label) return;
      const id = 'custom_' + Date.now().toString(36);
      ahf.customConditions = ahf.customConditions || [];
      ahf.customConditions.push({ id, label });
      ahf.conditions = (ahf.conditions || []).concat([id]);
      ahf.entries = ahf.entries || [];
      ahf.entries.push({
        id: newEntryId(),
        conditionId: id,
        relativeId: '',
        diagnosis: '',
        treatment: '',
        vitalStatus: 'desconocido',
      });
      if (input) input.value = '';
      mountHistoriaAhfPanel(container, ahf, catalog, onChange);
      emit();
    };
  }

  container.querySelectorAll('[data-ahf-add-relative]').forEach(function (btn) {
    btn.onclick = function () {
      const cid = btn.getAttribute('data-ahf-add-relative');
      ahf.entries = ahf.entries || [];
      ahf.entries.push({
        id: newEntryId(),
        conditionId: cid,
        relativeId: '',
        diagnosis: '',
        treatment: '',
        vitalStatus: 'desconocido',
      });
      mountHistoriaAhfPanel(container, ahf, catalog, onChange);
      emit();
    };
  });

  container.querySelectorAll('.hc-ahf-entry').forEach(function (row) {
    const entryId = row.getAttribute('data-entry-id');
    const entry = findEntry(entryId);
    if (!entry) return;

    row.querySelectorAll('[data-ahf-field]').forEach(function (el) {
      function apply() {
        const field = el.getAttribute('data-ahf-field');
        if (field === 'ageAtDeath') {
          const n = Number(el.value);
          entry.ageAtDeath = Number.isFinite(n) ? n : null;
        } else if (field === 'vitalStatus') {
          entry.vitalStatus = el.value;
          const deathWrap = row.querySelector('.hc-ahf-death-fields');
          if (deathWrap) {
            deathWrap.classList.toggle('hc-ahf-death-fields--hidden', el.value !== 'fallecido');
          }
          if (el.value !== 'fallecido') {
            entry.ageAtDeath = null;
            entry.causeOfDeath = '';
          }
        } else {
          entry[field] = el.value;
        }
        emit();
      }
      el.addEventListener('input', apply);
      el.addEventListener('change', apply);
    });

    const relSel = row.querySelector('.hc-ahf-relative');
    if (relSel) {
      relSel.addEventListener('change', function () {
        entry.relativeId = relSel.value;
        emit();
      });
    }

    const removeBtn = row.querySelector('[data-ahf-remove]');
    if (removeBtn) {
      removeBtn.onclick = function () {
        ahf.entries = (ahf.entries || []).filter(function (e) {
          return e.id !== entryId;
        });
        if (!entriesForCondition(ahf, entry.conditionId).length) {
          ahf.conditions = (ahf.conditions || []).filter(function (id) {
            return id !== entry.conditionId;
          });
        }
        mountHistoriaAhfPanel(container, ahf, catalog, onChange);
        emit();
      };
    }
  });

  const notes = container.querySelector('[data-ahf-field="descripcionDetallada"]');
  if (notes) {
    notes.addEventListener('input', function () {
      ahf.descripcionDetallada = notes.value;
      emit();
    });
  }
}
