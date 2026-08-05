import {
  isMobileWeb
} from "/mobile/js/chunks/chunk-WOP35WT6.js";
import "/mobile/js/chunks/chunk-XO7Z5S3R.js";
import "/mobile/js/chunks/chunk-GWKS66VB.js";
import "/mobile/js/chunks/chunk-3566DTDN.js";
import "/mobile/js/chunks/chunk-WZAOH7W5.js";
import "/mobile/js/chunks/chunk-CRJYUJ23.js";
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
//# sourceMappingURL=/js/chunks/mobile-lan-boot-XWCCZN2N.js.map
