/** Fecha aproximada desde id numérico (timestamp al guardar el set). Leaf module — no feature imports. */

export function formatDMYDate(d) {
  if (!d || isNaN(d.getTime())) return '';
  return (
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear()
  );
}

export function inferFechaLabSetFromId(set) {
  if (!set || set.fecha === 'Anterior') return '';
  var id = String(set.id || '');
  if (!/^\d{10,}$/.test(id)) return '';
  var ms = parseInt(id, 10);
  if (id.length === 10) ms *= 1000;
  return formatDMYDate(new Date(ms));
}

/** A stored fecha reads as a date («05/11/2026», «5/11», «Nov 5 2026») or is «Anterior». Old imports saved a lab row there. */
export function isValidLabFecha(fecha) {
  var t = String(fecha || '').trim();
  return !t || t === 'Anterior' || /^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?$/.test(t) || /^[A-Za-z]{3}\w*\s+\d{1,2}\s+\d{4}$/.test(t);
}

/** Good fecha for a set whose fecha is bad: from its id, then updatedAt, else «Anterior». */
export function repairedLabFecha(set) {
  return inferFechaLabSetFromId(set) || (set.updatedAt ? formatDMYDate(new Date(set.updatedAt)) : '') || 'Anterior';
}
