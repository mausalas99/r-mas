-- mutations.ops_json stored applied ops as plaintext JSON, including patient
-- fields (nombre, sala, cuarto, cama, sexo, edad...). room_state already
-- encrypts with WORKER_DATA_KEY (crypto-at-rest.js); mutations never did.
-- New columns hold the AES-256-GCM ciphertext. Existing rows keep plaintext
-- ops_json for backward-compat decode; new writes leave ops_json empty and
-- populate ciphertext/iv instead. No data migration: nothing can re-encrypt
-- historical plaintext rows from inside a Worker without reading them first.
ALTER TABLE mutations ADD COLUMN ciphertext BLOB;
ALTER TABLE mutations ADD COLUMN iv BLOB;
