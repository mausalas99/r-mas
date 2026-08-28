// public/js/features/patient-dashboard/interconsult-catalog.mjs
var INTERCONSULT_CAT_HUE = { med: 245, qx: 168, sop: 52 };
var INTERCONSULT_SERVICES = [
  { id: "card", name: "Cardiolog\xEDa", cat: "med" },
  { id: "nef", name: "Nefrolog\xEDa", cat: "med" },
  { id: "endo", name: "Endocrinolog\xEDa", cat: "med" },
  { id: "inf", name: "Infectolog\xEDa", cat: "med" },
  { id: "neumo", name: "Neumolog\xEDa", cat: "med" },
  { id: "gastro", name: "Gastroenterolog\xEDa", cat: "med" },
  { id: "hema", name: "Hematolog\xEDa", cat: "med" },
  { id: "onco", name: "Oncolog\xEDa", cat: "med" },
  { id: "reuma", name: "Reumatolog\xEDa", cat: "med" },
  { id: "neuro", name: "Neurolog\xEDa", cat: "med" },
  { id: "derma", name: "Dermatolog\xEDa", cat: "med" },
  { id: "geri", name: "Geriatr\xEDa", cat: "med" },
  { id: "psiq", name: "Psiquiatr\xEDa", cat: "med" },
  { id: "cxgen", name: "Cirug\xEDa general", cat: "qx" },
  { id: "cxct", name: "Cirug\xEDa cardiotor\xE1cica", cat: "qx" },
  { id: "ncx", name: "Neurocirug\xEDa", cat: "qx" },
  { id: "uro", name: "Urolog\xEDa", cat: "qx" },
  { id: "tyo", name: "Traumatolog\xEDa", cat: "qx" },
  { id: "cxvas", name: "Cirug\xEDa vascular", cat: "qx" },
  { id: "orl", name: "ORL", cat: "qx" },
  { id: "oft", name: "Oftalmolog\xEDa", cat: "qx" },
  { id: "gine", name: "Ginecolog\xEDa", cat: "qx" },
  { id: "uti", name: "UTI", cat: "sop" },
  { id: "nutri", name: "Nutrici\xF3n cl\xEDnica", cat: "sop" },
  { id: "rehab", name: "Rehabilitaci\xF3n", cat: "sop" },
  { id: "algo", name: "Algolog\xEDa", cat: "sop" },
  { id: "pali", name: "Cuidados paliativos", cat: "sop" },
  { id: "torre-hu", name: "Torre HU", cat: "sop" }
];
var REQUESTING_SERVICE_IDS = ["tyo", "cxgen", "gine", "torre-hu", "ncx"];
var REQUESTING_SERVICE_HUES = { tyo: 210, cxgen: 265, gine: 335, "torre-hu": 35, ncx: 150 };
var SERVICE_BY_ID = new Map(INTERCONSULT_SERVICES.map((svc) => [svc.id, svc]));
function serviceById(id) {
  return SERVICE_BY_ID.get(id);
}
function hueForService(svc) {
  return INTERCONSULT_CAT_HUE[svc.cat];
}
function hueForRequestingService(svc) {
  return REQUESTING_SERVICE_HUES[svc.id] ?? hueForService(svc);
}
function toggleInterconsultId(ids, id) {
  if (!SERVICE_BY_ID.has(id)) {
    return [...ids];
  }
  if (ids.includes(id)) {
    return ids.filter((existing) => existing !== id);
  }
  return [...ids, id];
}

export {
  INTERCONSULT_SERVICES,
  REQUESTING_SERVICE_IDS,
  serviceById,
  hueForService,
  hueForRequestingService,
  toggleInterconsultId
};
//# sourceMappingURL=/js/chunks/chunk-RSNFY6IK.js.map
