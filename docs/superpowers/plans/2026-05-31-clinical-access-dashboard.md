# Clinical Access Controls & Shared Dashboard Implementation Plan (v1.9.1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a clinical tracking schema with dynamic vitals frequencies, local-first P2P transaction signing, and a high-density dashboard UI with R4-specific ward partitioning.

**Architecture:** A decoupled-consensus P2P model using patient-specific ledgers. The UI uses a unified grid board that partitions data contextually (e.g., for R4 senior residents) and adapts tracking banners based on custom clinician-directed frequencies.

**Tech Stack:** Node.js Crypto, SQLCipher, CSS Grid, Electron Notifications, Vanilla JavaScript.

---

### Task 1: SQLCipher Schema Migrations & Extensions

**Files:**
- Modify: `lib/db/schema.mjs`
- Test: `lib/db/schema.test.mjs`

- [ ] **Step 1: Write the failing test for schema extensions**

```javascript
// lib/db/schema.test.mjs
import { applyMigrations } from './schema.mjs';
import Database from 'better-sqlite3';

export function test_schema_extensions() {
    const db = new Database(':memory:');
    applyMigrations(db);
    
    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
    ['users', 'teams', 'team_membership', 'active_guardias'].forEach(t => {
        if (!tables.includes(t)) throw new Error(`Missing table: ${t}`);
    });
    
    // Check active_guardias frequency enum
    const info = db.prepare("PRAGMA table_info(active_guardias)").all();
    if (!info.some(c => c.name === 'vitals_frequency')) throw new Error('Missing vitals_frequency');
    
    // Check patients extensions
    const patientCols = db.prepare("PRAGMA table_info(patients)").all().map(c => c.name);
    if (!patientCols.includes('prognosis_classification')) throw new Error('Missing prognosis');
    if (!patientCols.includes('negativa_maniobras_firmada')) throw new Error('Missing DNR column');
}
```

- [ ] **Step 2: Run test to verify it fails**
Run: `node lib/db/schema.test.mjs`
Expected: FAIL

- [ ] **Step 3: Implement migrations in `lib/db/schema.mjs`**

```javascript
// lib/db/schema.mjs
export function applyMigrations(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            rank TEXT NOT NULL CHECK(rank IN ('R1', 'R2', 'R3', 'R4', 'Admin')),
            public_key TEXT NOT NULL,
            encrypted_private_key TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS teams (
            team_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            service TEXT NOT NULL CHECK(service IN ('Sala', 'Torre HU', 'Eme', 'UX', 'Interconsultas', 'Área A/Pensionistas')),
            sub_area_fraction TEXT,
            on_call_day_index INTEGER NOT NULL CHECK(on_call_day_index BETWEEN 0 AND 6),
            created_by TEXT,
            FOREIGN KEY(created_by) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS team_membership (
            team_id TEXT,
            user_id TEXT,
            PRIMARY KEY(team_id, user_id),
            FOREIGN KEY(team_id) REFERENCES teams(team_id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS active_guardias (
            guardia_id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            covering_user_id TEXT NOT NULL,
            source_team_id TEXT NOT NULL,
            is_critical INTEGER DEFAULT 0 CHECK(is_critical IN (0, 1)),
            pendientes_json TEXT,
            vitals_frequency TEXT DEFAULT 'None' CHECK(vitals_frequency IN ('1h', '2h', '4h', 'Shift_Once', 'None')),
            last_vitals_check DATETIME DEFAULT CURRENT_TIMESTAMP,
            assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Resolved')),
            FOREIGN KEY(covering_user_id) REFERENCES users(user_id)
        );
    `);

    // Column additions for patients
    const cols = db.prepare("PRAGMA table_info(patients)").all().map(c => c.name);
    if (!cols.includes('interconsult_type')) {
        db.exec("ALTER TABLE patients ADD COLUMN interconsult_type TEXT DEFAULT 'None' CHECK(interconsult_type IN ('Ephemeral_VPO', 'Follow-up', 'None'))");
    }
    if (!cols.includes('prognosis_classification')) {
        db.exec("ALTER TABLE patients ADD COLUMN prognosis_classification TEXT DEFAULT 'Buen Pronóstico'");
    }
    if (!cols.includes('negativa_maniobras_firmada')) {
        db.exec("ALTER TABLE patients ADD COLUMN negativa_maniobras_firmada INTEGER DEFAULT 0 CHECK(negativa_maniobras_firmada IN (0, 1))");
    }
}
```

- [ ] **Step 4: Run test to verify it passes**
Run: `node lib/db/schema.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add lib/db/schema.mjs
git commit -m "feat(db): implement clinical tracking schema with dynamic frequencies and DNR tracking"
```

---

### Task 2: P2P Transaction Cryptographic Signing

**Files:**
- Create: `public/js/features/crypto-signer.js`
- Test: `public/js/features/crypto-signer.test.js`

- [ ] **Step 1: Implement `public/js/features/crypto-signer.js`**

```javascript
// public/js/features/crypto-signer.js
import crypto from 'crypto';

export function signClinicalChange({ userId, privateKeyPem, patientId, actionType, deltaData, lastBlockHash }) {
    const timestamp = new Date().toISOString();
    const deltaHash = crypto.createHash('sha256').update(JSON.stringify(deltaData)).digest('hex');
    const transactionBody = { timestamp, userId, patientId, actionType, deltaHash, lastBlockHash };
    const serializedPayload = JSON.stringify(transactionBody);
    
    const signer = crypto.createSign('SHA256');
    signer.update(serializedPayload);
    const signatureHex = signer.sign(privateKeyPem, 'hex');

    return {
        transactionBody,
        signature: signatureHex,
        blockHash: crypto.createHash('sha256').update(serializedPayload + signatureHex).digest('hex')
    };
}

export function verifyIncomingPeerChange(transactionBody, signatureHex, publicPemKey) {
    const serializedPayload = JSON.stringify(transactionBody);
    const verifier = crypto.createVerify('SHA256');
    verifier.update(serializedPayload);
    return verifier.verify(publicPemKey, signatureHex, 'hex');
}
```

- [ ] **Step 2: Commit**
```bash
git add public/js/features/crypto-signer.js
git commit -m "feat(crypto): implement P2P transaction signing and verification"
```

---

### Task 3: Clinical Access Matrix (V1 Permissive Mode)

**Files:**
- Modify: `public/js/clinico-access.mjs`

- [ ] **Step 1: Implement permissive `evaluateClinicalScope` in `public/js/clinico-access.mjs`**

```javascript
// public/js/clinico-access.mjs
export function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null) {
    // V1 Release: Any registered user can read/write for local patient profile logs
    // Metadata is captured for forensic ledger logging trails
    const auditContext = {
        userId: currentUser?.user_id,
        rank: currentUser?.rank,
        patientId: targetPatient?.id,
        service: targetPatient?.service,
        timestamp: new Date().toISOString()
    };

    return { 
        readable: true, 
        writable: true, 
        reasoning: 'V1 Release: Global peer-to-peer write access enabled',
        audit: auditContext
    };
}
```

- [ ] **Step 2: Commit**
```bash
git add public/js/clinico-access.mjs
git commit -m "feat(auth): implement permissive clinical access engine for V1 rollout"
```

---

### Task 4: UI Shared Grid & R4 Partitioning

**Files:**
- Create: `public/styles/pase-board.css`
- Create: `public/js/features/pase-board.mjs`

- [ ] **Step 1: Create CSS for High-Density Grid and DNR/R4 Sections**

```css
/* public/styles/pase-board.css */
.patient-chips-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
    padding: 1rem;
}

.r4-section-divider {
    grid-column: 1 / -1;
    border-bottom: 2px solid #1c192e;
    color: #8e8ea0;
    font-weight: 800;
    padding: 1rem 0 0.5rem 0;
    text-transform: uppercase;
    font-size: 0.8rem;
    letter-spacing: 0.1em;
}

.dnr-badge {
    background: #ffffff;
    color: #ff3b30;
    font-weight: 900;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.65rem;
    border: 1px solid #ff3b30;
    margin-right: 5px;
}

.priority-critical { animation: criticalPulseHighlight 2.5s infinite; }
@keyframes criticalPulseHighlight {
    0%, 100% { box-shadow: 0 0 4px rgba(255,59,48,0.2); }
    50% { box-shadow: 0 0 14px rgba(255,59,48,0.5); }
}
```

- [ ] **Step 2: Implement `UnifiedPatientGridBoard` with partitioning logic**

```javascript
// public/js/features/pase-board.mjs
export class UnifiedPatientGridBoard {
    constructor(domGridContainerId, appViewContext = 'GUARDIA') {
        this.container = document.getElementById(domGridContainerId);
        this.context = appViewContext;
    }

    drawCensusGrid(patients, guardiasMap, userRank = 'R1') {
        if (!this.container) return;
        this.container.innerHTML = '';
        
        if (userRank === 'R4') {
            const sectors = ['Sala A', 'Sala B', 'Eme', 'Torre HU'];
            sectors.forEach(sector => {
                const sectorPatients = patients.filter(p => p.service === sector || p.sub_area === sector);
                if (sectorPatients.length > 0) {
                    this.appendDivider(sector);
                    this.renderBatch(sectorPatients, guardiasMap);
                }
            });
        } else {
            this.renderBatch(patients, guardiasMap);
        }
    }

    renderBatch(patients, guardiasMap) {
        const sorted = [...patients].sort((a,b) => (guardiasMap.get(b.id)?.is_critical || 0) - (guardiasMap.get(a.id)?.is_critical || 0));
        sorted.forEach(p => this.container.appendChild(this.compileChip(p, guardiasMap.get(p.id))));
    }

    appendDivider(label) {
        const div = document.createElement('div');
        div.className = 'r4-section-divider';
        div.textContent = label;
        this.container.appendChild(div);
    }

    compileChip(p, g) {
        const card = document.createElement('div');
        card.className = `patient-chip-card ${g?.is_critical ? 'priority-critical' : ''}`;
        
        const dnr = p.negativa_maniobras_firmada ? '<span class="dnr-badge">DNR</span>' : '';
        const vitals = this.calcVitals(g?.last_vitals_check, g?.vitals_frequency);
        
        card.innerHTML = `
            <div class="header">${dnr}<b>${p.bed_label || ''}</b> ${p.name || ''}</div>
            <div class="vitals-banner ${vitals.cls}">${vitals.str}</div>
        `;
        return card;
    }

    calcVitals(last, freq) {
        if (!freq || freq === 'None') return { str: 'Rutina', cls: 'nominal-gray' };
        let ms = 4 * 3600000;
        if (freq === '1h') ms = 3600000;
        if (freq === '2h') ms = 7200000;
        if (freq === 'Shift_Once') ms = 8 * 3600000;
        
        const due = new Date(last).getTime() + ms;
        const diff = due - Date.now();
        if (diff <= 0) return { str: 'RETRASADO', cls: 'breached' };
        const mins = Math.floor(diff / 60000);
        return { str: `${Math.floor(mins/60)}h ${mins%60}m`, cls: mins <= 15 ? 'warning' : 'nominal' };
    }
}
```

- [ ] **Step 3: Commit**
```bash
git add public/styles/pase-board.css public/js/features/pase-board.mjs
git commit -m "feat(ui): implement shared grid with R4 partitioning and dynamic vitals banners"
```

---

### Task 5: Dynamic Vitals Monitoring Loop

**Files:**
- Create: `public/js/features/session-manager.mjs`

- [ ] **Step 1: Implement `BackgroundVitalsMonitorLoop` in `public/js/features/session-manager.mjs`**

```javascript
// public/js/features/session-manager.mjs
export class BackgroundVitalsMonitorLoop {
    constructor(db, userId) {
        this.db = db;
        this.userId = userId;
    }

    start() {
        setInterval(() => this.scan(), 60000);
    }

    async scan() {
        const rows = await this.db.all("SELECT patient_id, last_vitals_check, vitals_frequency FROM active_guardias WHERE covering_user_id = ? AND status = 'Active'", [this.userId]);
        rows.forEach(r => {
            const freq = r.vitals_frequency;
            if (!freq || freq === 'None') return;
            
            let ms = 4 * 3600000;
            if (freq === '1h') ms = 3600000;
            if (freq === '2h') ms = 7200000;
            if (freq === 'Shift_Once') ms = 8 * 3600000;

            const due = new Date(r.last_vitals_check).getTime() + ms;
            const diff = due - Date.now();
            
            if (diff <= 0) {
                new Notification("CRITICAL: Overdue", { body: `Patient ${r.patient_id}: ${freq} check breached.` });
            } else if (diff <= 15 * 60000) {
                new Notification("Warning: Check Soon", { body: `Patient ${r.patient_id}: ${freq} window closes in 15m.` });
            }
        });
    }
}

export class ClientSessionInactivityLocker {
    constructor(mins = 10, overlayId) {
        this.timeout = mins * 60000;
        this.el = document.getElementById(overlayId);
    }

    start(ctx) {
        this.ctx = ctx;
        ['mousemove', 'keydown', 'click'].forEach(e => window.addEventListener(e, () => this.reset()));
        this.reset();
    }

    reset() {
        if (this.handle) clearTimeout(this.handle);
        this.handle = setTimeout(() => {
            if (this.ctx) this.ctx.decryptedPrivateKeyPem = null;
            if (this.el) this.el.classList.add('active-lock-view-overlay');
        }, this.timeout);
    }
}
```

- [ ] **Step 2: Commit**
```bash
git add public/js/features/session-manager.mjs
git commit -m "feat(security): implement dynamic vitals monitor loop and inactivity locker"
```
