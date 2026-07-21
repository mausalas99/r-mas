/**
 * Pure helpers for bulk lab-repo update (mi equipo + checkboxes + sidebar queue).
 */

/**
 * @typedef {{
 *   id: string,
 *   nombre?: string,
 *   registro?: string,
 *   cuarto?: string,
 *   cama?: string,
 * }} LabRepoBatchPatient
 */

/**
 * @typedef {{
 *   id: string,
 *   nombre: string,
 *   registro: string,
 *   hint: string,
 *   hasRegistro: boolean,
 *   selected: boolean,
 * }} LabRepoBatchRow
 */

/**
 * @typedef {'pending'|'running'|'ok'|'empty'|'error'|'aborted'} LabRepoBatchJobStatus
 */

/**
 * @typedef {{
 *   id: string,
 *   nombre: string,
 *   registro: string,
 *   status: LabRepoBatchJobStatus,
 * }} LabRepoBatchJob
 */

/**
 * @param {LabRepoBatchPatient[]} patients
 * @param {{ selectedIds?: Set<string>|string[], defaultSelectWithRegistro?: boolean }} [opts]
 * @returns {LabRepoBatchRow[]}
 */
export function buildLabRepoBatchRows(patients, opts) {
  var selectedIds = normalizeIdSet(opts && opts.selectedIds);
  var defaultSelect = !(opts && opts.defaultSelectWithRegistro === false);
  var useExplicit = !!(opts && opts.selectedIds != null);

  return (patients || [])
    .filter(function (p) {
      return p && p.id != null && String(p.id);
    })
    .map(function (p) {
      var id = String(p.id);
      var registro = String(p.registro || '').trim();
      var hasRegistro = !!registro;
      var selected = hasRegistro
        ? useExplicit
          ? selectedIds.has(id)
          : defaultSelect
        : false;
      return {
        id: id,
        nombre: String(p.nombre || '').trim() || 'Sin nombre',
        registro: registro,
        hint: bedHint(p),
        hasRegistro: hasRegistro,
        selected: selected,
      };
    });
}

/**
 * @param {LabRepoBatchRow[]} rows
 * @returns {LabRepoBatchRow[]}
 */
export function selectedLabRepoBatchRows(rows) {
  return (rows || []).filter(function (r) {
    return r && r.selected && r.hasRegistro && r.registro;
  });
}

/**
 * @param {LabRepoBatchRow[]} rows
 * @param {boolean} selected
 * @returns {LabRepoBatchRow[]}
 */
export function setAllSelectableLabRepoBatchRows(rows, selected) {
  return (rows || []).map(function (r) {
    if (!r || !r.hasRegistro) return Object.assign({}, r, { selected: false });
    return Object.assign({}, r, { selected: !!selected });
  });
}

/**
 * @param {LabRepoBatchRow[]} rows
 * @param {string} patientId
 * @param {boolean} selected
 */
export function setLabRepoBatchRowSelected(rows, patientId, selected) {
  var id = String(patientId || '');
  return (rows || []).map(function (r) {
    if (!r || String(r.id) !== id) return r;
    if (!r.hasRegistro) return Object.assign({}, r, { selected: false });
    return Object.assign({}, r, { selected: !!selected });
  });
}

/**
 * @param {{ id: string, nombre: string, registro: string }[]} selectedRows
 * @returns {LabRepoBatchJob[]}
 */
export function buildLabRepoBatchJobs(selectedRows) {
  return (selectedRows || []).map(function (r) {
    return {
      id: String(r.id),
      nombre: String(r.nombre || 'Sin nombre'),
      registro: String(r.registro || ''),
      status: 'pending',
    };
  });
}

/**
 * @param {LabRepoBatchJob[]} jobs
 * @param {string} patientId
 * @param {LabRepoBatchJobStatus} status
 */
export function setLabRepoBatchJobStatus(jobs, patientId, status) {
  var id = String(patientId || '');
  return (jobs || []).map(function (j) {
    if (!j || String(j.id) !== id) return j;
    return Object.assign({}, j, { status: status });
  });
}

/**
 * Mark all still-pending/running jobs as aborted.
 * @param {LabRepoBatchJob[]} jobs
 */
export function abortPendingLabRepoBatchJobs(jobs) {
  return (jobs || []).map(function (j) {
    if (!j) return j;
    if (j.status === 'pending' || j.status === 'running') {
      return Object.assign({}, j, { status: 'aborted' });
    }
    return j;
  });
}

/** @param {LabRepoBatchJobStatus} status */
export function labRepoBatchJobStatusLabel(status) {
  if (status === 'running') return 'Consultando…';
  if (status === 'ok') return 'Actualizado';
  if (status === 'empty') return 'Sin estudios';
  if (status === 'error') return 'Error';
  if (status === 'aborted') return 'Detenido';
  return 'En cola';
}

/**
 * Map fetch classification → job status (connection/throw → error).
 * @param {'ok'|'empty'|'connection'|'error'|'throw'} kind
 * @returns {LabRepoBatchJobStatus}
 */
export function jobStatusFromFetchKind(kind) {
  if (kind === 'ok') return 'ok';
  if (kind === 'empty') return 'empty';
  if (kind === 'aborted') return 'aborted';
  return 'error';
}

/**
 * @param {{
 *   attempted: number,
 *   importedPatients: number,
 *   empty: number,
 *   skippedNoRegistro: number,
 *   failed: number,
 *   needsReview: number,
 *   aborted?: boolean,
 * }} summary
 */
export function formatLabRepoBatchSummaryToast(summary) {
  var s = summary || {};
  var parts = [];
  if (s.importedPatients) {
    parts.push(
      s.importedPatients +
        ' paciente' +
        (s.importedPatients === 1 ? '' : 's') +
        ' actualizado' +
        (s.importedPatients === 1 ? '' : 's')
    );
  }
  if (s.empty) {
    parts.push(s.empty + ' sin estudios en el rango');
  }
  if (s.skippedNoRegistro) {
    parts.push(s.skippedNoRegistro + ' sin registro');
  }
  if (s.failed) {
    parts.push(s.failed + ' con error');
  }
  if (s.needsReview) {
    parts.push(s.needsReview + ' para revisar');
  }
  if (s.aborted) {
    parts.push('detenido');
  }
  if (!parts.length) {
    return s.attempted
      ? 'Sin cambios en ' + s.attempted + ' paciente' + (s.attempted === 1 ? '' : 's')
      : 'Ningún paciente seleccionado';
  }
  return parts.join(' · ');
}

/**
 * Classify one patient fetch for batch control flow.
 * @param {unknown[]} studies
 * @param {{ message?: string }[]} errors
 * @returns {'ok'|'empty'|'connection'|'error'}
 */
export function classifyLabRepoBatchFetch(studies, errors) {
  if (studies && studies.length) return 'ok';
  var list = errors || [];
  if (!list.length) return 'empty';
  var first = String((list[0] && list[0].message) || '');
  if (isConnectionError(first)) return 'connection';
  if (first === 'no-search-results' || first === 'no-rows-in-range') return 'empty';
  return 'error';
}

function isConnectionError(message) {
  return /lab-repo-http-|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|fetch failed|network/i.test(
    String(message || '')
  );
}

function bedHint(p) {
  var cuarto = String((p && p.cuarto) || '').trim();
  var cama = String((p && p.cama) || '').trim();
  if (cuarto && cama) return cuarto + ' · ' + cama;
  return cuarto || cama || '';
}

function normalizeIdSet(ids) {
  var out = new Set();
  if (!ids) return out;
  if (typeof ids.has === 'function') {
    ids.forEach(function (id) {
      out.add(String(id));
    });
    return out;
  }
  (ids || []).forEach(function (id) {
    out.add(String(id));
  });
  return out;
}
