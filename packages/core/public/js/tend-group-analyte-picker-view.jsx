/**
 * Analyte picker of the group / dynamic table: the chips + "Agregar analito" bar, the study list and the
 * analyte list of its dropdown, and the hint line. Preact: same DOM and classes the string builders in
 * tend-group-analyte-picker.mjs made. The search box, focus, outside-click closing and the add / remove
 * rules stay in the .mjs, which passes the click handlers in. Every draw unmounts first and wipes the host,
 * like the old `innerHTML` swap.
 */
import { render } from 'preact';

const X_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function PivotHint({ text }) {
  return <p class="tend-pivot-hint">{text}</p>;
}

export function PickerBar({ chips, onAdd, onRemove }) {
  return (
    <>
      <div class="tend-analyte-picker-bar">
        {chips.map((c) => (
          <span class="tend-pivot-chip" title={c.secLabel}>
            {c.name}
            <button type="button" class="tend-pivot-chip-x" data-remove-extra={c.key} aria-label={'Quitar ' + c.name} onClick={(ev) => onRemove(ev, c.key)}>{X_ICON}</button>
          </span>
        ))}
        <button type="button" class="tend-pill tend-analyte-picker-add-btn" onClick={onAdd}>+ Agregar analito</button>
      </div>
      <PivotHint text="Marca un analito en la lista de la izquierda para agregarlo o quitarlo." />
    </>
  );
}

export function SectionList({ groups, onPick }) {
  if (!groups.length) return <p class="tend-analyte-picker-empty">Sin estudios que coincidan.</p>;
  return (
    <>
      {groups.map((g) => (
        <button type="button" class="tend-analyte-picker-option" data-section-key={g.sectionKey} onClick={(ev) => onPick(ev, g.sectionKey)}>{g.label}</button>
      ))}
    </>
  );
}

export function FieldList({ label, fields, onBack, onPick }) {
  return (
    <>
      <button type="button" class="tend-analyte-picker-back" onClick={onBack}>{'‹ ' + label}</button>
      {fields.length ? (
        fields.map((f) => (
          <button type="button" class="tend-analyte-picker-option" data-field-key={f.fieldKey} onClick={(ev) => onPick(ev, f.fieldKey)}>{f.title}</button>
        ))
      ) : (
        <p class="tend-analyte-picker-empty">Sin analitos que coincidan.</p>
      )}
    </>
  );
}

function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawPickerBar = (slot, props) => draw(slot, <PickerBar {...props} />);
export const drawSectionList = (list, props) => draw(list, <SectionList {...props} />);
export const drawFieldList = (list, props) => draw(list, <FieldList {...props} />);
export const drawPivotHint = (host, text) => draw(host, <PivotHint text={text} />);
