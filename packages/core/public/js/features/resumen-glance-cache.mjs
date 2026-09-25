/** Bust Resumen cache when pendientes or eventualidades change. */
export function resumenGlanceCacheSuffix(patient, todos) {
  var ev = patient && patient.eventualidades;
  var evAt = ev && ev.updatedAt ? String(ev.updatedAt) : '';
  var evN = ev && Array.isArray(ev.entries) ? ev.entries.length : 0;
  var open = 0;
  var stamp = '';
  (todos || []).forEach(function (t) {
    if (!t || t.completed) return;
    open += 1;
    var u = String(t.updatedAt || t.id || '');
    if (u > stamp) stamp = u;
  });
  return '|V' + evN + evAt + '|P' + open + stamp;
}
