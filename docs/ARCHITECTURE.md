# TrustLayer AI - Technical Architecture Specification

## 1. Executive System Overview

TrustLayer AI is an enterprise SaaS platform engineered to solve the triad of modern security challenges:
1. **Threat Telemetry & Anomaly Detection**
2. **Automated Sensitive Data Minimization & Redaction**
3. **Explainable AI Reasoning with Human-in-the-Loop Governance**

Unlike traditional SIEMs that dump cryptic log alerts or naive wrappers that feed raw confidential logs to third-party LLMs, TrustLayer AI introduces a deterministic-first architecture:
- Deterministic rules detect attacks mathematically.
- Sensitive information is masked **before** storage or external transit.
- Google Gemini enriches context and explains root causes without receiving raw credentials.
- Every state change and AI query is chained into an append-only SHA-256 cryptographic audit trail.

---

## 2. Full-Stack Layer Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 18 SPA (Vite + TS)                        │
│   Clerk React Components • TanStack Query • Tailwind • Recharts        │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ Bearer JWT (Clerk)             │ Sessions (Local)
                    ▼                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Express.js REST API Server (Node 22 LTS)               │
│  Clerk Token Verification • Helmet • Rate Limiting • Zod Validation   │
├───────────────────┬──────────────────────────┬─────────────────────────┤
│ Threat Detection  │ Privacy Scanner &        │ Gemini AI Reasoning     │
│ Deterministic     │ Redaction Engine         │ Structured Output (JSON)│
│ Rules (0-100 score│ Luhn Verification        │ System Prompt Sandbox   │
└─────────┬─────────┴────────────┬─────────────┴────────────┬────────────┘
          │                      │                          │
          ▼                      ▼                          ▼
┌────────────────────────────────────────────────────────────────────────┐
│         Supabase PostgreSQL 15+ with Native Row-Level Security         │
│    Tenant Isolation via `app.current_org_id` Transaction Setting       │
│    SHA-256 Hash Chained Audit Trail (`audit_head_hash` row locking)   │
│    Trigger-Enforced Immutability on Audit Logs (Rejects Update/Delete) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Threat Detection Engine

### Deterministic Rule Registry
- **`RULE_BRUTE_FORCE`**: Detects $\ge 5$ failed authentication attempts from a single source IP or targeting an actor identifier within a rolling 5-minute window.
- **`RULE_PRIV_ESCALATION`**: Detects promotion from lower privileges (e.g. `viewer` / `analyst`) to `admin` / `owner` outside authorized approval workflows.
- **`RULE_SUSPICIOUS_EXPORT`**: Detects high-volume data exfiltrations ($> 1,000$ records or $> 50\text{ MB}$) or extraction from designated restricted vault tables.
- **`RULE_UNUSUAL_ACCESS`**: Detects critical operations (e.g. key rotations, snapshot deletions) executed during non-standard hours (23:00 to 05:00 UTC).
- **`RULE_SENSITIVE_DATA_EXPOSURE`**: Flags unredacted API keys, private key blocks, credit cards, or JWT tokens embedded directly inside event descriptions or debug logs.
- **`RULE_SUSPICIOUS_EVENT`**: Flags known malicious indicators (malware flags, canary breaches, token theft signals).

### Risk Scoring Matrix
Risk scores range strictly between $0$ and $100$:
$$\text{Score} = \min\left(100, \max\left(0, \text{Base} + \sum \text{Modifiers}\right)\right)$$

| Severity Band | Risk Score Range | Color & Indicator |
|---|---|---|
| Informational | 0 – 24 | Slate / Subtle |
| Low | 25 – 49 | Electric Blue |
| Medium | 50 – 74 | Amber Warning |
| High | 75 – 89 | Orange Alert |
| Critical | 90 – 100 | Vivid Crimson |

---

## 4. Privacy Engine & Luhn Validation

The privacy engine scans unstructured text and JSON objects across 8 distinct sensitive categories:
1. **Email Addresses**: RFC 5322 regex pattern recognition.
2. **Phone Numbers**: International E.164 and regional patterns.
3. **Credit Cards**: 13–19 digit pattern recognition verified via the mathematical **Luhn checksum algorithm** to eliminate false positives from numeric database keys.
4. **API Keys**: Deterministic patterns for OpenAI/Anthropic (`sk-...`), Google Gemini (`AIza...`), AWS (`AKIA...`), GitHub (`ghp_...`), Slack tokens.
5. **Auth Tokens**: Standard HTTP Bearer headers.
6. **JWTs**: Base64URL-encoded three-segment tokens (`eyJ...`).
7. **Private Key Blocks**: PEM-encoded RSA/EC/OpenSSH private key headers and bodies.
8. **IP Addresses**: IPv4 and IPv6 recognition.

### Categorical Redaction
Matches are replaced with format-preserving tags such as `[REDACTED_EMAIL]`, `[REDACTED_API_KEY]`, and `[REDACTED_PAYMENT_CARD]`.

---

## 5. Google Gemini SDK Integration & Safety

- Uses official `@google/genai` Node.js package.
- API Key remains strictly server-side (`GEMINI_API_KEY`).
- System prompt instructs model that all input logs are untrusted evidence and to reject prompt injection attempts.
- Structured JSON output enforced via `responseMimeType: "application/json"`.
- Output validated at runtime using strict Zod schemas (`AIInvestigationResponseSchema`).
- Simulated local advisory fallback if `GEMINI_API_KEY` is not present, allowing offline development and testing.

---

## 6. Cryptographic Audit Hash Chain

Every audit record contains:
- `previous_hash`: SHA-256 hash of the preceding organization log entry.
- `entry_hash`: $\text{SHA-256}(\text{previous\_hash} \parallel \text{action} \parallel \text{org\_id} \parallel \text{actor\_id} \parallel \text{resource\_type} \parallel \text{resource\_id} \parallel \text{canonical\_metadata} \parallel \text{timestamp})$.
- Organizations track `audit_head_hash` under row-level database locks (`SELECT ... FOR UPDATE`).
- Database triggers automatically raise an exception on any `UPDATE` or `DELETE` statement targeting `audit_logs`.
- One-click verification endpoint `GET /api/v1/audit/verify` recalculates every hash in sequence.

