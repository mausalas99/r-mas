# R+ Security and Architecture Remediation Design

## Executive Summary

This design addresses the critical findings from the security and architecture audit of Proyecto R+. The audit identified CRITICAL risks in medical calculator safety, authentication security, data integrity, and architectural debt. This remediation plan prioritizes immediate hospital environment fixes while laying groundwork for commercial readiness.

## Problem Statement

The current R+ implementation has multiple critical vulnerabilities:
1. **Medical Safety**: Calculators lack physiological limits, risking lethal doses
2. **Authentication**: Hardcoded fallback to "1234" PIN grants unrestricted access
3. **Data Integrity**: Monolithic plaintext state files risk corruption and exposure
4. **Architectural Debt**: Python subprocess dependencies cause latency and DOS risk
5. **Security**: Tokens exposed in URLs, lack of audit trails, insecure storage

## Proposed Solution

### Phase 1: Immediate Hospital Environment Fixes (Week 1-2)

#### 1. Medical Calculator Safety Enhancements
- **Potassium Peripheral Volume Fix**: Replace volume bag capping logic with dose fractionation
  - When dose > max concentration × bag volume, split across multiple bags
  - Maintain therapeutic concentration while respecting physiological limits
- **Bicarbonate Math Correction**: Fix ambiguous division in extracellular deficit calculation
  - Clearly define divisor based on clinical guidelines
  - Return correct mEq total value
- **Vancomycin Maximum Limits**: Implement absolute maximums based on patient weight
  - Cap at 2000mg/dose regardless of weight-based calculation
  - Add warnings for doses approaching limits
- **General Calculator Guardrails**: Add physiological limits to all medication calculators
  - Max concentrations, infusion rates, cumulative doses
  - Real-time validation with user feedback

#### 2. Authentication and Session Security
- **Remove Hardcoded 1234 Fallback**: Eliminate DEFAULT_LAN_TEAM_CODE constant
- **Cryptographic Token Generation**: Use cryptographically random tokens for LAN authentication
- **Secure Token Storage**: Store tokens in encrypted local storage with expiration
- **Authentication Middleware**: Add request validation for all API/WebSocket endpoints

#### 3. Network Security Improvements
- **Token Transport Security**: Move tokens from URL parameters to HTTP headers
- **URI Scheme Validation**: Implement strict validation before processing custom URIs
- **Request Rate Limiting**: Implement middleware to prevent DOS from Python subprocess flooding
- **Input Sanitization**: Sanitize all user inputs to prevent command injection

### Phase 2: Architectural Improvements (Week 3-4)

#### 4. Encrypted Local Storage Migration
- **Replace Monolithic JSON**: Migrate to SQLite with SQLCipher encryption
- **Schema Design**: Normalized tables for patients, indications, lab results, audit trails
- **Migration Script**: Convert existing estado.json to encrypted database on first launch
- **Access Controls**: Role-based access to different data types

#### 5. Native Document Generation
- **Eliminate Python Dependency**: Replace python-docx with JavaScript-based generation
- **Template Engine**: Use JavaScript templating for .docx generation
- **Performance Optimization**: Eliminate subprocess latency and memory spikes

#### 6. Conflict Resolution System
- **Replace Clock-based Sync**: Implement Conflict-free Replicated Data Types (CRDTs)
- **Last-Write-Wins with Vector Clocks**: For simple cases requiring immediate resolution
- **Application-level Conflict Resolution**: For clinical data requiring manual review
- **Offline-first Design**: Support seamless synchronization when network restored

### Phase 3: Commercial Readiness (Week 5-6)

#### 7. Audit Trail Implementation
- **Cryptographic Audit Log**: Immutable log of all clinical actions
- **User Attribution**: Tie all changes to authenticated users with roles
- **Tamper Evidence**: Hash-chaining to detect log modifications
- **Export Capability**: Secure export for regulatory compliance

#### 8. Role-Based Access Control (RBAC)
- **User Roles**: Physician, Nurse, Administrator, Auditor
- **Permission Matrix**: Fine-grained access to clinical functions and data
- **Session Management**: Secure authentication with timeout and renewal

#### 9. Enhanced Security Monitoring
- **Security Headers**: Implement CSP, HSTS, X-Frame-Options
- **Input Validation**: Comprehensive validation at API boundaries
- **Error Handling**: Secure error responses that don't leak system information

## Component Architecture

### clinical-engine (New)
- Pure JavaScript medication calculation engine
- Physiological validators and limit checkers
- Zero external dependencies
- Unit-testable medical logic

### shared-types (Enhanced)
- TypeScript interfaces for patients, medications, doses
- Validation schemas for data integrity
- Shared between frontend and backend

### backend-api (Refactored)
- Express server with encrypted SQLite database
- Secure WebSocket implementation (wss://)
- Authentication middleware and rate limiting
- Native document generation endpoints

### desktop-client (Enhanced)
- React-based UI (migrating from monolithic SPA)
- Secure token storage and transmission
- Offline capability with CRDT sync
- Role-based interface rendering

## Data Flow

1. **User Authentication**: Secure login → encrypted token storage → header-based auth
2. **Clinical Calculation**: Input validation → physiological limits check → safe computation → result display
3. **Data Persistence**: Changes → local encrypted DB → CRDT sync → conflict resolution → audit log
4. **Document Generation**: API request → native JS processing → secure file download
5. **Network Communication**: WSS with token headers → validated inputs → rate-limited processing

## Error Handling and Validation

### Input Validation
- All medical inputs validated against physiological ranges
- String inputs sanitized to prevent injection
- Numeric inputs checked for NaN, infinity, and extreme values
- Empty/default values handled safely

### Clinical Safety Checks
- Pre-calculation: Validate inputs against min/max therapeutic ranges
- Post-calculation: Verify results don't exceed safety thresholds
- User confirmation required for doses approaching limits
- Visual indicators for abnormal values

### System Error Handling
- Graceful degradation when encryption unavailable
- Secure fallback for authentication failures
- Detailed logging for debugging without exposing PHI
- User-friendly error messages that don't reveal system details

## Testing Strategy

### Unit Testing
- Medical calculator edge cases (boundary values, extreme inputs)
- Cryptographic functions and authentication flows
- Data validation and sanitization functions
- CRDT merge and conflict resolution logic

### Integration Testing
- End-to-end clinical workflows
- Authentication and authorization pathways
- Data sync and conflict resolution scenarios
- Document generation and export processes

### Security Testing
- Penetration testing for common vulnerabilities
- Authentication bypass attempts
- Data exposure and leakage testing
- DOS resilience under load

### Clinical Validation
- Medical calculator accuracy against reference implementations
- Dose calculation verification with clinical pharmacists
- Safety limit validation with medical experts

## Success Criteria

### Immediate Hospital Environment
- [ ] No calculator produces doses exceeding physiological limits
- [ ] Authentication no longer falls back to "1234" under any condition
- [ ] All network tokens transmitted via secure headers, never URLs
- [ ] Request rate limiting prevents server overload
- [ ] All user inputs validated and sanitized

### Architectural Improvements
- [ ] State migrated to encrypted database with backup capability
- [ ] Python subprocess eliminated for document generation
- [ ] Conflict resolution handles network partitions gracefully
- [ ] Audit trail captures all clinical actions with user attribution

### Commercial Readiness
- [ ] Role-based access control functional with multiple user types
- [ ] Comprehensive audit log meets regulatory requirements
- [ ] Security headers and protections implemented
- [ ] Application passes basic penetration testing

## Open Questions and Decisions Needed

1. **UI Framework Migration**: Should we migrate to React incrementally or rewrite?
2. **Encryption Library**: SQLCipher vs Web Crypto API for client-side encryption
3. **CRDT Library**: Yjs vs Automerge vs custom implementation
4. **Authentication Flow**: Username/password vs certificate-based for hospital environments
5. **Document Generation**: JavaScript docx library vs PDF generation alternative

## Related Files and Modules

- `public/js/labs.js` - Contains medical calculators requiring safety limits
- `server.js` - Main Express server needing security middleware
- `lan-squad/effective-team-code.js` - Authentication logic with 1234 fallback
- `ws-hub.js` - WebSocket implementation needing secure token handling
- `public/index.html` - Monolithic SPA to be refactored
- `generate-receta-hu.js` - Prescription generation using Python subprocess

---
*Design committed to git. Please review and let me know if any changes are needed before proceeding to implementation planning.*