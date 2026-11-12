/** Diagnóstico rows of the Datos tab. Preact: same rows and data-on* hooks the string builder wrote. */
import { render } from 'preact';

export function DxRows({ rows }) {
  return rows.map((dx, i) => {
    const n = i + 1;
    const arg = '[' + i + ']';
    return (
      <li>
        <label class="exp-datos-list__n" for={'patient-dx-' + n}>{n}</label>
        <input type="text" id={'patient-dx-' + n} class="exp-datos-q" value={dx} placeholder={dx ? undefined : 'Diagnóstico · pegar DX1 + DX2'} aria-label={'Diagnóstico ' + n} style="text-transform:uppercase;" data-oninput="onPatientDxInput" data-oninput-args={arg} data-oninput-pass="value" data-onpaste="splitPatientDxPaste" data-onpaste-args={arg} data-onpaste-pass="event" data-onkeydown="addPatientDxRow" data-onkeydown-keys="Enter" />
        {rows.length > 1 && <button type="button" class="exp-datos-list__rm" data-onclick="removePatientDxRow" data-onclick-args={arg} aria-label={'Quitar diagnóstico ' + n}>×</button>}
      </li>
    );
  });
}

/** Replace the list's rows (fresh nodes, like the old `innerHTML =`). */
export function drawDxRows(host, props) {
  render(null, host);
  host.textContent = '';
  render(<DxRows {...props} />, host);
}

const jsonArgs = (...a) => JSON.stringify(a);

/** «N» next to a section title (the Antibióticos / Medicamentos count). */
export function CensoCount({ kind, count }) {
  return <span class="exp-datos-sec__count" id={'patient-censo-' + kind + '-count'}>{count ? '· ' + count : ''}</span>;
}

/** Antibiótico / medicamento chips. items/struck: [{ name, dia, text }]; editIndex: the line being typed, or -1. */
export function CensoList({ kind, label, empty, items, struck, editIndex }) {
  const lis = items.map((it, i) => {
    if (i === editIndex) {
      return (
        <li><input type="text" class="exp-datos-q" value={it.text} aria-label={label + ' ' + (i + 1)} data-onkeydown="onCensoLineKey" data-onkeydown-keys="Enter,Escape" data-onkeydown-args={jsonArgs(kind, i)} data-onkeydown-pass="event" data-onblur="commitCensoLine" data-onblur-args={jsonArgs(kind, i)} data-onblur-pass="event" /></li>
      );
    }
    const tag = it.dia
      ? <span class="exp-datos-tag">{it.dia}</span>
      : kind === 'atb' ? <span class="exp-datos-tag exp-datos-tag--muted">sin día</span> : null;
    if (kind === 'meds') {
      return (
        <li><button type="button" class="exp-datos-line exp-datos-line--toggle" data-onclick="toggleCensoMed" data-onclick-args={'[' + i + ']'} aria-label={'Tachar ' + it.text}><span class="exp-datos-line__t">{it.name}</span>{tag}</button></li>
      );
    }
    return (
      <li><button type="button" class="exp-datos-line" data-line={i} data-onclick="editCensoLine" data-onclick-args={jsonArgs(kind, i)} aria-label={'Editar ' + it.text}><span class="exp-datos-line__t">{it.name}</span>{tag}</button></li>
    );
  });
  struck.forEach((it, j) => {
    lis.push(
      <li><button type="button" class="exp-datos-line exp-datos-line--struck" data-onclick="toggleCensoMed" data-onclick-args={'[' + (items.length + j) + ']'} aria-label={'Restaurar ' + it.text}><span class="exp-datos-line__t">{it.name}</span></button></li>
    );
  });
  if (!lis.length) {
    lis.push(
      <li><button type="button" class="exp-datos-line exp-datos-line--empty" data-onclick="editCensoLine" data-onclick-args={jsonArgs(kind, 0)}>{empty}</button></li>
    );
  }
  return <ul class="exp-datos-list exp-datos-list--chips" id={'patient-censo-' + kind}>{lis}</ul>;
}

/** Swap `el` for freshly rendered nodes (no HTML string, no Preact root left on it). */
function replaceRendered(el, vnode) {
  const tmp = document.createElement('div');
  render(vnode, tmp);
  el.replaceWith(...tmp.childNodes);
}
export const replaceWithCensoList = (el, props) => replaceRendered(el, <CensoList {...props} />);
export const replaceWithCensoCount = (el, props) => replaceRendered(el, <CensoCount {...props} />);
