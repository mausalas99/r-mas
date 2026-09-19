/**
 * `cardio.rondasByDay` — daily inpatient round fields not already covered by
 * `pocusByDay` (congestion.mjs), `descongestion.mjs`, or `balance-historico.mjs`.
 */

export function emptyRondaEntry() {
  return {
    date: '',
    ta: '',
    fc: null,
    satO2: null,
    o2Sup: '',
    pesoActual: null,
    diuresis6h: null,
    diuresis24h: null,
    estertoresDerrame: '',
    plan: '',
    eventos: '',
    sixMwt: null,
    comorbilidadNota: '',
  };
}
