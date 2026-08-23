/**
 * `cardio.evaluacionInicial` — single intake record filled once per
 * hospitalization episode (ER/admission), not an array.
 */

export function emptyEvaluacionInicial() {
  return {
    fecha: '',
    motivoConsulta: '',
    antecedentes: '',
    medicamentosPrevios: [],
    historiaIcPrevia: null,
    fenotipoPrevio: '',
    tiempoEvolucion: '',
    ultimaHospitalizacion: '',
    ultimoNtProBnp: null,
    ultimaFevi: null,
    tratamientoPrevio: {
      ieca_ara: null,
      arni: null,
      sglt2: null,
      arm: null,
      bb: null,
      asa: null,
      anticoagulante: '',
    },
    faFlutter: null,
    estrategia: '',
    dispositivoPrevio: null,
    especificar: '',
    fechaImplante: '',
    peea: '',
    exploracion: {
      ta: '',
      fc: null,
      satO2: null,
      pvy: null,
      soplo: null,
      soploNota: '',
      estertores: null,
      estertoresNota: '',
      ascitisHepatomegalia: null,
      edemaMi: '',
      llenadoCapilar: '',
      temperaturaExtremidades: '',
    },
    vexusInicial: {
      grado: '',
      vciMm: null,
      vciColapso: '',
      dopplerHepaticas: '',
      pulsatilidadPorta: '',
      dopplerRenal: '',
    },
    usPulmonar: {
      campos: [
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
        { lineasB: '', derrame: null, consolidacion: null },
      ],
      nota: '',
    },
    rxTorax: {
      hallazgos: [],
      nota: '',
    },
    ecgIngreso: '',
    feviEstimadaInicial: null,
    labsIngreso: {
      na: null,
      k: null,
      mg: null,
      creat: null,
      bun: null,
      fa: null,
      hb: null,
      ntProBnp: null,
      lactato: null,
      bilTotal: null,
      bilDirecta: null,
      bicarbonato: null,
      ph: null,
      troponina: null,
    },
    impresionDiagnostica: '',
    planTerapeutico: '',
    nau2hPostBolo: null,
    gastoUrinario6h: null,
    eventualidades: '',
    residente: '',
  };
}

function mergeSection(defaultsSection, partialSection) {
  if (!partialSection || typeof partialSection !== 'object') return defaultsSection;
  return Object.assign({}, defaultsSection, partialSection);
}

const SECTION_KEYS = ['tratamientoPrevio', 'exploracion', 'vexusInicial', 'labsIngreso'];

/**
 * Merge a partial evaluacionInicial object onto emptyEvaluacionInicial()
 * defaults, per sub-object, without dropping unknown future keys.
 * @param {any} partial
 */
export function normalizeEvaluacionInicial(partial) {
  const defaults = emptyEvaluacionInicial();
  if (!partial || typeof partial !== 'object') return defaults;

  const out = Object.assign({}, defaults, partial);
  for (const key of SECTION_KEYS) {
    out[key] = mergeSection(defaults[key], partial[key]);
  }

  if (partial.usPulmonar && typeof partial.usPulmonar === 'object') {
    const camposIn = Array.isArray(partial.usPulmonar.campos)
      ? partial.usPulmonar.campos
      : defaults.usPulmonar.campos;
    out.usPulmonar = {
      campos: defaults.usPulmonar.campos.map((defaultCampo, i) =>
        Object.assign({}, defaultCampo, camposIn[i] || {}),
      ),
      nota:
        typeof partial.usPulmonar.nota === 'string'
          ? partial.usPulmonar.nota
          : defaults.usPulmonar.nota,
    };
  } else {
    out.usPulmonar = defaults.usPulmonar;
  }

  if (partial.rxTorax && typeof partial.rxTorax === 'object') {
    out.rxTorax = {
      hallazgos: Array.isArray(partial.rxTorax.hallazgos)
        ? partial.rxTorax.hallazgos
        : defaults.rxTorax.hallazgos,
      nota: typeof partial.rxTorax.nota === 'string' ? partial.rxTorax.nota : defaults.rxTorax.nota,
    };
  } else {
    out.rxTorax = defaults.rxTorax;
  }

  out.medicamentosPrevios = Array.isArray(partial.medicamentosPrevios)
    ? partial.medicamentosPrevios
    : defaults.medicamentosPrevios;

  return out;
}
