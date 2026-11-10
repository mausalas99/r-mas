/**
 * Ajustes → «Plantillas» section body. Preact (Phase 3): same DOM, classes and data-onclick hooks the static
 * partial had. settings-dropdown.mjs still turns the <details> into a panel (drops the summary, adds the title),
 * so Preact owns only the body's children and is drawn once at boot, before that code reads the body.
 */
import { render } from 'preact';
import { Button } from '../ui-kit/kit.jsx';

const CARDS = [
  { title: 'Plantillas de indicaciones', desc: 'Combinaciones de dieta, cuidados y medicamentos aplicables desde Indicaciones.', label: 'Administrar…', action: 'openExtraTemplatesManager', kind: 'secondary' },
  { title: 'Formatos de nota', desc: 'Plantilla en blanco de la nota. Solo llena secciones vacías.', label: 'Editar…', action: 'openNoteFormatsFromProfile', kind: 'secondary' },
  { title: 'Formatos de indicaciones', desc: 'Plantilla en blanco de las indicaciones.', label: 'Editar…', action: 'openIndicaFormatsFromProfile', kind: 'secondary' },
  { title: 'Restablecer formatos', label: 'Restablecer en blanco', action: 'resetProfileTemplates', kind: 'ghost' },
];

export function SettingsTemplates() {
  return (
    <div class="settings-card-stack">
      {CARDS.map(({ title, desc, label, action, kind }) => (
        <div class="settings-card">
          <div class="settings-card__copy">
            <p class="settings-card__title">{title}</p>
            {desc && <p class="settings-card__desc settings-acc-hint settings-acc-hint--tight">{desc}</p>}
          </div>
          <div class="settings-card__action">
            <Button class={`wb-btn-${kind} wb-btn-sm`} data-onclick={action}>{label}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Draw the cards into the empty #settings-templates-body. Call before settings-dropdown.mjs builds the panels. */
export function mountSettingsTemplates() {
  const host = document.getElementById('settings-templates-body');
  if (host && !host.firstElementChild) render(<SettingsTemplates />, host);
}
