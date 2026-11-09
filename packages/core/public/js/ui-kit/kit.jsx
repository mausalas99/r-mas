/**
 * Shared Preact pieces for the app's repeated controls. They draw the classes and tokens the app
 * already has (`.wb-btn`, `.ea-io-link`, native <dialog>), so a screen moved onto the kit looks the same.
 * Toast lives in ./toast.mjs, state in ./store.mjs.
 */
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';

const join = (...parts) => parts.filter(Boolean).join(' ');

/** Filled or outline button: `.wb-btn`, plus `.wb-btn-primary` when `primary`. */
export function Button({ primary, class: cls, children, ...rest }) {
  return (
    <button type="button" class={join('wb-btn', primary && 'wb-btn-primary', cls)} {...rest}>
      {children}
    </button>
  );
}

/** Text-only action: `.ea-io-link`. */
export function TextButton({ class: cls, children, ...rest }) {
  return (
    <button type="button" class={join('ea-io-link', cls)} {...rest}>
      {children}
    </button>
  );
}

/**
 * Window-capture Esc guard: while a kit dialog is the topmost open one, its Esc closes only itself.
 * Stopping the event here keeps every view-level Esc handler (back to list, close pane) from also running;
 * the browser still closes the native <dialog> because the default action is not prevented.
 */
export function stopEscapeBehindDialog(ev, dlg, doc = document) {
  if (ev.key !== 'Escape' || !dlg.open) return false;
  const open = doc.querySelectorAll('dialog[open]');
  if (open[open.length - 1] !== dlg) return false;
  ev.stopPropagation();
  return true;
}

/**
 * Modal dialog on the native <dialog>: title row with «Cerrar», backdrop click and Esc close it.
 * `open` is controlled: set it from state, and `onClose` fires when the dialog closes for any reason.
 * The styling classes come from the screen (`class`, `headClass`, `titleClass`); the kit adds none.
 * @param {{ title: string, open?: boolean, onClose?: () => void, class?: string, headClass?: string,
 *   titleClass?: string, closeProps?: object, children?: any, [attr: string]: any }} props
 */
export function Dialog({ title, open, onClose, class: cls, headClass, titleClass, closeProps, children, ...rest }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    else if (!open && dlg.open) dlg.close();
  }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (ev) => ref.current && stopEscapeBehindDialog(ev, ref.current);
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);
  const close = () => ref.current && ref.current.close();
  return (
    <dialog
      ref={ref}
      class={cls}
      aria-label={title}
      data-kit-dialog
      onClose={() => onClose && onClose()}
      onClick={(ev) => ev.target === ref.current && close()}
      {...rest}
    >
      <div class={headClass}>
        <h3 class={titleClass}>{title}</h3>
        <TextButton onClick={close} {...closeProps}>Cerrar</TextButton>
      </div>
      {children}
    </dialog>
  );
}
