/**
 * `cardio.device` — implantable device (TRC/DAI/marcapasos) indication and
 * implant tracking.
 */

export function emptyDevice() {
  return {
    tieneIndicacion: null,
    indicacion: '',
    indicacionNota: '',
    colocado: null,
    tipo: '',
    fechaColocacion: '',
    fechaUltimaRevision: '',
    parametros: '',
  };
}

/**
 * Merge a partial device object onto emptyDevice() defaults.
 * @param {any} partial
 */
export function normalizeDevice(partial) {
  const defaults = emptyDevice();
  if (!partial || typeof partial !== 'object') return defaults;
  return Object.assign({}, defaults, partial);
}
