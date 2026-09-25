-- Admin rescue copy of the room DEK: one extra wrap per room, locked with the
-- admin's public key (asymmetric — ECDH P-256 + AES-256-GCM), never a password or
-- the room code. The private half never leaves the admin's device (Mac Keychain,
-- via Electron safeStorage) and is never sent to the server.
--
-- (The room DEK itself is wrapped with a key derived from the room's own join code
-- — see rooms.wrapped_dek_* from schema/006 — not a personal login password. Every
-- member who can join the room already has what's needed to unlock it; no
-- per-member row or device handoff is needed.)
ALTER TABLE rooms ADD COLUMN admin_wrapped_dek_ct TEXT;
ALTER TABLE rooms ADD COLUMN admin_wrapped_dek_iv TEXT;
ALTER TABLE rooms ADD COLUMN admin_wrapped_ephemeral_pubkey TEXT; -- ECDH ephemeral public key, base64 raw
ALTER TABLE rooms ADD COLUMN admin_key_id TEXT; -- which admin public key this was wrapped for (rotation support)
