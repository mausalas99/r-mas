/** VPO screen state that the panel and the Preact calculator form share. */
import { createStore } from '../ui-kit/store.mjs';

/** Key of the «Otras escalas» tab showing; '' = the first one. */
export const vpoScaleTab = createStore('');
/** `data-vpo-dialog` key of the dialog that is open; a panel redraw reopens it. '' = none. */
export const vpoOpenDialog = createStore('');
