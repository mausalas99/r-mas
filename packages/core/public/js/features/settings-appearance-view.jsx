/**
 * Ajustes → «Apariencia» section body. Preact (Phase 3): same DOM, ids, classes and data-* hooks the static
 * partial had. UI only: theme, font zoom, density, contrast, motion, hardware acceleration and feature hints
 * keep their owners; buttons and checkboxes are wired by id / data-onclick and filled by those modules.
 * Every control is UNCONTROLLED and drawn once at boot. settings-dropdown.mjs still turns the <details> into a panel.
 */
import { render } from 'preact';

const HINT = 'settings-card__desc settings-acc-hint settings-acc-hint--tight';

function Row({ label, i18n, wide, aria, children }) {
  return (
    <div class={`settings-form-row${wide ? ' settings-form-row--wide' : ''}`}>
      <div class="settings-form-label" data-i18n={i18n}>{label}</div>
      <div class="settings-theme-row settings-theme-row--fit" id={aria.id} role="group" aria-label={aria.label} data-i18n-aria-label={aria.i18n}>
        {children}
      </div>
    </div>
  );
}

const Opt = ({ id, action, arg, i18n, children }) => (
  <button type="button" class="settings-theme-btn" id={id} data-onclick={action} data-onclick-args={JSON.stringify([arg])} data-i18n={i18n}>{children}</button>
);

function Toggle({ id, labelId, describedBy, action }) {
  return (
    <label class="settings-card__action settings-card__toggle-label" for={id}>
      <input type="checkbox" class="settings-card__toggle" id={id} aria-labelledby={labelId} aria-describedby={describedBy} data-onchange={action} data-onchange-pass="checked" />
    </label>
  );
}

export function SettingsAppearance() {
  return (
    <>
      <Row label="Tema" i18n="settings.theme" aria={{ label: 'Tema de la aplicación', i18n: 'settings.themeGroup' }}>
        <Opt id="settings-theme-light" action="setThemeMode" arg="light" i18n="settings.themeLight">Claro</Opt>
        <Opt id="settings-theme-dark" action="setThemeMode" arg="dark" i18n="settings.themeDark">Oscuro</Opt>
      </Row>
      <Row label="Tamaño de texto" i18n="settings.fontSize" aria={{ id: 'settings-font-zoom-row', label: 'Tamaño de texto', i18n: 'settings.fontSize' }}>
        <Opt id="settings-font-100" action="setFontZoom" arg={100} i18n="settings.fontNormal">Normal</Opt>
        <Opt id="settings-font-110" action="setFontZoom" arg={110} i18n="settings.fontLarge">Grande</Opt>
        <Opt id="settings-font-125" action="setFontZoom" arg={125} i18n="settings.fontXLarge">Más grande</Opt>
      </Row>
      <Row label="Modo de vista" i18n="settings.uiDensity" aria={{ label: 'Modo de vista', i18n: 'settings.uiDensity' }}>
        <Opt id="settings-density-normal" action="setUiDensity" arg="normal" i18n="settings.densityNormal">Normal</Opt>
      </Row>
      <Row label="Alto contraste" i18n="settings.highContrast" aria={{ label: 'Alto contraste', i18n: 'settings.highContrast' }}>
        <Opt id="settings-hc-off" action="setHighContrast" arg={false} i18n="settings.hcOff">Desactivado</Opt>
        <Opt id="settings-hc-on" action="setHighContrast" arg={true} i18n="settings.hcOn">Activado</Opt>
      </Row>
      <Row wide label="Animaciones" i18n="settings.motion" aria={{ label: 'Animaciones', i18n: 'settings.motion' }}>
        <Opt id="settings-motion-sobrio" action="setMotionMode" arg="sobrio" i18n="settings.motionSobrio">Sobrio</Opt>
        <Opt id="settings-motion-mixto" action="setMotionMode" arg="mixto" i18n="settings.motionMixto">Mixto</Opt>
        <Opt id="settings-motion-expresivo" action="setMotionMode" arg="expresivo" i18n="settings.motionExpresivo">Expresivo</Opt>
      </Row>
      <div id="settings-accordion-performance">
        <p class="settings-section-label">Rendimiento</p>
        <div class="settings-card-stack">
          <div class="settings-card settings-card--toggle">
            <div class="settings-card__copy">
              <p class="settings-card__title" id="settings-hardware-acceleration-title">Aceleración por hardware</p>
              <p class={HINT} id="settings-hardware-acceleration-hint">Gráficas más suaves. Usa más memoria. Pide reiniciar R+.</p>
            </div>
            <Toggle id="settings-hardware-acceleration" labelId="settings-hardware-acceleration-title" describedBy="settings-hardware-acceleration-hint" action="onHardwareAccelerationChange" />
          </div>
        </div>
      </div>
      <div class="settings-card-stack">
        <div class="settings-card settings-card--toggle" id="settings-feature-hints-card">
          <div class="settings-card__copy">
            <p class="settings-card__title" id="settings-feature-hints-title">Pistas en pantalla</p>
            <p class={HINT}>Globos junto a los botones que enseñan R+ y cuentan las novedades.</p>
          </div>
          <Toggle id="settings-feature-hints" labelId="settings-feature-hints-title" action="setFeatureHintsEnabledFromSettings" />
        </div>
      </div>
      <p class="settings-form-foot overview-hint settings-acc-hint" data-i18n="settings.appearanceFoot">⌘G/I/S cambian modo Guardia/Inter/Sala. Tamaño escala toda la interfaz. Mixto equilibra las animaciones.</p>
    </>
  );
}

/** Draw the section into the empty #settings-appearance-body. Call before settings-dropdown.mjs builds the panels. */
export function mountSettingsAppearance() {
  const host = document.getElementById('settings-appearance-body');
  if (host && !host.firstElementChild) render(<SettingsAppearance />, host);
}
