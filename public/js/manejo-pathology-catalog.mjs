/** Catálogo de patologías — wiki clínica por rama (machotes UCI / sala). */

export const MANEJO_PATHOLOGY_BRANCHES = [
  { id: 'cardio', label: 'Cardiovascular', hint: 'EAP, TEP, crisis hipertensiva' },
  { id: 'neuro', label: 'Neurología', hint: 'Estado epiléptico, encefalopatía' },
  { id: 'gastro', label: 'Gastroenterología', hint: 'HDA, EH, pancreatitis' },
  { id: 'nefro', label: 'Nefrología', hint: 'K+, Na+, Ca++' },
  { id: 'endo', label: 'Endocrinología', hint: 'CAD, EHH, tormenta tiroidea' },
  { id: 'pulmo', label: 'Neumología', hint: 'EAP, TEP, VNI' },
  { id: 'heme-onc', label: 'Hemato-oncología', hint: 'Neutropenia febril' },
  { id: 'infecc', label: 'Infecciosas', hint: 'Sepsis, shock' },
  { id: 'urgencias', label: 'Urgencias', hint: 'Anafilaxia, emergencias' },
];

/** @typedef {{
 *   id: string,
 *   branch: string,
 *   title: string,
 *   summary: string,
 *   definition?: string,
 *   tags?: string[],
 *   linkedProtocolIds?: string[],
 *   relatedPathologyIds?: string[],
 *   externalTab?: 'atb'|null,
 *   cadEhhMode?: 'cad'|'ehh',
 *   sections: Array<{ id: string, title: string, items: Array<{ type: 'text'|'protocol'|'recommendation', text?: string, protocolId?: string, label?: string, tier?: 'first-line'|'alternative', criteria?: string }> }>,
 *   monitoring?: string[],
 *   notes?: string[],
 * }} ManejoPathologyEntry */

/** @type {ManejoPathologyEntry[]} */
export const MANEJO_PATHOLOGIES = [
  {
    id: 'hyperkalemia-acute',
    branch: 'nefro',
    title: 'Hiperpotasemia aguda',
    summary: 'K+ >6.5 mmol/L o cambios en ECG — estabilizar, redistribuir y eliminar.',
    definition: 'Emergencia electrolítica con riesgo de arritmias ventriculares.',
    tags: ['emergencia', 'electrolitos'],
    linkedProtocolIds: [
      'ca-gluconate-bolus',
      'bicarb-hyperkalemia',
      'salbutamol-nebul',
      'furo-bolus',
    ],
    relatedPathologyIds: ['diabetic-ketoacidosis', 'severe-hypercalcemia'],
    sections: [
      {
        id: 'membrane',
        title: 'Estabilización de membrana cardíaca',
        items: [
          {
            type: 'text',
            text: 'Gluconato de calcio 10%: 10–20 ml (1–2 g) IV en 2–5 min. Repetir en 5 min si persisten cambios en ECG.',
          },
          {
            type: 'protocol',
            protocolId: 'ca-gluconate-bolus',
            label: 'Gluconato de calcio — bolo',
            tier: 'first-line',
            criteria: 'Cambios en ECG o K+ ≥6.5 mmol/L',
          },
        ],
      },
      {
        id: 'shift',
        title: 'Redistribución (shift intracelular)',
        items: [
          {
            type: 'text',
            text: 'Insulina regular 10 UI IV + dextrosa 50% 50 ml (25 g). Salbutamol nebulizado 10–20 mg en 10 min (puede repetir).',
          },
          {
            type: 'text',
            text: 'Bicarbonato 50 mEq IV en 5 min solo si acidosis metabólica severa pH <7.2.',
          },
          {
            type: 'protocol',
            protocolId: 'bicarb-hyperkalemia',
            label: 'Bicarbonato — hiperpotasemia',
            tier: 'alternative',
            criteria: 'Acidosis metabólica severa pH <7.2',
          },
          {
            type: 'protocol',
            protocolId: 'salbutamol-nebul',
            label: 'Salbutamol nebulizado',
            tier: 'first-line',
            criteria: 'Shift intracelular junto con insulina',
          },
        ],
      },
      {
        id: 'elimination',
        title: 'Eliminación de potasio',
        items: [
          {
            type: 'text',
            text: 'Furosemida 40–80 mg IV si función renal preservada y euvolémico. Patiromer o zirconium ciclosilicato si disponibles.',
          },
          {
            type: 'protocol',
            protocolId: 'furo-bolus',
            label: 'Furosemida — bolo',
            tier: 'alternative',
            criteria: 'Función renal preservada y euvolémico',
          },
          {
            type: 'text',
            text: 'Hemodiálisis urgente si K+ refractario, ERC terminal u oliguria/anuria.',
          },
        ],
      },
    ],
    monitoring: [
      'ECG continuo',
      'K+ sérico cada 2–4 h',
      'Glucosa cada 30–60 min × 4 h post-insulina',
    ],
    notes: ['Ajustar según función renal y volumen'],
  },
  {
    id: 'cardiogenic-pulmonary-edema',
    branch: 'cardio',
    title: 'Edema agudo pulmonar cardiogénico',
    summary: 'Disnea, estertores y sobrecarga con función ventricular comprometida.',
    tags: ['emergencia', 'cardio'],
    linkedProtocolIds: [
      'nitro-sublingual-eap',
      'nitro-iam',
      'nitro-standard',
      'furo-bolus',
      'morphine-eap-bolus',
      'dobutamine-infusion',
      'fentanyl-infusion',
      'salbutamol-nebul',
    ],
    relatedPathologyIds: ['hypertensive-emergency', 'pulmonary-embolism'],
    sections: [
      {
        id: 'general',
        title: 'Medidas generales',
        items: [
          { type: 'text', text: 'Oxígeno para SpO2 >90%; posición sentado (Fowler 90°); monitoreo continuo.' },
        ],
      },
      {
        id: 'pharm',
        title: 'Tratamiento farmacológico',
        items: [
          {
            type: 'protocol',
            protocolId: 'nitro-sublingual-eap',
            label: 'Nitroglicerina — sublingual',
            tier: 'first-line',
            criteria: '0.4 mg SL c/5 min × 3 antes de infusión IV',
          },
          {
            type: 'protocol',
            protocolId: 'nitro-iam',
            label: 'Nitroglicerina — infusión IV',
            tier: 'first-line',
            criteria: 'Tras SL o si no responde; PAS ≥90 mmHg',
          },
          {
            type: 'protocol',
            protocolId: 'furo-bolus',
            label: 'Furosemida — bolo',
            tier: 'first-line',
            criteria: 'Sobrecarga hídrica con estertores / edema',
          },
          {
            type: 'protocol',
            protocolId: 'morphine-eap-bolus',
            label: 'Morfina — bolo IV',
            tier: 'alternative',
            criteria: 'Ansiedad severa sin hipotensión — usar con precaución',
          },
          {
            type: 'protocol',
            protocolId: 'fentanyl-infusion',
            label: 'Fentanilo',
            tier: 'alternative',
            criteria: 'Disnea o ansiedad severa — preferible a morfina si inestabilidad',
          },
          {
            type: 'protocol',
            protocolId: 'salbutamol-nebul',
            label: 'Salbutamol nebulizado',
            tier: 'alternative',
            criteria: 'Broncoespasmo o sibilancias concurrentes',
          },
        ],
      },
      {
        id: 'hypotension',
        title: 'Si hipotensión (PAS <90 mmHg)',
        items: [
          { type: 'text', text: 'Suspender nitroglicerina.' },
          {
            type: 'protocol',
            protocolId: 'dobutamine-infusion',
            label: 'Dobutamina',
            tier: 'first-line',
            criteria: 'PAS <90 mmHg con bajo gasto — suspender nitroglicerina',
          },
        ],
      },
      {
        id: 'niv',
        title: 'Ventilación no invasiva',
        items: [
          {
            type: 'text',
            text: 'CPAP o BiPAP si insuficiencia respiratoria persistente (FR >30, SpO2 <90% con O2, trabajo respiratorio).',
          },
        ],
      },
    ],
    monitoring: ['SpO2', 'PAM', 'diuresis', 'lactato si shock'],
  },
  {
    id: 'diabetic-ketoacidosis',
    branch: 'endo',
    title: 'Cetoacidosis diabética (CAD)',
    summary: 'Hiperglucemia con acidosis y cetosis — fluidos, insulina y K+.',
    tags: ['emergencia', 'metabolismo'],
    cadEhhMode: 'cad',
    linkedProtocolIds: ['insulin-cad-01', 'insulin-cad-005', 'bic-hu-balanceada'],
    relatedPathologyIds: ['hyperkalemia-acute', 'hyperosmolar-state'],
    sections: [
      {
        id: 'fluids',
        title: 'Reanimación con líquidos',
        items: [
          {
            type: 'text',
            text: 'NaCl 0.9% 1000 ml primera hora; luego 250–500 ml/h. Al glucosa <250 mg/dl: glucosado 5% + NaCl 0.45% 150–250 ml/h.',
          },
        ],
      },
      {
        id: 'insulin',
        title: 'Insulina',
        items: [
          {
            type: 'text',
            text: 'Bolo 0.1 UI/kg opcional. Infusión 0.1 UI/kg/h (100 UI en 100 cc SS0.9%). Meta descenso 50–75 mg/dl/h.',
          },
          {
            type: 'protocol',
            protocolId: 'insulin-cad-01',
            label: 'Insulina 0.1 U/kg/h',
            tier: 'first-line',
            criteria: 'Inicio estándar tras reponer K+ si <3.3',
          },
          {
            type: 'text',
            text: 'Al glucosa <250 mg/dl: reducir a 0.05 U/kg/h y mantener 150–200 mg/dl hasta resolver acidosis.',
          },
          {
            type: 'protocol',
            protocolId: 'insulin-cad-005',
            label: 'Insulina 0.05 U/kg/h',
            tier: 'alternative',
            criteria: 'Glucosa <250 mg/dl — mantener 150–200 hasta resolver acidosis',
          },
        ],
      },
      {
        id: 'potassium',
        title: 'Potasio',
        items: [
          {
            type: 'text',
            text: 'K <3.3: reponer ANTES de insulina. K 3.3–5.2: 20–30 mEq KCl/L. K >5.2: no agregar inicialmente.',
          },
        ],
      },
      {
        id: 'resolution',
        title: 'Criterios de resolución',
        items: [
          {
            type: 'text',
            text: 'Glucosa <200 mg/dl, HCO3 ≥15, pH >7.3, anion gap <12.',
          },
        ],
      },
    ],
    monitoring: ['Glucosa c/h', 'Gasometría y electrolitos c/2–4 h'],
    notes: ['Checklist ADA integrado arriba — confirmar con protocolos institucionales'],
  },
  {
    id: 'hyperosmolar-state',
    branch: 'endo',
    title: 'Estado hiperosmolar (EHH)',
    summary: 'Hiperglucemia severa sin acidosis significativa — rehidratación e insulina cauta.',
    tags: ['emergencia', 'metabolismo'],
    cadEhhMode: 'ehh',
    linkedProtocolIds: ['insulin-ehh-014'],
    relatedPathologyIds: ['diabetic-ketoacidosis', 'thyroid-storm'],
    sections: [
      {
        id: 'fluids',
        title: 'Rehidratación',
        items: [
          {
            type: 'text',
            text: 'Corregir osmolalidad <3 mOsm/kg/h. NaCl 0.9% o 0.45% según sodio corregido; ~15–20 ml/kg/h inicial.',
          },
        ],
      },
      {
        id: 'insulin',
        title: 'Insulina',
        items: [
          {
            type: 'text',
            text: 'Tras rehidratación parcial: 0.14 U/kg/h sin bolo hasta glucosa <300 mg/dl.',
          },
          {
            type: 'protocol',
            protocolId: 'insulin-ehh-014',
            label: 'Insulina 0.14 U/kg/h (EHH)',
            tier: 'first-line',
            criteria: 'Tras rehidratación parcial; sin bolo',
          },
        ],
      },
    ],
    monitoring: ['Osmolalidad', 'Na corregido', 'Glucosa c/1–2 h'],
    notes: ['Checklist ADA integrado arriba — rehidratación prioritaria'],
  },
  {
    id: 'upper-gi-bleed',
    branch: 'gastro',
    title: 'Hemorragia digestiva alta',
    summary: 'Reanimación, IBP IV y manejo de varices si aplica.',
    tags: ['emergencia', 'sangrado'],
    linkedProtocolIds: ['platelets-volume'],
    relatedPathologyIds: ['hepatic-encephalopathy'],
    sections: [
      {
        id: 'resus',
        title: 'Reanimación',
        items: [
          {
            type: 'text',
            text: '2 accesos 16–18G; cristaloides 500–1000 ml bolo. Meta Hb 7–9 g/dl (restrictiva). Transfundir si Hb <7.',
          },
          {
            type: 'protocol',
            protocolId: 'platelets-volume',
            label: 'Plaquetas (si <50 000)',
            tier: 'alternative',
            criteria: 'Plaquetas <50 000 o sangrado activo con coagulopatía',
          },
        ],
      },
      {
        id: 'ppi',
        title: 'Protección gástrica',
        items: [
          {
            type: 'text',
            text: 'Omeprazol 80 mg bolo → 8 mg/h × 72 h (200 mg en 250 cc a 10 cc/h) o pantoprazol equivalente.',
          },
        ],
      },
      {
        id: 'varices',
        title: 'Si sospecha de varices',
        items: [
          {
            type: 'text',
            text: 'Octreótido 50 mcg bolo → 50 mcg/h × 2–5 días o terlipresina 2 mg c/4 h × 48 h.',
          },
          {
            type: 'text',
            text: 'Ceftriaxona 1 g c/24 h × 7 días. Endoscopia urgente <12 h.',
          },
        ],
      },
      {
        id: 'coag',
        title: 'Coagulopatía',
        items: [
          {
            type: 'text',
            text: 'INR >2.5: vitamina K 10 mg IV. Suspender anticoagulantes/antiagregantes.',
          },
        ],
      },
    ],
    monitoring: ['Hb seriada', 'PA', 'endoscopia'],
  },
  {
    id: 'hypertensive-emergency',
    branch: 'cardio',
    title: 'Crisis hipertensiva',
    summary: 'PAS >180 o PAD >120 con daño agudo a órgano blanco.',
    tags: ['emergencia', 'cardio', 'neuro'],
    linkedProtocolIds: ['nitro-iam', 'nitro-standard', 'furo-bolus', 'amiodarone-load'],
    relatedPathologyIds: ['cardiogenic-pulmonary-edema'],
    sections: [
      {
        id: 'goal',
        title: 'Meta de reducción',
        items: [
          {
            type: 'text',
            text: 'Reducir PAM 10–20% primera hora; ~25% en 2 h (excepto disección: PAS 100–120 en 20 min).',
          },
        ],
      },
      {
        id: 'encephalopathy',
        title: 'Encefalopatía / ACV',
        items: [
          {
            type: 'text',
            text: 'Labetalol 10–20 mg IV bolo → 20–80 mg c/10 min (máx 300 mg) o infusión 2–8 mg/min.',
          },
          { type: 'text', text: 'Alternativa: nicardipino 5 mg/h, titular 2.5 mg/h c/5–15 min (máx 15 mg/h).' },
        ],
      },
      {
        id: 'eap',
        title: 'Edema agudo pulmonar',
        items: [
          {
            type: 'protocol',
            protocolId: 'nitro-iam',
            label: 'Nitroglicerina IV',
            tier: 'first-line',
            criteria: 'EAP hipertensivo o crisis con congestión pulmonar',
          },
          {
            type: 'protocol',
            protocolId: 'furo-bolus',
            label: 'Furosemida',
            tier: 'first-line',
            criteria: 'Sobrecarga hídrica asociada a crisis hipertensiva',
          },
        ],
      },
      {
        id: 'arrhythmia',
        title: 'Arritmia asociada',
        items: [
          {
            type: 'protocol',
            protocolId: 'amiodarone-load',
            label: 'Amiodarona — carga',
            tier: 'alternative',
            criteria: 'Taquiarritmia ventricular o FA rápida con inestabilidad hemodinámica',
          },
        ],
      },
      {
        id: 'dissection',
        title: 'Disección aórtica',
        items: [
          {
            type: 'text',
            text: 'Labetalol IV o esmolol + nitroprusiato. Meta PAS 100–120 mmHg en 20 min.',
          },
        ],
      },
    ],
    monitoring: ['PA continua', 'neurológico', 'ECG'],
  },
  {
    id: 'anaphylaxis',
    branch: 'urgencias',
    title: 'Anafilaxia',
    summary: 'Reacción alérgica sistémica — epinefrina IM de inmediato.',
    tags: ['emergencia', 'alergia'],
    linkedProtocolIds: ['epinephrine-infusion', 'salbutamol-nebul'],
    sections: [
      {
        id: 'immediate',
        title: 'Tratamiento inmediato',
        items: [
          {
            type: 'text',
            text: 'Epinefrina IM 0.3–0.5 mg (1:1000) cara anterolateral del muslo; repetir c/5–15 min.',
          },
          { type: 'text', text: 'O2 8–10 L/min; posición supina con piernas elevadas si hipotensión.' },
        ],
      },
      {
        id: 'fluids',
        title: 'Líquidos',
        items: [{ type: 'text', text: 'NaCl 0.9% 1000–2000 ml IV rápido en adultos.' }],
      },
      {
        id: 'adjunct',
        title: 'Adyuvantes',
        items: [
          {
            type: 'text',
            text: 'Difenhidramina 25–50 mg IV; ranitidina 50 mg o famotidina 20 mg; metilprednisolona 125 mg o hidrocortisona 200 mg.',
          },
          {
            type: 'protocol',
            protocolId: 'salbutamol-nebul',
            label: 'Salbutamol si broncoespasmo',
            tier: 'alternative',
            criteria: 'Sibilancias o broncoespasmo',
          },
        ],
      },
      {
        id: 'refractory',
        title: 'Hipotensión refractaria',
        items: [
          {
            type: 'protocol',
            protocolId: 'epinephrine-infusion',
            label: 'Epinefrina IV en infusión',
            tier: 'alternative',
            criteria: 'Hipotensión refractaria tras IM y líquidos',
          },
        ],
      },
    ],
    monitoring: ['Observación mínimo 4–6 h (reacción bifásica 20%)'],
  },
  {
    id: 'status-epilepticus',
    branch: 'neuro',
    title: 'Estado epiléptico',
    summary: 'Convulsión >5 min o recurrencia sin recuperación — escalonar benzodiacepinas, antiepilépticos e IOT.',
    tags: ['emergencia', 'neuro'],
    linkedProtocolIds: [
      'levetiracetam-load',
      'levetiracetam-maint',
      'phenytoin-load',
      'midazolam-infusion',
      'propofol-infusion',
      'sedation-iot-bundle',
    ],
    sections: [
      {
        id: 'first',
        title: 'Primera línea (0–5 min)',
        items: [
          {
            type: 'text',
            text: 'Lorazepam 0.1 mg/kg IV (4 mg) a 2 mg/min; repetir ×1 a 5 min. Alternativa: diazepam 0.15 mg/kg o midazolam 10 mg IM.',
          },
        ],
      },
      {
        id: 'second',
        title: 'Segunda línea (5–20 min)',
        items: [
          {
            type: 'protocol',
            protocolId: 'phenytoin-load',
            label: 'Fenitoína 20 mg/kg',
            tier: 'first-line',
            criteria: 'Segunda línea tras benzodiacepina',
          },
          {
            type: 'protocol',
            protocolId: 'levetiracetam-load',
            label: 'Levetiracetam 60 mg/kg',
            tier: 'alternative',
            criteria: 'Alternativa a fenitoína o si contraindicación',
          },
          { type: 'text', text: 'Alternativa: ácido valproico 40 mg/kg IV (máx 3000 mg).' },
        ],
      },
      {
        id: 'refractory',
        title: 'Estado epiléptico refractario (>20 min)',
        items: [
          {
            type: 'protocol',
            protocolId: 'sedation-iot-bundle',
            label: 'Sedación IOT (bundle)',
            tier: 'first-line',
            criteria: 'Estado epiléptico refractario >20 min',
          },
          { type: 'text', text: 'Requiere intubación y EEG continuo. Alternativa: pentobarbital.' },
          {
            type: 'protocol',
            protocolId: 'midazolam-infusion',
            label: 'Midazolam en infusión',
            tier: 'alternative',
            criteria: 'Componente del bundle o sedación escalonada pre-IOT',
          },
          {
            type: 'protocol',
            protocolId: 'propofol-infusion',
            label: 'Propofol en infusión',
            tier: 'alternative',
            criteria: 'Alternativa a midazolam en sedación IOT continua',
          },
        ],
      },
    ],
    monitoring: ['EEG', 'gasometría', 'lactato'],
  },
  {
    id: 'pulmonary-embolism',
    branch: 'pulmo',
    title: 'Tromboembolismo pulmonar (TEP) agudo',
    summary: 'Estratificar riesgo; anticoagulación y trombólisis si inestabilidad.',
    tags: ['emergencia', 'trombosis'],
    linkedProtocolIds: ['nore-standard', 'dobutamine-infusion'],
    relatedPathologyIds: ['cardiogenic-pulmonary-edema', 'septic-shock'],
    sections: [
      {
        id: 'risk',
        title: 'Estratificación',
        items: [
          {
            type: 'text',
            text: 'Alto riesgo: PAS <90 >15 min o choque. Intermedio: estable + disfunción VD o biomarcadores. Bajo: estable sin VD/biomarcadores.',
          },
        ],
      },
      {
        id: 'anticoag',
        title: 'Anticoagulación',
        items: [
          {
            type: 'text',
            text: 'HNF: bolo 80 UI/kg (máx 10 000) + 18 UI/kg/h; meta TTPa 1.5–2.5×. HBPM o DOAC si estable.',
          },
        ],
      },
      {
        id: 'lysis',
        title: 'Trombólisis (alto riesgo)',
        items: [
          {
            type: 'text',
            text: 'Alteplase 100 mg en 2 h o dosis reducida 50 mg/2 h. Tenecteplase según peso en bolo.',
          },
        ],
      },
      {
        id: 'support',
        title: 'Soporte',
        items: [
          { type: 'text', text: 'O2 SpO2 >90%; líquidos con precaución (500 ml).' },
          {
            type: 'protocol',
            protocolId: 'nore-standard',
            label: 'Norepinefrina si hipotensión',
            tier: 'first-line',
            criteria: 'PAS <90 mmHg >15 min o choque obstructivo',
          },
          {
            type: 'protocol',
            protocolId: 'dobutamine-infusion',
            label: 'Dobutamina',
            tier: 'alternative',
            criteria: 'Disfunción VD con PAS preservada y bajo gasto',
          },
        ],
      },
    ],
    monitoring: ['Signos vitales post-lisis', 'examen neurológico c/h × 24 h'],
  },
  {
    id: 'febrile-neutropenia',
    branch: 'heme-onc',
    title: 'Neutropenia febril',
    summary: 'T ≥38.3°C y neutrófilos <500 — antibiótico empírico en <1 h.',
    tags: ['infección', 'oncología'],
    linkedProtocolIds: [],
    sections: [
      {
        id: 'definition',
        title: 'Definición y riesgo',
        items: [
          {
            type: 'text',
            text: 'T ≥38.3°C o ≥38°C sostenida >1 h + neutrófilos <500 (o <1000 con descenso esperado a <500). MASCC ≥21: bajo riesgo.',
          },
        ],
      },
      {
        id: 'workup',
        title: 'Evaluación (<1 h)',
        items: [
          {
            type: 'text',
            text: 'Hemocultivos ×2 periféricos + de catéter si aplica; urocultivo; Rx tórax; examen físico completo incl. perianal y cavidad oral.',
          },
        ],
      },
      {
        id: 'high-risk',
        title: 'Alto riesgo — monoterapia empírica',
        items: [
          {
            type: 'text',
            text: 'Cefepime 2 g c/8 h, meropenem 1 g c/8 h o pip/tazo 4.5 g c/6 h. Agregar vancomicina según foco/MRSA. Antifúngico a las 96 h si fiebre persistente.',
          },
        ],
      },
      {
        id: 'low-risk',
        title: 'Bajo riesgo — ambulatorio posible',
        items: [
          {
            type: 'text',
            text: 'Ciprofloxacino 750 mg c/12 h + amoxicilina/clavulanato 875/125 c/12 h (o levofloxacino 750 mg c/24 h + amox/clav). Primera dosis IV, observar 4 h.',
          },
        ],
      },
    ],
    monitoring: ['Cultivos', 'procalcitonina si disponible', 'revaluación 48–72 h'],
    notes: ['Ver pestaña ATB para esquemas detallados y ajuste renal'],
  },
  {
    id: 'thyroid-storm',
    branch: 'endo',
    title: 'Crisis tirotóxica (tormenta tiroidea)',
    summary: 'Descompensación aguda de hipertiroidismo — 5 líneas simultáneas.',
    tags: ['emergencia', 'tiroides'],
    linkedProtocolIds: ['mg-bolus-2g', 'mg-infusion-slow', 'nore-standard'],
    sections: [
      {
        id: 'block-synthesis',
        title: '1. Bloqueo de síntesis',
        items: [
          {
            type: 'text',
            label: 'PTU o metimazol',
            tier: 'first-line',
            criteria: 'Iniciar de inmediato — PTU preferido si embarazo o mixedema',
            text: 'PTU carga 600–1000 mg → 200–250 mg c/4 h (preferido) o metimazol 60–80 mg → 20 mg c/4–6 h.',
          },
        ],
      },
      {
        id: 'block-release',
        title: '2. Bloqueo de liberación (yodo)',
        items: [
          {
            type: 'text',
            label: 'Yodo (Lugol o SSKI)',
            tier: 'first-line',
            criteria: 'Al menos 1 h después del antitiroideo',
            text: 'Lugol 8–10 gotas c/6–8 h o SSKI 5 gotas c/6 h — AL MENOS 1 H DESPUÉS del antitiroideo.',
          },
        ],
      },
      {
        id: 'block-conversion',
        title: '3. Bloqueo T4→T3',
        items: [
          {
            type: 'text',
            label: 'Propranolol IV/VO',
            tier: 'first-line',
            criteria: 'Taquicardia o temblor; alternativa diltiazem/verapamilo si contraindicación',
            text: 'Propranolol 60–80 mg c/4–6 h o 1–2 mg IV lento. Si contraindicación: diltiazem o verapamilo.',
          },
        ],
      },
      {
        id: 'steroids',
        title: '4. Corticosteroides',
        items: [
          {
            type: 'text',
            label: 'Hidrocortisona o dexametasona',
            tier: 'first-line',
            criteria: 'Bloqueo periférico T4→T3 y tratar posible insuficiencia suprarrenal relativa',
            text: 'Hidrocortisona 100 mg c/8 h o dexametasona 2 mg c/6 h.',
          },
        ],
      },
      {
        id: 'support',
        title: '5. Soporte',
        items: [
          {
            type: 'text',
            label: 'Soporte general',
            text: 'Paracetamol (NO AINEs). SS0.9% 250–500 ml/h. Tratar precipitante (infección más común).',
          },
          {
            type: 'protocol',
            protocolId: 'mg-bolus-2g',
            label: 'Magnesio — bolo',
            tier: 'alternative',
            criteria: 'Taquiarritmias, FA rápida o hipomagnesemia',
          },
          {
            type: 'protocol',
            protocolId: 'mg-infusion-slow',
            label: 'Magnesio — infusión lenta',
            tier: 'alternative',
            criteria: 'Reposición prolongada si déficit documentado',
          },
          {
            type: 'protocol',
            protocolId: 'nore-standard',
            label: 'Norepinefrina si shock',
            tier: 'alternative',
            criteria: 'Shock refractario tras rehidratación IV',
          },
        ],
      },
    ],
    monitoring: ['TSH, T4L, T3 c/24–48 h', 'telemetría', 'glucosa c/4–6 h'],
    notes: ['Mortalidad 10–30% incluso con tratamiento'],
  },
  {
    id: 'severe-hyponatremia',
    branch: 'nefro',
    title: 'Hiponatremia severa sintomática',
    summary: 'Na+ <120 mEq/L con síntomas neurológicos — hipertónico urgente con límites estrictos.',
    tags: ['emergencia', 'electrolitos'],
    linkedProtocolIds: ['hypertonic-saline'],
    sections: [
      {
        id: 'urgent',
        title: 'Tratamiento urgente',
        items: [
          {
            type: 'text',
            text: 'NaCl 3%: 100 ml bolo en 10 min; repetir c/10 min hasta mejoría (máx 3 bolos = 300 ml).',
          },
          {
            type: 'protocol',
            protocolId: 'hypertonic-saline',
            label: 'Solución hipertónica',
            tier: 'first-line',
            criteria: 'Convulsión, coma o síntomas neurológicos graves',
          },
        ],
      },
      {
        id: 'limits',
        title: 'Límites de corrección',
        items: [
          {
            type: 'text',
            text: 'Máx +8 mEq/L en 24 h (+6 en alto riesgo: alcoholismo, cirrosis, K+ bajo). Meta inicial +4–6 mEq/L en 4–6 h.',
          },
        ],
      },
      {
        id: 'chronic',
        title: 'Hiponatremia crónica asintomática',
        items: [
          {
            type: 'text',
            text: 'Restricción hídrica 800–1000 ml/día; tratar causa (SIADH, hipotiroidismo). Tolvaptán 15 mg c/24 h en SIADH refractario.',
          },
        ],
      },
    ],
    monitoring: ['Na+ c/2–4 h durante corrección activa'],
  },
  {
    id: 'severe-hypercalcemia',
    branch: 'nefro',
    title: 'Hipercalcemia severa',
    summary: 'Ca++ >14 mg/dl o >12 con síntomas — hidratación, calcitonina y bifosfonatos.',
    tags: ['emergencia', 'metabolismo'],
    linkedProtocolIds: ['furo-bolus'],
    sections: [
      {
        id: 'hydration',
        title: 'Hidratación',
        items: [
          {
            type: 'text',
            text: 'NaCl 0.9% 200–300 ml/h (4–6 L/24 h). Meta diuresis 100–150 ml/h. Vigilar sobrecarga.',
          },
        ],
      },
      {
        id: 'calcitonin',
        title: 'Calcitonina',
        items: [
          {
            type: 'text',
            text: '4 UI/kg IM/SC c/12 h — efecto en 4–6 h, taquifilaxia a 48 h.',
          },
        ],
      },
      {
        id: 'bisphosphonate',
        title: 'Bifosfonatos',
        items: [
          {
            type: 'text',
            text: 'Ácido zoledrónico 4 mg IV en 15 min (preferido) o pamidronato 60–90 mg en 2–4 h.',
          },
        ],
      },
      {
        id: 'adjunct',
        title: 'Medidas adyuvantes',
        items: [
          {
            type: 'protocol',
            protocolId: 'furo-bolus',
            label: 'Furosemida',
            tier: 'alternative',
            criteria: 'Solo si sobrecarga hídrica — no usar de forma rutinaria',
          },
        ],
      },
      {
        id: 'dialysis',
        title: 'Hemodiálisis',
        items: [
          {
            type: 'text',
            text: 'Si Ca++ >18, insuficiencia renal severa o refractario.',
          },
        ],
      },
    ],
    monitoring: ['Ca++ c/24 h', 'función renal', 'ECG'],
    notes: ['Evitar furosemida rutinaria; no usar tiazidas'],
  },
  {
    id: 'hepatic-encephalopathy',
    branch: 'gastro',
    title: 'Encefalopatía hepática aguda',
    summary: 'Confusión en cirrosis — lactulosa, tratar precipitantes, rifaximina.',
    tags: ['hepático', 'neuro'],
    linkedProtocolIds: ['albumin-paracentesis', 'propofol-infusion'],
    relatedPathologyIds: ['upper-gi-bleed'],
    sections: [
      {
        id: 'lactulose',
        title: 'Lactulosa (primera línea)',
        items: [
          {
            type: 'text',
            text: '30 ml c/1–2 h hasta evacuación → 15–30 ml c/6–8 h. Meta 2–3 evacuaciones blandas/día.',
          },
        ],
      },
      {
        id: 'rifaximin',
        title: 'Rifaximina',
        items: [
          { type: 'text', text: '550 mg c/12 h en grados 2–4 o encefalopatía recurrente.' },
        ],
      },
      {
        id: 'precipitants',
        title: 'Precipitantes',
        items: [
          {
            type: 'text',
            text: 'Infección (paracentesis, cultivos), sangrado GI, constipación, deshidratación, benzodiacepinas/opioides, PBE (PMN >250).',
          },
          {
            type: 'protocol',
            protocolId: 'albumin-paracentesis',
            label: 'Albumina post-paracentesis',
            tier: 'first-line',
            criteria: 'Paracentesis >5 L o PBE confirmada',
          },
        ],
      },
      {
        id: 'grade4',
        title: 'Grado 4 / coma',
        items: [
          {
            type: 'text',
            text: 'Intubación; propofol preferido sobre benzodiacepinas.',
          },
          {
            type: 'protocol',
            protocolId: 'propofol-infusion',
            label: 'Propofol',
            tier: 'first-line',
            criteria: 'Grado 4 EH con IOT — preferido sobre benzodiacepinas',
          },
        ],
      },
    ],
    monitoring: ['Grado EH', 'electrolitos', 'amoniaco (limitado)'],
    notes: ['No restringir proteínas: 1.2–1.5 g/kg/día vegetal/láctea'],
  },
  {
    id: 'severe-pancreatitis',
    branch: 'gastro',
    title: 'Pancreatitis aguda severa',
    summary: 'Falla orgánica >48 h — líquidos agresivos, analgesia, nutrición temprana.',
    tags: ['emergencia', 'abdomen'],
    linkedProtocolIds: ['fentanyl-infusion', 'buprenorphine-infusion'],
    sections: [
      {
        id: 'fluids',
        title: 'Reanimación (primeras 24 h)',
        items: [
          {
            type: 'text',
            text: 'Ringer lactato 250–500 ml/h × 12–24 h. Meta diuresis >0.5 ml/kg/h, BUN descendente.',
          },
        ],
      },
      {
        id: 'analgesia',
        title: 'Analgesia',
        items: [
          {
            type: 'text',
            text: 'Opioides IV no contraindicados. Paracetamol 1 g c/6 h. Evitar AINEs.',
          },
          {
            type: 'protocol',
            protocolId: 'fentanyl-infusion',
            label: 'Fentanilo',
            tier: 'first-line',
            criteria: 'Dolor abdominal severo refractario a bolos IV',
          },
          {
            type: 'protocol',
            protocolId: 'buprenorphine-infusion',
            label: 'Buprenorfina',
            tier: 'alternative',
            criteria: 'Alternativa si intolerancia a fentanilo u opioides clásicos',
          },
        ],
      },
      {
        id: 'nutrition',
        title: 'Nutrición',
        items: [
          {
            type: 'text',
            text: 'Vía oral temprana 24–48 h si tolera. Enteral preferida sobre parenteral. No ayuno prolongado.',
          },
        ],
      },
      {
        id: 'abx',
        title: 'Antibióticos',
        items: [{ type: 'text', text: 'NO profilaxis antibiótica rutinaria.' }],
      },
    ],
    monitoring: ['Diuresis', 'lactato', 'SOFA', 'necrosis en TC'],
  },
  {
    id: 'septic-shock',
    branch: 'infecc',
    title: 'Shock séptico',
    summary: 'Sepsis con hipotensión persistente — líquidos, antibióticos tempranos y vasopresores.',
    tags: ['emergencia', 'sepsis'],
    linkedProtocolIds: ['nore-standard', 'vasopressin-standard', 'epinephrine-infusion'],
    relatedPathologyIds: ['pulmonary-embolism', 'febrile-neutropenia'],
    sections: [
      {
        id: 'initial',
        title: 'Reanimación inicial',
        items: [
          {
            type: 'text',
            text: 'Cultivos antes de ATB si no retrasa >45 min. Antibiótico empírico en primera hora. Cristaloides 30 ml/kg si hipotensión/lactato.',
          },
        ],
      },
      {
        id: 'vasopressors',
        title: 'Vasopresores',
        items: [
          {
            type: 'text',
            text: 'Norepinefrina primera línea; meta PAM ≥65 mmHg. Vasopresina 0.03 UI/min fija si NORE ≥0.25–0.5 mcg/kg/min sin meta.',
          },
          {
            type: 'protocol',
            protocolId: 'nore-standard',
            label: 'Noradrenalina (NORE)',
            tier: 'first-line',
            criteria: 'Meta PAM ≥65 mmHg tras cristaloides',
          },
          {
            type: 'protocol',
            protocolId: 'vasopressin-standard',
            label: 'Vasopresina',
            tier: 'alternative',
            criteria: 'NORE ≥0.25–0.5 mcg/kg/min sin alcanzar meta',
          },
          {
            type: 'protocol',
            protocolId: 'epinephrine-infusion',
            label: 'Epinefrina (si refractario)',
            tier: 'alternative',
            criteria: 'Shock refractario a NORE + vasopresina',
          },
        ],
      },
    ],
    monitoring: ['Lactato c/2–4 h', 'diuresis', 'SOFA'],
    notes: ['Ver pestaña ATB para esquema antibiótico', 'Surviving Sepsis 2021/2026'],
  },
];

/** @param {string} branchId */
export function pathologyBranchLabelFor(branchId) {
  var hit = MANEJO_PATHOLOGY_BRANCHES.find(function (b) {
    return b.id === branchId;
  });
  return hit ? hit.label : branchId;
}

/** @param {string} id */
export function findPathologyById(id) {
  if (!id) return null;
  return (
    MANEJO_PATHOLOGIES.find(function (p) {
      return p.id === id;
    }) || null
  );
}

/** @param {ManejoPathologyEntry} entry @param {string} q */
export function pathologyMatchesSearch(entry, q) {
  if (!q) return true;
  var needle = q.toLowerCase();
  var hay =
    entry.title +
    ' ' +
    entry.summary +
    ' ' +
    (entry.definition || '') +
    ' ' +
    (entry.tags || []).join(' ') +
    ' ' +
    pathologyBranchLabelFor(entry.branch);
  return hay.toLowerCase().indexOf(needle) >= 0;
}

/** @param {string} pathologyId @param {ManejoPathologyEntry[]} all */
export function getRelatedPathologies(pathologyId, all) {
  var entry = findPathologyById(pathologyId);
  if (!entry || !entry.relatedPathologyIds) return [];
  return (all || MANEJO_PATHOLOGIES).filter(function (p) {
    return entry.relatedPathologyIds.indexOf(p.id) >= 0;
  });
}

/** Pasos clínicos accionables en secciones (indicaciones + infusiones). */
export function pathologyStepCount(entry) {
  var n = 0;
  (entry.sections || []).forEach(function (sec) {
    (sec.items || []).forEach(function (item) {
      if (item.type === 'protocol' || item.type === 'text' || item.type === 'recommendation') {
        n++;
      }
    });
  });
  return n;
}
