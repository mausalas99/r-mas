import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-S2OQTBTO.js";
import "/mobile/js/chunks/chunk-SUI526FO.js";
import "/mobile/js/chunks/chunk-W6RRSTLS.js";
import "/mobile/js/chunks/chunk-CCQC427D.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-QPJXCZUR.js";
import "/mobile/js/chunks/chunk-7I2DYQ7W.js";

// public/js/mobile-lan-boot.mjs
function scheduleMobileLanWork(fn) {
  if (!isMobileWeb()) {
    void Promise.resolve().then(fn);
    return;
  }
  const run = () => {
    try {
      void Promise.resolve(fn());
    } catch (e) {
      console.warn("[R+] mobile LAN boot:", e && e.message);
    }
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(run, { timeout: 800 });
      } else {
        setTimeout(run, 50);
      }
    });
  } else {
    setTimeout(run, 50);
  }
}
export {
  scheduleMobileLanWork
};
//# sourceMappingURL=/js/chunks/mobile-lan-boot-OR2BYHKT.js.map
