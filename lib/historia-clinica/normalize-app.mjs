import { ERC_CONDITION_ID, normalizeErcDetail, syncErcMedicationsToApp } from './erc-detail.mjs';

/** Catalog ids handled by dedicated APP sections (not disease chips). */
export const APP_DEDICATED_IDS = new Set([
  'cirugias',
  'transfusiones',
  'traumaticos',
  'alergias',
]);

function trim(s) {
  return String(s || '').trim();
}

/**
 * @param {object} app
 * @param {object} [defaults]
 */
export function normalizeAppData(app, defaults) {
  app = Object.assign({}, defaults || {}, app || {});
  if (!Array.isArray(app.customConditions)) app.customConditions = [];
  if (!app.conditionDetails || typeof app.conditionDetails !== 'object') {
    app.conditionDetails = {};
  }
  if (!Array.isArray(app.cirugias)) app.cirugias = [];
  if (!Array.isArray(app.hospitalizaciones)) app.hospitalizaciones = [];
  if (!Array.isArray(app.conditions)) app.conditions = [];

  app.conditions = app.conditions.filter(function (id) {
    return id && !APP_DEDICATED_IDS.has(id);
  });

  if (!Array.isArray(app.alergiaMedicamentos)) app.alergiaMedicamentos = [];
  if (!Array.isArray(app.traumaticosEntries)) app.traumaticosEntries = [];
  if (!Array.isArray(app.transfusionesEntries)) app.transfusionesEntries = [];
  if (!Array.isArray(app.medicamentosActuales)) {
    const legacyMed = trim(app.medicamentosActuales);
    app.medicamentosActuales = legacyMed
      ? [
          {
            id: 'legacy_med',
            medication: legacyMed,
            route: '',
            dosage: '',
            frequency: '',
          },
        ]
      : [];
  }

  if (trim(app.alergias) && !app.alergiaMedicamentos.length) {
    app.alergiaMedicamentos.push({ id: 'legacy_al', medication: trim(app.alergias) });
    app.alergiasNegado = false;
  }
  if (trim(app.traumaticos) && !app.traumaticosEntries.length) {
    app.traumaticosEntries.push({
      id: 'legacy_tr',
      description: trim(app.traumaticos),
      date: null,
    });
  }
  if (trim(app.transfusiones) && !app.transfusionesEntries.length) {
    app.transfusionesEntries.push({
      id: 'legacy_tf',
      units: '',
      adverseReactions: trim(app.transfusiones),
      date: null,
    });
  }

  delete app.alergias;
  delete app.traumaticos;
  delete app.transfusiones;

  if (app.alergiasNegado !== true && app.alergiaMedicamentos.length > 0) {
    app.alergiasNegado = false;
  }
  if (app.alergiasNegado !== false && !app.alergiaMedicamentos.length) {
    app.alergiasNegado = app.alergiasNegado === true;
  }

  Object.keys(app.conditionDetails).forEach(function (id) {
    if (APP_DEDICATED_IDS.has(id)) delete app.conditionDetails[id];
  });

  if ((app.conditions || []).indexOf(ERC_CONDITION_ID) >= 0) {
    app.conditionDetails[ERC_CONDITION_ID] = normalizeErcDetail(
      app.conditionDetails[ERC_CONDITION_ID]
    );
  }

  return syncErcMedicationsToApp(app);
}
