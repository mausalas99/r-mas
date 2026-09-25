import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const purgeSrc = readFileSync(join(dir, 'panel-admin-clinical-purge.mjs'), 'utf8');
const actionsSrc = readFileSync(join(dir, 'panel-admin-actions.mjs'), 'utf8');

describe('panel-admin-clinical-purge', () => {
  it('looks up clinical user by username then deletes and publishes teams', () => {
    assert.match(purgeSrc, /export async function purgeClinicalUserMatchingCloudHandle/);
    assert.match(purgeSrc, /dbClinicalUserLookup/);
    assert.match(purgeSrc, /dbClinicalUserDelete/);
    assert.match(purgeSrc, /publishClinicalTeamsAfterChange/);
    assert.match(purgeSrc, /rpc-clinical-teams-changed/);
  });

  it('cloud admin Eliminar purges local clinical roster after worker delete', () => {
    const start = actionsSrc.indexOf('async function handleDeleteUser');
    assert.ok(start >= 0);
    const body = actionsSrc.slice(start, start + 1400);
    assert.match(body, /adminDeleteUser/);
    assert.match(body, /purgeClinicalUserMatchingCloudHandle/);
    assert.match(body, /equipos clínicos/);
  });
});
