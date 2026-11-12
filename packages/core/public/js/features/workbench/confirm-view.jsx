/**
 * Workbench confirm modal, Preact. Same markup confirm.mjs used to write as a string.
 */
import { render } from 'preact';

function Consequence({ label, text }) {
  return (
    <div class="wb-confirm-consequence">
      {label ? <span class="wb-confirm-consequence-label">{label}</span> : null}
      <span class="wb-confirm-consequence-text">{text}</span>
    </div>
  );
}

function ConfirmInput({ label, value, type }) {
  return (
    <input type={type === 'password' ? 'password' : 'text'} class="wb-confirm-input" data-wb-confirm-input autocomplete="off" aria-label={label} value={value} />
  );
}

function Footer({ weight, secondaryLabel, cancelLabel, confirmLabel }) {
  return (
    <div class={weight === 'consequence' ? 'wb-confirm-footer wb-confirm-footer--rail' : 'wb-confirm-footer'}>
      {secondaryLabel ? <button type="button" class="wb-btn wb-btn-ghost" data-wb-confirm-secondary>{secondaryLabel}</button> : null}
      <div class="wb-confirm-footer-actions">
        <button type="button" class="wb-btn wb-btn-secondary" data-wb-confirm-cancel>{cancelLabel}</button>
        <button type="button" class={weight === 'destructive' ? 'wb-btn wb-btn-danger' : 'wb-btn wb-btn-primary'} data-wb-confirm-ok>{confirmLabel}</button>
      </div>
    </div>
  );
}

/** @param {Record<string, any>} p confirm options (weight, title, message, labels, input) */
export function ConfirmModal({
  weight,
  title = '',
  message = '',
  consequenceLabel = '',
  consequenceText = '',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  secondaryLabel = '',
  inputLabel = '',
  inputValue = '',
  inputType = 'text',
}) {
  return (
    <div class="wb-scrim" data-wb-confirm-backdrop>
      <div class={`wb-confirm-modal wb-confirm-modal--${weight}`} role="dialog" aria-modal="true">
        <div class="wb-confirm-body">
          <span class="wb-confirm-title">{title}</span>
          {weight === 'consequence' && consequenceText ? <Consequence label={consequenceLabel} text={consequenceText} /> : null}
          {message ? <span class="wb-confirm-message">{message}</span> : null}
          {inputLabel ? <ConfirmInput label={inputLabel} value={inputValue} type={inputType} /> : null}
        </div>
        <Footer weight={weight} secondaryLabel={secondaryLabel} cancelLabel={cancelLabel} confirmLabel={confirmLabel} />
      </div>
    </div>
  );
}

/** The scrim element, ready to append to the body (static markup; the caller wires it). */
export function buildConfirmBackdrop(opts) {
  const host = document.createElement('div');
  render(<ConfirmModal {...opts} />, host);
  return host.firstElementChild;
}
