import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildOnboardingBootLoadingHtml } from './clinical-onboarding-shell.mjs';

const featureDir = dirname(fileURLToPath(import.meta.url));

describe('clinical-onboarding-boot-progress', () => {
  it('buildOnboardingBootLoadingHtml includes spinner and progress track', () => {
    const html = buildOnboardingBootLoadingHtml({ title: 'Preparando R+', message: 'Iniciando R+…' });
    assert.match(html, /clinical-onboard-boot-spinner/);
    assert.match(html, /clinical-onboard-boot-progress-track/);
    assert.match(html, /aria-busy="true"/);
  });

  it('boot progress rotates messages and keeps Casi listo last', () => {
    const src = readFileSync(join(featureDir, 'clinical-onboarding-boot-progress.mjs'), 'utf8');
    const earlySrc = readFileSync(
      join(dirname(featureDir), 'clinical-onboarding-boot-progress.js'),
      'utf8'
    );
    assert.match(src, /pickRotatingMessage/);
    assert.match(src, /BOOT_ROTATE_MS = 4200/);
    assert.match(src, /_rpcBootStartedAt/);
    assert.match(earlySrc, /BOOT_FINAL_MESSAGE = 'Casi listo…'/);
    assert.match(earlySrc, /BOOT_ROTATE_MS/);
  });

  it('early boot loader markup matches shell helper', () => {
    const earlySrc = readFileSync(
      join(dirname(featureDir), 'clinical-onboarding-early-boot.js'),
      'utf8'
    );
    assert.match(earlySrc, /clinical-onboard-boot-spinner/);
    assert.match(earlySrc, /__rpcOnboardingBootProgress/);
    assert.match(earlySrc, /width:3%/);
  });
});
