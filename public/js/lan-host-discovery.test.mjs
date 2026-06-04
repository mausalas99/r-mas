import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLanHostBase,
  hostIpv4FromBase,
  lanHostBasesSameMachine,
} from './lan-host-discovery.mjs';

describe('lan-host-discovery', () => {
  it('normalizeLanHostBase adds scheme', () => {
    assert.equal(normalizeLanHostBase('192.168.1.5:3738'), 'http://192.168.1.5:3738');
    assert.equal(normalizeLanHostBase('http://192.168.1.5:3738/'), 'http://192.168.1.5:3738');
  });

  it('lanHostBasesSameMachine treats loopback as same machine', () => {
    assert.equal(
      lanHostBasesSameMachine('http://127.0.0.1:3738', 'http://localhost:3738'),
      true
    );
    assert.equal(
      lanHostBasesSameMachine('http://192.168.1.10:3738', 'http://192.168.1.11:3738'),
      false
    );
  });

  it('hostIpv4FromBase parses hostname', () => {
    assert.equal(hostIpv4FromBase('http://192.168.1.44:3738'), '192.168.1.44');
  });
});
