import {
  TOXICOMANIAS_SUBSTANCES,
  newToxicomaniaEntryId,
  normalizeToxicomaniasDetail,
} from '../../../lib/historia-clinica/toxicomanias.mjs';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function catalogOptions() {
  return Object.keys(TOXICOMANIAS_SUBSTANCES).map(function (id) {
    return { id, label: TOXICOMANIAS_SUBSTANCES[id] };
  });
}

function entryForSubstance(entries, substanceId) {
  return (entries || []).find(function (e) {
    return e.substanceId === substanceId;
  });
}

function entryHtml(entry, label) {
  return (
    '<div class="hc-tox-entry" data-tox-entry-id="' +
    esc(entry.id) +
    '">' +
    '<div class="hc-tox-entry-title">' +
    esc(label) +
    '</div>' +
    '<div class="hc-tox-entry-fields">' +
    '<div class="field-group"><label>Frecuencia de uso</label>' +
    '<input type="text" data-tox-field="frequency" value="' +
    esc(entry.frequency || '') +
    '" placeholder="Diario, semanal, ocasional…"></div>' +
    '<div class="field-group"><label>Años de uso</label>' +
    '<input type="number" min="0" max="80" step="1" data-tox-field="years" value="' +
    esc(entry.years || '') +
    '" placeholder="0"></div>' +
    '</div>' +
    '<button type="button" class="btn-remove" data-tox-remove="' +
    esc(entry.id) +
    '" aria-label="Quitar">×</button></div>'
  );
}

/**
 * @param {HTMLElement} container
 * @param {object} apnp
 * @param {(nextApnp: object) => void} onChange
 */
export function mountToxicomaniasPanel(container, apnp, onChange) {
  if (!container) return;
  apnp = apnp && typeof apnp === 'object' ? apnp : {};
  let entries = normalizeToxicomaniasDetail(apnp).entries.slice();
  const options = catalogOptions();
  const activeIds = new Set(
    entries.map(function (e) {
      return e.substanceId;
    }).filter(Boolean)
  );
  let html = '<div class="hc-tox-panel">';
  html += '<p class="profile-hint">Selecciona sustancias usadas; indica frecuencia y años de consumo.</p>';
  html += '<div class="hc-checklist-options hc-checklist-options--grid hc-tox-chips">';
  options.forEach(function (opt) {
    const checked = activeIds.has(opt.id) ? ' checked' : '';
    html +=
      '<label class="hc-check-chip">' +
      '<input type="checkbox" class="hc-check-chip-input" data-tox-substance="' +
      esc(opt.id) +
      '"' +
      checked +
      '>' +
      '<span class="hc-check-chip-label">' +
      esc(opt.label) +
      '</span></label>';
  });
  html += '</div>';

  html += '<div class="hc-tox-entries" id="hc-tox-entries-host">';
  entries.forEach(function (entry) {
    const label = entry.substanceId
      ? TOXICOMANIAS_SUBSTANCES[entry.substanceId]
      : entry.customLabel;
    if (label) html += entryHtml(entry, label);
  });
  html += '</div>';

  html +=
    '<div class="hc-app-custom-row hc-tox-custom-row">' +
    '<div class="field-group hc-app-custom-field">' +
    '<label>Otra sustancia</label>' +
    '<input type="text" id="hc-tox-custom-label" placeholder="Nombre de la sustancia">' +
    '</div>' +
    '<button type="button" class="btn-med-secondary" id="hc-tox-add-custom">Agregar</button>' +
    '</div></div>';

  container.innerHTML = html;

  function emit() {
    const next = Object.assign({}, apnp, { toxicomaniasEntries: entries });
    onChange(next);
  }

  function renderEntries() {
    const host = container.querySelector('#hc-tox-entries-host');
    if (!host) return;
    host.innerHTML = entries
      .map(function (entry) {
        const label = entry.substanceId
          ? TOXICOMANIAS_SUBSTANCES[entry.substanceId]
          : entry.customLabel;
        return label ? entryHtml(entry, label) : '';
      })
      .join('');
    wireEntries();
  }

  function wireEntries() {
    container.querySelectorAll('[data-tox-field]').forEach(function (el) {
      el.oninput = function () {
        const row = el.closest('[data-tox-entry-id]');
        const id = row.getAttribute('data-tox-entry-id');
        const entry = entries.find(function (e) {
          return e.id === id;
        });
        if (!entry) return;
        entry[el.getAttribute('data-tox-field')] = el.value;
        emit();
      };
    });
    container.querySelectorAll('[data-tox-remove]').forEach(function (btn) {
      btn.onclick = function () {
        const id = btn.getAttribute('data-tox-remove');
        const removed = entries.find(function (e) {
          return e.id === id;
        });
        entries = entries.filter(function (e) {
          return e.id !== id;
        });
        if (removed && removed.substanceId) {
          const chip = container.querySelector(
            '[data-tox-substance="' + removed.substanceId + '"]'
          );
          if (chip) chip.checked = false;
        }
        renderEntries();
        emit();
      };
    });
  }

  container.querySelectorAll('[data-tox-substance]').forEach(function (el) {
    el.onchange = function () {
      const sid = el.getAttribute('data-tox-substance');
      if (el.checked) {
        if (!entryForSubstance(entries, sid)) {
          entries.push({
            id: newToxicomaniaEntryId(),
            substanceId: sid,
            customLabel: '',
            frequency: '',
            years: '',
          });
        }
      } else {
        entries = entries.filter(function (e) {
          return e.substanceId !== sid;
        });
      }
      renderEntries();
      emit();
    };
  });

  const addCustom = container.querySelector('#hc-tox-add-custom');
  if (addCustom) {
    addCustom.onclick = function () {
      const input = container.querySelector('#hc-tox-custom-label');
      const label = String((input && input.value) || '').trim();
      if (!label) return;
      entries.push({
        id: newToxicomaniaEntryId(),
        substanceId: '',
        customLabel: label,
        frequency: '',
        years: '',
      });
      if (input) input.value = '';
      renderEntries();
      emit();
    };
  }

  wireEntries();
}
