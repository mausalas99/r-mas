/**
 * Migrate flat legacy historia fields (ficha, ahf, app, apnp, peea strings)
 * into the nested HistoriaClinicaData shape.
 *
 * @param {object} legacy
 * @returns {object}
 */
export function migrateLegacyHistoriaData(legacy) {
  if (!legacy || typeof legacy !== 'object') return legacy;

  const hasLegacyFlat =
    typeof legacy.ficha === 'string' ||
    typeof legacy.ahf === 'string' ||
    typeof legacy.app === 'string' ||
    typeof legacy.apnp === 'string' ||
    typeof legacy.peea === 'string';

  if (!hasLegacyFlat) return { ...legacy };

  const out = { ...legacy };

  if (typeof legacy.ficha === 'string' && legacy.ficha.trim()) {
    out.identificacion = {
      ...(out.identificacion && typeof out.identificacion === 'object' ? out.identificacion : {}),
      informante: legacy.ficha.trim(),
    };
  }

  if (typeof legacy.app === 'string') {
    out.app = {
      conditions: [],
      descripcionDetallada: legacy.app,
      hospitalizacionesPrevias: '',
      medicamentosActuales: [],
    };
  } else if (!out.app || typeof out.app !== 'object' || Array.isArray(out.app)) {
    out.app = {
      conditions: [],
      descripcionDetallada: '',
      hospitalizacionesPrevias: '',
      medicamentosActuales: [],
    };
  }

  if (typeof legacy.ahf === 'string') {
    out.ahf = {
      conditions: [],
      descripcionDetallada: legacy.ahf,
    };
  } else if (!out.ahf || typeof out.ahf !== 'object' || Array.isArray(out.ahf)) {
    out.ahf = { conditions: [], customConditions: [], entries: [], descripcionDetallada: '' };
  } else {
    if (!Array.isArray(out.ahf.entries)) out.ahf.entries = [];
    if (!Array.isArray(out.ahf.customConditions)) out.ahf.customConditions = [];
    if (!Array.isArray(out.ahf.conditions)) out.ahf.conditions = [];
  }

  if (typeof legacy.apnp === 'string' && legacy.apnp.trim()) {
    out.apnp = {
      ...(out.apnp && typeof out.apnp === 'object' ? out.apnp : {}),
      tabaquismo: legacy.apnp.trim(),
    };
  } else if (!out.apnp || typeof out.apnp !== 'object' || Array.isArray(out.apnp)) {
    out.apnp = {};
  }

  if (typeof legacy.peea === 'string') {
    out.padecimientoActual = legacy.peea;
  }

  delete out.ficha;
  delete out.peea;

  return out;
}
