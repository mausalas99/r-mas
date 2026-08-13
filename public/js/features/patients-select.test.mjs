import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isRoundOverviewInner } from './patients-round.mjs';
import { shouldKeepSidebarRevealed, shouldRevealSidebarAt } from './patients.mjs';

function readSidebarCss() {
  return readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../styles/sidebar.css'),
    'utf8'
  );
}

/** Mirrors selectPatientCore patientChanged detection. */
function patientChanged(prevId, id) {
  return String(prevId ?? '') !== String(id);
}

/** Mirrors list refresh branch in selectPatientCore. */
function shouldFullRenderPatientList(patientChanged, patchHighlightOk) {
  return !patientChanged || !patchHighlightOk;
}

describe('selectPatient patientChanged', () => {
  it('is true when selecting the first patient from empty state', () => {
    assert.equal(patientChanged(null, 'abc'), true);
    assert.equal(patientChanged(undefined, 'abc'), true);
  });

  it('is true when switching between patients', () => {
    assert.equal(patientChanged('a', 'b'), true);
  });

  it('is false when re-selecting the same patient', () => {
    assert.equal(patientChanged('a', 'a'), false);
    assert.equal(patientChanged(12, '12'), false);
  });
});

describe('selectPatient list refresh branch', () => {
  it('re-renders list when re-selecting the same patient', () => {
    assert.equal(shouldFullRenderPatientList(false, true), true);
  });

  it('re-renders list when highlight patch cannot run silently', () => {
    assert.equal(shouldFullRenderPatientList(true, false), true);
  });
});

describe('isRoundOverviewInner', () => {
  it('treats resumen, todo, and empty as Pase overview', () => {
    assert.equal(isRoundOverviewInner('resumen'), true);
    assert.equal(isRoundOverviewInner('todo'), true);
    assert.equal(isRoundOverviewInner(''), true);
    assert.equal(isRoundOverviewInner(null), true);
    assert.equal(isRoundOverviewInner(undefined), true);
  });

  it('does not treat other inners as overview', () => {
    assert.equal(isRoundOverviewInner('estadoActual'), false);
    assert.equal(isRoundOverviewInner('tend'), false);
    assert.equal(isRoundOverviewInner('notas'), false);
  });
});

describe('shouldRevealSidebarAt', () => {
  it('reveals when the pointer is on the left 36px of the window or workbench', () => {
    assert.equal(shouldRevealSidebarAt(8, 0), true);
    assert.equal(shouldRevealSidebarAt(36, 0), true);
    assert.equal(shouldRevealSidebarAt(37, 0), false);
    assert.equal(shouldRevealSidebarAt(90, 80), true);
    assert.equal(shouldRevealSidebarAt(116, 80), true);
    assert.equal(shouldRevealSidebarAt(117, 80), false);
  });
});

describe('shouldKeepSidebarRevealed', () => {
  it('keeps the census open across the sidebar column after reveal', () => {
    assert.equal(shouldKeepSidebarRevealed(100, 0, 240), true);
    assert.equal(shouldKeepSidebarRevealed(252, 0, 240), true);
    assert.equal(shouldKeepSidebarRevealed(253, 0, 240), false);
    assert.equal(shouldKeepSidebarRevealed(20, 80, 0), true);
  });
});

describe('sidebar hover strip', () => {
  it('is viewport-fixed with no-drag so it punches the macOS titlebar drag region', () => {
    const css = readSidebarCss();
    assert.match(css, /\.sidebar-hover-strip\s*\{[^}]*position:\s*fixed/s);
    assert.match(css, /\.sidebar-hover-strip\s*\{[^}]*-webkit-app-region:\s*no-drag/s);
    assert.equal(/\.sidebar-hover-strip\s*\{[^}]*position:\s*absolute/s.test(css), false);
  });
});
