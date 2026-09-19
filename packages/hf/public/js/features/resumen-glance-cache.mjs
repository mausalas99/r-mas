/** Bust Resumen cache when pendientes or eventualidades change. */
export function resumenGlanceCacheSuffix(patient, todos) {
  var cardio = patient && patient.cardio;
  var evList =
    cardio && Array.isArray(cardio.eventualidadesSeguimiento) ? cardio.eventualidadesSeguimiento : [];
  var evN = evList.length;
  // ponytail: JSON length as a cheap change signal — won't catch same-length edits.
  var evAt = evN ? String(JSON.stringify(evList).length) : '';
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
