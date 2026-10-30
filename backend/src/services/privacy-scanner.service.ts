import crypto from 'crypto';

export interface PrivacyFinding {
  id?: string;
  category: string;
  startOffset: number;
  endOffset: number;
  safePreview: string;
  confidence: number;
  detectionMethod: string;
  riskClassification: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'reviewed' | 'redacted' | 'dismissed';
}

export interface ScanResult {
  findings: PrivacyFinding[];
  totalFindings: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  inputDigest: string;
}

export class PrivacyScannerService {
  /**
   * Luhn algorithm for payment card validation to eliminate false positives
   */
  public static passesLuhn(numStr: string): boolean {
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

  /**
   * Generates a safe masked preview of a sensitive value without leaking it
   */
  public static createSafePreview(category: string, value: string): string {
    const clean = value.trim();
    if (clean.length <= 4) {
      return '****';
    }

    switch (category) {
      case 'email': {
        const parts = clean.split('@');
        if (parts.length === 2) {
          const user = parts[0];
          const domain = parts[1];
          const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
          return `${maskedUser}@${domain}`;
        }
        return `${clean.substring(0, 2)}***${clean.slice(-2)}`;
      }
      case 'payment_card': {
        const digits = clean.replace(/[\s-]/g, '');
        return `****-****-****-${digits.slice(-4)}`;
      }
      case 'api_key':
      case 'auth_token': {
        if (clean.startsWith('sk-')) {
          return `sk-***${clean.slice(-4)}`;
        }
        if (clean.startsWith('AIza')) {
          return `AIza***${clean.slice(-4)}`;
        }
        return `${clean.substring(0, 3)}***${clean.slice(-3)}`;
      }
      case 'jwt': {
        return 'eyJ***[JWT_SIGNATURE_HIDDEN]';
      }
      case 'private_key': {
        return '-----BEGIN PRIVATE KEY...[CONTENT_HIDDEN]...END PRIVATE KEY-----';
      }
      case 'phone': {
        return `${clean.substring(0, 3)}***${clean.slice(-2)}`;
      }
      case 'ip_address': {
        const octets = clean.split('.');
        if (octets.length === 4) {
          return `${octets[0]}.${octets[1]}.***.***`;
        }
        return `${clean.substring(0, 4)}***`;
      }
      default:
        return `${clean.substring(0, 2)}***${clean.slice(-2)}`;
    }
  }

  /**
   * Scans text content for all supported sensitive data categories
   */
  public static scan(text: string, categoriesToScan?: string[], customPatterns?: Array<{ name: string; regex: string }>): ScanResult {
    const findings: PrivacyFinding[] = [];
    const inputDigest = crypto.createHash('sha256').update(text, 'utf8').digest('hex');

    const shouldScan = (cat: string) => !categoriesToScan || categoriesToScan.length === 0 || categoriesToScan.includes(cat);

    // 1. Private Key Blocks (Critical)
    if (shouldScan('private_key')) {
      const privateKeyRegex = /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/gi;
      let match: RegExpExecArray | null;
      while ((match = privateKeyRegex.exec(text)) !== null) {
        findings.push({
          category: 'private_key',
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          safePreview: this.createSafePreview('private_key', match[0]),
          confidence: 0.99,
          detectionMethod: 'pattern_block',
          riskClassification: 'critical',
          status: 'detected',
        });
      }
    }

    // 2. JWT Tokens (Critical)
    if (shouldScan('jwt')) {
      const jwtRegex = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
      let match: RegExpExecArray | null;
      while ((match = jwtRegex.exec(text)) !== null) {
        findings.push({
          category: 'jwt',
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          safePreview: this.createSafePreview('jwt', match[0]),
          confidence: 0.95,
          detectionMethod: 'jwt_structure',
          riskClassification: 'critical',
          status: 'detected',
        });
      }
    }

    // 3. API Keys & Secrets (Critical/High)
    if (shouldScan('api_key')) {
      // Standard OpenAI/Anthropic/Stripe/Gemini/GitHub patterns
      const apiKeyPatterns = [
        { regex: /\b(sk-[a-zA-Z0-9_\-]{20,})\b/g, conf: 0.98, type: 'secret_key' },
        { regex: /\b(AIza[0-9A-Za-z-_]{35})\b/g, conf: 0.99, type: 'gemini_api_key' },
        { regex: /\b(AKIA[0-9A-Z]{16})\b/g, conf: 0.99, type: 'aws_access_key' },
        { regex: /\b(gh[pousr]_[A-Za-z0-9_]{36,})\b/g, conf: 0.99, type: 'github_token' },
        { regex: /\b(xox[baprs]-[0-9]{12}-[0-9]{12}-[a-zA-Z0-9]{24})\b/g, conf: 0.99, type: 'slack_token' },
        { regex: /(?:api[_-]?key|secret[_-]?token|auth[_-]?token)[\s:='"]+([a-zA-Z0-9_-]{16,64})['"\s,;]/gi, conf: 0.85, type: 'generic_key' },
      ];

      for (const pattern of apiKeyPatterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.regex.exec(text)) !== null) {
          const value = match[1] || match[0];
          const start = match.index + (match[0].indexOf(value));
          findings.push({
            category: 'api_key',
            startOffset: start,
            endOffset: start + value.length,
            safePreview: this.createSafePreview('api_key', value),
            confidence: pattern.conf,
            detectionMethod: pattern.type,
            riskClassification: 'critical',
            status: 'detected',
          });
        }
      }
    }

    // 4. Bearer / Auth Tokens (High)
    if (shouldScan('auth_token')) {
      const bearerRegex = /Bearer\s+([a-zA-Z0-9-._~+/]+=*)/gi;
      let match: RegExpExecArray | null;
      while ((match = bearerRegex.exec(text)) !== null) {
        const token = match[1];
        if (token.length > 10) {
          findings.push({
            category: 'auth_token',
            startOffset: match.index,
            endOffset: match.index + match[0].length,
            safePreview: 'Bearer ' + this.createSafePreview('auth_token', token),
            confidence: 0.92,
            detectionMethod: 'bearer_header',
            riskClassification: 'high',
            status: 'detected',
          });
        }
      }
    }

    // 5. Payment Card Numbers with Luhn check (Critical)
    if (shouldScan('payment_card')) {
      const cardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b|\b\d{13,19}\b/g;
      let match: RegExpExecArray | null;
      while ((match = cardRegex.exec(text)) !== null) {
        const potentialCard = match[0];
        if (this.passesLuhn(potentialCard)) {
          findings.push({
            category: 'payment_card',
            startOffset: match.index,
            endOffset: match.index + potentialCard.length,
            safePreview: this.createSafePreview('payment_card', potentialCard),
            confidence: 0.98,
            detectionMethod: 'regex_and_luhn_algorithm',
            riskClassification: 'critical',
            status: 'detected',
          });
        }
      }
    }

    // 6. Email Addresses (Medium)
    if (shouldScan('email')) {
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
      let match: RegExpExecArray | null;
      while ((match = emailRegex.exec(text)) !== null) {
        findings.push({
          category: 'email',
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          safePreview: this.createSafePreview('email', match[0]),
          confidence: 0.95,
          detectionMethod: 'rfc5322_pattern',
          riskClassification: 'medium',
          status: 'detected',
        });
      }
    }

    // 7. Phone Numbers (Medium)
    if (shouldScan('phone')) {
      const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,9}/g;
      let match: RegExpExecArray | null;
      while ((match = phoneRegex.exec(text)) !== null) {
        const phone = match[0].trim();
        // filter out pure small numbers or timestamps
        const digits = phone.replace(/\D/g, '');
        if (digits.length >= 10 && digits.length <= 15) {
          findings.push({
            category: 'phone',
            startOffset: match.index,
            endOffset: match.index + phone.length,
            safePreview: this.createSafePreview('phone', phone),
            confidence: 0.85,
            detectionMethod: 'e164_pattern',
            riskClassification: 'medium',
            status: 'detected',
          });
        }
      }
    }

    // 8. IP Addresses (Low / Informational)
    if (shouldScan('ip_address')) {
      const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
      let match: RegExpExecArray | null;
      while ((match = ipv4Regex.exec(text)) !== null) {
        // Exclude common safe non-sensitive local loopbacks if desired, or include with low risk
        findings.push({
          category: 'ip_address',
          startOffset: match.index,
          endOffset: match.index + match[0].length,
          safePreview: this.createSafePreview('ip_address', match[0]),
          confidence: 0.90,
          detectionMethod: 'ipv4_format',
          riskClassification: 'low',
          status: 'detected',
        });
      }
    }

    // 9. Custom Organization Patterns
    if (customPatterns && customPatterns.length > 0) {
      for (const custom of customPatterns) {
        try {
          const regex = new RegExp(custom.regex, 'g');
          let match: RegExpExecArray | null;
          while ((match = regex.exec(text)) !== null) {
            findings.push({
              category: `custom_${custom.name}`,
              startOffset: match.index,
              endOffset: match.index + match[0].length,
              safePreview: this.createSafePreview('custom', match[0]),
              confidence: 0.80,
              detectionMethod: 'organization_policy_regex',
              riskClassification: 'high',
              status: 'detected',
            });
          }
        } catch {
          // ignore invalid custom regex pattern
        }
      }
    }

    // Deduplicate overlapping findings (prefer higher risk / longer matches)
    const sorted = findings.sort((a, b) => a.startOffset - b.startOffset || (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset));
    const nonOverlapping: PrivacyFinding[] = [];
    let lastEnd = -1;

    for (const f of sorted) {
      if (f.startOffset >= lastEnd) {
        nonOverlapping.push(f);
        lastEnd = f.endOffset;
      }
    }

    // Determine overall risk
    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (nonOverlapping.some(f => f.riskClassification === 'critical')) {
      overallRisk = 'critical';
    } else if (nonOverlapping.some(f => f.riskClassification === 'high')) {
      overallRisk = 'high';
    } else if (nonOverlapping.some(f => f.riskClassification === 'medium')) {
      overallRisk = 'medium';
    }

    return {
      findings: nonOverlapping,
      totalFindings: nonOverlapping.length,
      riskLevel: overallRisk,
      inputDigest,
    };
  }
}

