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
        '<button type="button" class="wb-btn wb-btn-primary" id="' +
        copy.actionId +
        '">' +
        copy.actionLabel +
        '</button></div>'
      : '';
  return (
    '<div class="empty-state guardia-census-empty" role="status">' +
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
 * Step 1 — declare which sala this account covers tonight, before census (Step 2) filters by it.
 * @param {string[]} salas
 * @param {string} [selectedSala]
 * @returns {string}
 */
export function buildGuardiaSalaPickerHtml(salas, selectedSala) {
  var selected = String(selectedSala || '').trim();
  var options = (salas || [])
    .map(function (s) {
      var value = String(s);
      var isSelected = value === selected ? ' selected' : '';
      return '<option value="' + value + '"' + isSelected + '>' + value + '</option>';
    })
    .join('');
  return (
    '<div class="empty-state guardia-sala-picker" role="status">' +
    '<h3 class="empty-state-title">Activar guardia</h3>' +
    '<p class="empty-state-lead">Tu perfil no tiene sala. Elige la que cubres esta noche. ' +
    'Para no ver este paso, pon tu sala en Mi rotación.</p>' +
    '<div class="guardia-sala-picker-field">' +
    '<label for="guardia-sala-picker-select">Sala</label>' +
    '<select id="guardia-sala-picker-select" class="profile-input">' +
    options +
    '</select>' +
    '</div>' +
    '<div class="empty-state-actions">' +
    '<button type="button" class="wb-btn wb-btn-primary" id="guardia-sala-picker-start">Empezar guardia</button>' +
    '</div>' +
    '</div>'
  );
}

/**
 * @param {HTMLElement|null|undefined} container
 * @param {{ salas?: string[], selected?: string, onStart?: (sala: string) => void }} [opts]
 */
export function renderGuardiaSalaPicker(container, opts) {
  if (!container) return;
  var salas = (opts && opts.salas) || [];
  var selected = (opts && opts.selected) || '';
  container.innerHTML = buildGuardiaSalaPickerHtml(salas, selected);
  container.classList.add('patient-chips-grid', 'patient-chips-grid--guardia');
  var select = container.querySelector('#guardia-sala-picker-select');
  var btn = container.querySelector('#guardia-sala-picker-start');
  if (btn && opts && typeof opts.onStart === 'function') {
    btn.addEventListener('click', function () {
      var sala = select ? String(select.value || '').trim() : '';
      if (!sala) return;
      opts.onStart(sala);
    });
  }
}

const SKELETON_GROUP_SIZES = [4, 2, 3, 2];

function guardiaSkeletonCardHtml() {
  return (
    '<div class="gct-card gct-card--skeleton">' +
    '<div class="gct-card__row">' +
    '<span class="skel skel-bed"></span>' +
    '<span class="skel skel-name"></span>' +
    '</div>' +
    '<div class="gct-task-row"><span class="skel skel-task"></span></div>' +
    '</div>'
  );
}

function guardiaSkeletonGroupHtml(cardCount) {
  return (
    '<div class="gct-team-group">' +
    '<div class="gct-divider"><span class="skel skel-label"></span></div>' +
    `<div class="gct-grid">${Array(cardCount).fill(0).map(guardiaSkeletonCardHtml).join('')}</div>` +
    '</div>'
  );
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
  container.innerHTML =
    '<div class="wb-table-card guardia-census-loading" role="status">' +
    '<span class="visually-hidden">Cargando censo…</span>' +
    '<div class="wb-table-card-header"><span class="skel skel-title"></span></div>' +
    `<div class="wb-table-body">${SKELETON_GROUP_SIZES.map(guardiaSkeletonGroupHtml).join('')}</div>` +
    '</div>';
  container.classList.remove('patient-chips-grid', 'patient-chips-grid--guardia');
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
