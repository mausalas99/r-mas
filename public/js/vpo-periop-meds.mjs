/** Reglas orientativas — PDF manejo perioperatorio (keywords en nombre SOME). */

const PERIOP_RULES = [
  { keywords: ['WARFARINA', 'ACENOCUMAROL', 'RIVAROXABAN', 'APIXABAN', 'DABIGATRAN', 'EDOXABAN'], sugerencia: 'SUSPENDER / puente según riesgo trombótico', notaBreve: 'Anticoagulante oral — plan con Hematología o guía institucional' },
  { keywords: ['ENOXAPARINA', 'HEPARINA'], sugerencia: 'Ajustar según indicación y riesgo de sangrado', notaBreve: 'Anticoagulación parenteral' },
  { keywords: ['METFORMINA'], sugerencia: 'SUSPENDER el día de cirugía', notaBreve: 'Riesgo de acidosis láctica perioperatoria' },
  { keywords: ['GLIMEPIRIDA', 'GLIPIZIDA', 'GLIBENCLAMIDA', 'GLICLAZIDA'], sugerencia: 'SUSPENDER el día de cirugía', notaBreve: 'Sulfonilurea — riesgo hipoglucemia' },
  { keywords: ['INSULINA'], sugerencia: 'Esquema perioperatorio con Endocrinología / protocolo de unidad', notaBreve: 'No suspender sin plan de insulinización' },
  { keywords: ['LOSARTAN', 'VALSARTAN', 'LISINOPRIL', 'ENALAPRIL', 'RAMIPRIL', 'IRBESARTAN', 'CANDESARTAN'], sugerencia: 'Usualmente SUSPENDER el día de cirugía', notaBreve: 'IECA/ARA-II — riesgo hipotensión refractaria' },
  { keywords: ['METOPROLOL', 'ATENOLOL', 'BISOPROLOL', 'CARVEDILOL', 'PROPRANOLOL', 'LABETALOL'], sugerencia: 'CONTINUAR', notaBreve: 'Betabloqueador — no suspender (rebote isquémico)' },
  { keywords: ['AMLODIPINO', 'NIFEDIPINO', 'DILTIAZEM', 'VERAPAMIL'], sugerencia: 'CONTINUAR', notaBreve: 'Calcioantagonista' },
  { keywords: ['HIDROCLOROTIAZIDA', 'FUROSEMIDA', 'ESPIRONOLACTONA'], sugerencia: 'Usualmente SUSPENDER el día de cirugía', notaBreve: 'Diurético — valorar volemia' },
  { keywords: ['ATORVASTATINA', 'ROSUVASTATINA', 'SIMVASTATINA', 'PRAVASTATINA'], sugerencia: 'CONTINUAR', notaBreve: 'Estatina' },
  { keywords: ['PREDNISONA', 'DEXAMETASONA', 'METILPREDNISOLONA', 'HIDROCORTISONA'], sugerencia: 'CONTINUAR / estrés-dosis si uso crónico', notaBreve: 'Corticoide' },
  { keywords: ['LEVOTIROXINA'], sugerencia: 'CONTINUAR', notaBreve: 'Tiroxina — tomar con sorbo de agua' },
  { keywords: ['CLONIDINA'], sugerencia: 'CONTINUAR', notaBreve: 'No suspender (HTA rebote)' },
  { keywords: ['TAMSULOSINA', 'DOXAZOSINA', 'PRAZOSINA'], sugerencia: 'CONTINUAR — informar si cirugía oftálmica', notaBreve: 'Alfa-bloqueador' },
];

function normName(s) {
  return String(s || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** @param {string} nombreRaw */
export function suggestPeriopMed(nombreRaw) {
  var n = normName(nombreRaw);
  for (var i = 0; i < PERIOP_RULES.length; i += 1) {
    var rule = PERIOP_RULES[i];
    for (var k = 0; k < rule.keywords.length; k += 1) {
      if (n.includes(rule.keywords[k])) {
        return {
          sugerencia: rule.sugerencia,
          notaEditable: rule.sugerencia + '. ' + rule.notaBreve,
        };
      }
    }
  }
  return {
    sugerencia: 'Revisar manualmente — no en catálogo',
    notaEditable: 'Revisar manualmente según guía perioperatoria.',
  };
}
