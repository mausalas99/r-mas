/** Catálogo de infusiones / sedación — copiables en pestaña Manejo → Infusiones. */

export const MANEJO_PROTOCOL_CATEGORIES = [
  { id: 'vasopresores', label: 'Vasopresores' },
  { id: 'cardiovascular', label: 'Cardiovascular' },
  { id: 'sedacion', label: 'Sedación' },
  { id: 'anticonvulsivantes', label: 'Anticonvulsivantes' },
  { id: 'fluidos', label: 'Fluidos / electrolitos' },
  { id: 'analgesia', label: 'Analgesia' },
  { id: 'respiratorio', label: 'Respiratorio' },
  { id: 'hierro', label: 'Hierro / transfusión' },
  { id: 'diureticos-albumina', label: 'Diuréticos / albumina' },
  { id: 'otros', label: 'Otros' },
];

/** @typedef {{
 *   id: string,
 *   category: string,
 *   title: string,
 *   indicationText: string,
 *   calculatorId: string|null,
 *   calculatorParams?: Record<string, unknown>,
 *   copyTemplate: string,
 *   notes: string[],
 *   doseUnitSwitch?: object,
 *   someFields?: object,
 *   isComponentGroup?: boolean,
 *   components?: object[],
 * }} ManejoProtocolEntry */

/** @type {ManejoProtocolEntry[]} */
export const MANEJO_PROTOCOLS = [
  {
    id: 'nore-standard',
    category: 'vasopresores',
    title: 'Noradrenalina (NORE)',
    indicationText:
      '16 mg en 125 cc glucosado 5%. Iniciar 5 mcg/min (HU) o 0.05–0.1 mcg/kg/min (estándar) y titular según PAM ≥65 mmHg.',
    calculatorId: null,
    copyTemplate:
      'NORE: 16 MG EN 125 CC DE GLUCOSADO AL 5%, INICIAR A 5 MCG/MIN Y TITULAR',
    notes: ['Permitir titular', 'Dosis máxima usual: 0.5–1 mcg/kg/min'],
    doseUnitSwitch: {
      perKgRange: [0.05, 0.1],
      maxPerKg: [0.5, 1],
      hu: {
        indicationText:
          '16 mg en 125 cc glucosado 5%. Iniciar 5 mcg/min y titular según PAM ≥65 mmHg.',
        copyTemplate:
          'NORE: 16 MG EN 125 CC DE GLUCOSADO AL 5%, INICIAR A 5 MCG/MIN Y TITULAR',
        someFields: {
          medication: 'NORADRENALINA',
          route: 'IV',
          doseValue: '16',
          doseUnit: 'MG',
          dilution: '125 ML DE GLUCOSADO 5%',
          frequency: 'INFUSIÓN CONTINUA',
          infusionRateMlHr: '5 MCG/MIN',
          comments: 'TITULAR SEGÚN PAM ≥65 MMHG; PERMITIR TITULAR',
        },
      },
      standard: {
        indicationText:
          '16 mg en 125 cc glucosado 5%. Iniciar 0.05–0.1 mcg/kg/min y titular según PAM ≥65 mmHg.',
        copyTemplate:
          'NORE: 16 MG EN 125 CC DE GLUCOSADO AL 5%, INICIAR A 0.05–0.1 MCG/KG/MIN Y TITULAR',
        someFields: {
          medication: 'NORADRENALINA',
          route: 'IV',
          doseValue: '0.05–0.1',
          doseUnit: 'MCG/KG/MIN',
          dilution: '125 ML DE GLUCOSADO 5%',
          frequency: 'INFUSIÓN CONTINUA',
          infusionRateMlHr: '0.05–0.1 MCG/KG/MIN',
          comments:
            'TITULAR SEGÚN PAM ≥65 MMHG; MÁX USUAL 0.5–1 MCG/KG/MIN; PERMITIR TITULAR',
        },
        notes: ['Permitir titular', 'Dosis máxima usual: 0.5–1 mcg/kg/min'],
      },
    },
  },
  {
    id: 'vasopressin-standard',
    category: 'vasopresores',
    title: 'Vasopresina',
    indicationText:
      '20 UI en 100 cc glucosado 5%. Administrar 0.03 UI/min (dosis fija, no titular).',
    calculatorId: null,
    copyTemplate:
      'VASOPRESINA: 20 UI EN 100 CC GLUCOSADO 5%, 0.03 UI/MIN (NO TITULAR)',
    notes: [
      'Agregar si norepinefrina ≥0.25–0.5 mcg/kg/min sin meta de PAM',
      'Dosis fija — no titular',
    ],
  },
  {
    id: 'epinephrine-infusion',
    category: 'vasopresores',
    title: 'Epinefrina',
    indicationText:
      '4 mg en 250 cc glucosado 5%. Iniciar 0.05–0.1 mcg/kg/min (estándar) o titular en mcg/min (HU).',
    calculatorId: null,
    copyTemplate:
      'EPINEFRINA: 4 MG EN 250 CC GLUCOSADO 5%, INICIAR A 0.05–0.1 MCG/KG/MIN Y TITULAR',
    notes: ['Agregar si no se alcanza meta con norepinefrina + vasopresina'],
    doseUnitSwitch: {
      perKgRange: [0.05, 0.1],
      hu: {
        indicationText:
          '4 mg en 250 cc glucosado 5%. Iniciar 5–10 mcg/min y titular según respuesta hemodinámica.',
        copyTemplate:
          'EPINEFRINA: 4 MG EN 250 CC GLUCOSADO 5%, INICIAR A 5–10 MCG/MIN Y TITULAR',
        someFields: {
          medication: 'EPINEFRINA',
          route: 'IV',
          doseValue: '4',
          doseUnit: 'MG',
          dilution: '250 ML DE GLUCOSADO 5%',
          frequency: 'INFUSIÓN CONTINUA',
          infusionRateMlHr: '5–10 MCG/MIN',
          comments: 'PERMITIR TITULAR',
        },
      },
      standard: {
        indicationText:
          '4 mg en 250 cc glucosado 5%. Iniciar 0.05–0.1 mcg/kg/min y titular.',
        copyTemplate:
          'EPINEFRINA: 4 MG EN 250 CC GLUCOSADO 5%, INICIAR A 0.05–0.1 MCG/KG/MIN Y TITULAR',
        someFields: {
          medication: 'EPINEFRINA',
          route: 'IV',
          doseValue: '0.05–0.1',
          doseUnit: 'MCG/KG/MIN',
          dilution: '250 ML DE GLUCOSADO 5%',
          frequency: 'INFUSIÓN CONTINUA',
          infusionRateMlHr: '0.05–0.1 MCG/KG/MIN',
          comments: 'PERMITIR TITULAR',
        },
      },
    },
  },
  {
    id: 'dobutamine-infusion',
    category: 'vasopresores',
    title: 'Dobutamina',
    indicationText:
      '250 mg en 250 cc glucosado 5%. Iniciar 2.5–5 mcg/kg/min y titular hasta 20 mcg/kg/min.',
    calculatorId: null,
    copyTemplate:
      'DOBUTAMINA: 250 MG EN 250 CC GLUCOSADO 5%, INICIAR 2.5–5 MCG/KG/MIN, TITULAR HASTA 20 MCG/KG/MIN',
    notes: ['Permitir titular según respuesta'],
  },
  {
    id: 'nitro-standard',
    category: 'cardiovascular',
    title: 'Nitroglicerina',
    indicationText:
      '50 mg en 250 cc solución salina 0.9%. Iniciar 5–10 mcg/min y titular de 5 en 5 mcg/min.',
    calculatorId: null,
    copyTemplate:
      'NITROGLICERINA: 50 MG EN 250 CC SS0.9%, INICIAR 5–10 MCG/MIN, TITULAR DE 5 EN 5 MCG/MIN',
    notes: ['Permitir titular', 'Meta habitual: PAM <140/90 mmHg en IAM'],
  },
  {
    id: 'nitro-sublingual-eap',
    category: 'cardiovascular',
    title: 'Nitroglicerina — sublingual',
    indicationText:
      '0.4 mg sublingual c/5 min × 3 dosis. Si persiste disnea o congestión → infusión IV titulada.',
    calculatorId: null,
    copyTemplate: 'NITROGLICERINA: 0.4 MG SL C/5 MIN × 3',
    notes: ['Verificar PAS antes de cada dosis', 'Preparar infusión IV si no responde'],
  },
  {
    id: 'nitro-iam',
    category: 'cardiovascular',
    title: 'IAM — nitroglicerina',
    indicationText:
      '50 mg en 250 cc fisiológico. Iniciar 10–20 mcg/min; titular cada 5–10 min (incrementos de 10 mcg/min) hasta mejoría o PAM <90 mmHg.',
    calculatorId: null,
    copyTemplate:
      'IAM NITRO: 50 MG EN 250 CC SS0.9%, 10–20 MCG/MIN, TITULAR CADA 5–10 MIN',
    notes: ['Meta presión arterial <140/90 mmHg', 'Suspender si PAM <90 mmHg'],
  },
  {
    id: 'amiodarone-load',
    category: 'cardiovascular',
    title: 'Amiodarona — impregnación',
    indicationText: '150 mg en 100 cc glucosado 5%. Pasar en 10 minutos.',
    calculatorId: null,
    copyTemplate: 'AMIODARONA IMPREGNACIÓN: 150 MG EN 100 CC G5%, PASAR EN 10 MIN',
    notes: ['Monitorizar TA y FC durante bolus'],
  },
  {
    id: 'amiodarone-infusion',
    category: 'cardiovascular',
    title: 'Amiodarona — infusión',
    indicationText:
      '900 mg en 250 cc glucosado 5%. 1 mg/min × 6 h (15 cc/h), luego 0.5 mg/min × 18 h (7.5 cc/h).',
    calculatorId: null,
    copyTemplate:
      'AMIODARONA: 900 MG EN 250 CC G5%, 1 MG/MIN 6 H (15 CC/H), LUEGO 0.5 MG/MIN 18 H (7.5 CC/H)',
    notes: ['Vigilar función tiroidea y pulmonar con uso prolongado'],
  },
  {
    id: 'midazolam-infusion',
    category: 'sedacion',
    title: 'Midazolam',
    indicationText:
      '50 mg en 100 cc SS 0.9% (0.5 mg/ml). 0.02–0.1 mg/kg/h (20–100 mcg/kg/h) y titular.',
    calculatorId: 'sedation-mg-kg-h',
    calculatorParams: { drug: 'midazolam' },
    copyTemplate: 'MIDAZOLAM: 50 MG EN 100 CC SS0.9%, 0.02–0.1 MG/KG/H — PERMITIR TITULAR',
    notes: ['Permitir titular', 'Rango 0.02–0.1 mg/kg/h'],
  },
  {
    id: 'propofol-infusion',
    category: 'sedacion',
    title: 'Propofol',
    indicationText:
      'No diluir (1% = 10 mg/ml). Iniciar 5–20 mcg/kg/min y titular. Máx 4 mg/kg/h (síndrome de infusión).',
    calculatorId: 'sedation-mg-kg-h',
    calculatorParams: { drug: 'propofol' },
    copyTemplate: 'PROPOFOL: NO DILUIR, 5–20 MCG/KG/MIN, PERMITIR TITULAR',
    notes: ['No diluir', 'Permitir titular', 'Máx 4 mg/kg/h'],
  },
  {
    id: 'dexmed-infusion',
    category: 'sedacion',
    title: 'Dexmedetomidina',
    indicationText: '200 mcg en 100 cc SS 0.9%. 0.2–0.7 mcg/kg/h (hasta 1.4 mcg/kg/h).',
    calculatorId: 'sedation-mg-kg-h',
    calculatorParams: { drug: 'dexmed' },
    copyTemplate: 'DEXMEDETOMIDINA: 200 MCG EN 100 CC SS0.9%, 0.2–0.7 MCG/KG/H',
    notes: ['Permitir titular', 'IOT: considerar 0.5 mcg/kg/h'],
  },
  {
    id: 'sedation-iot-bundle',
    category: 'sedacion',
    title: 'Sedación IOT (bundle)',
    indicationText:
      'Midazolam 0.1 mg/kg/h + propofol 40 mcg/kg/min + dexmedetomidina 0.5 mcg/kg/h. Permitir titular cada componente.',
    calculatorId: null,
    copyTemplate:
      'SEDACIÓN IOT: MIDAZOLAM 0.1 MG/KG/H + PROPOFOL 40 MCG/KG/MIN + DEXMED 0.5 MCG/KG/H — PERMITIR TITULAR',
    notes: ['Bundle orientativo; ajustar según hemodinámica y RASS'],
  },
  {
    id: 'midazolam-iot-01',
    category: 'sedacion',
    title: 'Midazolam — dosis IOT',
    indicationText: 'En intubación: 0.1 mg/kg/h (ajustar con calculadora por peso).',
    calculatorId: 'sedation-mg-kg-h',
    calculatorParams: { drug: 'midazolam' },
    copyTemplate: 'MIDAZOLAM IOT: 0.1 MG/KG/H — PERMITIR TITULAR',
    notes: ['Componente del bundle IOT'],
  },
  {
    id: 'propofol-iot-40',
    category: 'sedacion',
    title: 'Propofol — dosis IOT',
    indicationText: 'En intubación: 40 mcg/kg/min; no diluir.',
    calculatorId: 'sedation-mg-kg-h',
    calculatorParams: { drug: 'propofol' },
    copyTemplate: 'PROPOFOL IOT: 40 MCG/KG/MIN, NO DILUIR — PERMITIR TITULAR',
    notes: ['Componente del bundle IOT'],
  },
  {
    id: 'dexmed-iot-05',
    category: 'sedacion',
    title: 'Dexmedetomidina — dosis IOT',
    indicationText: 'En intubación: 0.5 mcg/kg/h.',
    calculatorId: 'sedation-mg-kg-h',
    calculatorParams: { drug: 'dexmed' },
    copyTemplate: 'DEXMED IOT: 0.5 MCG/KG/H — PERMITIR TITULAR',
    notes: ['Componente del bundle IOT'],
  },
  {
    id: 'levetiracetam-load',
    category: 'anticonvulsivantes',
    title: 'Levetiracetam — impregnación',
    indicationText: '60 mg/kg diluido en 100 cc SS 0.9%; pasar en 15 minutos.',
    calculatorId: 'levetiracetam-load',
    copyTemplate: 'LEVETIRACETAM IMPREGNACIÓN 60 MG/KG EN 100 CC SS0.9%, 15 MIN',
    notes: ['Verificar función renal en dosis de mantenimiento'],
  },
  {
    id: 'levetiracetam-maint',
    category: 'anticonvulsivantes',
    title: 'Levetiracetam — mantenimiento',
    indicationText:
      '500–1500 mg IV cada 12 h (sin diluir o diluir en 100 cc SS 0.9% para 15 min).',
    calculatorId: null,
    copyTemplate: 'LEVETIRACETAM: 500–1500 MG IV C/12 H (15 MIN SI SE DILUYE)',
    notes: ['Ajustar según función renal'],
  },
  {
    id: 'phenytoin-load',
    category: 'anticonvulsivantes',
    title: 'Fenitoína — impregnación',
    indicationText:
      '15–20 mg/kg diluido en SS 0.9% (máx 50 mg/ml); pasar a ≤50 mg/min con monitoreo cardíaco.',
    calculatorId: null,
    copyTemplate:
      'FENITOÍNA: 15–20 MG/KG EN SS0.9% (MÁX 50 MG/ML), ≤50 MG/MIN CON MONITOR',
    notes: ['Monitor cardíaco continuo durante infusión'],
  },
  {
    id: 'bic-hu-balanceada',
    category: 'fluidos',
    title: 'Balanceada HU (bicarbonato)',
    indicationText:
      'Fórmula: (24 − bic px) × peso × 0.3 / 8.5 mEq total; fraccionar en bolo, 4 h diluido e infusión 24 h.',
    calculatorId: 'bic-hu-balanceada',
    copyTemplate: 'BALANCEADA HU — VER CÁLCULO',
    notes: ['Tercios: bolo sin diluir / 4 h diluido / 24 h infusión titular'],
  },
  {
    id: 'bicarb-hyperkalemia',
    category: 'fluidos',
    title: 'Bicarbonato — hiperpotasemia',
    indicationText:
      '50 mEq (1 ampolla 50 ml al 8.4%) diluido en 100 cc glucosado 5%; pasar en 5–10 min (solo si acidosis metabólica severa pH <7.2).',
    calculatorId: null,
    copyTemplate:
      'BICARB HIPERK: 50 MEQ EN 100 CC G5%, 5–10 MIN (SI ACIDOSIS pH <7.2)',
    notes: ['Solo si acidosis metabólica severa', 'Parte del manejo de hiperpotasemia'],
  },
  {
    id: 'mg-infusion-slow',
    category: 'fluidos',
    title: 'Magnesio sulfato — infusión',
    indicationText: '4–8 g en 500 cc SS 0.9%; pasar en 12–24 h. Repetir hasta Mg >1 mg/dl.',
    calculatorId: null,
    copyTemplate: 'MAGNESIO: 4–8 G EN 500 CC SS0.9%, INFUSIÓN 12–24 H',
    notes: ['Vigilar reflejos y función renal'],
  },
  {
    id: 'mg-bolus-2g',
    category: 'fluidos',
    title: 'Magnesio — bolo urgente',
    indicationText: '2 g (4 ml al 50%) en 100 cc SS 0.9%; pasar en 15–30 min.',
    calculatorId: null,
    copyTemplate: 'MAGNESIO BOLO: 2 G EN 100 CC SS0.9%, 15–30 MIN',
    notes: ['Indicado en hipomagnesemia sintomática o arritmias'],
  },
  {
    id: 'ca-gluconate-bolus',
    category: 'fluidos',
    title: 'Gluconato de calcio — bolo',
    indicationText:
      '1–2 g (10–20 ml al 10%) en 50 cc glucosado 5%; pasar en 10–20 min. Indicado en hiperpotasemia con cambios ECG o K+ ≥6.5.',
    calculatorId: null,
    copyTemplate: 'CA GLUCONATO BOLO: 1–2 G EN 50 CC G5%, 10–20 MIN',
    notes: ['Monitorizar ECG', 'Estabilización de membrana en hiperpotasemia'],
  },
  {
    id: 'ca-gluconate-infusion',
    category: 'fluidos',
    title: 'Gluconato de calcio — infusión',
    indicationText: '10 g en 1000 cc glucosado 5%; velocidad 50 cc/h (0.5 g/h).',
    calculatorId: null,
    copyTemplate: 'CA GLUCONATO INFUSIÓN: 10 G EN 1000 CC G5% A 50 CC/H',
    notes: ['Valorar calcio iónico seriado'],
  },
  {
    id: 'hypertonic-saline',
    category: 'fluidos',
    title: 'Solución hipertónica',
    indicationText:
      '250 cc SS 0.9% + 3 ampollas NaCl 17.7%; pasar 100 cc en 20 min (o 3 cc/kg si se usa regla por peso).',
    calculatorId: 'hypertonic-volume',
    copyTemplate: 'HIPERTÓNICA: 250 CC SS0.9% + 3 AMP NaCl 17.7%, 100 CC EN 20 MIN',
    notes: ['Hiponatremia sintomática severa', 'Usar regla 3 cc/kg solo si protocolo lo indica'],
  },
  {
    id: 'bicarb-capsules',
    category: 'fluidos',
    title: 'Bicarbonato oral (cápsulas)',
    indicationText: '500 mg–1 g vía oral cada 12–8 h según acidosis.',
    calculatorId: null,
    copyTemplate: 'BICARB CÁPSULAS: 500 MG–1 G VO C/12–8 H',
    notes: ['No sustituye manejo de causa de acidosis'],
  },
  {
    id: 'buprenorphine-infusion',
    category: 'analgesia',
    title: 'Buprenorfina',
    indicationText: '900 mcg en 100 cc SS 0.9%; administrar 4 cc/h (36 mcg/h) y titular.',
    calculatorId: null,
    copyTemplate: 'BUPRENORFINA: 900 MCG EN 100 CC A 4 CC/H (36 MCG/H)',
    notes: ['Riesgo de depresión respiratoria con sedantes'],
  },
  {
    id: 'fentanyl-infusion',
    category: 'analgesia',
    title: 'Fentanilo',
    indicationText:
      '1000 mcg (1 mg) en 100 cc SS 0.9%; iniciar 25–50 mcg/h (2.5–5 cc/h) y titular.',
    calculatorId: null,
    copyTemplate: 'FENTANILO: 1000 MCG EN 100 CC SS0.9%, 25–50 MCG/H (2.5–5 CC/H)',
    notes: ['Permitir titular', 'Vigilar depresión respiratoria'],
  },
  {
    id: 'morphine-eap-bolus',
    category: 'analgesia',
    title: 'Morfina — bolo IV',
    indicationText:
      '2–4 mg IV lento (2–4 min); repetir c/5–15 min según ansiedad o disnea. Usar con precaución.',
    calculatorId: null,
    copyTemplate: 'MORFINA: 2–4 MG IV LENTO (2–4 MIN)',
    notes: ['Precaución si hipotensión o bradicardia', 'Preferir fentanilo si inestabilidad hemodinámica'],
  },
  {
    id: 'salbutamol-nebul',
    category: 'respiratorio',
    title: 'Salbutamol nebulizado',
    indicationText:
      '2.5–5 mg (0.5–1 ml al 0.5%) en 3–5 ml SS 0.9%; nebulizar cada 4–6 h.',
    calculatorId: null,
    copyTemplate: 'SALBUTAMOL: 2.5–5 MG EN 3–5 CC SS0.9% NEBUL C/4–6 H',
    notes: ['Monitorizar FC y K⁺ con uso repetido'],
  },
  {
    id: 'carboxymaltose-iron',
    category: 'hierro',
    title: 'Carboximaltosa férrica',
    indicationText:
      '500 mg en 250 cc SS 0.9%; infundir en 30 min (primeros 10 min a goteo lento). Premedicación: paracetamol 1 g + clorfenamina 10 mg IV.',
    calculatorId: null,
    copyTemplate:
      'CARBOXIMALTOSA: 500 MG EN 250 CC SS0.9% 30 MIN + PARACETAMOL 1 G + CLORFENAMINA 10 MG IV',
    notes: ['Observar reacciones infusionales'],
  },
  {
    id: 'venofer-dose',
    category: 'hierro',
    title: 'Venofer (sacarato férrico)',
    indicationText: '100–200 mg en 100–200 cc SS 0.9%; pasar en 15–30 min.',
    calculatorId: null,
    copyTemplate: 'VENOFER: 100–200 MG EN 100–200 CC SS0.9%, 15–30 MIN',
    notes: ['No mezclar con otros electrolitos en misma línea'],
  },
  {
    id: 'platelets-volume',
    category: 'hierro',
    title: 'Plaquetas',
    indicationText: '10–20 cc por litro de sangre del paciente (ajustar a meta plaquetaria).',
    calculatorId: null,
    copyTemplate: 'PLAQUETAS: 10–20 CC/L DE SANGRE DEL PACIENTE',
    notes: ['Confirmar tipo y compatibilidad en banco'],
  },
  {
    id: 'furo-infusion',
    category: 'diureticos-albumina',
    title: 'Furosemida infusión',
    indicationText: '360 mg en 100 cc SS 0.9%; velocidad 4 cc/h (14.4 mg/h).',
    calculatorId: null,
    copyTemplate: 'FUROSEMIDA: 360 MG EN 100 CC SS0.9% A 4 CC/H (14.4 MG/H)',
    notes: ['Vigilar electrolitos y diuresis'],
  },
  {
    id: 'furo-bolus',
    category: 'diureticos-albumina',
    title: 'Furosemida — bolo IV',
    indicationText: '20–80 mg IV directo lento (2–4 min); repetir según respuesta diurética.',
    calculatorId: null,
    copyTemplate: 'FUROSEMIDA: 20–80 MG IV BOLO LENTO (2–4 MIN)',
    notes: ['Escalar a infusión si oligoanuria persistente'],
  },
  {
    id: 'insulin-cad-01',
    category: 'fluidos',
    title: 'Insulina regular — 0.1 U/kg/h',
    indicationText:
      'CAD: 100 UI en 100 cc SS 0.9% (1 UI/ml). Infusión 0.1 U/kg/h; meta descenso glucosa 50–75 mg/dl/h.',
    calculatorId: 'insulin-u-kg-h',
    calculatorParams: { unitsPerKgPerHour: 0.1 },
    copyTemplate: 'INSULINA REGULAR 0.1 U/KG/H EN 100 CC SS0.9%',
    notes: ['Si glucosa no baja ~50 mg/dL/h → +1 U/h', 'Al 250 mg/dL → 0.05 U/kg/h'],
  },
  {
    id: 'insulin-cad-005',
    category: 'fluidos',
    title: 'Insulina regular — 0.05 U/kg/h',
    indicationText: 'CAD: cuando glucosa ~250 mg/dL; 0.05 U/kg/h y agregar dextrosa a fluidos.',
    calculatorId: 'insulin-u-kg-h',
    calculatorParams: { unitsPerKgPerHour: 0.05 },
    copyTemplate: 'INSULINA REGULAR 0.05 U/KG/H',
    notes: ['Agregar dextrosa a solución de mantenimiento'],
  },
  {
    id: 'insulin-ehh-014',
    category: 'fluidos',
    title: 'Insulina regular — 0.14 U/kg/h',
    indicationText: 'EHH: tras rehidratación parcial; 0.14 U/kg/h sin bolo hasta glucosa < 300 mg/dL.',
    calculatorId: 'insulin-u-kg-h',
    calculatorParams: { unitsPerKgPerHour: 0.14 },
    copyTemplate: 'INSULINA REGULAR 0.14 U/KG/H (EHH)',
    notes: ['Sin bolo en EHH según protocolo ADA orientativo'],
  },
  {
    id: 'albumin-paracentesis',
    category: 'diureticos-albumina',
    title: 'Albumina post-paracentesis',
    indicationText:
      '8 g de albumina por cada litro drenado si >5 litros (ej. 12 L → 96 g ≈ 10 ampollas 20%).',
    calculatorId: 'albumin-paracentesis',
    copyTemplate: 'ALBUMINA POST-PARACENTESIS — VER CÁLCULO',
    notes: ['Ampollas 20% ≈ 10 g por ampolla de 50 ml'],
  },
  {
    id: 'stanford-solution',
    category: 'otros',
    title: 'Solución Stanford',
    indicationText:
      'Enjuagues 20 ml cada 8 h antes de alimentos (escupir). Copia cada componente por separado para SOME.',
    calculatorId: null,
    copyTemplate: 'ENJUAGUE STANFORD: 20 ML C/8H ANTES DE ALIMENTOS',
    notes: ['Mezcla oral institucional — volcar componentes en SOME uno por uno'],
    isComponentGroup: true,
    components: [
      {
        id: 'stanford-nystatin',
        label: 'Nistatina',
        someText: 'NISTATINA 100.000 UI 10 ML',
      },
      {
        id: 'stanford-al-mag',
        label: 'Hidróxido Al/Mg',
        someText: '200 ML HIDRÓXIDO DE ALUMINIO/MAGNESIO',
      },
      {
        id: 'stanford-diphen',
        label: 'Difenhidramina jarabe',
        someText: '250 ML DIFENHIDRAMINA JARABE',
      },
      {
        id: 'stanford-dexa',
        label: 'Dexametasona',
        someText: 'DEXAMETASONA 4 MG (1 ML DE 4 MG/ML)',
      },
      {
        id: 'stanford-doxy',
        label: 'Doxiciclina',
        someText: 'DOXICICLINA 300 MG',
      },
      {
        id: 'stanford-rinse',
        label: 'Indicación de enjuague',
        someText: 'ENJUAGUE 20 ML C/8H ANTES DE ALIMENTOS, ESCUPIR',
      },
    ],
  },
];
