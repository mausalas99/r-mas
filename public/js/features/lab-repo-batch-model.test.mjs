import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  buildLabRepoBatchRows,
  selectedLabRepoBatchRows,
  setAllSelectableLabRepoBatchRows,
  setLabRepoBatchRowSelected,
  formatLabRepoBatchSummaryToast,
  classifyLabRepoBatchFetch,
  buildLabRepoBatchJobs,
  setLabRepoBatchJobStatus,
  abortPendingLabRepoBatchJobs,
  labRepoBatchJobStatusLabel,
  jobStatusFromFetchKind,
} = await import('./lab-repo-batch-model.mjs');

const patients = [
  { id: 'p1', nombre: 'García', registro: '111', cuarto: '3', cama: 'A' },
  { id: 'p2', nombre: 'Pérez', registro: '', cuarto: '4' },
  { id: 'p3', nombre: 'López', registro: '333' },
];

test('buildLabRepoBatchRows defaults select only with registro', () => {
  var rows = buildLabRepoBatchRows(patients);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].selected, true);
  assert.equal(rows[1].selected, false);
  assert.equal(rows[1].hasRegistro, false);
  assert.equal(rows[2].selected, true);
  assert.equal(rows[0].hint, '3 · A');
});

test('buildLabRepoBatchRows respects selectedIds', () => {
  var rows = buildLabRepoBatchRows(patients, { selectedIds: ['p3'] });
  assert.equal(rows[0].selected, false);
  assert.equal(rows[2].selected, true);
});

test('select all / none / toggle', () => {
  var rows = buildLabRepoBatchRows(patients);
  rows = setAllSelectableLabRepoBatchRows(rows, false);
  assert.equal(selectedLabRepoBatchRows(rows).length, 0);
  rows = setAllSelectableLabRepoBatchRows(rows, true);
  assert.equal(selectedLabRepoBatchRows(rows).length, 2);
  rows = setLabRepoBatchRowSelected(rows, 'p1', false);
  assert.equal(selectedLabRepoBatchRows(rows).length, 1);
});

test('classifyLabRepoBatchFetch', () => {
  assert.equal(classifyLabRepoBatchFetch([{ text: 'x' }], []), 'ok');
  assert.equal(classifyLabRepoBatchFetch([], []), 'empty');
  assert.equal(classifyLabRepoBatchFetch([], [{ message: 'no-rows-in-range' }]), 'empty');
  assert.equal(classifyLabRepoBatchFetch([], [{ message: 'lab-repo-http-503' }]), 'connection');
  assert.equal(classifyLabRepoBatchFetch([], [{ message: 'boom' }]), 'error');
});

test('queue jobs build / status / abort pending', () => {
  var selected = selectedLabRepoBatchRows(buildLabRepoBatchRows(patients));
  var jobs = buildLabRepoBatchJobs(selected);
  assert.equal(jobs.length, 2);
  assert.equal(jobs[0].status, 'pending');
  jobs = setLabRepoBatchJobStatus(jobs, 'p1', 'running');
  assert.equal(jobs[0].status, 'running');
  jobs = setLabRepoBatchJobStatus(jobs, 'p1', 'ok');
  jobs = abortPendingLabRepoBatchJobs(jobs);
  assert.equal(jobs[0].status, 'ok');
  assert.equal(jobs[1].status, 'aborted');
  assert.equal(labRepoBatchJobStatusLabel('running'), 'Consultando…');
  assert.equal(jobStatusFromFetchKind('empty'), 'empty');
  assert.equal(jobStatusFromFetchKind('throw'), 'error');
});

test('formatLabRepoBatchSummaryToast', () => {
  assert.match(
    formatLabRepoBatchSummaryToast({
      attempted: 3,
      importedPatients: 2,
      empty: 1,
      skippedNoRegistro: 1,
      failed: 0,
      needsReview: 0,
    }),
    /2 pacientes actualizados/
  );
  assert.equal(formatLabRepoBatchSummaryToast({ attempted: 0 }), 'Ningún paciente seleccionado');
});
