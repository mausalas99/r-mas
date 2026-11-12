/**
 * Interconsult catalog modals (interconsultantes picker, Servicio solicitante picker). Preact: same DOM,
 * classes and data-* hooks the string builders in ic-modal.mjs made. ic-modal.mjs keeps the catalog
 * lookups, the open/close layer and the click handler on the panel.
 */
import { render } from 'preact';

/** @param {{ id: string, name: string, hue: number, on: boolean }} s */
function Chip({ s, attr }) {
  return <button type="button" class={s.on ? 'svc is-on' : 'svc'} style={'--h:' + s.hue} {...{ [attr]: s.id }}>{s.name}</button>;
}

/** @param {{ groups: { label: string, services: { id: string, name: string, hue: number, on: boolean }[] }[] }} p */
export function IcPicker({ groups }) {
  return groups.map((g) => (
    <div class="ic-cat"><small>{g.label}</small>
      <div class="chips">{g.services.map((s) => <Chip s={s} attr="data-ic-toggle" />)}</div>
    </div>
  ));
}

/** Whole interconsultantes panel body. */
export function IcPanel({ groups }) {
  return (
    <>
      <h3 id="patient-ic-title">Servicios interconsultantes</h3>
      <div id="ic-picker"><IcPicker groups={groups} /></div>
      <button type="button" class="wb-btn wb-btn-secondary" data-ic-done="">Listo</button>
    </>
  );
}

/** Flat chip row for the requesting service. @param {{ services: { id: string, name: string, hue: number, on: boolean }[] }} p */
export function ServicePicker({ services }) {
  return <div class="chips">{services.map((s) => <Chip s={s} attr="data-svc-pick" />)}</div>;
}

/** Whole Servicio solicitante panel body. */
export function ServicePanel({ services }) {
  return (
    <>
      <h3 id="patient-svc-pick-title">Servicio solicitante</h3>
      <div id="svc-picker"><ServicePicker services={services} /></div>
      <button type="button" class="wb-btn wb-btn-secondary" data-svc-pick-done="">Cerrar</button>
    </>
  );
}

export const drawIcPanel = (panel, groups) => render(<IcPanel groups={groups} />, panel);
export const drawServicePanel = (panel, services) => render(<ServicePanel services={services} />, panel);
