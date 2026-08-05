// public/js/features/cloud-mobile/invite-url.mjs
function buildCloudMobileJoinUrl(opts) {
  const base = String(opts?.baseUrl || "").trim().replace(/\/+$/, "");
  const auth = String(opts?.auth || "").trim();
  const user = String(opts?.user || "").trim().replace(/^@+/, "");
  if (!base || !auth && !user) return "";
  const u = new URL(`${base}/mobile/`);
  if (auth) u.searchParams.set("auth", auth);
  if (user) u.searchParams.set("user", user);
  const code = String(opts?.roomCode || "").trim();
  if (code) u.searchParams.set("room", code);
  const sala = String(opts?.sala || "").trim();
  if (sala) u.searchParams.set("sala", sala);
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
//# sourceMappingURL=/js/chunks/chunk-KW6FOZVD.js.map
