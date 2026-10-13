/**
 * ESC 2022 surgical risk by procedure (Halvorsen, Eur Heart J 2022;43:3826, Table 5).
 * Tier = 30-day cardiovascular death, MI or stroke from the surgery alone: Bajo <1%, Intermedio 1-5%, Alto >5%.
 */
export const ESC_TIER_PCT = { Bajo: '<1%', Intermedio: '1–5%', Alto: '>5%' };

/** @type {Array<{ id: string, label: string, tier: 'Bajo'|'Intermedio'|'Alto' }>} */
export const ESC_PROCEDURES = [
  { id: 'breast', label: 'Mama', tier: 'Bajo' },
  { id: 'dental', label: 'Dental', tier: 'Bajo' },
  { id: 'thyroid', label: 'Endocrina: tiroides', tier: 'Bajo' },
  { id: 'eye', label: 'Oftalmológica', tier: 'Bajo' },
  { id: 'gyn-minor', label: 'Ginecológica menor', tier: 'Bajo' },
  { id: 'ortho-minor', label: 'Ortopédica menor (meniscectomía)', tier: 'Bajo' },
  { id: 'reconstructive', label: 'Reconstructiva', tier: 'Bajo' },
  { id: 'superficial', label: 'Superficial', tier: 'Bajo' },
  { id: 'uro-minor', label: 'Urológica menor (RTU de próstata)', tier: 'Bajo' },
  { id: 'vats-minor', label: 'Resección pulmonar menor por VATS', tier: 'Bajo' },
  { id: 'carotid-asymp', label: 'Carótida asintomática (endarterectomía o stent)', tier: 'Intermedio' },
  { id: 'carotid-cea', label: 'Carótida sintomática (endarterectomía)', tier: 'Intermedio' },
  { id: 'evar', label: 'Reparación endovascular de aneurisma aórtico', tier: 'Intermedio' },
  { id: 'head-neck', label: 'Cabeza o cuello', tier: 'Intermedio' },
  { id: 'intraperitoneal', label: 'Intraperitoneal: esplenectomía, hernia hiatal, colecistectomía', tier: 'Intermedio' },
  { id: 'thoracic-nonmajor', label: 'Intratorácica no mayor', tier: 'Intermedio' },
  { id: 'neuro-ortho-major', label: 'Neurológica u ortopédica mayor (cadera, columna)', tier: 'Intermedio' },
  { id: 'peripheral-angioplasty', label: 'Angioplastia arterial periférica', tier: 'Intermedio' },
  { id: 'renal-transplant', label: 'Trasplante renal', tier: 'Intermedio' },
  { id: 'uro-gyn-major', label: 'Urológica o ginecológica mayor', tier: 'Intermedio' },
  { id: 'adrenal', label: 'Resección suprarrenal', tier: 'Alto' },
  { id: 'aortic-vascular', label: 'Aórtica y vascular mayor', tier: 'Alto' },
  { id: 'carotid-cas', label: 'Carótida sintomática (stent)', tier: 'Alto' },
  { id: 'duodeno-pancreatic', label: 'Duodenopancreática', tier: 'Alto' },
  { id: 'liver-bile', label: 'Resección hepática o de vía biliar', tier: 'Alto' },
  { id: 'esophagectomy', label: 'Esofagectomía', tier: 'Alto' },
  { id: 'limb-revasc-amputation', label: 'Revascularización abierta de miembro inferior por isquemia aguda, o amputación', tier: 'Alto' },
  { id: 'pneumonectomy', label: 'Neumonectomía (VATS o abierta)', tier: 'Alto' },
  { id: 'lung-liver-transplant', label: 'Trasplante de pulmón o hígado', tier: 'Alto' },
  { id: 'perforated-bowel', label: 'Reparación de perforación intestinal', tier: 'Alto' },
  { id: 'cystectomy', label: 'Cistectomía total', tier: 'Alto' },
];

/** @param {string} id */
export function getEscProcedure(id) {
  return ESC_PROCEDURES.find((p) => p.id === id) || null;
}
