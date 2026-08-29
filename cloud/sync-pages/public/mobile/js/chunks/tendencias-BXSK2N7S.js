import {
  ascitisInterpretacionBody_,
  citoquimInterpretacionBody_,
  closeLabDisplayPrefsModal,
  closeTendDetail,
  closeTendGroupModal,
  closeTendHiddenModal,
  copyTendGroupTablePng,
  copyTendGroupTableText,
  formatBhExtendedTabLine,
  getLabOutputPrefs,
  isAscitisInterpretacionResLabChunk,
  isBhMainResLabChunk,
  isCitoquimInterpretacionResLabChunk,
  isGasoInterpretacionResLabChunk,
  isTendGroupModalOpen,
  onLabDisplayPrefsChanged,
  openLabDisplayPrefsModal,
  openTendDetail,
  openTendGasoExtendedModal,
  openTendGroupModal,
  openTendHiddenModal,
  registerTendenciasRuntime,
  renderTendencias,
  seedTendHiddenDefaults,
  setLabOutputPrefs,
  setTendGroupTab,
  tendCardActivate,
  tendHideSeriesFromCard,
  tendResetAllHiddenSeries,
  tendUnhideSeries,
  tendenciasWindowHandlers,
  toggleTendAbnormalOnlyFilter,
  toggleTendSection
} from "/mobile/js/chunks/chunk-MKMDQNAK.js";
import "/mobile/js/chunks/chunk-HNEGYFPT.js";
import "/mobile/js/chunks/chunk-NXF6E32Y.js";
import "/mobile/js/chunks/chunk-O6PRRCV3.js";
import "/mobile/js/chunks/chunk-64GPJDUL.js";
import "/mobile/js/chunks/chunk-ZNI4EPCO.js";
import "/mobile/js/chunks/chunk-XBVMN72A.js";
import "/mobile/js/chunks/chunk-MB77G5WL.js";
import "/mobile/js/chunks/chunk-MST23B4T.js";
import "/mobile/js/chunks/chunk-WSJX2ILZ.js";
import "/mobile/js/chunks/chunk-36QQC646.js";
import "/mobile/js/chunks/chunk-DIWOGDCA.js";
import "/mobile/js/chunks/chunk-JAVEC37I.js";
import "/mobile/js/chunks/chunk-HABESGMS.js";
import "/mobile/js/chunks/chunk-FN6TV54N.js";
import "/mobile/js/chunks/chunk-A3RN2FNA.js";
import "/mobile/js/chunks/chunk-YR5I2T5V.js";
import "/mobile/js/chunks/chunk-BZFH7ZFF.js";
import "/mobile/js/chunks/chunk-22PMAIWL.js";
import "/mobile/js/chunks/chunk-ATT36THA.js";
import "/mobile/js/chunks/chunk-O5BLBOGB.js";
import "/mobile/js/chunks/chunk-PVAHDYTI.js";
import "/mobile/js/chunks/chunk-P6VHYBXO.js";
import "/mobile/js/chunks/chunk-M7VR4TZJ.js";
import "/mobile/js/chunks/chunk-JOF7DXVU.js";
import "/mobile/js/chunks/chunk-2DZ4BCVC.js";
import "/mobile/js/chunks/chunk-UKBXHDKP.js";
import "/mobile/js/chunks/chunk-VPWSQYDS.js";
import "/mobile/js/chunks/chunk-MZJL4LWP.js";
import "/mobile/js/chunks/chunk-QAC2VFLD.js";
import "/mobile/js/chunks/chunk-TMPFUFBU.js";
import "/mobile/js/chunks/chunk-WQ5L4FZX.js";
import "/mobile/js/chunks/chunk-ONL4KPJ3.js";
import "/mobile/js/chunks/chunk-Y7GW6JFZ.js";
import "/mobile/js/chunks/chunk-U6BZK27B.js";
import "/mobile/js/chunks/chunk-XWG2LQDN.js";
import "/mobile/js/chunks/chunk-FLRAL5YB.js";
import "/mobile/js/chunks/chunk-PWDSP7QN.js";
import "/mobile/js/chunks/chunk-VDGV3EZB.js";
import "/mobile/js/chunks/chunk-EM634A4Q.js";
import "/mobile/js/chunks/chunk-S7KMFXOR.js";
import "/mobile/js/chunks/chunk-43SWAHG6.js";
import "/mobile/js/chunks/chunk-VORZBJRG.js";
import "/mobile/js/chunks/chunk-CT2YJYKC.js";
import "/mobile/js/chunks/chunk-RSNFY6IK.js";
import "/mobile/js/chunks/chunk-DKL3XNPH.js";
import "/mobile/js/chunks/chunk-2JKGABV2.js";
import "/mobile/js/chunks/chunk-SZR4MTGX.js";
import "/mobile/js/chunks/chunk-YCVXJOA7.js";
import "/mobile/js/chunks/chunk-QEMMR6VK.js";
import "/mobile/js/chunks/chunk-JWTFWW4O.js";
import "/mobile/js/chunks/chunk-HVYKQKG5.js";
import "/mobile/js/chunks/chunk-UWLXNLAN.js";
import "/mobile/js/chunks/chunk-IXDNIHYC.js";
import "/mobile/js/chunks/chunk-YFJ366MU.js";
import "/mobile/js/chunks/chunk-Z7AG6BZL.js";
import "/mobile/js/chunks/chunk-6KV6OYKI.js";
import "/mobile/js/chunks/chunk-T7RIOEVR.js";
import "/mobile/js/chunks/chunk-JTFIIC4P.js";
import "/mobile/js/chunks/chunk-AIC37VNN.js";
import "/mobile/js/chunks/chunk-R4TUTVRX.js";
import "/mobile/js/chunks/chunk-RMUFSCXL.js";
import "/mobile/js/chunks/chunk-7E4ACOES.js";
import "/mobile/js/chunks/chunk-EP7FYMO7.js";
import "/mobile/js/chunks/chunk-HHBM77OL.js";
import "/mobile/js/chunks/chunk-CBI7THZ4.js";
import "/mobile/js/chunks/chunk-D4NKXSWN.js";
import "/mobile/js/chunks/chunk-65OLLRBJ.js";
import "/mobile/js/chunks/chunk-CX4N6SE7.js";
import "/mobile/js/chunks/chunk-AA7ORONM.js";
import "/mobile/js/chunks/chunk-YVT3SP6T.js";
import "/mobile/js/chunks/chunk-N3UTXQGG.js";
import "/mobile/js/chunks/chunk-OXN2ZL25.js";
import "/mobile/js/chunks/chunk-JGESXDLG.js";
import "/mobile/js/chunks/chunk-SHV4FR3K.js";
import "/mobile/js/chunks/chunk-SOQEY2U2.js";
import "/mobile/js/chunks/chunk-IUWKNPSX.js";
import "/mobile/js/chunks/chunk-6P7TSNN6.js";
import "/mobile/js/chunks/chunk-JNMJGW22.js";
import "/mobile/js/chunks/chunk-WEWTMUQK.js";
import "/mobile/js/chunks/chunk-PJD3LECG.js";
import "/mobile/js/chunks/chunk-LN2N4VIO.js";
import "/mobile/js/chunks/chunk-2GD37PRJ.js";
import "/mobile/js/chunks/chunk-5CRK7XGO.js";
import "/mobile/js/chunks/chunk-4EH4XZVS.js";
import "/mobile/js/chunks/chunk-7TIZPCQQ.js";
import "/mobile/js/chunks/chunk-PLO52CII.js";
import "/mobile/js/chunks/chunk-WEOKZTSW.js";
import "/mobile/js/chunks/chunk-7XJNQXQX.js";
import {
  formatDMYDate,
  inferFechaLabSetFromId
} from "/mobile/js/chunks/chunk-US2NRS5S.js";
import "/mobile/js/chunks/chunk-BURG7PNJ.js";
import "/mobile/js/chunks/chunk-VAFCBXBV.js";
import "/mobile/js/chunks/chunk-P2TSIQM4.js";
import "/mobile/js/chunks/chunk-QLSLJE42.js";
import "/mobile/js/chunks/chunk-EASTAY6S.js";
import "/mobile/js/chunks/chunk-B7NNRK4H.js";
import "/mobile/js/chunks/chunk-ZDAIWZ25.js";
import "/mobile/js/chunks/chunk-7TJEM4JY.js";
import "/mobile/js/chunks/chunk-MLLRKYO6.js";
import "/mobile/js/chunks/chunk-2SJQGKPU.js";
import "/mobile/js/chunks/chunk-EZ7GA6IL.js";
import "/mobile/js/chunks/chunk-FLCMQPNP.js";
import "/mobile/js/chunks/chunk-K4PQIQOH.js";
import "/mobile/js/chunks/chunk-BTIFFDH4.js";
import "/mobile/js/chunks/chunk-ZSD6QMCL.js";
import "/mobile/js/chunks/chunk-URXNXYS2.js";
import "/mobile/js/chunks/chunk-64IP3Y67.js";
import "/mobile/js/chunks/chunk-WAILSXBQ.js";
import "/mobile/js/chunks/chunk-G6B5EEF6.js";
import "/mobile/js/chunks/chunk-IVEQE6G4.js";
import "/mobile/js/chunks/chunk-UDWVBKE4.js";
import "/mobile/js/chunks/chunk-X2R3ZGWP.js";
import "/mobile/js/chunks/chunk-HDEGXLWA.js";
import "/mobile/js/chunks/chunk-Y2YRXJMM.js";
import "/mobile/js/chunks/chunk-K5SBVD6P.js";
import "/mobile/js/chunks/chunk-FSGBGJHB.js";
import "/mobile/js/chunks/chunk-XV2TMACY.js";
import "/mobile/js/chunks/chunk-A7GKLJFV.js";
import "/mobile/js/chunks/chunk-N2POLXHZ.js";
import "/mobile/js/chunks/chunk-FLGCYVFI.js";
export {
  ascitisInterpretacionBody_,
  citoquimInterpretacionBody_,
  closeLabDisplayPrefsModal,
  closeTendDetail,
  closeTendGroupModal,
  closeTendHiddenModal,
  copyTendGroupTablePng,
  copyTendGroupTableText,
  formatBhExtendedTabLine,
  formatDMYDate,
  getLabOutputPrefs,
  inferFechaLabSetFromId,
  isAscitisInterpretacionResLabChunk,
  isBhMainResLabChunk,
  isCitoquimInterpretacionResLabChunk,
  isGasoInterpretacionResLabChunk,
  isTendGroupModalOpen,
  onLabDisplayPrefsChanged,
  openLabDisplayPrefsModal,
  openTendDetail,
  openTendGasoExtendedModal,
  openTendGroupModal,
  openTendHiddenModal,
  registerTendenciasRuntime,
  renderTendencias,
  seedTendHiddenDefaults,
  setLabOutputPrefs,
  setTendGroupTab,
  tendCardActivate,
  tendHideSeriesFromCard,
  tendResetAllHiddenSeries,
  tendUnhideSeries,
  tendenciasWindowHandlers,
  toggleTendAbnormalOnlyFilter,
  toggleTendSection
};
//# sourceMappingURL=/js/chunks/tendencias-BXSK2N7S.js.map
