/** Synthetic Manejo blocks for the medication list old-vs-new tests. No real data. `now` is fixed here. */
export const MED_NOW = new Date(2026, 10, 12, 9, 0, 0);
export const MED_PATIENT = 'p1';

const iv = { viaRaw: 'VIA INTRAVENOSA', dosisRaw: '1 G //', frecuenciaRaw: 'CADA 24 HORAS' };
const vo = { viaRaw: 'VIA ORAL', frecuenciaRaw: 'CADA 24 HORAS' };
const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: 'm' + i, nombreRaw: 'FARMACO' + i + ' 10 MG TABLETA', ...vo, dosisRaw: '10 MG //' }));

export const MED_SCENARIOS = {
  // abx with Día chip, SOAP meds with the picker, no-destino med, PRN, suspended, nutrition (skipped)
  mixed: { fechaActualizacion: '11/08/2026', items: [
    { id: 'a', nombreRaw: 'PREGABALINA', dosisRaw: '75MG VO C/24H', ...vo },
    { id: 'b', nombreRaw: 'LINEZOLID', dosisRaw: '600MG VO C/12H', diaTratamiento: 5, ...vo },
    { id: "c'<x>", nombreRaw: 'CEFTRIAXONA 1 G SOL INY', ...iv, diaTratamiento: 2 },
    { id: 'd', nombreRaw: 'FARMACO NUEVO XYZ 100 MG SOL INY', ...iv, dosisRaw: '100 MG //' },
    { id: 'e', nombreRaw: 'LOSARTAN 50 MG COMPRIMIDO', ...vo, dosisRaw: '50 MG //', suspendido: true },
    { id: 'f', nombreRaw: 'PARACETAMOL 1 G SOL INY', ...iv, frecuenciaRaw: 'SI ES NECESARIO' },
    { id: 'g', nombreRaw: 'DIETA NORMAL', ...vo },
  ] },
  // grouped rows: insulin rescate + prandial, potassium repos, insulin IV pump row
  groups: { items: [
    { id: 'r1', nombreRaw: 'INSULINA HUMANA RAPIDA', viaRaw: 'VIA SUBCUTANEA', dosisRaw: '2 UI SI GLUCOSA > 180 MG/DL', frecuenciaRaw: 'CADA 6 HORAS' },
    { id: 'k1', nombreRaw: 'CLORURO DE POTASIO 40 MEQ SOL INY 10 ML', ...iv, dosisRaw: '20 MEQ //' },
    { id: 'i1', nombreRaw: 'INSULINA HUMANA RAPIDA', viaRaw: 'VIA INTRAVENOSA', dosisRaw: '100 UI //', frecuenciaRaw: 'CADA 24 HORAS' },
    { id: 's1', nombreRaw: 'GLUCOSA 5 % SOL INY 250 ML', ...iv, dosisRaw: 'SOLUCION STANFORD 1 //' },
    { id: 'i2', nombreRaw: 'CLORURO DE SODIO 0.9 % SOL INY 100 ML', ...iv, dosisRaw: '100 ML / VEL.INF: BOMBA EN ALGORITMO 2' },
  ] },
  suspendedGroup: { items: [
    { id: 'k1', nombreRaw: 'CLORURO DE POTASIO 40 MEQ SOL INY 10 ML', ...iv, dosisRaw: '20 MEQ //', suspendido: true },
  ] },
  dense: { items: mk(16) },
  roomy: { items: mk(15) },
  onlyNutrition: { items: [{ id: 'g', nombreRaw: 'NUTRICION PARENTERAL', ...vo }] },
};
