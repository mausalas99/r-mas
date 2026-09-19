// Minimal CDP client shared by cdp-elements.mjs and audit.mjs: one WebSocket
// connection, reused across many evaluate/click calls instead of reconnecting
// (and respawning node) per step — that per-step respawn was the actual slow
// part of routing every click through separate CLI invocations.
export async function connectCdp(port = 9222) {
  const targets = await fetch(`http://localhost:${port}/json`).then((r) => r.json());
  const page = targets.find((t) => t.type === "page");
  if (!page) throw new Error("No page target found on the CDP port.");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const consoleErrors = [];
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method === "Runtime.exceptionThrown") {
      consoleErrors.push(msg.params.exceptionDetails.text ?? JSON.stringify(msg.params.exceptionDetails));
    } else if (msg.method === "Log.entryAdded" && msg.params.entry.level === "error") {
      consoleErrors.push(msg.params.entry.text);
    }
  });

  const send = (method, params = {}) => {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await send("Runtime.enable");
  await send("Log.enable");

  return {
    consoleErrors,
    async evaluate(expression) {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    },
    async click(x, y) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    },
    async screenshot() {
      const r = await send("Page.captureScreenshot", { format: "png" });
      return r.data;
    },
    close() {
      ws.close();
    },
  };
}
