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
 * @param {{ filterOn?: boolean }} [opts]
 * @returns {string}
 */
export function buildGuardiaCensusEmptyHtml(opts) {
  var copy = resolveGuardiaCensusEmptyCopy(opts);
  var action =
    copy.actionId && copy.actionLabel
      ? '<div class="guardia-census-empty-actions">' +
        '<button type="button" class="btn-med-primary" id="' +
        copy.actionId +
        '">' +
        copy.actionLabel +
        '</button></div>'
      : '';
  return (
    '<div class="empty-state empty-state--compact guardia-census-empty" role="status">' +
    '<h3 class="empty-state-title">' +
    copy.title +
    '</h3>' +
    '<p class="empty-state-lead">' +
    copy.lead +
    '</p>' +
    action +
    '</div>'
  );
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {{ filterOn?: boolean, onShowAll?: () => void }} [opts]
 */
export function renderGuardiaCensusEmpty(container, opts) {
  if (!container) return;
  var filterOn = !!(opts && opts.filterOn);
  container.innerHTML = buildGuardiaCensusEmptyHtml({ filterOn: filterOn });
  container.classList.add('patient-chips-grid', 'patient-chips-grid--guardia');
  var btn = container.querySelector('#btn-guardia-census-show-all');
  if (btn && opts && typeof opts.onShowAll === 'function') {
    btn.addEventListener('click', function () {
      opts.onShowAll();
    });
  }
}
