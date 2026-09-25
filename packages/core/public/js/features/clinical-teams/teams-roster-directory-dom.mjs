/** LAN directorio modal DOM accessors. */

export function directoryUsersModalBackdropEl() {
  return document.getElementById('clinical-directory-users-backdrop');
}

export function directoryUsersModalBodyEl() {
  return document.getElementById('clinical-directory-users-panel-body');
}

export function isDirectoryModalOpen() {
  const bd = directoryUsersModalBackdropEl();
  return !!(bd && bd.classList.contains('open'));
}
