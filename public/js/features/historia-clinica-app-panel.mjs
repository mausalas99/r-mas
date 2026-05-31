import { formatFlexibleDate, normalizeFlexibleDate, defaultFlexibleDate } from '../../../lib/historia-clinica/flexible-date.mjs';
import { APP_DEDICATED_IDS, normalizeAppData } from '../../../lib/historia-clinica/normalize-app.mjs';
import {
  ERC_CONDITION_ID,
  CKD_STAGES,
  normalizeErcDetail,
  syncErcMedicationsToApp,
  purgeErcMedicationsFromApp,
} from '../../../lib/historia-clinica/erc-detail.mjs';

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function newRowId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function catalogOptions(map) {
  return Object.keys(map || {})
    .filter(function (id) {
      return !APP_DEDICATED_IDS.has(id);
    })
    .map(function (id) {
      return { id, label: map[id] };
    });
}

function flexibleDateHtml(prefix, date) {
  const d = normalizeFlexibleDate(date) || defaultFlexibleDate();
  const p = d.precision || 'year';
  return (
    '<div class="hc-flex-date" data-flex-prefix="' +
    esc(prefix) +
    '">' +
    '<select class="hc-flex-precision" data-flex="precision" aria-label="Precisión de fecha">' +
    '<option value="year"' +
    (p === 'year' ? ' selected' : '') +
    '>Año</option>' +
    '<option value="month"' +
    (p === 'month' ? ' selected' : '') +
    '>Mes/Año</option>' +
    '<option value="day"' +
    (p === 'day' ? ' selected' : '') +
    '>Día completo</option>' +
    '</select>' +
    '<input type="number" class="hc-flex-year" data-flex="year" min="1900" max="2100" placeholder="Año" value="' +
    esc(d.year) +
    '">' +
    '<input type="number" class="hc-flex-month" data-flex="month" min="1" max="12" placeholder="Mes" value="' +
    esc(d.month != null ? d.month : '') +
    '"' +
    (p === 'year' ? ' hidden' : '') +
    '>' +
    '<input type="number" class="hc-flex-day" data-flex="day" min="1" max="31" placeholder="Día" value="' +
    esc(d.day != null ? d.day : '') +
    '"' +
    (p !== 'day' ? ' hidden' : '') +
    '></div>'
  );
}

function readFlexibleDate(wrap) {
  if (!wrap) return null;
  const precision = wrap.querySelector('[data-flex="precision"]').value;
  const year = Number(wrap.querySelector('[data-flex="year"]').value);
  const month = Number(wrap.querySelector('[data-flex="month"]').value);
  const day = Number(wrap.querySelector('[data-flex="day"]').value);
  return normalizeFlexibleDate({ precision, year, month, day });
}

function wireFlexibleDate(wrap) {
  if (!wrap || wrap._hcFlexWired) return;
  wrap._hcFlexWired = true;
  const prec = wrap.querySelector('[data-flex="precision"]');
  const monthEl = wrap.querySelector('[data-flex="month"]');
  const dayEl = wrap.querySelector('[data-flex="day"]');
  prec.addEventListener('change', function () {
    const p = prec.value;
    monthEl.hidden = p === 'year';
    dayEl.hidden = p !== 'day';
  });
}

function defaultApp() {
  return {
    conditions: [],
    customConditions: [],
    conditionDetails: {},
    cirugias: [],
    hospitalizaciones: [],
    alergiasNegado: false,
    alergiaMedicamentos: [],
    traumaticosEntries: [],
    transfusionesEntries: [],
    descripcionDetallada: '',
    medicamentosActuales: [],
    inmunizaciones: '',
  };
}

function ensureApp(app) {
  return normalizeAppData(app, defaultApp());
}

function allConditionIds(app, catalog) {
  const ids = (app.conditions || []).slice();
  (app.customConditions || []).forEach(function (c) {
    if (c && c.id && ids.indexOf(c.id) < 0) ids.push(c.id);
  });
  return ids
    .filter(function (id) {
      return !APP_DEDICATED_IDS.has(id);
    })
    .map(function (id) {
      return {
        id,
        label:
          (catalog && catalog[id]) ||
          ((app.customConditions || []).find(function (c) {
            return c && c.id === id;
          }) || {}).label ||
          id,
        custom: !(catalog && catalog[id]),
      };
    });
}

function emptyHint(text) {
  return '<p class="hc-empty-hint">' + esc(text) + '</p>';
}

function conditionCardHtml(row, app) {
  const det = (app.conditionDetails && app.conditionDetails[row.id]) || {};
  if (row.id === ERC_CONDITION_ID) {
    const erc = normalizeErcDetail(det);
    const stageOpts = CKD_STAGES.map(function (s) {
      return (
        '<option value="' +
        esc(s.id) +
        '"' +
        (erc.stage === s.id ? ' selected' : '') +
        '>' +
        esc(s.label) +
        '</option>'
      );
    }).join('');
    return (
      '<details class="card hc-app-cond-card hc-app-cond-card--erc" open data-cond-id="' +
      esc(row.id) +
      '">' +
      '<summary class="card-header">' +
      esc(row.label) +
      '</summary><div class="card-body">' +
      '<div class="hc-grid">' +
      '<div class="field-group"><label>Estadio (KDIGO)</label>' +
      '<select data-erc-field="stage">' +
      stageOpts +
      '</select></div>' +
      '<div class="field-group"><label>Fecha de diagnóstico</label>' +
      flexibleDateHtml('erc-dx', erc.diagnosedAt) +
      '</div>' +
      '<div class="field-group hc-entry-row-span"><label>Diagnóstico / etiología</label>' +
      '<input type="text" data-erc-field="diagnosis" value="' +
      esc(erc.diagnosis) +
      '" placeholder="Ej. nefropatía diabética, NAE, riñón poliquístico"></div>' +
      '<div class="field-group hc-entry-row-span"><label>Tratamiento (no farmacológico)</label>' +
      '<input type="text" data-erc-field="treatment" value="' +
      esc(erc.treatment) +
      '" placeholder="Dieta, restricción hídrica, diálisis…"></div>' +
      '</div>' +
      '<div class="hc-erc-meds-block">' +
      '<p class="profile-hint">Medicamentos del tratamiento — se agregan automáticamente a <strong>Medicamentos actuales</strong>.</p>' +
      '<div id="hc-erc-meds-list" class="hc-app-special-body"></div>' +
      '<button type="button" class="btn-add-row" id="hc-erc-add-med">+ Agregar medicamento</button>' +
      '</div></div></details>'
    );
  }
  return (
    '<details class="card hc-app-cond-card" open data-cond-id="' +
    esc(row.id) +
    '">' +
    '<summary class="card-header">' +
    esc(row.label) +
    (row.custom ? ' <span class="hc-tag">Personalizada</span>' : '') +
    '</summary><div class="card-body hc-grid">' +
    '<div class="field-group"><label>Fecha de diagnóstico</label>' +
    flexibleDateHtml('dx-' + row.id, det.diagnosedAt) +
    '</div>' +
    '<div class="field-group"><label>Tratamiento</label>' +
    '<input type="text" data-cond-field="treatment" value="' +
    esc(det.treatment || '') +
    '" placeholder="Tratamiento actual o previo"></div></div></details>'
  );
}

/**
 * @param {HTMLElement} container
 * @param {object} app
 * @param {Record<string,string>} catalog
 * @param {(nextApp: object) => void} onChange
 */
export function mountHistoriaAppPanel(container, app, catalog, onChange) {
  if (!container) return;
  app = ensureApp(app);
  catalog = catalog || {};
  const options = catalogOptions(catalog);
  const selected = new Set(app.conditions || []);
  const positiveIds = allConditionIds(app, catalog).filter(function (row) {
    return selected.has(row.id) || row.custom;
  });

  let html = '<div class="hc-app-panel">';

  html += '<section class="hc-app-block">';
  html += '<h4 class="hc-app-block-title">Enfermedades y antecedentes</h4>';
  html += '<div class="hc-checklist-options hc-checklist-options--grid">';
  options.forEach(function (opt) {
    const checked = selected.has(opt.id) ? ' checked' : '';
    html +=
      '<label class="hc-check-chip">' +
      '<input type="checkbox" class="hc-check-chip-input" data-app-cond="' +
      esc(opt.id) +
      '"' +
      checked +
      '>' +
      '<span class="hc-check-chip-label">' +
      esc(opt.label) +
      '</span></label>';
  });
  html += '</div>';
  html +=
    '<div class="hc-app-custom-row">' +
    '<div class="field-group hc-app-custom-field">' +
    '<label>Otra enfermedad</label>' +
    '<input type="text" id="hc-app-custom-label" placeholder="Nombre de la enfermedad">' +
    '</div>' +
    '<button type="button" class="btn-med-secondary" id="hc-app-add-custom">Agregar</button>' +
    '</div>';

  if (positiveIds.length) {
    html += '<div class="hc-app-conditions-detail">';
    positiveIds.forEach(function (row) {
      html += conditionCardHtml(row, app);
    });
    html += '</div>';
  }
  html += '</section>';

  html += '<section class="hc-app-block">';
  html += '<h4 class="hc-app-block-title">Alergias, trauma y transfusiones</h4>';

  html +=
    '<details class="card hc-app-special" open><summary class="card-header">Alergias medicamentosas</summary>' +
    '<div class="card-body">' +
    '<label class="hc-inline-toggle">' +
    '<input type="checkbox" id="hc-app-alergias-negado"' +
    (app.alergiasNegado ? ' checked' : '') +
    '> Sin alergias medicamentosas conocidas</label>' +
    '<div id="hc-app-alergias-body" class="hc-app-special-body' +
    (app.alergiasNegado ? ' hc-app-special-body--hidden' : '') +
    '"></div>' +
    '<div class="hc-app-special-actions' +
    (app.alergiasNegado ? ' hc-app-special-body--hidden' : '') +
    '" id="hc-app-alergias-actions">' +
    '<button type="button" class="btn-add-row" id="hc-app-add-alergia">+ Agregar medicamento</button></div>' +
    '</div></details>';

  html +=
    '<details class="card hc-app-special" open><summary class="card-header">Antecedentes traumáticos / fracturas</summary>' +
    '<div class="card-body">' +
    '<div id="hc-app-trauma-body" class="hc-app-special-body"></div>' +
    '<button type="button" class="btn-add-row" id="hc-app-add-trauma">+ Agregar evento</button>' +
    '</div></details>';

  html +=
    '<details class="card hc-app-special" open><summary class="card-header">Transfusiones previas</summary>' +
    '<div class="card-body">' +
    '<div id="hc-app-transfusion-body" class="hc-app-special-body"></div>' +
    '<button type="button" class="btn-add-row" id="hc-app-add-transfusion">+ Agregar transfusión</button>' +
    '</div></details>';
  html += '</section>';

  html += '<section class="hc-app-block">';
  html += '<h4 class="hc-app-block-title">Procedimientos e ingresos</h4>';
  html +=
    '<details class="card" open><summary class="card-header">Cirugías previas</summary>' +
    '<div class="card-body"><div id="hc-app-cirugias" class="hc-app-special-body"></div>' +
    '<button type="button" class="btn-add-row" id="hc-app-add-cirugia">+ Agregar cirugía</button></div></details>';
  html +=
    '<details class="card" open><summary class="card-header">Hospitalizaciones previas</summary>' +
    '<div class="card-body"><div id="hc-app-hospitalizaciones" class="hc-app-special-body"></div>' +
    '<button type="button" class="btn-add-row" id="hc-app-add-hosp">+ Agregar hospitalización</button></div></details>';
  html +=
    '<details class="card" open><summary class="card-header">Medicamentos actuales</summary>' +
    '<div class="card-body"><div id="hc-app-medicamentos" class="hc-app-special-body"></div>' +
    '<button type="button" class="btn-add-row" id="hc-app-add-medicamento">+ Agregar medicamento</button></div></details>';
  html += '</section>';

  html += '<section class="hc-app-block">';
  html +=
    '<div class="field-group"><label>Descripción adicional</label>' +
    '<textarea rows="3" data-app-field="descripcionDetallada" placeholder="Otros antecedentes relevantes">' +
    esc(app.descripcionDetallada) +
    '</textarea></div>';
  html +=
    '<div class="field-group"><label>Inmunizaciones</label>' +
    '<input type="text" data-app-field="inmunizaciones" value="' +
    esc(app.inmunizaciones || '') +
    '" placeholder="Esquema o pendientes"></div>';
  html += '</section></div>';

  container.innerHTML = html;

  function emit() {
    syncErcMedicationsToApp(app);
    onChange(ensureApp(app));
  }

  function getErcDetail() {
    app.conditionDetails = app.conditionDetails || {};
    app.conditionDetails[ERC_CONDITION_ID] = normalizeErcDetail(
      app.conditionDetails[ERC_CONDITION_ID]
    );
    return app.conditionDetails[ERC_CONDITION_ID];
  }

  function renderErcMeds() {
    const host = container.querySelector('#hc-erc-meds-list');
    if (!host) return;
    const erc = getErcDetail();
    const list = erc.medications || [];
    if (!list.length) {
      host.innerHTML = emptyHint('Ej. eritropoyetina, sevelamer, furosemida.');
      return;
    }
    host.innerHTML = list
      .map(function (m, i) {
        return (
          '<div class="hc-entry-row hc-entry-row--compact" data-erc-med-idx="' +
          i +
          '">' +
          '<div class="field-group"><label>Medicamento</label><input type="text" data-erc-med-field="medication" value="' +
          esc(m.medication || '') +
          '"></div>' +
          '<div class="field-group"><label>Vía</label><input type="text" data-erc-med-field="route" value="' +
          esc(m.route || '') +
          '"></div>' +
          '<div class="field-group"><label>Dosis</label><input type="text" data-erc-med-field="dosage" value="' +
          esc(m.dosage || '') +
          '"></div>' +
          '<div class="field-group"><label>Frecuencia</label><input type="text" data-erc-med-field="frequency" value="' +
          esc(m.frequency || '') +
          '"></div>' +
          '<button type="button" class="btn-remove" data-erc-med-remove="' +
          i +
          '" aria-label="Quitar">×</button></div>'
        );
      })
      .join('');
    host.querySelectorAll('[data-erc-med-field]').forEach(function (el) {
      el.addEventListener('input', function () {
        const idx = Number(el.closest('[data-erc-med-idx]').getAttribute('data-erc-med-idx'));
        const key = el.getAttribute('data-erc-med-field');
        erc.medications[idx][key] = el.value;
        syncErcMedicationsToApp(app);
        renderMedicamentos();
        emit();
      });
    });
    host.querySelectorAll('[data-erc-med-remove]').forEach(function (btn) {
      btn.onclick = function () {
        erc.medications.splice(Number(btn.getAttribute('data-erc-med-remove')), 1);
        syncErcMedicationsToApp(app);
        renderErcMeds();
        renderMedicamentos();
        emit();
      };
    });
  }

  function wireErcCard() {
    const card = container.querySelector('[data-cond-id="' + ERC_CONDITION_ID + '"]');
    if (!card) return;
    const erc = getErcDetail();
    card.querySelectorAll('[data-erc-field]').forEach(function (el) {
      el.addEventListener('input', function () {
        erc[el.getAttribute('data-erc-field')] = el.value;
        emit();
      });
      el.addEventListener('change', function () {
        erc[el.getAttribute('data-erc-field')] = el.value;
        emit();
      });
    });
    const flex = card.querySelector('.hc-flex-date');
    if (flex) {
      flex.querySelectorAll('input,select').forEach(function (el) {
        el.addEventListener('change', function () {
          erc.diagnosedAt = readFlexibleDate(flex);
          emit();
        });
      });
    }
    const addMed = card.querySelector('#hc-erc-add-med');
    if (addMed) {
      addMed.onclick = function () {
        erc.medications.push({
          id: newRowId('erc'),
          medication: '',
          route: '',
          dosage: '',
          frequency: '',
        });
        syncErcMedicationsToApp(app);
        renderErcMeds();
        renderMedicamentos();
        emit();
      };
    }
    renderErcMeds();
  }

  function renderAlergias() {
    const host = container.querySelector('#hc-app-alergias-body');
    if (!host) return;
    const list = app.alergiaMedicamentos || [];
    if (!list.length) {
      host.innerHTML = emptyHint('Agrega cada medicamento que causa alergia o reacción.');
      return;
    }
    host.innerHTML = list
      .map(function (row, i) {
        return (
          '<div class="hc-entry-row hc-entry-row--compact" data-alergia-idx="' +
          i +
          '">' +
          '<div class="field-group hc-entry-row-main"><label>Medicamento</label>' +
          '<input type="text" data-al-field="medication" value="' +
          esc(row.medication || '') +
          '" placeholder="ej. Penicilina, AINEs, contraste yodado"></div>' +
          '<button type="button" class="btn-remove" data-alergia-remove="' +
          i +
          '" aria-label="Quitar">×</button></div>'
        );
      })
      .join('');
    host.querySelectorAll('[data-al-field]').forEach(function (el) {
      el.addEventListener('input', function () {
        const row = el.closest('[data-alergia-idx]');
        const idx = Number(row.getAttribute('data-alergia-idx'));
        app.alergiaMedicamentos[idx][el.getAttribute('data-al-field')] = el.value;
        app.alergiasNegado = false;
        emit();
      });
    });
    host.querySelectorAll('[data-alergia-remove]').forEach(function (btn) {
      btn.onclick = function () {
        app.alergiaMedicamentos.splice(Number(btn.getAttribute('data-alergia-remove')), 1);
        renderAlergias();
        emit();
      };
    });
  }

  function renderTrauma() {
    const host = container.querySelector('#hc-app-trauma-body');
    if (!host) return;
    const list = app.traumaticosEntries || [];
    if (!list.length) {
      host.innerHTML = emptyHint('Fracturas, politraumatismos u otros eventos con fecha aproximada.');
      return;
    }
    host.innerHTML = list
      .map(function (t, i) {
        return (
          '<div class="hc-entry-row" data-trauma-idx="' +
          i +
          '">' +
          '<div class="field-group"><label>Fecha</label>' +
          flexibleDateHtml('tr-' + i, t.date) +
          '</div>' +
          '<div class="field-group hc-entry-row-main"><label>Qué ocurrió</label>' +
          '<input type="text" data-tr-field="description" value="' +
          esc(t.description || '') +
          '" placeholder="ej. Fractura de fémur por caída"></div>' +
          '<button type="button" class="btn-remove" data-trauma-remove="' +
          i +
          '" aria-label="Quitar">×</button></div>'
        );
      })
      .join('');
    host.querySelectorAll('.hc-flex-date').forEach(wireFlexibleDate);
    host.querySelectorAll('[data-tr-field]').forEach(function (el) {
      el.addEventListener('input', function () {
        const idx = Number(el.closest('[data-trauma-idx]').getAttribute('data-trauma-idx'));
        app.traumaticosEntries[idx][el.getAttribute('data-tr-field')] = el.value;
        emit();
      });
    });
    host.querySelectorAll('[data-trauma-remove]').forEach(function (btn) {
      btn.onclick = function () {
        app.traumaticosEntries.splice(Number(btn.getAttribute('data-trauma-remove')), 1);
        renderTrauma();
        emit();
      };
    });
    host.querySelectorAll('.hc-flex-date').forEach(function (wrap) {
      wrap.querySelectorAll('input,select').forEach(function (el) {
        el.addEventListener('change', function () {
          const idx = Number(wrap.closest('[data-trauma-idx]').getAttribute('data-trauma-idx'));
          app.traumaticosEntries[idx].date = readFlexibleDate(wrap);
          emit();
        });
      });
    });
  }

  function renderTransfusiones() {
    const host = container.querySelector('#hc-app-transfusion-body');
    if (!host) return;
    const list = app.transfusionesEntries || [];
    if (!list.length) {
      host.innerHTML = emptyHint('Número de unidades, fecha y reacciones adversas si hubo.');
      return;
    }
    host.innerHTML = list
      .map(function (t, i) {
        return (
          '<div class="hc-entry-row" data-transfusion-idx="' +
          i +
          '">' +
          '<div class="field-group"><label>Unidades / cantidad</label>' +
          '<input type="text" data-tf-field="units" value="' +
          esc(t.units != null ? t.units : '') +
          '" placeholder="ej. 2 paquetes globulares"></div>' +
          '<div class="field-group"><label>Fecha</label>' +
          flexibleDateHtml('tf-' + i, t.date) +
          '</div>' +
          '<div class="field-group hc-entry-row-span"><label>Reacciones adversas</label>' +
          '<input type="text" data-tf-field="adverseReactions" value="' +
          esc(t.adverseReactions || '') +
          '" placeholder="Ninguna, o describir"></div>' +
          '<button type="button" class="btn-remove" data-transfusion-remove="' +
          i +
          '" aria-label="Quitar">×</button></div>'
        );
      })
      .join('');
    host.querySelectorAll('.hc-flex-date').forEach(wireFlexibleDate);
    host.querySelectorAll('[data-tf-field]').forEach(function (el) {
      el.addEventListener('input', function () {
        const idx = Number(el.closest('[data-transfusion-idx]').getAttribute('data-transfusion-idx'));
        app.transfusionesEntries[idx][el.getAttribute('data-tf-field')] = el.value;
        emit();
      });
    });
    host.querySelectorAll('[data-transfusion-remove]').forEach(function (btn) {
      btn.onclick = function () {
        app.transfusionesEntries.splice(Number(btn.getAttribute('data-transfusion-remove')), 1);
        renderTransfusiones();
        emit();
      };
    });
    host.querySelectorAll('.hc-flex-date').forEach(function (wrap) {
      wrap.querySelectorAll('input,select').forEach(function (el) {
        el.addEventListener('change', function () {
          const idx = Number(wrap.closest('[data-transfusion-idx]').getAttribute('data-transfusion-idx'));
          app.transfusionesEntries[idx].date = readFlexibleDate(wrap);
          emit();
        });
      });
    });
  }

  function renderMedicamentos() {
    const host = container.querySelector('#hc-app-medicamentos');
    if (!host) return;
    const list = app.medicamentosActuales || [];
    if (!list.length) {
      host.innerHTML = emptyHint('Medicamento, vía, dosis y frecuencia de cada fármaco activo.');
      return;
    }
    host.innerHTML = list
      .map(function (m, i) {
        const linked = m.linkedFrom === ERC_CONDITION_ID;
        const ro = linked ? ' readonly tabindex="-1" title="Editar en la tarjeta de enfermedad renal crónica"' : '';
        const tag = linked ? ' <span class="hc-tag">ERC</span>' : '';
        return (
          '<div class="hc-entry-row' +
          (linked ? ' hc-entry-row--linked' : '') +
          '" data-medicamento-idx="' +
          i +
          '">' +
          '<div class="field-group"><label>Medicamento' +
          tag +
          '</label>' +
          '<input type="text" data-med-field="medication" value="' +
          esc(m.medication || '') +
          '" placeholder="Nombre genérico o comercial"' +
          ro +
          '></div>' +
          '<div class="field-group"><label>Vía de administración</label>' +
          '<input type="text" data-med-field="route" value="' +
          esc(m.route || '') +
          '" placeholder="VO, IV, SC, inhalada…"' +
          ro +
          '></div>' +
          '<div class="field-group"><label>Dosis</label>' +
          '<input type="text" data-med-field="dosage" value="' +
          esc(m.dosage || '') +
          '" placeholder="ej. 850 mg"' +
          ro +
          '></div>' +
          '<div class="field-group"><label>Frecuencia</label>' +
          '<input type="text" data-med-field="frequency" value="' +
          esc(m.frequency || '') +
          '" placeholder="ej. c/12 h"' +
          ro +
          '></div>' +
          '<button type="button" class="btn-remove" data-medicamento-remove="' +
          i +
          '" aria-label="Quitar">×</button></div>'
        );
      })
      .join('');
    host.querySelectorAll('[data-med-field]').forEach(function (el) {
      el.addEventListener('input', function () {
        const row = el.closest('[data-medicamento-idx]');
        const idx = Number(row.getAttribute('data-medicamento-idx'));
        const m = app.medicamentosActuales[idx];
        if (!m || m.linkedFrom === ERC_CONDITION_ID) return;
        m[el.getAttribute('data-med-field')] = el.value;
        emit();
      });
    });
    host.querySelectorAll('[data-medicamento-remove]').forEach(function (btn) {
      btn.onclick = function () {
        const idx = Number(btn.getAttribute('data-medicamento-remove'));
        const m = app.medicamentosActuales[idx];
        if (m && m.linkedFrom === ERC_CONDITION_ID) {
          const erc = getErcDetail();
          erc.medications = erc.medications.filter(function (x) {
            return x.id !== m.id;
          });
          syncErcMedicationsToApp(app);
          renderErcMeds();
        } else {
          app.medicamentosActuales.splice(idx, 1);
        }
        renderMedicamentos();
        emit();
      };
    });
  }

  function renderCirugias() {
    const host = container.querySelector('#hc-app-cirugias');
    if (!host) return;
    const list = app.cirugias || [];
    if (!list.length) {
      host.innerHTML = emptyHint('Procedimiento, fecha y complicaciones si aplica.');
      return;
    }
    host.innerHTML = list
      .map(function (c, i) {
        return (
          '<div class="hc-entry-row" data-cirugia-idx="' +
          i +
          '">' +
          '<div class="field-group"><label>Procedimiento</label><input type="text" data-c-field="procedure" value="' +
          esc(c.procedure || '') +
          '"></div>' +
          '<div class="field-group"><label>Fecha</label>' +
          flexibleDateHtml('cir-' + i, c.date) +
          '</div>' +
          '<div class="field-group hc-entry-row-span"><label>Complicaciones</label><input type="text" data-c-field="complications" value="' +
          esc(c.complications || '') +
          '"></div>' +
          '<button type="button" class="btn-remove" data-cirugia-remove="' +
          i +
          '" aria-label="Quitar">×</button></div>'
        );
      })
      .join('');
    wireEntryList(host, app.cirugias, 'cirugia', 'c-field', function (idx, wrap) {
      app.cirugias[idx].date = readFlexibleDate(wrap);
    });
  }

  function renderHosps() {
    const host = container.querySelector('#hc-app-hospitalizaciones');
    if (!host) return;
    const list = app.hospitalizaciones || [];
    if (!list.length) {
      host.innerHTML = emptyHint('Motivo, fecha, duración y complicaciones.');
      return;
    }
    host.innerHTML = list
      .map(function (h, i) {
        return (
          '<div class="hc-entry-row" data-hosp-idx="' +
          i +
          '">' +
          '<div class="field-group"><label>Motivo</label><input type="text" data-h-field="reason" value="' +
          esc(h.reason || '') +
          '"></div>' +
          '<div class="field-group"><label>Fecha</label>' +
          flexibleDateHtml('hos-' + i, h.date) +
          '</div>' +
          '<div class="field-group"><label>Duración</label><input type="text" data-h-field="duration" value="' +
          esc(h.duration || '') +
          '" placeholder="ej. 5 días"></div>' +
          '<div class="field-group"><label>Complicaciones</label><input type="text" data-h-field="complications" value="' +
          esc(h.complications || '') +
          '"></div>' +
          '<button type="button" class="btn-remove" data-hosp-remove="' +
          i +
          '" aria-label="Quitar">×</button></div>'
        );
      })
      .join('');
    wireEntryList(host, app.hospitalizaciones, 'hosp', 'h-field', function (idx, wrap) {
      app.hospitalizaciones[idx].date = readFlexibleDate(wrap);
    });
  }

  function wireEntryList(host, list, rowAttr, fieldAttr, onDateChange) {
    host.querySelectorAll('.hc-flex-date').forEach(wireFlexibleDate);
    host.querySelectorAll('[' + 'data-' + fieldAttr + ']').forEach(function (el) {
      el.addEventListener('input', function () {
        const row = el.closest('[data-' + rowAttr + '-idx]');
        const idx = Number(row.getAttribute('data-' + rowAttr + '-idx'));
        const key = el.getAttribute('data-' + fieldAttr);
        if (!list[idx]) return;
        list[idx][key] = el.value;
        emit();
      });
    });
    host.querySelectorAll('[data-' + rowAttr + '-remove]').forEach(function (btn) {
      btn.onclick = function () {
        list.splice(Number(btn.getAttribute('data-' + rowAttr + '-remove')), 1);
        if (rowAttr === 'cirugia') renderCirugias();
        else renderHosps();
        emit();
      };
    });
    host.querySelectorAll('.hc-flex-date').forEach(function (wrap) {
      wrap.querySelectorAll('input,select').forEach(function (el) {
        el.addEventListener('change', function () {
          const row = wrap.closest('[data-' + rowAttr + '-idx]');
          const idx = Number(row.getAttribute('data-' + rowAttr + '-idx'));
          onDateChange(idx, wrap);
          emit();
        });
      });
    });
  }

  renderAlergias();
  renderTrauma();
  renderTransfusiones();
  renderMedicamentos();
  renderCirugias();
  renderHosps();
  wireErcCard();

  container.querySelectorAll('.hc-flex-date').forEach(wireFlexibleDate);

  const negadoEl = container.querySelector('#hc-app-alergias-negado');
  const alBody = container.querySelector('#hc-app-alergias-body');
  const alActions = container.querySelector('#hc-app-alergias-actions');
  if (negadoEl) {
    negadoEl.addEventListener('change', function () {
      app.alergiasNegado = negadoEl.checked;
      if (app.alergiasNegado) app.alergiaMedicamentos = [];
      alBody.classList.toggle('hc-app-special-body--hidden', app.alergiasNegado);
      alActions.classList.toggle('hc-app-special-body--hidden', app.alergiasNegado);
      if (!app.alergiasNegado) renderAlergias();
      emit();
    });
  }

  container.querySelectorAll('.hc-check-chip-input').forEach(function (el) {
    el.addEventListener('change', function () {
      const id = el.getAttribute('data-app-cond');
      const set = new Set(app.conditions || []);
      if (el.checked) {
        set.add(id);
        if (id === ERC_CONDITION_ID) {
          app.conditionDetails = app.conditionDetails || {};
          app.conditionDetails[ERC_CONDITION_ID] = normalizeErcDetail(
            app.conditionDetails[ERC_CONDITION_ID]
          );
        }
      } else {
        set.delete(id);
        if (id === ERC_CONDITION_ID) purgeErcMedicationsFromApp(app);
        else if (app.conditionDetails && app.conditionDetails[id]) delete app.conditionDetails[id];
      }
      app.conditions = Array.from(set);
      mountHistoriaAppPanel(container, app, catalog, onChange);
      emit();
    });
  });

  const addCustom = container.querySelector('#hc-app-add-custom');
  if (addCustom) {
    addCustom.onclick = function () {
      const input = container.querySelector('#hc-app-custom-label');
      const label = input && input.value ? input.value.trim() : '';
      if (!label) return;
      const id = newRowId('custom');
      app.customConditions.push({ id, label });
      app.conditions.push(id);
      app.conditionDetails[id] = { treatment: '' };
      if (input) input.value = '';
      mountHistoriaAppPanel(container, app, catalog, onChange);
      emit();
    };
  }

  container.querySelectorAll('.hc-app-cond-card:not(.hc-app-cond-card--erc)').forEach(function (card) {
    const id = card.getAttribute('data-cond-id');
    card.querySelectorAll('[data-cond-field]').forEach(function (el) {
      el.addEventListener('input', function () {
        app.conditionDetails[id] = app.conditionDetails[id] || {};
        app.conditionDetails[id][el.getAttribute('data-cond-field')] = el.value;
        emit();
      });
    });
    const flex = card.querySelector('.hc-flex-date');
    if (flex) {
      flex.querySelectorAll('input,select').forEach(function (el) {
        el.addEventListener('change', function () {
          app.conditionDetails[id] = app.conditionDetails[id] || {};
          app.conditionDetails[id].diagnosedAt = readFlexibleDate(flex);
          emit();
        });
      });
    }
  });

  container.querySelectorAll('[data-app-field]').forEach(function (el) {
    el.addEventListener('input', function () {
      app[el.getAttribute('data-app-field')] = el.value;
      emit();
    });
  });

  const addAlergia = container.querySelector('#hc-app-add-alergia');
  if (addAlergia) {
    addAlergia.onclick = function () {
      app.alergiasNegado = false;
      if (negadoEl) negadoEl.checked = false;
      app.alergiaMedicamentos.push({ id: newRowId('al'), medication: '' });
      alBody.classList.remove('hc-app-special-body--hidden');
      alActions.classList.remove('hc-app-special-body--hidden');
      renderAlergias();
      emit();
    };
  }

  const addTrauma = container.querySelector('#hc-app-add-trauma');
  if (addTrauma) {
    addTrauma.onclick = function () {
      app.traumaticosEntries.push({
        id: newRowId('tr'),
        description: '',
        date: defaultFlexibleDate(),
      });
      renderTrauma();
      emit();
    };
  }

  const addTf = container.querySelector('#hc-app-add-transfusion');
  if (addTf) {
    addTf.onclick = function () {
      app.transfusionesEntries.push({
        id: newRowId('tf'),
        units: '',
        adverseReactions: '',
        date: defaultFlexibleDate(),
      });
      renderTransfusiones();
      emit();
    };
  }

  const addMed = container.querySelector('#hc-app-add-medicamento');
  if (addMed) {
    addMed.onclick = function () {
      app.medicamentosActuales.push({
        id: newRowId('med'),
        medication: '',
        route: '',
        dosage: '',
        frequency: '',
      });
      renderMedicamentos();
      emit();
    };
  }

  const addCir = container.querySelector('#hc-app-add-cirugia');
  if (addCir) {
    addCir.onclick = function () {
      app.cirugias.push({ procedure: '', complications: '', date: defaultFlexibleDate() });
      renderCirugias();
      emit();
    };
  }

  const addHosp = container.querySelector('#hc-app-add-hosp');
  if (addHosp) {
    addHosp.onclick = function () {
      app.hospitalizaciones.push({
        reason: '',
        duration: '',
        complications: '',
        date: defaultFlexibleDate(),
      });
      renderHosps();
      emit();
    };
  }
}
