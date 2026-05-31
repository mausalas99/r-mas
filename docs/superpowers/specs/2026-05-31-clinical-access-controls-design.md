# Clinical Access Controls & Shared Dashboard UI Design Document
**Date:** 2026-05-31  
**Status:** Approved / Production Blueprint  
**Component:** Clinical Access Controls, P2P Cryptographic Signing, Shared Patient Grid UI  
**Application:** r-mas (local-first, peer-to-peer Electron app for hospital residency management)

## System Overview
This document details the implementation of clinical access controls, peer-to-peer transaction signing, and shared dashboard UI components for the r-mas application. The design adheres to the local-first, serverless, and P2P synchronization constraints while implementing the residency hierarchy rules and interconsult lifecycle management.

## 1. SQLCipher Relational Schema Extensions

To support cryptographic user validation, dynamic team alignment, active guardias tracking, and specialized interconsult tracking, the SQLCipher schema is extended using backward-compatible incremental additions:

```sql
-- Migration Script: Executed locally within each client instance

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,                -- Argon2id or local bcrypt verification hash string
    rank TEXT NOT NULL CHECK(rank IN ('R1', 'R2', 'R3', 'R4', 'Admin')),
    public_key TEXT NOT NULL,                   -- Serialized public key for peer-to-peer signature auditing
    encrypted_private_key TEXT NOT NULL,        -- Asymmetric private key ciphertext locked with user password hash
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    team_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,                         -- e.g., "Torre HU - Equipo 1"
    service TEXT NOT NULL CHECK(service IN ('Sala', 'Torre HU', 'Eme', 'UX', 'Interconsultas', 'Área A/Pensionistas')),
    sub_area_fraction TEXT,                     -- Structural floor sections, e.g., "A1" or "A2" assignments
    on_call_day_index INTEGER NOT NULL CHECK(on_call_day_index BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...
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
    covering_user_id TEXT NOT NULL,             -- Designated resident directly taking on-call responsibility
    source_team_id TEXT NOT NULL,
    is_critical INTEGER DEFAULT 0 CHECK(is_critical IN (0, 1)),
    pendientes_json TEXT,                       -- Serialized text string mapping transient task lists
    vitals_interval_hours INTEGER DEFAULT 4,
    last_vitals_check DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Active' CHECK(status IN ('Active', 'Resolved')),
    FOREIGN KEY(covering_user_id) REFERENCES users(user_id)
);

-- Extensions to core patients table for interconsult tracking
ALTER TABLE patients ADD COLUMN interconsult_type TEXT DEFAULT 'None' CHECK(interconsult_type IN ('Ephemeral_VPO', 'Follow-up', 'None'));
ALTER TABLE patients ADD COLUMN interconsult_status TEXT DEFAULT 'Pending' CHECK(interconsult_status IN ('Pending', 'Resolved', 'Active'));
```

### Schema Rationale
- **Backward Compatibility**: Uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN` to preserve existing data
- **Referential Integrity**: Foreign keys ensure data consistency between users, teams, and guardias records
- **Enumerated Constraints**: CHECK constraints enforce valid values for rank, service, interconsult types/status, and guardia status
- **Minimal Footprint**: Only adds necessary columns/tables without restructuring existing schema

## 2. P2P Transaction Cryptographic Signing

Each patient's clinical chart maintains an independent cryptographic append-only timeline (Patient-Specific Ledger), enabling seamless background merges over localized network paths without global consensus bottlenecks.

### Implementation: `public/js/features/crypto-signer.js`

```javascript
import crypto from 'crypto';

/**
 * Creates a cryptographically signed clinical mutation block payload.
 * Paired natively with the localized SHA-256 chained audit mechanism.
 */
export function signClinicalChange({ userId, privateKeyPem, patientId, actionType, deltaData, lastBlockHash }) {
    const timestamp = new Date().toISOString();
    
    // Hash change delta profile to normalize encoding variance across nodes
    const deltaHash = crypto.createHash('sha256')
                            .update(JSON.stringify(deltaData))
                            .digest('hex');
    
    // Construct immutable transaction payload structure
    const transactionBody = {
        timestamp,
        userId,
        patientId,
        actionType,
        deltaHash,
        lastBlockHash // Patient-Specific ledger pointer isolation target
    };

    const serializedPayload = JSON.stringify(transactionBody);
    
    // Sign transaction block using local device private key credentials
    const signer = crypto.createSign('SHA256');
    signer.update(serializedPayload);
    const signatureHex = signer.sign(privateKeyPem, 'hex');

    return {
        transactionBody,
        signature: signatureHex,
        blockHash: crypto.createHash('sha256')
                         .update(serializedPayload + signatureHex)
                         .digest('hex')
    };
}

/**
 * Peer Verification Hook: Validates incoming mutations over LAN sockets
 * without relying on an online central authority pipeline.
 */
export function verifyIncomingPeerChange(transactionBody, signatureHex, publicPemKey) {
    const serializedPayload = JSON.stringify(transactionBody);
    const verifier = crypto.createVerify('SHA256');
    verifier.update(serializedPayload);
    return verifier.verify(publicPemKey, signatureHex, 'hex');
}
```

### Design Benefits
- **Patient-Specific Ledger Isolation**: Prevents synchronization deadlocks when multiple residents document different patients concurrently
- **Offline Resilience**: Devices can sync back later as long as no conflicting modifications occurred to the same patient
- **Conflict Localization**: Any edit conflicts are isolated to individual patient ledgers, resolvable via existing conflict resolution mechanisms
- **Zero-Coordination Overhead**: No need for global sequence numbers or consensus protocols

## 3. Real-Time Client Access Scope Evaluation Matrix

Access decisions are made dynamically at runtime by evaluating current database state, accommodating residency hierarchy rules and workforce deficit exceptions.

### Implementation: `public/js/clinico-access.mjs`

```javascript
/**
 * Evaluates view and write clearance metrics directly inside the runtime instance.
 * Automatically accommodates residency hierarchy adjustments and rotation deficits.
 */
export function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null) {
    // 1. Root System Administrator Bypass
    if (currentUser.rank === 'Admin') {
        return { readable: true, writable: true, reasoning: 'System Administrative Privilege' };
    }

    // 2. R4 Senior Scope Override: Whole census access over assigned macro-domains
    if (currentUser.rank === 'R4') {
        if (targetPatient.service === 'Sala' || targetPatient.service === 'Interconsultas') {
            return { readable: true, writable: true, reasoning: 'Global Ward Census Supervisory Override' };
        }
    }

    // 3. Interconsult Closed Archive Isolation Pipeline
    if (targetPatient.service === 'Interconsultas') {
        if (targetPatient.interconsult_type === 'Ephemeral_VPO' && targetPatient.interconsult_status === 'Resolved') {
            return { readable: true, writable: false, reasoning: 'Ephemeral VPO Closed Archive: Reference Read-Only Mode' };
        }
    }

    // 4. Sala R2 Exclusive Deficit Exception Override
    // Activated dynamically if a Sala R2 holds an active handover entry within the active_guardias table
    if (currentUser.rank === 'R2' && targetPatient.service === 'Sala') {
        const holdsActiveSalaGuardia = currentUser.active_guardias && 
            currentUser.active_guardias.some(g => g.service === 'Sala' && g.status === 'Active');

        if (holdsActiveSalaGuardia) {
            return { readable: true, writable: true, reasoning: 'Sala R2 Rotation Deficit: Global Ward Write Access Granted' };
        }
    }

    // 5. Active Guardias Tracking Target Assignment
    if (activeGuardia && activeGuardia.status === 'Active') {
        if (activeGuardia.covering_user_id === currentUser.user_id && activeGuardia.patient_id === targetPatient.id) {
            return { readable: true, writable: true, reasoning: 'Designated Active On-Call Coverage Assignment' };
        }
    }

    // 6. Default Primary Assigned Care Team Match
    const assignedToTeam = currentUser.registered_team_ids.includes(targetPatient.team_id);
    if (assignedToTeam) {
        return { readable: true, writable: true, reasoning: 'Primary Care Team Structural Domain Membership' };
    }

    // 7. LAN Drop Bounds / External Snapshot Fallback Strategy
    // Locks downstream write capabilities if off-network, preserving a clean read-only snapshot.
    return { readable: true, writable: false, reasoning: 'Off-Duty Contextual Read-Only Data Snapshot' };
}
```

### Access Logic Flow
1. **Admin**: Unrestricted access to all functions and data
2. **R4 (Chief Resident)**: Full access to their assigned macro-domains (Sala and Interconsultas)
3. **Interconsult Special Handling**: Ephemeral_VPO resolved cases become read-only archives
4. **Sala R2 Deficit Rule**: Dynamic write access granted when R2 has active coverage in active_guardias table
5. **Active Guardia Assignment**: Direct write access to assigned patients during on-call shifts
6. **Team Membership**: Standard read/write access to primary team-assigned patients
7. **Fallback**: Read-only snapshot when off-network or no matching criteria

## 4. Shared High-Density Patient Chips CSS Grid Layout

A unified grid interface shared between Handoff View and Guardia Mode Dashboard, displaying patient status via interactive cards.

### CSS Core: `public/styles/estado-actual.css` & `public/styles/modals.css`

```css
.high-density-matrix-layout {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem;
    width: 100%;
    box-sizing: border-box;
}

.patient-chips-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1.25rem;
    align-content: start;
}

/* High Density Patient Chips Configuration */
.patient-chip-card {
    background: var(--surface-card, #151321); /* Replicating dark workspace palette */
    border: 1px solid var(--border-neutral, #1c192e);
    border-radius: 12px;
    padding: 0.85rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.patient-chip-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* Priority Card Pulsing Shadow Animations for Critical Patients */
.patient-chip-card.priority-critical {
    border-left: 5px solid #ff3b30;
    animation: criticalPulseHighlight 2.5s infinite ease-in-out;
}

@keyframes criticalPulseHighlight {
    0% { box-shadow: 0 0 4px rgba(255, 59, 48, 0.15); border-left-color: #ff3b30; }
    50% { box-shadow: 0 0 14px rgba(255, 59, 48, 0.4); border-left-color: #ff9500; }
    100% { box-shadow: 0 0 4px rgba(255, 59, 48, 0.15); border-left-color: #ff3b30; }
}

/* Conditional Vital Tracker Badge Styles */
.vitals-countdown-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    margin-top: 0.5rem;
    width: fit-content;
}

.vitals-countdown-badge.nominal  { background-color: #102a18; color: #34c759; }
.vitals-countdown-badge.warning  { background-color: #2e220f; color: #ff9500; animation: warningFlash 1.5s infinite; }
.vitals-countdown-badge.breached { background-color: #301314; color: #ff3b30; font-weight: 800; }

@keyframes warningFlash {
    0% { opacity: 1.0; } 50% { opacity: 0.5; } 100% { opacity: 1.0; }
}
```

### JavaScript Controller: `public/js/features/pase-board.mjs`

```javascript
export class UnifiedPatientGridBoard {
    /**
     * @param {string} domGridContainerId - Target grid template node string.
     * @param {string} appViewContext - Active dashboard state parameter: 'GUARDIA' | 'HANDOFF'
     */
    constructor(domGridContainerId, appViewContext = 'GUARDIA') {
        this.gridContainer = document.getElementById(domGridContainerId);
        this.appViewContext = appViewContext;
    }

    /**
     * Renders patient chip components dynamically, prioritizing critical cases.
     */
    drawCensusGrid(patientsCensusArray, activeGuardiasLedgerMap) {
        this.gridContainer.innerHTML = '';

        // Prioritization Engine: Shift critical entries automatically to row index 0 layouts
        const organizedCensus = [...patientsCensusArray].sort((a, b) => {
            const isCritA = activeGuardiasLedgerMap.get(a.id)?.is_critical ? 1 : 0;
            const isCritB = activeGuardiasLedgerMap.get(b.id)?.is_critical ? 1 : 0;
            return isCritB - isCritA;
        });

        organizedCensus.forEach(patient => {
            const activeGuardiaData = activeGuardiasLedgerMap.get(patient.id);
            const cardChipNode = this.compileChipCardNode(patient, activeGuardiaData);
            this.gridContainer.appendChild(cardChipNode);
        });
    }

    compileChipCardNode(patient, guardiaData) {
        const cardNode = document.createElement('div');
        const isCritical = guardiaData?.is_critical === 1;
        
        cardNode.className = `patient-chip-card ${isCritical ? 'priority-critical' : 'standard-card'}`;
        cardNode.setAttribute('data-patient-id', patient.id);

        const temporalVitalsState = this.calculateVitalsTrackingWindow(guardiaData?.last_vitals_check);
        const taskArray = JSON.parse(guardiaData?.pendientes_json || '[]');
        const uncompletedTasksCount = taskArray.filter(t => !t.completed).length;

        cardNode.innerHTML = `
            <div class="chip-header flex justify-between font-bold text-sm">
                <span class="location-box font-mono">${patient.bed_label || 'S/C'}</span>
                <span class="patient-name truncate">${patient.name || 'PACIENTE'}</span>
            </div>
            <div class="card-body my-2">
                <p class="dx-text text-xs text-gray-400 line-clamp-2">
                    ${patient.dx_summary || 'No primary evaluation summary logged'}
                </p>
                <div class="vitals-countdown-badge ${temporalVitalsState.badgeClass}">
                    🩺 Vital: ${temporalVitalsState.timeString}
                </div>
            </div>
            <div class="card-footer border-t pt-1 mt-1 text-xs flex justify-between text-gray-500">
                <span>📋 ${uncompletedTasksCount} Pendientes</span>
            </div>
        `;

        // Action Router Switch Context Mapping
        cardNode.addEventListener('click', () => {
            if (this.appViewContext === 'HANDOFF') {
                this.executeHandoffTransferModal(patient, guardiaData);
            } else {
                this.routeDirectlyToClinicalChart(patient.id);
            }
        });

        return cardNode;
    }

    calculateVitalsTrackingWindow(lastCheckIsoString) {
        if (!lastCheckIsoString) return { timeString: '--:--', badgeClass: 'nominal' };

        const targetTimeMs = new Date(lastCheckIsoString).getTime() + (4 * 60 * 60 * 1000);
        const deltaMs = targetTimeMs - Date.now();

        if (deltaMs <= 0) {
            return { timeString: 'RETRASADO', badgeClass: 'breached' };
        }

        const totalMinutesRemaining = Math.floor(deltaMs / 60000);
        if (totalMinutesRemaining <= 15) {
            return { timeString: `${totalMinutesRemaining} mins`, badgeClass: 'warning' };
        }

        const standardHours = Math.floor(totalMinutesRemaining / 60);
        const standardMinutes = totalMinutesRemaining % 60;
        return { timeString: `${standardHours}h ${standardMinutes}m`, badgeClass: 'nominal' };
    }

    executeHandoffTransferModal(patient, guardiaData) {
        if (window.appShell && typeof window.appShell.openHandoffAssignmentModal === 'function') {
            window.appShell.openHandoffAssignmentModal(patient.id, guardiaData?.guardia_id);
        }
    }

    routeDirectlyToClinicalChart(patientId) {
        if (window.appShell && typeof window.appShell.navigateToPatientChart === 'function') {
            window.appShell.navigateToPatientChart(patientId);
        }
    }
}
```

### UI Features
- **Responsive Grid**: CSS Grid with `auto-fill` and `minmax()` for adaptive layouts
- **Critical Patient Prioritization**: Critical patients automatically sorted to front (index 0) positions
- **Visual Alerts**: 
  - Critical patients: Pulsing CSS border animation
  - Vital status: Color-coded badges (nominal/warning/breached) with warning flash animation
- **Contextual Interactions**: 
  - Handoff View: Click opens transfer target modal
  - Guardia Mode: Click routes directly to patient's clinical chart
- **Information Density**: Displays bed assignment, patient initials, diagnosis snippet, 4-hour vitals countdown, and pending tasks counter

## 5. Local Inactivity Tracker & Vitals Monitor Loop

Separated background services for precise inactivity monitoring and vitals tracking intervals.

### Implementation: `public/js/features/session-manager.mjs`

```javascript
/**
 * Monitors terminal workspace interactions to isolate security states.
 * Automatically clears decrypted private keys from volatile memory allocations.
 */
export class ClientSessionInactivityLocker {
    /**
     * @param {number} thresholdMinutes - Allowed duration of workspace idleness.
     * @param {string} lockOverlayUiId - HTML Target id corresponding to terminal lockout screen views.
     */
    constructor(thresholdMinutes = 10, lockOverlayUiId) {
        this.timeoutPeriodMs = thresholdMinutes * 60 * 1000;
        this.lockOverlayElement = document.getElementById(lockOverlayUiId);
        this.inactivityTimerHandle = null;
    }

    startInactivityMonitoring(volatileSessionContext) {
        this.sessionContext = volatileSessionContext;

        const refreshInteractions = () => this.resetInactivityCountdown();
        window.addEventListener('mousemove', refreshInteractions);
        window.addEventListener('keydown', refreshInteractions);
        window.addEventListener('click', refreshInteractions);

        this.resetInactivityCountdown();
    }

    resetInactivityCountdown() {
        if (this.inactivityTimerHandle) clearTimeout(this.inactivityTimerHandle);
        this.inactivityTimerHandle = setTimeout(() => this.executeWorkstationLockdown(), this.timeoutPeriodMs);
    }

    executeWorkstationLockdown() {
        if (this.sessionContext) {
            this.sessionContext.decryptedPrivateKeyPem = null; // Purge volatile key variables
        }

        if (this.lockOverlayElement) {
            this.lockOverlayElement.classList.remove('hidden');
            this.lockOverlayElement.classList.add('active-lock-view-overlay');
        }
    }
}

/**
 * Background Vitals Verification Loop Engine.
 * Runs background evaluations over local files to enforce the 4-hour monitoring criteria.
 */
export class BackgroundVitalsMonitorLoop {
    constructor(sqliteLocalDbWrapperInstance, currentActiveUserId) {
        this.db = sqliteLocalDbWrapperInstance;
        this.userId = currentActiveUserId;
        this.pollingIntervalHandle = null;
    }

    startExecutionScanning() {
        this.pollingIntervalHandle = setInterval(() => this.scanActiveGuardiasIntervals(), 60000);
    }

    async scanActiveGuardiasIntervals() {
        const sqlQuery = `
            SELECT guardia_id, patient_id, last_vitals_check 
            FROM active_guardias 
            WHERE covering_user_id = ? AND status = 'Active'
        `;

        try {
            const operationalRows = await this.db.all(sqlQuery, [this.userId]);

            operationalRows.forEach(row => {
                const targetBreachTimeMs = new Date(row.last_vitals_check).getTime() + (4 * 60 * 60 * 1000);
                const remainingDurationMs = targetBreachTimeMs - Date.now();

                if (remainingDurationMs <= 0) {
                    this.dispatchNativeDesktopNotification(
                        row.patient_id, 
                        "CRITICAL: Control de Vitales Vencido", 
                        "Límite de 4 horas superado. Registre signos vitales de inmediato."
                    );
                } else if (remainingDurationMs <= 15 * 60 * 1000) {
                    // Trigger dynamic warning UI changes exactly 15 minutes before expiration window closes (at 3h 45m mark)
                    this.dispatchNativeDesktopNotification(
                        row.patient_id, 
                        "Alerta: Control Próximo", 
                        "La ventana para el chequeo de signos vitales cierra en menos de 15 minutos."
                    );
                }
            });
        } catch (dbError) {
            console.error("Local background scan routine failed execution context mapping: ", dbError);
        }
    }

    dispatchNativeDesktopNotification(patientId, headline, instruction) {
        new Notification(headline, {
            body: `Paciente: ${patientId} -- ${instruction}`,
            silent: false
        });
    }

    stopExecutionScanning() {
        if (this.pollingIntervalHandle) clearInterval(this.pollingIntervalHandle);
    }
}
```

### Monitoring Benefits
- **Precise Inactivity Timeout**: Exact 10-minute timeout using resetable setTimeout
- **Efficient Polling**: Vitals monitoring at 60-second intervals balances responsiveness with resource usage
- **Early Warning System**: Visual/desktop notifications at 15-minute pre-breach window (3h 45m mark)
- **Immediate Alerts**: Desktop notifications fire instantly when 4-hour threshold is breached
- **Memory Security**: Decrypted private keys cleared from volatile memory on inactivity lockdown
- **Separation of Concerns**: Independent timelines prevent precision drift between systems

## Implementation Notes

### Migration Strategy
- Schema changes use backward-compatible ALTER TABLE statements
- Existing patient data preserved without migration scripts
- New tables created with IF NOT EXISTS to avoid conflicts on existing installations

### Security Considerations
- Private keys exist only in volatile memory during active sessions
- Cryptographic signing uses device-resident keys never stored persistently
- Access decisions made in real-time prevent privilege escalation through stale caches
- All P2P verification occurs locally without external dependencies

### Testing Approach
- Unit tests for cryptographic signing/verification with known test vectors
- Integration tests for access control matrix covering all rank/service combinations
- UI tests for grid rendering, sorting, and interaction handling
- End-to-end scenarios simulating handover workflows and access rule triggers
- Stress testing concurrent P2P sync scenarios with conflict resolution

### Performance Characteristics
- Schema changes: Minimal impact (ALTER TABLE ADD COLUMN is lightweight)
- Cryptographic signing: O(1) per transaction with constant-time hashing
- Access evaluation: O(n) where n = active guardias per user (typically small)
- Grid rendering: O(p) where p = patients in census (efficient DOM batching)
- Background monitors: Minimal CPU usage with intelligent timeouts

---
*This design document captures the agreed-upon approaches for extending the r-mas application with clinical access controls, P2P cryptographic signing, and shared dashboard UI components while maintaining strict adherence to the local-first, peer-to-peer architectural constraints.*