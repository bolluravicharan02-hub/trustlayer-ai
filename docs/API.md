# TrustLayer AI - REST API Documentation

Base URL: `/api/v1`

Standard Response Envelope:
```json
// Success
{
  "success": true,
  "data": {},
  "meta": {}
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable explanation",
    "details": []
  }
}
```

---

## 1. Authentication Endpoints

### `GET /auth/csrf`
Returns a synchronizer CSRF token required in `X-CSRF-Token` header for all state-changing mutations (`POST`, `PATCH`, `DELETE`).

### `POST /auth/register`
Creates a new user, hashes password with Argon2id, creates an organization with the user as `owner`, and establishes a secure session.
```json
{
  "fullName": "Alex Rivera",
  "email": "alex.security@acmecorp.internal",
  "password": "Password123456!",
  "confirmPassword": "Password123456!",
  "organizationName": "Acme Defense Labs"
}
```

### `POST /auth/login`
Validates credentials against Argon2id hash and returns active organization context. Rate limited to 10 attempts/min.
```json
{
  "email": "alex.security@acmecorp.internal",
  "password": "DemoSecurity2026!"
}
```

### `POST /auth/logout`
Destroys session and clears cookie.

### `GET /auth/me`
Returns currently authenticated user profile and memberships list.

---

## 2. Organization Management

### `GET /organizations`
Lists organizations the user belongs to.

### `POST /organizations`
Creates a new organization.

### `GET /organizations/:id/members`
Lists all members in the organization.

### `POST /organizations/:id/invitations`
Generates a cryptographically random invitation token for a user.

### `PATCH /organizations/:id/members/:userId`
Updates member role (`owner`, `admin`, `analyst`, `viewer`).

---

## 3. Security Events

### `GET /events`
Paginated search and filter query across security events.
Query params: `page`, `limit`, `search`, `eventType`, `source`, `startDate`, `endDate`.

### `POST /events`
Manually ingest a single security event. Automatically scans for privacy leaks, redacts payloads, evaluates deterministic detection rules, and records audit logs.

### `POST /events/import`
Multi-part file upload (`.csv` or `.json`, max 5MB) or raw JSON array. Ingests and evaluates up to 5,000 records in batch with pre-storage redaction.

### `GET /events/stats`
Telemetry metrics by source and event type.

---

## 4. Security Alerts & Incident Investigation

### `GET /alerts`
Lists security alerts with pagination and filters (`severity`, `status`, `category`).

### `GET /alerts/:id`
Retrieves alert details, linked security event, deterministic evidence, investigation notes, and historical AI runs.

### `PATCH /alerts/:id/status`
Updates incident status (`open`, `acknowledged`, `investigating`, `resolved`, `false_positive`).

### `POST /alerts/:id/notes`
Adds an investigation note or collaborative comment.

### `POST /alerts/:id/analyze`
Invokes the **Google Gemini Copilot** to produce explainable root-cause analysis, alternative explanations, confidence scores, and recommended actions.

---

## 5. Privacy & Redaction Studio

### `POST /privacy/scan`
Scans input text or JSON for 8 sensitive categories (email, phone, credit card with Luhn verification, API keys, tokens, JWTs, private keys, IPs). Returns safe masked previews and overall risk level.

### `POST /privacy/redact`
Replaces detected sensitive tokens with format-preserving placeholders (`[REDACTED_EMAIL]`, `[REDACTED_API_KEY]`).

### `GET /privacy/scans`
Lists historical organization privacy scans.

---

## 6. Trust & Transparency Center

### `GET /trust/overview`
Returns configured model specifications, live connection telemetry, and data minimization guarantees.

### `GET /trust/ai-runs`
Lists all AI queries along with latency, model version, and cryptographic input digest.

---

## 7. Cryptographic Audit Trail

### `GET /audit`
Paginated, append-only audit trail.

### `GET /audit/verify`
Calculates and verifies the sequential SHA-256 hash chain across all historical audit entries. Returns `{ isValid: true, totalRecords, headHash }`.

