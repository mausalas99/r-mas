import { normalizePendientesJson } from '../../../lib/entrega/entrega-pendientes.mjs';
import { calcVitalsBannerForSpec } from '../../../lib/interno/vitals-banner.mjs';

/** @param {{ last_vitals_check?: string, vitals_frequency?: string, pendientes_json?: string|null }} meta */
export function vitalsBannerForGuardia(meta) {
  const doc = normalizePendientesJson(meta?.pendientes_json);
  return calcVitalsBannerForSpec(
    meta?.last_vitals_check,
    doc.vitalsPlan?.frequency ?? meta?.vitals_frequency
  );
}


