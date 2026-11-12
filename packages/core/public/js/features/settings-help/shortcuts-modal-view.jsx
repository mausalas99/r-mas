/** Shortcuts cheat sheet body. Preact: same sections the string builder in shortcuts-modal.mjs wrote. */
import { render } from 'preact';

const keyLabel = (key, mod) => String(key).replace(/⌘/g, mod).replace(/Ctrl/g, mod);

export function ShortcutsBody({ groups, mod }) {
  return groups.map((group) => (
    <section class="shortcuts-section">
      <h4 class="shortcuts-section-title">{group.title}</h4>
      <ul class="shortcuts-rows">
        {group.items.map((item) => (
          <li class="shortcuts-row">
            <div class="shortcuts-row-copy">
              <span class="shortcuts-row-label">{item.label}</span>
              {item.hint ? <span class="shortcuts-row-hint">{item.hint}</span> : null}
            </div>
            <span class="shortcuts-key-group">{item.keys.map((k) => <kbd class="shortcuts-key">{keyLabel(k, mod)}</kbd>)}</span>
          </li>
        ))}
      </ul>
    </section>
  ));
}

export function drawShortcutsBody(host, props) {
  render(null, host);
  host.textContent = '';
  render(<ShortcutsBody {...props} />, host);
}
