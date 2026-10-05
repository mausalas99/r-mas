// Makes the Nube crypto parity fixture. Run with Electron's Node (or Node 22):
//   ELECTRON_RUN_AS_NODE=1 <Electron binary> make-nube-fixtures.mjs
// Writes nube-fixtures.json: a synthetic Nube password, room salt, wrapped room key and
// sample `{enc:1,iv,ct}` values made by the desktop cloud-sync crypto. Swift (Mac T9, iOS)
// must derive the same wrap key, unwrap the same key and open the same values.
// Output is byte-stable: IVs come from a counter, not from random bytes.
import { pbkdf2Sync } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = resolve(here, '../../../../packages/core/public/js/features/cloud-sync');
let n = 0;
globalThis.crypto.getRandomValues = (a) => { for (let i = 0; i < a.length; i += 1) a[i] = (n++ * 7 + 3) & 255; return a; };
const c = await import(join(dir, 'crypto.mjs'));
const w = await import(join(dir, 'cloud-sync-crypto-wire.mjs'));

const b64 = (b) => Buffer.from(b).toString('base64');
const password = 'sala-demo-2026';
const saltB64 = c.generateWrapSalt();
const dekRaw = Uint8Array.from({ length: 32 }, (_, i) => 255 - i);
const dek = await c.importDekRaw(b64(dekRaw));
const wrapKey = await c.deriveWrapKey(password, saltB64);
const wrapped = await c.wrapDek(dek, wrapKey);
const roundTrip = await c.exportDekRaw(await c.unwrapDek(wrapped, wrapKey));
if (roundTrip !== b64(dekRaw)) throw new Error('unwrap mismatch');

const monitoreo = {
  vitals: { tas: 130, tad: 80, fc: 94, fr: 22, temp: 37, sat: 96 },
  alteredAt: { tas: '2026-10-05T08:00:00.000Z' },
  glucometrias: [{ value: 144, time: '08:00' }, { value: 98, time: '14:00' }],
  io: { ing: 200, egr: 100, evac: 'NO' },
  historial: [{ at: '2026-10-05T06:00:00.000Z', vitals: { tas: 118, tad: 76 }, io: { ing: 500, egr: 450, evac: 'SÍ' } }],
};
const plains = {
  number: 42,
  text: 'Paciente estable, sin ñ ni acentos perdidos: José Núñez ✓',
  nullValue: null,
  list: ['I10', 'E11.9'],
  monitoreo,
};
const values = {};
for (const [name, plain] of Object.entries(plains)) values[name] = { plain, envelope: await c.encryptValue(dek, plain) };

const fieldsPlain = { nombre: 'Generico Casobl', cama: '12', registro: '1234567', diagnosticosList: ['HAS'], diagnosticosText: 'HAS, DM2' };
const ops = await w.encryptOpsForPush(dek, [
  { path: 'entries/p1/monitoreo', value: monitoreo },
  { path: 'entries/p1/fields', value: fieldsPlain },
]);

writeFileSync(join(here, 'nube-fixtures.json'), JSON.stringify({
  method: 'PBKDF2-HMAC-SHA256, 210000 iterations, 32-byte key, password = Nube password (UTF-8), salt = base64 room salt',
  password,
  saltB64,
  wrapKeyHex: pbkdf2Sync(password, Buffer.from(saltB64, 'base64'), 210_000, 32, 'sha256').toString('hex'),
  dekB64: b64(dekRaw),
  wrapped,
  values,
  ops: { plain: { monitoreo, fields: fieldsPlain }, encrypted: ops },
}, null, 1) + '\n');
console.log('ok');
