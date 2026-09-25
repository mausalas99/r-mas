import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  shouldOfferRotationRejoin,
  buildRotationRejoinLeadHtml,
} from './clinical-rotation-rejoin-modal.mjs';

describe('clinical-rotation-rejoin-modal', () => {
  it('shouldOfferRotationRejoin only when pending and not joined', () => {
    assert.equal(shouldOfferRotationRejoin({ pending: true, joinedCount: 0 }), true);
    assert.equal(shouldOfferRotationRejoin({ pending: false, joinedCount: 0 }), false);
    assert.equal(shouldOfferRotationRejoin({ pending: true, joinedCount: 1 }), false);
  });

  it('modal is triggered only by R4 init or rotationNuevaAt sync', () => {
    const modalSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-rotation-rejoin-modal.mjs'),
      'utf8'
    );
    const rotationSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-rotation.mjs'),
      'utf8'
    );
    const mergeSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../../lib/db/clinical-ops-sync-merge.mjs'),
      'utf8'
    );
    assert.match(modalSrc, /promptRotationRejoinAfterNuevaRotacion/);
    assert.match(modalSrc, /rotationNuevaApplied/);
    assert.doesNotMatch(modalSrc, /rpc-guardia-rotation-changed/);
    assert.doesNotMatch(modalSrc, /lastJoinedCount/);
    assert.match(rotationSrc, /promptRotationRejoinAfterNuevaRotacion/);
    assert.match(mergeSrc, /stats\.rotationNuevaApplied = 1/);
  });

  it('suppresses rejoin modal while profile onboarding is pending', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'clinical-rotation-rejoin-modal.mjs'),
      'utf8'
    );
    assert.match(src, /needsProfileOnboarding/);
    assert.match(src, /setRotationRejoinPending\(false\)/);
  });

  it('buildRotationRejoinLeadHtml mentions existing teams for residents', () => {
    const html = buildRotationRejoinLeadHtml({ rank: 'R2', sala: 'Sala 2' });
    assert.match(html, /nueva rotación/i);
    assert.match(html, /Sala 2/);
    assert.match(html, /publicó equipos/i);
    assert.match(html, /elige el tuyo/i);
  });

  it('buildRotationRejoinLeadHtml tells R4 to publish teams', () => {
    const html = buildRotationRejoinLeadHtml({ rank: 'R4', sala: 'Sala 1' });
    assert.match(html, /publica los equipos/i);
    assert.match(html, /Sala 1/);
  });
});
