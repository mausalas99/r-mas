import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldOfferRotationRejoin,
  buildRotationRejoinLeadHtml,
} from './clinical-rotation-rejoin-modal.mjs';

describe('clinical-rotation-rejoin-modal', () => {
  it('shouldOfferRotationRejoin is true when force or pending without teams', () => {
    assert.equal(shouldOfferRotationRejoin({ force: true, joinedCount: 0 }), true);
    assert.equal(
      shouldOfferRotationRejoin({ pending: true, joinedCount: 0, everJoined: false }),
      true
    );
    assert.equal(
      shouldOfferRotationRejoin({ everJoined: true, joinedCount: 0 }),
      true
    );
  });

  it('shouldOfferRotationRejoin is false when already joined or local-only', () => {
    assert.equal(shouldOfferRotationRejoin({ force: true, joinedCount: 2 }), false);
    assert.equal(
      shouldOfferRotationRejoin({ everJoined: true, joinedCount: 1 }),
      false
    );
    assert.equal(
      shouldOfferRotationRejoin({ force: true, localOnly: true, joinedCount: 0 }),
      false
    );
    assert.equal(
      shouldOfferRotationRejoin({ everJoined: false, pending: false, joinedCount: 0 }),
      false
    );
  });

  it('buildRotationRejoinLeadHtml mentions nueva rotación for residents', () => {
    const html = buildRotationRejoinLeadHtml({ rank: 'R2', sala: 'Sala 2' });
    assert.match(html, /nueva rotación/i);
    assert.match(html, /Sala 2/);
    assert.match(html, /Mi rotación/);
  });

  it('buildRotationRejoinLeadHtml tells R4 to create teams', () => {
    const html = buildRotationRejoinLeadHtml({ rank: 'R4', sala: 'Sala 1' });
    assert.match(html, /crea o publica/i);
    assert.match(html, /Sala 1/);
  });
});
