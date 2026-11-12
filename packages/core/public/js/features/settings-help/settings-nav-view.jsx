/**
 * Settings side-menu button contents: the icon and the label. Preact: same DOM the innerHTML strings in
 * settings-dropdown.mjs made. The icon shapes are trusted SVG strings from SETTINGS_ICON_PATHS, so the
 * SVG children are listed here as nodes keyed by icon.
 */
import { render } from 'preact';

const ICONS = {
  perfil: () => <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  apariencia: () => <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  respaldos: () => <><path d="M21 8 12 3 3 8v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" /></>,
  laboratorio: () => <><path d="M9 3h6" /><path d="M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" /><path d="M7.5 15h9" /></>,
  documentos: () => <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /></>,
  plantillas: () => <><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 13 9 5 9-5" /></>,
  seguridad: () => <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  aplicacion: () => <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18" /></>,
  nube: () => <path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z" />,
  peligro: () => <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4" /><path d="M12 17h.01" /></>,
};

export function SettingsNavContent({ iconKey, label }) {
  const icon = ICONS[iconKey];
  return (
    <>
      {icon ? (
        <svg class="settings-nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{icon()}</svg>
      ) : null}
      <span>{label}</span>
    </>
  );
}

export const drawSettingsNavContent = (host, props) => render(<SettingsNavContent {...props} />, host);
