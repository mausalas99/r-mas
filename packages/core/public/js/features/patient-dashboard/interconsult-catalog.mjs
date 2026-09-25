export const INTERCONSULT_CAT_HUE = { med: 245, qx: 168, sop: 52 };

export const INTERCONSULT_SERVICES = [
  { id: 'card', name: 'Cardiología', cat: 'med' },
  { id: 'nef', name: 'Nefrología', cat: 'med' },
  { id: 'endo', name: 'Endocrinología', cat: 'med' },
  { id: 'inf', name: 'Infectología', cat: 'med' },
  { id: 'neumo', name: 'Neumología', cat: 'med' },
  { id: 'gastro', name: 'Gastroenterología', cat: 'med' },
  { id: 'hema', name: 'Hematología', cat: 'med' },
  { id: 'onco', name: 'Oncología', cat: 'med' },
  { id: 'reuma', name: 'Reumatología', cat: 'med' },
  { id: 'neuro', name: 'Neurología', cat: 'med' },
  { id: 'derma', name: 'Dermatología', cat: 'med' },
  { id: 'geri', name: 'Geriatría', cat: 'med' },
  { id: 'psiq', name: 'Psiquiatría', cat: 'med' },
  { id: 'cxgen', name: 'Cirugía general', cat: 'qx' },
  { id: 'cxct', name: 'Cirugía cardiotorácica', cat: 'qx' },
  { id: 'ncx', name: 'Neurocirugía', cat: 'qx' },
  { id: 'uro', name: 'Urología', cat: 'qx' },
  { id: 'tyo', name: 'Traumatología', cat: 'qx' },
  { id: 'cxvas', name: 'Cirugía vascular', cat: 'qx' },
  { id: 'orl', name: 'ORL', cat: 'qx' },
  { id: 'oft', name: 'Oftalmología', cat: 'qx' },
  { id: 'gine', name: 'Ginecología', cat: 'qx' },
  { id: 'uti', name: 'UTI', cat: 'sop' },
  { id: 'nutri', name: 'Nutrición clínica', cat: 'sop' },
  { id: 'rehab', name: 'Rehabilitación', cat: 'sop' },
  { id: 'algo', name: 'Algología', cat: 'sop' },
  { id: 'pali', name: 'Cuidados paliativos', cat: 'sop' },
  { id: 'torre-hu', name: 'Torre HU', cat: 'sop' },
];

/** Servicio solicitante (Interconsulta band) picks from this fixed subset,
 * in this order — not the full Sala interconsultantes catalog above. */
export const REQUESTING_SERVICE_IDS = ['tyo', 'cxgen', 'gine', 'torre-hu', 'ncx'];

/** Per-service hues for the requesting-service picker — deliberately not
 * the category hues above (Sala's interconsultantes picker colors by
 * médicas/quirúrgicas/soporte; this one needs each service to read apart). */
export const REQUESTING_SERVICE_HUES = { tyo: 210, cxgen: 265, gine: 335, 'torre-hu': 35, ncx: 150 };

const SERVICE_BY_ID = new Map(INTERCONSULT_SERVICES.map((svc) => [svc.id, svc]));

export function serviceById(id) {
  return SERVICE_BY_ID.get(id);
}

export function hueForService(svc) {
  return INTERCONSULT_CAT_HUE[svc.cat];
}

export function hueForRequestingService(svc) {
  return REQUESTING_SERVICE_HUES[svc.id] ?? hueForService(svc);
}

export function toggleInterconsultId(ids, id) {
  if (!SERVICE_BY_ID.has(id)) {
    return [...ids];
  }
  if (ids.includes(id)) {
    return ids.filter((existing) => existing !== id);
  }
  return [...ids, id];
}
