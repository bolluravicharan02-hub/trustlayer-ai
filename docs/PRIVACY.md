# TrustLayer AI - Privacy Protection & Data Redaction Specification

TrustLayer AI is engineered around the fundamental principle of **Privacy by Default**. Organizations frequently collect security logs that unintentionally contain personal identifying information (PII), customer payment cards, or sensitive API credentials.

---

## 1. Supported Sensitive Data Categories

| Category | Detection Technique | Verification Mechanism | Risk Level |
|---|---|---|---|
| **Payment Card Numbers** | 13–19 digit numeric patterns | **Luhn Checksum Algorithm** | Critical |
| **Private Keys** | PEM private key blocks (`BEGIN PRIVATE KEY`) | Pattern block matching | Critical |
| **API Keys & Secrets** | Known provider signatures (`sk-...`, `AIza...`, `AKIA...`) | High-entropy token regex | Critical |
| **Authentication Tokens** | HTTP `Bearer <token>` headers | Header & token length checks | High |
| **JWTs** | Base64URL 3-segment structure (`eyJ...`) | Structure & signature pattern | Critical |
| **Email Addresses** | RFC 5322 pattern recognition | Standard email domain format | Medium |
| **Phone Numbers** | E.164 and regional phone patterns | Digit count validation (10-15) | Medium |
| **IP Addresses** | IPv4 & IPv6 formatting | Octet range checking (0-255) | Low |

---

## 2. Luhn Algorithm Validation for Payment Cards

Credit cards (Visa, Mastercard, American Express, Discover, Diners Club) are validated using the mod-10 Luhn checksum algorithm:
```typescript
function passesLuhn(numStr: string): boolean {
  const digits = numStr.replace(/[\s-]/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (isNaN(digit)) return false;
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}
```
This prevents false positives from transaction IDs, internal timestamps, or numerical order codes.

---

## 3. Safe Masked Previews

When displaying detected findings in dashboards and reports, the system generates safe previews that mask the sensitive portions to prevent secondary leakage:
- Email: `ravi.sharma@example.com` $\rightarrow$ `r***a@example.com`
- Payment Card: `4532-0151-1283-0366` $\rightarrow$ `****-****-****-0366`
- API Key: `sk-9f8a7b6c5d4e3f2a1b0c` $\rightarrow$ `sk-***1b0c`
- JWT: `eyJhbGciOi...` $\rightarrow$ `eyJ***[JWT_SIGNATURE_HIDDEN]`
- Private Key: `-----BEGIN PRIVATE KEY...-----` $\rightarrow$ `-----BEGIN PRIVATE KEY...[CONTENT_HIDDEN]...END PRIVATE KEY-----`

---

## 4. Categorical Redaction

Redacted strings preserve semantic structure while stripping raw secrets:
```
Original:
"User dev.user@acme.com accessed database using key sk-secret9988."

Redacted:
"User [REDACTED_EMAIL] accessed database using key [REDACTED_API_KEY]."
```
Redactions occur in reverse character-offset order, preserving original indexing during substitution.

---

## 5. Zero-Exposure AI Boundary

1. Raw event payloads are passed through `RedactionService.redactObject()` before any Grok API call.
2. The AI model only receives sanitized text and format placeholders.
3. Model responses are parsed strictly against strict Zod schemas.
4. Input digests are hashed (SHA-256) and recorded in `ai_analysis_runs` for audit transparency without persisting raw prompt secrets.

