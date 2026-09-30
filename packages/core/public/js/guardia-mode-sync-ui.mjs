/** Guardia mode DOM + board rerender helpers (extracted for complexity budget). */

const GUARDIA_CENSUS_FILTER_HINT_ON = 'Solo pacientes que te entregaron en este turno.';
const GUARDIA_CENSUS_FILTER_HINT_OFF = 'Todos los pacientes en tu alcance clínico.';

export function syncGuardiaModeDom(active) {
  if (typeof document === 'undefined') return;
  const filterHint = document.getElementById('guardia-census-filter-hint');
  if (filterHint) {
    filterHint.textContent = active ? GUARDIA_CENSUS_FILTER_HINT_ON : GUARDIA_CENSUS_FILTER_HINT_OFF;
  }
}

export function rerenderGuardiaBoardIfRequested(opts) {
  if (!opts.rerenderBoard) return;
  const render = opts.renderGuardiaBoard;
  if (typeof render === 'function') {
    render(opts.settings);
    return;
  }
  if (typeof globalThis.renderGuardiaBoard !== 'function') return;
  let settings = opts.settings;
  if (!settings) {
    try {
      settings = JSON.parse(localStorage.getItem('rpc-settings') || '{}');
    } catch {
      settings = {};
    }
  }
  globalThis.renderGuardiaBoard(settings);
}
