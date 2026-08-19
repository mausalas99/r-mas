import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerLabRepoBatchImportRuntime,
  openLabRepoBatchModal,
  confirmLabRepoBatchImport,
} from './lab-repo-batch-import.mjs';

/**
 * Teal workbench §11c "Actualizando pacientes": the sidebar queue's spinner
 * and Detener button must toggle via CSS class (visibility), never via the
 * `hidden` attribute — the title row and the Cerrar button must not move
 * when a run starts or finishes. See public/js/features/lab-repo-batch-import.mjs
 * `renderSidebarQueue` and public/styles/lab.css `.lab-repo-batch-queue-spinner`.
 */

const FIXTURE_HTML = `
  <div id="lab-repo-batch-modal" hidden>
    <h3 id="lab-repo-batch-title"></h3>
    <p id="lab-repo-batch-hint"></p>
    <input id="lab-repo-batch-desde" type="date" class="rpc-date-input" />
    <input id="lab-repo-batch-hasta" type="date" class="rpc-date-input" />
    <div id="lab-repo-batch-team-block">
      <span id="lab-repo-batch-count"></span>
      <button id="lab-repo-batch-select-all"></button>
      <button id="lab-repo-batch-select-active"></button>
      <button id="lab-repo-batch-select-none"></button>
      <div id="lab-repo-batch-list"></div>
    </div>
    <p id="lab-repo-batch-progress" hidden></p>
    <button id="lab-repo-batch-cancel"></button>
    <button id="lab-repo-batch-confirm"></button>
  </div>
  <div id="lab-repo-batch-queue" hidden>
    <span class="lab-repo-batch-queue-btn">
      <span id="lab-repo-batch-queue-spinner" class="lab-repo-batch-queue-spinner"></span>
      <span id="lab-repo-batch-queue-btn-label">Actualizando</span>
    </span>
    <div id="lab-repo-batch-queue-fill"></div>
    <span id="lab-repo-batch-queue-meta"></span>
    <button id="lab-repo-batch-queue-stop" class="lab-repo-batch-queue-stop--inactive" disabled>Detener</button>
    <button id="lab-repo-batch-queue-dismiss"></button>
  </div>
`;

function teamPatients() {
  return [
    { id: 'p1', nombre: 'Paciente Uno', registro: 'REG1' },
    { id: 'p2', nombre: 'Paciente Dos', registro: 'REG2' },
  ];
}

describe('lab-repo-batch-import — inline "Actualizando pacientes" progress', () => {
  let resolveFetch;
  let originalElectronAPI;

  beforeEach(() => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML = FIXTURE_HTML;
    originalElectronAPI = window.electronAPI;
    window.electronAPI = {
      labRepoFetch: () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    };
    registerLabRepoBatchImportRuntime({
      getLabRepoBatchTeamPatients: teamPatients,
      getActivePatient: () => null,
      getActiveId: () => null,
      showToast: () => {},
    });
  });

  afterEach(() => {
    if (typeof document === 'undefined') return;
    window.electronAPI = originalElectronAPI;
  });

  it('keeps the spinner/Detener toggles class-based (visibility), not `hidden`, while a run is in flight', async () => {
    if (typeof document === 'undefined') return;

    openLabRepoBatchModal();
    // Only one patient selected — keeps the mocked fetch to a single pending
    // promise the test can resolve deterministically.
    const p2Check = document.querySelector('[data-patient-id="p2"]');
    p2Check.checked = false;
    p2Check.dispatchEvent(new Event('change', { bubbles: true }));

    const spinner = document.getElementById('lab-repo-batch-queue-spinner');
    const stopBtn = document.getElementById('lab-repo-batch-queue-stop');
    const meta = document.getElementById('lab-repo-batch-queue-meta');
    const btnLabel = document.getElementById('lab-repo-batch-queue-btn-label');
    const fill = document.getElementById('lab-repo-batch-queue-fill');

    // At rest: spinner inactive, Detener present-but-inactive (never `hidden`).
    assert.equal(spinner.hasAttribute('hidden'), false);
    assert.equal(stopBtn.hasAttribute('hidden'), false);
    assert.equal(stopBtn.classList.contains('lab-repo-batch-queue-stop--inactive'), true);

    const runPromise = confirmLabRepoBatchImport();
    // Let the microtask queue flush enough for the fetch loop to start.
    await Promise.resolve();
    await Promise.resolve();

    assert.equal(spinner.classList.contains('lab-repo-batch-queue-spinner--active'), true);
    assert.equal(stopBtn.classList.contains('lab-repo-batch-queue-stop--inactive'), false);
    assert.equal(stopBtn.disabled, false);
    // Never falls back to the `hidden` attribute — that's what caused the
    // Cerrar button to slide when Detener disappeared.
    assert.equal(spinner.hasAttribute('hidden'), false);
    assert.equal(stopBtn.hasAttribute('hidden'), false);
    // §11c "Actualizando pacientes": one button ("Actualizando") + one
    // "N de M · ..." caption — never a per-patient row list.
    assert.equal(btnLabel.textContent, 'Actualizando');
    assert.match(meta.textContent, /^0 de 1 · /);
    assert.equal(fill.style.width, '0%');

    resolveFetch({ studies: [], errors: [] });
    await runPromise;

    assert.equal(spinner.classList.contains('lab-repo-batch-queue-spinner--active'), false);
    assert.equal(stopBtn.classList.contains('lab-repo-batch-queue-stop--inactive'), true);
    assert.equal(stopBtn.disabled, true);
    assert.equal(btnLabel.textContent, 'Listo');
    assert.match(meta.textContent, /^1 de 1 · /);
    assert.equal(fill.style.width, '100%');
  });
});
