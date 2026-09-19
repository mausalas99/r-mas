/**
 * `cardio.workup` — HF etiological/comorbidity workup checklist, grouped by
 * subsystem. Each sub-object is a small set of select/tri-state/free fields
 * pre-tagged by the Part C plan.
 */

export function emptyWorkup() {
  return {
    hierro: {
      estadoEstudio: '',
      ferritina: null,
      satTransferrina: null,
      deficienciaHierro: null,
      tratamiento: '',
    },
    tiroideo: {
      estadoEstudio: '',
      tsh: null,
      t4l: null,
      alteracion: null,
    },
    proteinuria: {
      estadoEstudio: '',
      relacionProtCr: null,
      microalbuminuria: null,
    },
    amiloidosis: {
      sospecha: null,
      estadoEstudio: '',
      perugini: '',
      biopsiaConfirmada: null,
    },
    infiltracion: {
      sospecha: null,
      estadoEstudio: '',
      nota: '',
    },
    coronaria: {
      estado: '',
      metodo: '',
      fecha: '',
      hallazgos: '',
    },
    fa: {
      presente: null,
      estrategia: '',
      cha2ds2vasc: '',
      hasbled: '',
      anticoagulante: '',
    },
    sueno: {
      trastorno: '',
      stopbang: '',
      tratamiento: '',
    },
    valvular: {
      lesion: '',
      severidad: '',
      nota: '',
    },
  };
}

