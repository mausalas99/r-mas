import { esc } from "../dom-escape.mjs";
import { STACKED_BACKDROP_CLASS } from "./cloud-sync/stacked-overlay.mjs";

/**
 * Pide al usuario el día de antibiótico de hoy para cada fila.
 * @param {{ title: string, message: string, rows: { id: string, label: string, dia: number }[] }} opts
 * @returns {Promise<Record<string, number> | null>} id → día de hoy, o null si cancela
 */
export function openAbxDiaModal(opts) {
  return new Promise(function (resolve) {
    var host = document.createElement("div");
    host.innerHTML =
      '<div class="' + STACKED_BACKDROP_CLASS + '" data-abx-dia-modal>' +
      '<div class="lab-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="abx-dia-title">' +
      '<h3 id="abx-dia-title" style="margin:0 0 10px;">' + esc(opts.title) + "</h3>" +
      '<p style="font-size:13px;line-height:1.45;margin:0 0 14px;color:var(--text-muted);">' + esc(opts.message) + "</p>" +
      opts.rows
        .map(function (r) {
          return (
            '<label style="display:flex;align-items:center;gap:10px;margin:0 0 10px;font-size:13px;">' +
            '<span style="flex:1;">' + esc(r.label) + "</span>" +
            "Día " +
            '<input type="number" min="1" step="1" class="profile-input" style="width:72px;" data-abx-dia-id="' +
            esc(r.id) + '" value="' + esc(String(r.dia)) + '" aria-label="Día de ' + esc(r.label) + '" />' +
            "</label>"
          );
        })
        .join("") +
      '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">' +
      '<button type="button" class="cloud-sync-btn cloud-sync-btn--ghost" data-abx-dia-cancel>Cancelar</button>' +
      '<button type="button" class="cloud-sync-btn" data-abx-dia-ok>Guardar</button>' +
      "</div></div></div>";
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
