import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { procesarLabs, parseBH_ } from './labs.js';

const ROGELIO_MAY15 = `
Expediente:\t1936787-7\tSolicitud:\t2605150542
Nombre:\tROGELIO GONZALEZ ESQUIVEL\tFecha Registro:\tMay 15 2026 11:31AM
HEMATOLOGIA
DIFERENCIAL MANUAL
SEGMENTADOS\tA\n71\n%\t50 - 70
LINFOCITOS\t*\n25\n%\t10 - 50
METAMIELOCITOS\tA\n3\n%\t0 - 0
OBSERVACIONES\t*\nPLAQUETAS DISMINUIDAS ++.
TIEMPO DE PROTROMBINA Y TROMBOPLASTINA
TIEMPO DE PROTROMBINA\tA\n14.20\nSEG.\t10.25 - 13.20
INR\t*\n1.22
TIEMPO DE TROMBOPLASTINA\t*\n30.9\nSEG\t29.1 - 38.4
FIBRINOGENO
FIBRINOGENO\tA\n405\nmg/dL\t150 - 400
FROTIS DE SANGRE PERIFERICA
FROTIS DE SANGRE PERIFERICA\t*\nHIPOCROMIA + .
DIMERO D
DIMERO D\tA\n2227\nng/mL\t0.0 - 500.0
`;

describe('diferencial manual + coagulación SOME', () => {
  it('parseBH_ muestra diferencial (Seg = segmentados) y coag legibles', () => {
    const { visible, extras } = parseBH_(ROGELIO_MAY15);
    assert.match(visible, /^BH:/);
    assert.match(visible, /\bDif\./);
    assert.match(visible, /\bSeg\s+71%\*/);
    assert.match(visible, /\bLin\s+25%/);
    assert.match(visible, /\bMeta\s+3%/);
    assert.match(visible, /\bCoag\./);
    assert.match(visible, /\bTP\s+14\.2/);
    assert.match(visible, /\bFib\s+405/);
    assert.match(visible, /\bDD\s+2227/);
    assert.strictEqual(extras.NeuPct, '71');
    assert.strictEqual(extras.Metamielo, '3');
  });

  it('procesarLabs incluye BH, FROTIS calidad y plaquetas', () => {
    const { resLabs } = procesarLabs(ROGELIO_MAY15);
    const bh = resLabs.find((l) => /^BH:/.test(l) || /^BH\t/.test(l));
    assert.ok(bh, 'línea BH');
    assert.match(bh, /\bSeg\s+71%\*/);
    assert.match(bh, /Fib/);
    assert.match(bh, /DD/);
    const frotis = resLabs.filter((l) => l.startsWith('FROTIS\t')).join('\n');
    assert.ok(frotis.includes('HIPOCROMIA') || frotis.includes('PLAQUETAS DISMINUIDAS'));
  });
});
