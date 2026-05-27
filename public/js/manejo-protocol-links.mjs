/** Metadatos wiki: categoría de uso y patologías vinculadas. */

export const MANEJO_PROTOCOL_USE_CATEGORIES = [
  { id: 'vasopresor', label: 'Vasopresor / inotrópico' },
  { id: 'sedacion-analgesia', label: 'Sedación / analgesia' },
  { id: 'antiarritmico', label: 'Antiarritmico' },
  { id: 'anticonvulsivante', label: 'Anticonvulsivante' },
  { id: 'electrolito', label: 'Electrolito / fluido' },
  { id: 'diuretico', label: 'Diurético' },
  { id: 'respiratorio', label: 'Respiratorio' },
  { id: 'soporte-metabolico', label: 'Soporte metabólico' },
  { id: 'hemostasia-transfusion', label: 'Hemostasia / transfusión' },
  { id: 'otro', label: 'Otro' },
];

/** @type {Record<string, { useCategories?: string[], linkedPathologyIds?: string[] }>} */
export const MANEJO_PROTOCOL_LINK_META = {
  'nore-standard': {
    useCategories: ['vasopresor'],
    linkedPathologyIds: [
      'septic-shock',
      'pulmonary-embolism',
      'anaphylaxis',
      'thyroid-storm',
      'cardiogenic-pulmonary-edema',
    ],
  },
  'vasopressin-standard': {
    useCategories: ['vasopresor'],
    linkedPathologyIds: ['septic-shock'],
  },
  'epinephrine-infusion': {
    useCategories: ['vasopresor'],
    linkedPathologyIds: ['anaphylaxis', 'septic-shock', 'cardiogenic-pulmonary-edema'],
  },
  'dobutamine-infusion': {
    useCategories: ['vasopresor'],
    linkedPathologyIds: ['cardiogenic-pulmonary-edema', 'pulmonary-embolism'],
  },
  'nitro-standard': {
    useCategories: ['vasopresor'],
    linkedPathologyIds: ['cardiogenic-pulmonary-edema', 'hypertensive-emergency'],
  },
  'nitro-sublingual-eap': {
    useCategories: ['vasopresor'],
    linkedPathologyIds: ['cardiogenic-pulmonary-edema'],
  },
  'nitro-iam': {
    useCategories: ['vasopresor'],
    linkedPathologyIds: ['cardiogenic-pulmonary-edema', 'hypertensive-emergency'],
  },
  'amiodarone-load': {
    useCategories: ['antiarritmico'],
    linkedPathologyIds: ['hypertensive-emergency'],
  },
  'amiodarone-infusion': {
    useCategories: ['antiarritmico'],
    linkedPathologyIds: ['hypertensive-emergency'],
  },
  'midazolam-infusion': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['status-epilepticus', 'hepatic-encephalopathy'],
  },
  'propofol-infusion': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['status-epilepticus', 'hepatic-encephalopathy', 'severe-pancreatitis'],
  },
  'dexmed-infusion': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['status-epilepticus'],
  },
  'sedation-iot-bundle': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['status-epilepticus', 'hepatic-encephalopathy'],
  },
  'midazolam-iot-01': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['status-epilepticus'],
  },
  'propofol-iot-40': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['status-epilepticus'],
  },
  'dexmed-iot-05': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['status-epilepticus'],
  },
  'levetiracetam-load': {
    useCategories: ['anticonvulsivante'],
    linkedPathologyIds: ['status-epilepticus'],
  },
  'levetiracetam-maint': {
    useCategories: ['anticonvulsivante'],
    linkedPathologyIds: ['status-epilepticus'],
  },
  'phenytoin-load': {
    useCategories: ['anticonvulsivante'],
    linkedPathologyIds: ['status-epilepticus'],
  },
  'bic-hu-balanceada': {
    useCategories: ['electrolito'],
    linkedPathologyIds: ['diabetic-ketoacidosis'],
  },
  'bicarb-hyperkalemia': {
    useCategories: ['electrolito'],
    linkedPathologyIds: ['hyperkalemia-acute'],
  },
  'mg-infusion-slow': {
    useCategories: ['electrolito'],
    linkedPathologyIds: ['thyroid-storm', 'status-epilepticus'],
  },
  'mg-bolus-2g': {
    useCategories: ['electrolito'],
    linkedPathologyIds: ['thyroid-storm', 'status-epilepticus'],
  },
  'ca-gluconate-bolus': {
    useCategories: ['electrolito'],
    linkedPathologyIds: ['hyperkalemia-acute'],
  },
  'ca-gluconate-infusion': {
    useCategories: ['electrolito'],
    linkedPathologyIds: ['hyperkalemia-acute', 'severe-hypercalcemia'],
  },
  'hypertonic-saline': {
    useCategories: ['electrolito'],
    linkedPathologyIds: ['severe-hyponatremia'],
  },
  'bicarb-capsules': {
    useCategories: ['electrolito'],
    linkedPathologyIds: ['diabetic-ketoacidosis'],
  },
  'buprenorphine-infusion': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['severe-pancreatitis'],
  },
  'fentanyl-infusion': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['severe-pancreatitis', 'cardiogenic-pulmonary-edema'],
  },
  'morphine-eap-bolus': {
    useCategories: ['sedacion-analgesia'],
    linkedPathologyIds: ['cardiogenic-pulmonary-edema'],
  },
  'salbutamol-nebul': {
    useCategories: ['respiratorio'],
    linkedPathologyIds: ['hyperkalemia-acute', 'anaphylaxis', 'cardiogenic-pulmonary-edema'],
  },
  'furo-infusion': {
    useCategories: ['diuretico'],
    linkedPathologyIds: [
      'cardiogenic-pulmonary-edema',
      'hyperkalemia-acute',
      'severe-hypercalcemia',
    ],
  },
  'furo-bolus': {
    useCategories: ['diuretico'],
    linkedPathologyIds: ['cardiogenic-pulmonary-edema', 'hyperkalemia-acute'],
  },
  'insulin-cad-01': {
    useCategories: ['soporte-metabolico'],
    linkedPathologyIds: ['diabetic-ketoacidosis'],
  },
  'insulin-cad-005': {
    useCategories: ['soporte-metabolico'],
    linkedPathologyIds: ['diabetic-ketoacidosis'],
  },
  'insulin-ehh-014': {
    useCategories: ['soporte-metabolico'],
    linkedPathologyIds: ['hyperosmolar-state'],
  },
  'albumin-paracentesis': {
    useCategories: ['electrolito'],
    linkedPathologyIds: ['hepatic-encephalopathy'],
  },
  'stanford-solution': {
    useCategories: ['otro'],
    linkedPathologyIds: [],
  },
  'carboxymaltose-iron': {
    useCategories: ['otro'],
    linkedPathologyIds: [],
  },
  'venofer-dose': {
    useCategories: ['otro'],
    linkedPathologyIds: [],
  },
  'platelets-volume': {
    useCategories: ['hemostasia-transfusion'],
    linkedPathologyIds: ['upper-gi-bleed'],
  },
};

function mergeLinkedPathologyIds(entry, meta) {
  var custom = Array.isArray(entry.linkedPathologyIds) ? entry.linkedPathologyIds : [];
  if (custom.length) return custom.slice();
  return (meta.linkedPathologyIds || []).slice();
}

/** @param {object|null|undefined} entry */
export function enrichProtocolEntry(entry) {
  if (!entry || !entry.id) return entry;
  var meta = MANEJO_PROTOCOL_LINK_META[entry.id] || {};
  return Object.assign({}, entry, {
    useCategories: meta.useCategories || entry.useCategories || [],
    linkedPathologyIds: mergeLinkedPathologyIds(entry, meta),
  });
}

/** @param {string} useCatId */
export function useCategoryLabelFor(useCatId) {
  var hit = MANEJO_PROTOCOL_USE_CATEGORIES.find(function (c) {
    return c.id === useCatId;
  });
  return hit ? hit.label : useCatId;
}

/** @param {object[]} protocols @param {string} pathologyId */
export function protocolsLinkedToPathology(protocols, pathologyId) {
  return (protocols || []).filter(function (p) {
    return (p.linkedPathologyIds || []).indexOf(pathologyId) >= 0;
  });
}

/** @param {object[]} pathologies @param {object|null} protocolEntry */
export function pathologiesLinkedToProtocol(pathologies, protocolEntry) {
  if (!protocolEntry) return [];
  var enriched = enrichProtocolEntry(protocolEntry);
  var ids = enriched.linkedPathologyIds || [];
  if (!ids.length) return [];
  return (pathologies || []).filter(function (p) {
    return ids.indexOf(p.id) >= 0;
  });
}

/** IDs de protocolos referenciados en secciones de una patología (dedupe). */
export function protocolIdsInPathologySections(entry) {
  var set = {};
  (entry.sections || []).forEach(function (sec) {
    (sec.items || []).forEach(function (item) {
      if (item.type === 'protocol' && item.protocolId) set[item.protocolId] = true;
    });
  });
  return Object.keys(set);
}
