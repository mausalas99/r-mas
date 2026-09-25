import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanSourceForForbiddenLanImports } from './forbid-lan-imports.mjs';

describe('forbid-lan-imports', () => {
  it('flags production imports of features/lan and lan-squad', () => {
    const hits = scanSourceForForbiddenLanImports(
      "import { x } from '../features/lan/orchestrator.mjs';\n" +
        "const y = require('../../lan-squad/host-store.js');\n",
      'public/js/fake.mjs'
    );
    assert.ok(hits.length >= 2);
    assert.ok(hits.some((h) => /features\/lan/.test(h.rule)));
    assert.ok(hits.some((h) => /lan-squad/.test(h.rule)));
  });

  it('flags /api/lan/v1 only in client graphs', () => {
    const client = scanSourceForForbiddenLanImports(
      "fetch('/api/lan/v1/rooms');\n",
      'public/js/fake.mjs'
    );
    assert.equal(client.length, 1);
    const server = scanSourceForForbiddenLanImports(
      "app.use('/api/lan/v1', handler);\n",
      'server.js'
    );
    assert.equal(server.length, 0);
  });

  it('ignores docs, tests, and comments-only LAN mentions', () => {
    assert.equal(
      scanSourceForForbiddenLanImports(
        "import { x } from '../features/lan/orchestrator.mjs';\n",
        'docs/core/fake.md'
      ).length,
      0
    );
    assert.equal(
      scanSourceForForbiddenLanImports(
        "import { x } from '../features/lan/orchestrator.mjs';\n",
        'public/js/features/cloud-sync/panel.test.mjs'
      ).length,
      0
    );
    assert.equal(
      scanSourceForForbiddenLanImports(
        "// formerly features/lan/panel-clinical-context\nexport const x = 1;\n",
        'public/js/features/cloud-sync/panel-clinical-context.mjs'
      ).length,
      0
    );
  });
});
