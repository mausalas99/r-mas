import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkPackage } from './vendor-manifests.mjs';

test('reports dead entries and uncopied imports; --write fixes both', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-'));
  const put = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };
  put('core/a.mjs', "import './b.mjs'; // import './nope.mjs'\n");
  put('core/b.mjs', "export {};\n");
  put('hf/scripts/vendor-core-manifest.json', JSON.stringify(['a.mjs', 'gone.mjs']));
  assert.deepEqual(checkPackage('hf', { packages: root }), { dead: ['gone.mjs'], missing: ['b.mjs'] });
  checkPackage('hf', { write: true, packages: root });
  assert.deepEqual(checkPackage('hf', { packages: root }), { dead: [], missing: [] });
  assert.equal(checkPackage('neumo', { packages: root }), null);
});
