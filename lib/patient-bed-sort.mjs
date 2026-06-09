/**
 * Numeric bed ordering for census / guardia lists (cuarto + cama).
 * @param {{ cuarto?: string, cama?: string, bed_label?: string, bedLabel?: string, nombre?: string, name?: string }} patient
 */
export function patientBedSortKey(patient) {
  const cuarto = parseInt(String(patient?.cuarto || '').replace(/\D/g, ''), 10);
  const cama = parseInt(String(patient?.cama || '').replace(/\D/g, ''), 10);
  if (Number.isFinite(cuarto)) {
    return cuarto * 1000 + (Number.isFinite(cama) ? cama : 0);
  }
  const bedLabel = String(patient?.bed_label || patient?.bedLabel || '').trim();
  if (bedLabel && bedLabel !== '—') {
    const nums = bedLabel.match(/\d+/g);
    if (nums?.length) {
      const n0 = parseInt(nums[0], 10);
      const n1 = nums.length > 1 ? parseInt(nums[1], 10) : 0;
      if (Number.isFinite(n0)) {
        return n0 * 1000 + (Number.isFinite(n1) ? n1 : 0);
      }
    }
  }
  return 999999;
}

/**
 * @param {Record<string, unknown>} a
 * @param {Record<string, unknown>} b
 */
export function comparePatientsByBed(a, b) {
  const ka = patientBedSortKey(a);
  const kb = patientBedSortKey(b);
  if (ka !== kb) return ka - kb;
  return String(a?.nombre || a?.name || '').localeCompare(String(b?.nombre || b?.name || ''), 'es');
}
