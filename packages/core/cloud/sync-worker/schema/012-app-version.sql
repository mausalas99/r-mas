-- Last app version seen from this user, stamped on login/register. Lets admin
-- check fleet adoption of a release before deploying anything version-sensitive
-- (see docs/superpowers/plans/2026-08-23-nube-e2ee-deploy.md).
ALTER TABLE users ADD COLUMN app_version TEXT;
ALTER TABLE users ADD COLUMN app_version_at TEXT;
