/**
 * Lab manual entry modal pieces. Preact: same DOM the string builders in lab-manual-entry.mjs made
 * (type <option>s and the field grid). Each draw empties the host first, like the old `innerHTML` swap.
 * Reading values, the select value and every handler stay in lab-manual-entry.mjs.
 */
import { render } from 'preact';

/** "Biometría (BH) (BH)" guard: add the key only when the label does not already hold it. */
export function manualTypeLabel(t) {
  let label = String(t.label || t.sectionKey);
  const key = String(t.sectionKey || '');
  if (key && label.indexOf('(' + key + ')') === -1) label = label + ' (' + key + ')';
  return label;
}

export function LabManualTypeOptions({ types }) {
  return (
    <>
      {types.map((t) => <option value={String(t.sectionKey ?? '')}>{manualTypeLabel(t)}</option>)}
    </>
  );
}

export function LabManualFieldGrid({ fields }) {
  if (!fields.length) return <p class="lab-manual-empty">Sin campos para este tipo.</p>;
  return (
    <>
      {fields.map((fld) => (
        <label class="lab-manual-field">
          <span class="lab-manual-field-label">{fld.label}</span>
          <input type="text" class="profile-input lab-manual-field-input" data-field-key={fld.key} data-field-mode={fld.mode} autocomplete="off" spellcheck="false" inputmode={fld.mode === 'num' ? 'decimal' : undefined} />
        </label>
      ))}
    </>
  );
}

function redraw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawLabManualTypeOptions = (selectEl, types) => redraw(selectEl, <LabManualTypeOptions types={types} />);
export const drawLabManualFieldGrid = (host, fields) => redraw(host, <LabManualFieldGrid fields={fields} />);
