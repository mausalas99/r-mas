import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { needsPassphraseConfirm, __test } from './db-unlock.mjs';

describe('db-unlock', () => {
  it('requires confirm when migration is pending', () => {
    assert.equal(needsPassphraseConfirm({ migrationPending: true, dbFileExists: true }), true);
  });

  it('requires confirm when migration probe reports needed', () => {
    assert.equal(
      needsPassphraseConfirm({ migrationPending: false, dbFileExists: true }, { needed: true }),
      true
    );
  });

  it('requires confirm when db file does not exist', () => {
    assert.equal(needsPassphraseConfirm({ migrationPending: false, dbFileExists: false }), true);
  });

  it('does not require confirm for existing encrypted db', () => {
    assert.equal(needsPassphraseConfirm({ migrationPending: false, dbFileExists: true }), false);
  });

  describe('toggleDbUnlockSecretField', () => {
    /** @type {Map<string, { type: string }>} */
    let inputs;
    /** @type {Map<string, { textContent: string, attrs: Map<string, string> }>} */
    let buttons;

    beforeEach(() => {
      inputs = new Map([
        ['rpc-db-unlock-pass', { type: 'password' }],
        ['rpc-db-unlock-confirm', { type: 'password' }],
      ]);
      buttons = new Map([
        [
          'pass-toggle',
          {
            textContent: 'Mostrar',
            attrs: new Map([
              ['aria-controls', 'rpc-db-unlock-pass'],
              ['aria-pressed', 'false'],
              ['aria-label', 'Mostrar contraseña'],
            ]),
          },
        ],
        [
          'confirm-toggle',
          {
            textContent: 'Mostrar',
            attrs: new Map([
              ['aria-controls', 'rpc-db-unlock-confirm'],
              ['aria-pressed', 'false'],
              ['aria-label', 'Mostrar contraseña'],
            ]),
          },
        ],
      ]);
      globalThis.document = {
        getElementById(id) {
          if (inputs.has(id)) {
            return inputs.get(id);
          }
          if (buttons.has(id)) {
            const btn = buttons.get(id);
            return {
              getAttribute(name) {
                return btn.attrs.get(name) ?? null;
              },
              setAttribute(name, value) {
                btn.attrs.set(name, value);
              },
              get textContent() {
                return btn.textContent;
              },
              set textContent(value) {
                btn.textContent = value;
              },
            };
          }
          return null;
        },
      };
    });

    afterEach(() => {
      delete globalThis.document;
    });

    it('toggles only the input linked by aria-controls', () => {
      const passToggle = document.getElementById('pass-toggle');
      const confirmToggle = document.getElementById('confirm-toggle');

      __test.toggleDbUnlockSecretField(passToggle);
      assert.equal(inputs.get('rpc-db-unlock-pass').type, 'text');
      assert.equal(inputs.get('rpc-db-unlock-confirm').type, 'password');
      assert.equal(passToggle.textContent, 'Ocultar');
      assert.equal(confirmToggle.textContent, 'Mostrar');

      __test.toggleDbUnlockSecretField(confirmToggle);
      assert.equal(inputs.get('rpc-db-unlock-pass').type, 'text');
      assert.equal(inputs.get('rpc-db-unlock-confirm').type, 'text');
      assert.equal(confirmToggle.textContent, 'Ocultar');
    });
  });
});
