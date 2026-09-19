// public/js/features/cloud-mobile/invite-url.mjs
function applyCloudMobileJoinParams(url, opts) {
  const auth = String(opts.auth || "").trim();
  const user = String(opts.user || "").trim().replace(/^@+/, "");
  if (auth) url.searchParams.set("auth", auth);
  if (user) url.searchParams.set("user", user);
  const code = String(opts.roomCode || "").trim();
  if (code) url.searchParams.set("room", code);
  const sala = String(opts.sala || "").trim();
  if (sala) url.searchParams.set("sala", sala);
}
function buildCloudMobileJoinUrl(opts) {
  const base = String(opts?.baseUrl || "").trim().replace(/\/+$/, "");
  const auth = String(opts?.auth || "").trim();
  const user = String(opts?.user || "").trim().replace(/^@+/, "");
  if (!base || !auth && !user) return "";
  const u = new URL(`${base}/mobile/`);
  applyCloudMobileJoinParams(u, opts);
  return u.toString();
}
function parseCloudMobileInviteSearch(search) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  return {
    room: String(params.get("room") || "").trim(),
    sala: String(params.get("sala") || "").trim(),
    auth: String(params.get("auth") || "").trim(),
    user: String(params.get("user") || "").trim().replace(/^@+/, "")
  };
}
function buildCloudMobileBookmarkUrl(opts) {
  return buildCloudMobileJoinUrl({
    baseUrl: opts.baseUrl,
    user: opts.user,
    auth: opts.auth
  });
}

export {
  buildCloudMobileJoinUrl,
  parseCloudMobileInviteSearch,
  buildCloudMobileBookmarkUrl
};
//# sourceMappingURL=/js/chunks/chunk-OBGB2GI4.js.map
