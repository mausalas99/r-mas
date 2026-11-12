/**
 * Release-notes list. Preact: same <li> markup the createElement loop in release-notes.mjs made.
 * Bodies are curated copy with `<strong>` runs only, drawn as nodes, no HTML string.
 */
import { render } from 'preact';

function Rich({ text }) {
  return text.split(/<strong>(.*?)<\/strong>/g).map((part, i) => (i % 2 ? <strong>{part}</strong> : part));
}

export function ReleaseNotesList({ notes }) {
  return notes.map((n) => (
    <li class="release-notes-item">
      <p class="release-notes-item-title">{n.title || ''}</p>
      <p class="release-notes-item-body"><Rich text={n.body == null ? '' : String(n.body)} /></p>
    </li>
  ));
}

export function drawReleaseNotes(host, notes) {
  render(null, host);
  host.textContent = '';
  render(<ReleaseNotesList notes={notes || []} />, host);
}
