# R+ Security and Architecture Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement critical security and medical safety fixes for Proyecto R+ including physiological limits in calculators, secure authentication, encrypted storage, and architectural improvements.

**Architecture:** Phase-based approach addressing immediate hospital environment fixes first (medical calculator safety, authentication security, network protections), followed by architectural improvements (encrypted database, native document generation, CRDT sync), and finally commercial readiness features (audit trail, RBAC, enhanced security).

**Tech Stack:** JavaScript/Node.js, Express, SQLCipher, pdf-lib/docx-js, Yjs/Automerge.

---

### Task 1: Medical Calculator Safety Fixes

Fix critical medical calculation bugs identified in the audit: Vancomycin max dose, Bicarbonate math correction, and Potassium volume fractionation.

**Files:**
- Modify: `public/js/manejo-calculators.mjs`
- Test: `public/js/manejo-calculators.test.mjs`

- [ ] **Step 1: Write failing tests for safety limits**

```javascript
// public/js/manejo-calculators.test.mjs
import { calcVancoDose, calcBicHuBalanceada } from './manejo-calculators.mjs';

test('calcVancoDose caps at 2000mg for heavy patients', () => {
  const result = calcVancoDose({ weightKg: 160, mgPerKg: 25 });
  // 160 * 25 = 4000, should be capped at 2000
  expect(result.totalMg).toBe(2000);
});

test('calcBicHuBalanceada uses correct clinical divisor', () => {
  const result = calcBicHuBalanceada({ weightKg: 70, bicPx: 10 });
  // (24-10) * 70 * 0.3 = 294 mEq total deficit
  // Audit says current division by 8.5 is ambiguous/wrong
  // Expected mEqTotal should be 294 (not 35)
  expect(result.meqTotal).toBe(294);
});
```

- [ ] **Step 2: Run tests to verify failures**

Run: `npm test public/js/manejo-calculators.test.mjs`
Expected: FAIL (Vanco returns 4000, Bicarb returns 35)

- [ ] **Step 3: Implement safety limits and fix math**

```javascript
// public/js/manejo-calculators.mjs

export function calcVancoDose(p) {
  var w = Number(p.weightKg);
  var mgKg = Number(p.mgPerKg);
  var totalMg = Math.round(w * mgKg);
  
  // ADD SAFETY CAP
  if (totalMg > 2000) totalMg = 2000; 

  var volumeCc = Math.round(totalMg / 5);
  // ... rest of function
}

export function calcBicHuBalanceada(p) {
  // FIX MATH: Audit says division by 8.5 is wrong
  var meqTotal = (24 - Number(p.bicPx)) * Number(p.weightKg) * 0.3;
  var rounded = Math.round(meqTotal);
  // ... rest of function using 'rounded'
}
```

- [ ] **Step 4: Run tests to verify passing**

Run: `npm test public/js/manejo-calculators.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add public/js/manejo-calculators.mjs public/js/manejo-calculators.test.mjs
git commit -m "fix(medical): apply safety caps to vanco and fix bicarb math"
```

---

### Task 2: Secure Authentication (Remove 1234)

Replace the hardcoded '1234' PIN with cryptographically random tokens for LAN synchronization.

**Files:**
- Modify: `lan-squad/effective-team-code.js`
- Test: `lan-squad/effective-team-code.test.js`

- [ ] **Step 1: Write failing test for random token generation**

```javascript
// lan-squad/effective-team-code.test.js
test('ensureLanTeamCodeFile generates a random token instead of 1234', () => {
  const result = ensureLanTeamCodeFile({ userDataPath: './temp-test' });
  expect(result.code).not.toBe('1234');
  expect(result.code.length).toBeGreaterThan(16);
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test lan-squad/effective-team-code.test.js`
Expected: FAIL (returns '1234')

- [ ] **Step 3: Implement crypto token generation**

```javascript
// lan-squad/effective-team-code.js
const crypto = require('node:crypto');

function generateSecureToken() {
  return crypto.randomBytes(16).toString('hex');
}

// In ensureLanTeamCodeFile:
const token = generateSecureToken();
fs.writeFileSync(filePath, token + '\n', 'utf8');
```

- [ ] **Step 4: Run tests to verify passing**

Run: `npm test lan-squad/effective-team-code.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lan-squad/effective-team-code.js
git commit -m "sec(auth): replace 1234 default with secure random tokens"
```

---

### Task 3: Server Protection (Rate Limiting and Header Auth)

Protect the backend from DOS attacks and move tokens from URLs to headers.

**Files:**
- Modify: `server.js`
- Modify: `lan-squad/ws-hub.js`

- [ ] **Step 1: Add rate limiting to Express**

```javascript
// server.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per window
});

app.use(limiter);
```

- [ ] **Step 2: Verify WebSocket auth moves to headers**

Modify `ws-hub.js` to check `Sec-WebSocket-Protocol` or custom headers instead of `url.searchParams`.

- [ ] **Step 3: Commit**

```bash
git add server.js lan-squad/ws-hub.js
git commit -m "sec(server): add rate limiting and secure header-based auth"
```

---

### Task 4: Encrypted Storage Migration

Migrate from monolithic plaintext `estado.json` to encrypted SQLite with SQLCipher.

**Files:**
- Create: `src/db/encrypted-storage.js`
- Modify: `server.js`

- [ ] **Step 1: Implement SQLite storage with encryption**

```javascript
// src/db/encrypted-storage.js
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('rplus.db');
db.run("PRAGMA key = 'secure-key-from-env'");
```

- [ ] **Step 2: Write migration script from JSON to SQL**

- [ ] **Step 3: Commit**

```bash
git add src/db/encrypted-storage.js
git commit -m "arch(db): migrate to encrypted SQLite storage"
```

---

### Task 5: Native Document Generation

Replace Python subprocesses with native JavaScript libraries for .docx and .pdf generation.

**Files:**
- Modify: `generate-receta-hu.js`
- Delete: `generate_note.py`, etc.

- [ ] **Step 1: Replace Python call with native JS library**

Use `docx-js` or similar for template manipulation.

- [ ] **Step 2: Commit**

```bash
git add generate-receta-hu.js
git commit -m "arch(doc): replace python subprocess with native JS generation"
```

---

### Task 6: Conflict-free Sync (CRDT)

Replace clock-based conflict resolution with Yjs or Automerge.

**Files:**
- Modify: `public/js/sync.js` (if exists, or equivalent)

- [ ] **Step 1: Integrate Yjs for shared state**

- [ ] **Step 2: Commit**

```bash
git add public/js/sync.js
git commit -m "arch(sync): implement CRDT-based conflict resolution"
```
