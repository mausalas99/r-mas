/**
 * Pide al usuario el día de antibiótico de hoy para cada fila.
 * @param {{ title: string, message: string, rows: { id: string, label: string, dia: number }[] }} opts
 * @returns {Promise<Record<string, number> | null>} id → día de hoy, o null si cancela
 */
export async function openAbxDiaModal(opts) {
  var view = await import("./medications-abx-dia-modal-view.jsx");
  return new Promise(function (resolve) {
    var host = document.createElement("div");
    view.drawAbxDia(host, opts);
    var overlay = host.firstElementChild;
    document.body.appendChild(overlay);
    var inputs = Array.from(overlay.querySelectorAll("[data-abx-dia-id]"));

    function finish(value) {
      overlay.remove();
      resolve(value);
    }
    function save() {
      var out = {};
      for (var i = 0; i < inputs.length; i += 1) {
        var n = parseInt(inputs[i].value, 10);
        if (!Number.isFinite(n) || n < 1) {
          inputs[i].focus();
          return;
        }
        out[inputs[i].getAttribute("data-abx-dia-id")] = n;
      }
      finish(out);
    }
    overlay.querySelector("[data-abx-dia-cancel]").addEventListener("click", function () {
      finish(null);
    });
    overlay.querySelector("[data-abx-dia-ok]").addEventListener("click", save);
    overlay.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") {
        ev.preventDefault();
        save();
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        finish(null);
      }
    });
    queueMicrotask(function () {
      if (inputs[0]) inputs[0].select();
    });
  });
}
