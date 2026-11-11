/**
 * Feature-hints drawing: the step bubble and the one-time "activar pistas" dialog. Preact: same DOM,
 * classes and data-fh-choice hook the innerHTML strings in feature-hints.mjs made. Where the bubble
 * sits, which step shows and what each click does stay in that module. Every draw unmounts first, so
 * the DOM is rebuilt from scratch like the old `innerHTML` swap.
 */
import { render } from 'preact';

/** Hint copy from FEATURE_HINTS: plain text with `<strong>` runs only. Drawn as nodes, no HTML string. */
function Rich({ text }) {
  return text.split(/<strong>(.*?)<\/strong>/g).map((part, i) => (i % 2 ? <strong>{part}</strong> : part));
}

export function HintBubble({ badge, n, total, text, last, action }) {
  return (
    <>
      <div class="fh-bubble-head">
        <span class="fh-bubble-badge">{`${badge} · ${n}/${total}`}</span>
        <button type="button" class="fh-close" aria-label="Cerrar">×</button>
      </div>
      <p class="fh-bubble-text"><Rich text={text} /></p>
      {action ? null : (
        <div class="fh-bubble-foot">
          <button type="button" class="wb-btn wb-btn-primary fh-next">{last ? 'Entendido' : 'Siguiente'}</button>
        </div>
      )}
    </>
  );
}

/** @param {{ step: 1 | 2 }} props 1 = ask; 2 = after "Desactivar pistas", where to turn them back on. */
export function HintsChoice({ step }) {
  return (
    <div class="fh-choice" role="dialog" aria-modal="true" aria-labelledby="fh-choice-title">
      {step === 1 ? (
        <>
          <h2 id="fh-choice-title">Nuevo: pistas en pantalla</h2>
          <p>R+ puede mostrar pistas junto a los botones, para enseñarte a usar cada área y contarte las novedades.</p>
          <p>Cada pista se cierra con la <strong>×</strong>. Elige si quieres verlas.</p>
          <div class="fh-choice-actions">
            <button type="button" class="wb-btn wb-btn-secondary" data-fh-choice="off">Desactivar pistas</button>
            <button type="button" class="wb-btn wb-btn-primary" data-fh-choice="on">Activar pistas</button>
          </div>
        </>
      ) : (
        <>
          <h2 id="fh-choice-title">Pistas desactivadas</h2>
          <p>Puedes activarlas otra vez cuando quieras en:</p>
          <p class="fh-choice-path"><strong>Ajustes → Apariencia → Pistas en pantalla</strong></p>
          <div class="fh-choice-actions">
            <button type="button" class="wb-btn wb-btn-secondary" data-fh-choice="where">Mostrarme dónde</button>
            <button type="button" class="wb-btn wb-btn-primary" data-fh-choice="ok">Entendido</button>
          </div>
        </>
      )}
    </div>
  );
}

function draw(host, vnode) {
  render(null, host);
  host.textContent = '';
  render(vnode, host);
}

export const drawHintBubble = (host, props) => draw(host, <HintBubble {...props} />);
export const drawHintsChoice = (host, step) => draw(host, <HintsChoice step={step} />);
