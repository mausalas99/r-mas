# Compliance Assessment: Nube Client-Side Encryption Plan

## Context

R+ stores clinical PHI (nombres, diagnósticos, labs, notas) in Cloudflare D1 as plaintext JSON today. The plan proposes AES-GCM envelope encryption on the client before any push, so D1 holds only opaque ciphertext. The Worker Paid plan ($5/mo, 30s CPU) enables raising PBKDF2 to 310k iterations. The question is whether this plan closes the gap between the current state and health regulations / hospital IT policy.

---

## What the plan CLOSES

| Gap closed | How | Regulatory relevance |
|---|---|---|
| Plaintext PHI in D1 (biggest current risk) | AES-GCM envelope; Worker never sees DEK | LFPDPPP Art. 19: personal data must be protected with administrative, physical, and technical measures. Encrypting at origin is a required technical measure. |
| Weak PBKDF2 (50k) | Raise to 310k on Paid CPU | Meets current NIST SP 800-132 guidance (>= 210k for PBKDF2-SHA-256). Meaningful hardening of the login credential hash. |
| Old clients writing garbage names | 426 + `update_required` version gate | Prevents data integrity failure; supports auditability. |
| Monthly DEK rotation | Automatic via calendar-month room boundary | Reduces blast radius of a compromised DEK to one month of one sala. |

---

## What the plan does NOT close

These gaps remain after the plan ships. Some are blockers for formal hospital IT approval.

### 1. Personal Cloudflare account — likely a blocker

The D1 database is on `djsalas99@gmail.com`'s personal Cloudflare account. Even with client E2EE, Cloudflare holds encrypted PHI, patient UUIDs (in `path`), timestamps, and membership metadata. Hospital IT policies and LFPDPPP Art. 36 (data processors) require a signed Data Processing Agreement (DPA / "convenio de encargado") with any cloud processor that touches personal data — encrypted or not. A personal account has no mechanism for this. This is also a single-point-of-failure for the program if the personal account is suspended.

**What is needed:** Transfer to a hospital-controlled or institution-controlled Cloudflare account with a formal DPA before any hospital audit.

### 2. Data residency — D1 stays in WNAM

D1 region is Western North America. LFPDPPP does not mandate Mexican data residency for all data, but hospitals and their legal counsel frequently impose it via institutional policy. The plan does not change the D1 region. Post-encryption, metadata (UUIDs, paths, timestamps) is still in WNAM.

**What is needed:** Clarify with hospital IT whether WNAM is acceptable or whether a DPA with residency clause (or explicit exemption) is required.

### 3. `clinicalOps` stays plaintext

The plan explicitly leaves `clinicalOps` (teams, `@usuario`, ranks, assignments, guardia) unencrypted so the Worker's `mergeClinicalOpsLww` keeps working. This is internal staff structure, not patient names — but it does link internal patient UUIDs to actor IDs in plaintext. Under LFPDPPP, `registro` / patient ID combos are sensitive personal data. Low risk in isolation; not zero.

### 4. No audit of key operations

The plan has no logging for: DEK generation, wrap distribution, wrap fetch, or the backfill re-push. An audit trail of "who got the room key and when" is expected in healthcare environments. The existing `forensic-audit.mjs` covers local DB ops but nothing in Nube's key lifecycle.

**What is needed:** At minimum, timestamp-stamped log entries for DEK create, wrap PUT, and wrap GET — stored locally in the forensic audit chain.

### 5. Auth traffic still exposed to a hospital MITM proxy

The plan encrypts clinical `op.value` but does not address certificate pinning. A hospital TLS-terminating proxy still sees the login `POST /auth/login` body (username + password plaintext in the POST, before PBKDF2 runs on the Worker). This is unchanged. Raising PBKDF2 helps only if the password never travels in the clear — it does travel over TLS, which the hospital proxy can break.

**Note:** This is a pre-existing gap. The plan does not make it worse. But it is still on the known-gaps table and hospital IT will find it.

### 6. Recuérdame token on disk, not OS keychain

32-byte session token stored in `cloud-sync-remember.json` at mode `0600`. Not OS keychain / `safeStorage`. Out of scope for this plan but relevant to a hospital IT device audit.

### 7. No Cloudflare BAA / equivalent

Cloudflare offers a HIPAA-compliant posture (BAA) only on Enterprise plans. For Mexican private hospitals operating under LFPDPPP (not HIPAA), the equivalent is a signed `convenio de tratamiento de datos`. The plan does not trigger or require this conversation. Without it, even opaque ciphertext in D1 on a personal account is a documentation gap.

---

## Net assessment

The plan is the right technical step. It eliminates the most material current risk: a D1 dump or Wrangler access exposing full clinical JSON.

However, **E2EE alone does not make the app compliant** with a hospital IT policy that audits vendor agreements, data residency, and account ownership. The two gaps that would most likely appear in a formal hospital IT review:

1. **Personal account with no DPA** — this is a process/legal gap, not a code gap.
2. **No key-operation audit trail** — this is a small code gap that should go in the same workstream.

The plan is worth shipping. Pair it with a conversation about moving to a hospital-controlled or institution-controlled Cloudflare account and a signed DPA before presenting the app to hospital IT as "Nube-compliant."

---

## Recommended additions to the same workstream

| Item | Effort | Priority |
|---|---|---|
| Log DEK create / wrap PUT / wrap GET to local forensic audit chain | Small: hook in `room-dek.mjs` | High — audit requirement |
| Document the personal-account risk in `docs/core/15-security.md` and `14-compliance.md` | Docs only | High — honesty |
| Add `convenio de encargado` to institutional checklist in `14-compliance.md` | Docs only | Medium |

## Out of scope for this review

Implementation sequence, test list, D1 migration — those are already well-specified in the plan.
