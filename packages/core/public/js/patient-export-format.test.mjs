import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isRPlusPatientExportPayload,
  describePatientImportRejection,
  parsePatientImportJsonText,
  stripJsonBom,
} from './patient-export-format.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('demo-perez.json pasa validación de importación', () => {
  const text = fs.readFileSync(path.join(root, 'public/demo-patients/demo-perez.json'), 'utf8');
  const { payloads } = parsePatientImportJsonText(text);
  assert.equal(payloads.length, 1);
  assert.equal(isRPlusPatientExportPayload(payloads[0]), true);
});

test('stripJsonBom quita el BOM inicial', () => {
  assert.equal(stripJsonBom('\ufeff{}'), '{}');
  assert.equal(stripJsonBom('{}'), '{}');
});

test('describePatientImportRejection para respaldo completo', () => {
  const msg = describePatientImportRejection({ format: 'r-plus-backup', version: 1 });
  assert.match(msg, /copia de seguridad/i);
});
