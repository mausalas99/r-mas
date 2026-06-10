import {
  GUARDIA_V7_CHAPTERS
} from "/js/chunks/chunk-QZXLPUPG.js";

// public/js/guardia-v7-progress.mjs
var GUARDIA_V7_PROGRESS_LS_KEY = "rpc-guardia-v7-progress";
function loadGuardiaV7Progress(storage = localStorage) {
  try {
    const raw = storage.getItem(GUARDIA_V7_PROGRESS_LS_KEY);
    if (!raw) return { completedChapters: [], dismissedCard: false, updatedAt: null };
    const p = JSON.parse(raw);
    return {
      completedChapters: Array.isArray(p.completedChapters) ? p.completedChapters : [],
      dismissedCard: !!p.dismissedCard,
      updatedAt: p.updatedAt || null
    };
  } catch (_e) {
    return { completedChapters: [], dismissedCard: false, updatedAt: null };
  }
}
function saveGuardiaV7Progress(patch, storage = localStorage) {
  const prev = loadGuardiaV7Progress(storage);
  const next = { ...prev, ...patch, updatedAt: Date.now() };
  storage.setItem(GUARDIA_V7_PROGRESS_LS_KEY, JSON.stringify(next));
  return next;
}
function isGuardiaV7TrackComplete(storage = localStorage) {
  const { completedChapters } = loadGuardiaV7Progress(storage);
  return GUARDIA_V7_CHAPTERS.every((ch) => completedChapters.includes(ch.id));
}
function markGuardiaV7ChapterComplete(chapterId, storage = localStorage) {
  const prev = loadGuardiaV7Progress(storage);
  const set = new Set(prev.completedChapters);
  const wasNew = !set.has(chapterId);
  set.add(chapterId);
  const next = saveGuardiaV7Progress({ completedChapters: [...set] }, storage);
  return { ...next, wasNew };
}
function resetGuardiaV7Chapter(chapterId, storage = localStorage) {
  const prev = loadGuardiaV7Progress(storage);
  const set = new Set(prev.completedChapters);
  set.delete(chapterId);
  return saveGuardiaV7Progress({ completedChapters: [...set] }, storage);
}

export {
  GUARDIA_V7_PROGRESS_LS_KEY,
  loadGuardiaV7Progress,
  saveGuardiaV7Progress,
  isGuardiaV7TrackComplete,
  markGuardiaV7ChapterComplete,
  resetGuardiaV7Chapter
};
//# sourceMappingURL=/js/chunks/chunk-TVNIPUSB.js.map
