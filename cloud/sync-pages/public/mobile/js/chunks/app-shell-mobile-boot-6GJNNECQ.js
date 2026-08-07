import {
  initCloudMobileBoot
} from "/mobile/js/chunks/chunk-Y6456IR4.js";
import "/mobile/js/chunks/chunk-O4OYLHD6.js";
import "/mobile/js/chunks/chunk-MOLLKB6J.js";
import "/mobile/js/chunks/chunk-OBGB2GI4.js";
import "/mobile/js/chunks/chunk-FGXPGVIE.js";
import "/mobile/js/chunks/chunk-RFW76HSI.js";
import "/mobile/js/chunks/chunk-QIUON47E.js";
import "/mobile/js/chunks/chunk-S2GJRSU7.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-W5HGKDOD.js";
import "/mobile/js/chunks/chunk-S6K5O6BP.js";
import "/mobile/js/chunks/chunk-TBKNEONY.js";
import "/mobile/js/chunks/chunk-OXMUDSQA.js";
import "/mobile/js/chunks/chunk-BP4QC5UJ.js";
import "/mobile/js/chunks/chunk-2ZXFDPTM.js";
import "/mobile/js/chunks/chunk-3ETJLEUF.js";
import "/mobile/js/chunks/chunk-ZQ44CCKF.js";
import "/mobile/js/chunks/chunk-VL5J4B3E.js";
import "/mobile/js/chunks/chunk-QQOJTZU6.js";
import "/mobile/js/chunks/chunk-N74FWNUD.js";
import "/mobile/js/chunks/chunk-PAAJVTB4.js";
import "/mobile/js/chunks/chunk-AKP3FGXS.js";
import "/mobile/js/chunks/chunk-WD3AJTQB.js";
import "/mobile/js/chunks/chunk-LTZPVWLE.js";
import "/mobile/js/chunks/chunk-4NDVAGJX.js";
import "/mobile/js/chunks/chunk-PEG2E4FB.js";
import "/mobile/js/chunks/chunk-SFXEUBWR.js";
import "/mobile/js/chunks/chunk-IVOJHSUB.js";
import "/mobile/js/chunks/chunk-GTJXSHII.js";
import "/mobile/js/chunks/chunk-KPMBH6IG.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-LUBBZBEB.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-ZQE77EGT.js";
import "/mobile/js/chunks/chunk-RU5G223P.js";
import "/mobile/js/chunks/chunk-CO6ZSBF2.js";
import "/mobile/js/chunks/chunk-T4WWDITM.js";
import "/mobile/js/chunks/chunk-QWJHEGH4.js";
import "/mobile/js/chunks/chunk-7S6BFQ5R.js";
import "/mobile/js/chunks/chunk-B4Q7USSM.js";
import "/mobile/js/chunks/chunk-T2MO3KS5.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-KLMIZH6A.js";
import "/mobile/js/chunks/chunk-GPBMQXYE.js";
import "/mobile/js/chunks/chunk-LQTSNMET.js";
import "/mobile/js/chunks/chunk-MGEK6PHD.js";
import "/mobile/js/chunks/chunk-GRJDNRYE.js";
import "/mobile/js/chunks/chunk-PIQOYX4G.js";
import "/mobile/js/chunks/chunk-FORXNEKH.js";

// public/js/app-shell-mobile-boot.mjs
function setMobileBootBanner(visible, text) {
  const el = document.getElementById("rpc-mobile-boot-banner");
  if (!el) return;
  if (text) el.textContent = text;
  el.classList.toggle("is-visible", !!visible);
}
async function initMobileWebBoot() {
  await initCloudMobileBoot();
}
export {
  initMobileWebBoot,
  setMobileBootBanner
};
//# sourceMappingURL=/js/chunks/app-shell-mobile-boot-6GJNNECQ.js.map
