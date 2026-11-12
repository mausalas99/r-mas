import { drawGuardiaCensusEmpty, drawGuardiaSalaPicker, drawGuardiaCensusLoading } from './guardia-census-empty-view.jsx';

/**
 * Empty census grid copy for Modo Guardia (Nube era).
 * Filter language: «Censo: todos / solo entregados» — not a second mode.
 */

/**
 * @param {{ filterOn?: boolean }} [opts]
 * @returns {{ title: string, lead: string, actionLabel: string | null, actionId: string | null }}
 */
export function resolveGuardiaCensusEmptyCopy(opts) {
  var filterOn = !!(opts && opts.filterOn);
  if (filterOn) {
    return {
      title: 'No hay pacientes en este alcance',
      lead:
        'Prueba «Censo: todos», o confirma que ya te entregaron en Nube. Si acabas de rotar, abre Mi rotación.',
      actionLabel: 'Ver censo completo',
      actionId: 'btn-guardia-census-show-all',
    };
  }
  return {
    title: 'No hay pacientes visibles',
    lead:
      'Confirma que estás en Nube con sala y equipo correctos. Si acabas de rotar, abre Mi rotación.',
    actionLabel: null,
    actionId: null,
  };
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {{ salas?: string[], selected?: string, onStart?: (sala: string) => void }} [opts]
 */
export function renderGuardiaSalaPicker(container, opts) {
  if (!container) return;
  var salas = (opts && opts.salas) || [];
  var selected = String((opts && opts.selected) || '').trim();
  drawGuardiaSalaPicker(container, salas, selected, opts && opts.onStart);
  container.classList.add('patient-chips-grid', 'patient-chips-grid--guardia');
}

/**
 * Shown instead of the empty state while the first guardia census fetch is
 * still in flight, so a slow load never reads as "your scope is wrong".
 * A shimmering scaffold of the real census-table shape (borrowed gct-* /
 * wb-table-card classes) instead of a spinner in an otherwise empty panel.
 * @param {HTMLElement|null|undefined} container
 */
export function renderGuardiaCensusLoading(container) {
  if (!container) return;
  drawGuardiaCensusLoading(container);
  container.classList.remove('patient-chips-grid', 'patient-chips-grid--guardia');
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {{ filterOn?: boolean, onShowAll?: () => void }} [opts]
 */
export function renderGuardiaCensusEmpty(container, opts) {
  if (!container) return;
  var filterOn = !!(opts && opts.filterOn);
  drawGuardiaCensusEmpty(container, resolveGuardiaCensusEmptyCopy({ filterOn: filterOn }), opts && opts.onShowAll);
  container.classList.add('patient-chips-grid', 'patient-chips-grid--guardia');
}
