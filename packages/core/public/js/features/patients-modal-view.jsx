/**
 * «Completar ingreso» (Interconsultas) service picker: the buttons inside #m-ic-svc.
 * Preact: same buttons, classes and aria-pressed the DOM loop in patients-modal.mjs made.
 * The modal owns the value fields and the pick callback. Every draw unmounts first, so the
 * buttons are rebuilt from scratch like the old `innerHTML = ''` reset.
 */
import { render } from 'preact';

export function IcServiceButtons({ names, selected, onPick }) {
  return (
    <>
      {names.map((name) => {
        const on = name === selected;
        return (
          <button type="button" aria-pressed={on ? 'true' : 'false'} class={'wb-btn ' + (on ? 'wb-btn-primary' : 'wb-btn-secondary')}
            onClick={() => onPick(name)}>{name}</button>
        );
      })}
    </>
  );
}

export function drawIcServiceButtons(host, names, selected, onPick) {
  render(null, host);
  host.textContent = '';
  render(<IcServiceButtons names={names} selected={selected} onPick={onPick} />, host);
}
