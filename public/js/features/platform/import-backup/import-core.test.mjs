import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// See public/js/features/med-pharm-profile-modals.test.mjs for why this suite
// checks the source directly: `npm run test:one` runs through Electron's Node
// runtime with no `document`, so the workbench confirm scrim can't be mounted
// here. We instead assert the destructive confirm is requested with the right
// copy, and that the import only runs after the guard on the resolved result.
const src = readFileSync(fileURLToPath(new URL('./import-core.mjs', import.meta.url)), 'utf8');

function importPatientExportPayloadsBody() {
  const start = src.indexOf('async function importPatientExportPayloads');
  assert.notEqual(start, -1, 'importPatientExportPayloads should be declared as an async function');
  const nextExport = src.indexOf('\nexport {', start + 1);
  return src.slice(start, nextExport === -1 ? src.length : nextExport);
}

describe('cardio data is carried over on patient import', () => {
  it('copyImportCardio clones the imported cardio object and backfills defaults', () => {
    const start = src.indexOf('function copyImportCardio');
    assert.notEqual(start, -1, 'copyImportCardio should be declared');
    const body = src.slice(start, src.indexOf('\n}', start) + 2);
    assert.match(body, /JSON\.parse\(JSON\.stringify\(importedPatient\.cardio\)\)/);
    assert.match(body, /ensureCardio\(target\)/);
  });

  it('overwrite path copies cardio before the existing patient is persisted', () => {
    const start = src.indexOf('function applyImportOverwrite');
    const body = src.slice(start, src.indexOf('\n}', start) + 2);
    assert.match(body, /copyImportCardio\(existing, entry\.patient\)/);
  });

  it('duplicate path copies cardio onto the newly created patient', () => {
    const start = src.indexOf('function applyImportDuplicate');
    const body = src.slice(start, src.indexOf('\n}', start) + 2);
    assert.match(body, /copyImportCardio\(newPatient, entry\.patient\)/);
  });
});

describe('importPatientExportPayloads destructive confirms', () => {
  it('multi-patient path requests a destructive confirm before importing', () => {
    const body = importPatientExportPayloadsBody();
    assert.match(body, /weight:\s*'destructive'/);
    assert.match(body, /Se importarán ' \+\s*\n?\s*payloads\.length \+\s*\n?\s*' pacientes:/);
    const confirmIdx = body.indexOf("var multiResult = await openConfirm");
    const guardIdx = body.indexOf("if (multiResult !== 'confirm')");
    const importIdx = body.indexOf('importEntriesWithConflicts(entries,');
    assert.ok(confirmIdx > -1 && guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(importIdx > guardIdx, 'the multi-import must run only after the confirm guard');
  });

  it('single-patient path requests a destructive confirm before importing', () => {
    const body = importPatientExportPayloadsBody();
    const confirmIdx = body.indexOf('var singleResult = await openConfirm');
    assert.notEqual(confirmIdx, -1);
    const guardIdx = body.indexOf('if (singleResult !== \'confirm\') return false;');
    const applyIdx = body.indexOf('applySinglePatientExportPayload(payload)');
    assert.ok(guardIdx > confirmIdx, 'the confirm guard must follow the openConfirm call');
    assert.ok(applyIdx > guardIdx, 'the single-patient import must run only after the confirm guard');
    assert.match(body.slice(confirmIdx, guardIdx + 60), /weight:\s*'destructive'/);
  });
});
