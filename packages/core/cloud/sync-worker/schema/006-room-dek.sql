-- Wrapped room DEK for client-side E2EE. NULL until the owning client opts a room
-- into encryption. The Worker only ever stores/relays the wrapped blob — it cannot
-- unwrap it (no server-side key involved; unwrap key is derived from the user's
-- Nube password, client-side only).
ALTER TABLE rooms ADD COLUMN wrapped_dek_ct TEXT;
ALTER TABLE rooms ADD COLUMN wrapped_dek_iv TEXT;
ALTER TABLE rooms ADD COLUMN wrapped_dek_salt TEXT;
