
export {
  normalizeEventualidadText,
  toEventualidadDateValue,
  eventualidadDateToIso,
  appendEventualidad,
  updateEventualidad,
  findEventualidadEntry,
  removeEventualidad,
  sortEntriesDesc,
  dayKeyFromIso,
  formatDayLabel,
  formatDaySubLabel,
  groupEntriesByDay,
  normalizeEventualidadKind,
  inferEventualidadKind,
  resolveEventualidadKind,
  pickHigherPriorityKind,
  EVENTUALIDAD_KINDS,
  EVENTUALIDAD_KIND_LABELS,
  resolveEventualidadEntryText,
  buildEventualidadComposeText,
  TRANSFUSION_PRODUCTS,
  TRANSFUSION_PRODUCT_LABELS,
  normalizeTransfusionProduct,
} from './eventualidades-store.mjs';
export { registerEventualidadesRuntime } from './eventualidades-store.mjs';
export {
  renderEventualidadesPanel,
  invalidateEventualidadesPanel,
  savePatientEventualidad,
  savePatientEventualidadesLabs,
  queueEventualidadesPrefill,
  applyEventualidadesPrefill,
  selectEventualidadesLabsMode,
} from './eventualidades-render.mjs';
export {
  getEventualidadesLabsText,
  setEventualidadesLabsText,
  mergeEventualidadesLabsText,
} from './eventualidades-store.mjs';
export { applyDriveImportEventualidades } from './eventualidades-drive.mjs';
