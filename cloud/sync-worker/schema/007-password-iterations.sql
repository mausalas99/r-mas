-- Per-row PBKDF2 iteration count. Existing rows default to the value they were
-- actually hashed with (50k); new hashes use password.js MAX_ITERATIONS (100k,
-- the Cloudflare Workers WebCrypto platform cap). See password.js for why this
-- must be per-row and never a shared hardcoded constant.
ALTER TABLE users ADD COLUMN password_iterations INTEGER NOT NULL DEFAULT 50000;
