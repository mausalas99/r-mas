/**
 * Lab bulk preview list (the rows inside #lab-bulk-preview-body). Preact: same DOM, classes and
 * data-bulk-block-idx hooks the string builder in lab-bulk-preview-modal.mjs made. The modal shell
 * (backdrop, summary, confirm button) stays in overlays.html; the modal still owns the click handler.
 * Every draw unmounts first, so the DOM is rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';
import { bulkPreviewStatusLabel, unknownLabRowsWarning } from '../lab-bulk-paste.mjs';
import { shouldOfferBulkPreviewAddPatient, isRepeatOfEarlierMissingPatient } from './lab-bulk-preview-rules.mjs';

const plural = (n, word) => word + (n === 1 ? '' : 's');
const badReports = (block) => (block.reports || []).filter((r) => !r.ok);

function statusClass(status) {
  if (status === 'ok') return 'lab-bulk-preview-status--ok';
  if (status === 'no-patient' || status === 'parse-errors') return 'lab-bulk-preview-status--err';
  if (status === 'mixed-expediente') return 'lab-bulk-preview-status--warn';
  return 'lab-bulk-preview-status--muted';
}

function blockMeta(block) {
  const parts = [];
  const ok = block.okReportCount || 0;
  const total = block.reportCount || 0;
  const sets = block.setsAfterMerge || 0;
  const omitted = badReports(block).length;
  if (ok) parts.push(ok + '/' + total + ' reportes');
  else if (total) parts.push(total + ' reportes');
  if (sets) parts.push(sets + ' ' + plural(sets, 'conjunto'));
  if (block.daysLabel && block.daysLabel !== '—') parts.push(block.daysLabel);
  if (omitted) parts.push(omitted + ' ' + plural(omitted, 'omitido'));
  return parts.join(' · ');
}

function expedienteLabel(block, status) {
  const list = Array.isArray(block.expedientes) ? block.expedientes : [];
  if (status === 'mixed-expediente' && list.length >= 2) return 'Exp. ' + list.join(' y Exp. ');
  return block.primaryExpediente ? 'Exp. ' + block.primaryExpediente : 'Sin expediente';
}

function ReportIssues({ block }) {
  const bad = badReports(block);
  if (!bad.length) return null;
  const shown = bad.slice(0, 3);
  const more = bad.length - shown.length;
  return (
    <details class="lab-bulk-preview-issues">
      <summary>{bad.length + ' ' + plural(bad.length, 'reporte') + ' ' + plural(bad.length, 'omitido') + ' (ruido del portal)'}</summary>
      <ul>
        {shown.map((r, idx) => (
          <li>
            <span class="lab-bulk-preview-issue-label">{r.expediente ? 'Exp. ' + r.expediente : 'Reporte ' + (idx + 1)}</span>
            {' ' + (r.error || 'No se pudo parsear')}
          </li>
        ))}
        {more > 0 ? <li>{'+' + more + ' más'}</li> : null}
      </ul>
    </details>
  );
}

function ConflictReports({ block }) {
  const conflicts = Array.isArray(block.conflictReports) ? block.conflictReports : [];
  if (!conflicts.length) return null;
  return (
    <details class="lab-bulk-preview-issues lab-bulk-preview-conflicts">
      <summary>{conflicts.length + ' ' + plural(conflicts.length, 'reporte') + ' ' + plural(conflicts.length, 'excluido') + ' (otro expediente, no se guardó)'}</summary>
      <ul>
        {conflicts.map((r) => (
          <li>
            <span class="lab-bulk-preview-issue-label">{r.expediente ? 'Exp. ' + r.expediente : 'Reporte'}</span>
            {' no coincide con ' + (block.patientName || 'el paciente') + ' (' + (block.primaryExpediente || '') + ') — posible otro ingreso u otro paciente'}
          </li>
        ))}
      </ul>
    </details>
  );
}

function RawText({ block }) {
  const raw = String(block.rawText || '').trim();
  if (!raw) return null;
  return (
    <details class="lab-bulk-preview-rawtext">
      <summary>{'Ver texto (' + raw.length + ' caracteres)'}</summary>
      <pre>{raw}</pre>
    </details>
  );
}

function RowActions({ block, idx, blocks }) {
  if (isRepeatOfEarlierMissingPatient(blocks, idx)) {
    return <span class="lab-bulk-preview-status lab-bulk-preview-status--muted">Repetido: se agrega con el de arriba</span>;
  }
  return (
    <>
      <span class={'lab-bulk-preview-status ' + statusClass(block.status)}>{bulkPreviewStatusLabel(block.status)}</span>
      {shouldOfferBulkPreviewAddPatient(block) ? (
        <button type="button" class="wb-btn wb-btn-secondary lab-bulk-preview-add-btn" data-bulk-block-idx={idx} title="Registrar paciente con datos del reporte">Agregar al censo</button>
      ) : null}
    </>
  );
}

function Row({ block, idx, blocks }) {
  const status = block.status || 'unknown';
  const meta = blockMeta(block);
  const unknown = unknownLabRowsWarning([block]);
  return (
    <li class={'lab-bulk-preview-row lab-bulk-preview-row--' + status}>
      <div class="lab-bulk-preview-row-main">
        <div class="lab-bulk-preview-row-text">
          <div class="lab-bulk-preview-row-name">{block.patientName || '—'}</div>
          <div class="lab-bulk-preview-row-meta">{expedienteLabel(block, status) + (meta ? ' · ' + meta : '')}</div>
        </div>
        <div class="lab-bulk-preview-row-aside"><RowActions block={block} idx={idx} blocks={blocks} /></div>
      </div>
      <ReportIssues block={block} />
      {unknown ? <div class="lab-bulk-preview-unknown-rows">{unknown}</div> : null}
      <ConflictReports block={block} />
      <RawText block={block} />
    </li>
  );
}

/** @param {{ blocks: object[] }} props */
export function LabBulkPreviewList({ blocks }) {
  return <ul class="lab-bulk-preview-list">{blocks.map((block, idx) => <Row block={block} idx={idx} blocks={blocks} />)}</ul>;
}

/** Draw into `host`, replacing whatever was there (same effect as the old `host.innerHTML = html`). */
export function drawLabBulkPreviewList(host, blocks) {
  render(null, host);
  host.textContent = '';
  render(<LabBulkPreviewList blocks={blocks} />, host);
}

export function clearLabBulkPreviewList(host) {
  render(null, host);
  host.textContent = '';
}
