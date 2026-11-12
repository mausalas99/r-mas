/**
 * "Copiar varios días" modal body. Preact: same DOM, ids, classes and data-* hooks the string
 * builder in lab-history-batch-copy-modal.mjs made. Drawn once into the backdrop; the checkboxes,
 * preview and count are then edited in place by the modal's handlers, so nothing here may re-render.
 */
import { render } from 'preact';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** dayKey is "YYYY-M-D" (dayKeyFromLabSet); anything else shows the raw label. */
function dayRowParts(group) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(group.dayKey);
  if (!m) return { date: group.label, weekday: '' };
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return { date: ('0' + m[3]).slice(-2) + '/' + ('0' + m[2]).slice(-2), weekday: WEEKDAYS[d.getDay()] };
}

function DayRow({ group }) {
  const parts = dayRowParts(group);
  const n = group.sets.length;
  return (
    <label class="lab-copydays-row">
      <input type="checkbox" class="lab-batch-copy-cb" data-day-key={group.dayKey} data-sends={String(n)} />
      <span class="lab-copydays-box" aria-hidden="true"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg></span>
      <span class="lab-copydays-date">{parts.date}</span>
      <span class="lab-copydays-wd">{parts.weekday}</span>
      <span class="lab-copydays-sends">{n > 1 ? n + ' envíos' : ''}</span>
    </label>
  );
}

export function BatchCopyModal({ groups }) {
  return (
    <div class="lab-conflict-modal lab-copydays" role="dialog" aria-modal="true" aria-labelledby="lab-batch-copy-title">
      <div class="lab-copydays-head"><h3 id="lab-batch-copy-title">Copiar varios días</h3>
        <button type="button" id="lab-batch-copy-close" class="lab-copydays-close" aria-label="Cerrar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg></button></div>
      <p class="lab-copydays-sub">Marca los días. Se copia el bloque Estudios de cada día, con laboratorio y cultivos.</p>
      <div class="lab-copydays-chips">
        <button type="button" class="lab-copydays-chip" data-pick="3">Últimos 3</button>
        <button type="button" class="lab-copydays-chip" data-pick="7">Últimos 7</button>
        <button type="button" class="lab-copydays-chip" data-pick="all">Todos</button>
        <button type="button" class="lab-copydays-chip" data-pick="none">Ninguno</button>
      </div>
      <div class="lab-copydays-list">{groups.map((g) => <DayRow group={g} />)}</div>
      <div class="lab-copydays-h">Vista previa</div>
      <textarea id="lab-batch-copy-preview" class="lab-copydays-preview" readonly rows={4} aria-label="Vista previa"></textarea>
      <div class="lab-copydays-foot">
        <span id="lab-batch-copy-count" class="lab-copydays-count" aria-live="polite"></span>
        <button type="button" id="lab-batch-copy-ok" class="wb-btn wb-btn-primary" disabled aria-disabled="true">Copiar al portapapeles</button>
      </div>
    </div>
  );
}

export function drawBatchCopyModal(backdrop, groups) {
  render(<BatchCopyModal groups={groups} />, backdrop);
}
