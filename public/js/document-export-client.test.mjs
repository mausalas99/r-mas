import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canGenerateDocumentsOffline,
  guardDocExportBlocked,
  isDocExportBlockedByLocalServer,
  parseContentDispositionFilename,
  requestDocumentJson,
} from './document-export-client.mjs';

describe('offline document export guards', () => {
  it('isDocExportBlockedByLocalServer is false when IPC is available', () => {
    const prev = globalThis.window;
    globalThis.window = { electronAPI: { generateDocument() {} } };
    try {
      assert.equal(isDocExportBlockedByLocalServer(true), false);
      assert.equal(canGenerateDocumentsOffline(), true);
    } finally {
      globalThis.window = prev;
    }
  });

  it('guardDocExportBlocked blocks only without IPC', () => {
    const prev = globalThis.window;
    globalThis.window = {};
    let toastMsg = '';
    try {
      assert.equal(
        guardDocExportBlocked({
          isRpcOffline() {
            return true;
          },
          showToast(msg) {
            toastMsg = msg;
          },
        }),
        true
      );
      assert.match(toastMsg, /servidor local/);
      assert.equal(guardDocExportBlocked({ isRpcOffline() { return false; } }), false);
    } finally {
      globalThis.window = prev;
    }
  });
});

describe('requestDocumentJson IPC preference', () => {
  it('uses electronAPI.generateDocument and never fetch when IPC exists', async () => {
    const prev = globalThis.window;
    const prevFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return { json: async () => ({}) };
    };
    globalThis.window = {
      electronAPI: {
        async generateDocument({ kind, payload }) {
          return { ok: true, kind, payload, fileName: 'x.docx' };
        },
      },
    };
    try {
      const out = await requestDocumentJson('/generate', { patient: { id: '1' } });
      assert.equal(out.ok, true);
      assert.equal(out.kind, 'note');
      assert.equal(fetchCalls, 0);
    } finally {
      globalThis.window = prev;
      globalThis.fetch = prevFetch;
    }
  });
});

describe('parseContentDispositionFilename', () => {
  it('parses attachment filename', () => {
    assert.equal(
      parseContentDispositionFilename('attachment; filename="foo.docx"'),
      'foo.docx'
    );
  });

  it('returns null for missing header', () => {
    assert.equal(parseContentDispositionFilename(null), null);
  });
});
