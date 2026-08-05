// lib/clinical-salas.mjs
var CLINICAL_SALA_VALUES = [
  "Sala 1",
  "Sala 2",
  "Sala E",
  "Torre HU",
  "\xC1rea A/Pensionistas",
  "Interconsultas",
  "UX",
  "Eme"
];
function normalizeSalaKey(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function clinicalServiceForSala(sala) {
  const key = normalizeSalaKey(sala);
  if (key === "torre hu") return "Torre HU";
  if (key === "area a/pensionistas") return "\xC1rea A/Pensionistas";
  if (key === "interconsultas") return "Interconsultas";
  if (key === "ux") return "UX";
  if (key === "eme" || key === "emergencias" || key === "urgent care") return "Eme";
  if (key === "sala 1" || key === "sala 2" || key === "sala e") return "Sala";
  return "";
}
function clinicalSalaUsesAbcOnlyRotation(sala) {
  const mapped = clinicalServiceForSala(sala);
  return mapped !== "" && mapped !== "Sala";
}
function clinicalSalaRoomSlug(sala) {
  const s = String(sala || "").trim();
  if (s === "Sala 1") return "sala-1";
  if (s === "Sala 2") return "sala-2";
  if (s === "Sala E") return "sala-e";
  if (s === "Torre HU") return "torre-hu";
  if (s === "\xC1rea A/Pensionistas") return "area-a-pensionistas";
  if (s === "Interconsultas") return "interconsultas";
  if (s === "UX") return "ux";
  if (s === "Eme") return "eme";
  return "";
}

export {
  CLINICAL_SALA_VALUES,
  clinicalServiceForSala,
  clinicalSalaUsesAbcOnlyRotation,
  clinicalSalaRoomSlug
};
//# sourceMappingURL=/js/chunks/chunk-CRJYUJ23.js.map
