/**
 * Synthetic SOME report builders for E2E runs. DEMO names and made-up
 * expedientes only: p = { exp, name }, when = SOME "Fecha Registro" text.
 */
import { DEMO_SOME_LAB_REPORT } from '../../public/js/tour-demo-some-lab.mjs';

export const TABLE = 'Estudio\t\tResultado\tUnidades\tValor de Referencia\n';

export function header(p, when) {
  return (
    `Expediente:\t${p.exp}\tSolicitud:\t26${Math.abs(hash(when + p.exp)) % 100000000}\n` +
    `Nombre:\t${p.name}\tFecha Registro:\t${when}\n` +
    'Sexo:\tMASCULINO\tUbicación:\tSERVICIO DEMO\n' +
    'Edad:\t58\tMedico:\tSERVICIO DEMO\n\n'
  );
}

function hash(s) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

/** Full demo report (BH + QS + ESC + PFHs) re-labelled for p at `when`. */
export function fullLabs(p, when) {
  return DEMO_SOME_LAB_REPORT.replace(/9000095-7/g, p.exp)
    .replace('DEMO PÉREZ JUAN', p.name)
    .replace('Apr 11 2026 9:42AM', when);
}

export function gas(p, when, ph) {
  return (
    header(p, when) +
    'GASOMETRIAS\nGASOMETRIA VENOSA PARCIAL\n' + TABLE +
    `PH\t*\t${ph}\t\t7.32 - 7.43\n` +
    'pCO2\tB\t35\tmmHg\t40 - 45\n' +
    'pO2\tA\t60\tmmHg\tN/A\n' +
    'Lactato\tB\t0.7\tmmol/L\t0.9 - 1.9\n' +
    'HCO3\tB\t21.2\tmmol/L\t24.0 - 30.0\n' +
    'EX. BASE\tB\t-3.4\tmmol/L\t-2.0 - 2.0\n' +
    'SAT 02\tA\t90\t%\t0 - 0\n'
  );
}
