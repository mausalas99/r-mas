// Parse a computer-use AX summary dump (app_screenshot / app_ax_find output)
// into {index: {role, title, frame}}. Shared by ax-to-elements.mjs and watch.mjs.
const LINE =
  /^\[(\d+)\]\s+([\w/]+)\s+\[(-?\d+),(-?\d+)\s+(\d+)×(\d+)\](?:\s+"([^"]*)"|\s+\(title withheld\))?\s*$/;

export function parseAx(text) {
  const elements = {};
  for (const line of text.split("\n")) {
    const m = LINE.exec(line.trim());
    if (!m) continue;
    const [, index, role, x, y, w, h, title] = m;
    elements[index] = {
      role,
      title: title ?? null,
      frame: [Number(x), Number(y), Number(w), Number(h)],
    };
  }
  return elements;
}
