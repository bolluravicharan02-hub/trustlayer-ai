import { PrivacyScannerService, PrivacyFinding } from './privacy-scanner.service.js';

export interface RedactionResult {
  originalLength: number;
  redactedText: string;
  totalRedacted: number;
  redactedCategories: Record<string, number>;
}

export class RedactionService {
  /**
   * Redacts sensitive data from plain text using category-specific placeholders
   */
  public static redactText(
    text: string,
    categoriesToRedact?: string[],
    customPatterns?: Array<{ name: string; regex: string }>
  ): RedactionResult {
    const scanResult = PrivacyScannerService.scan(text, categoriesToRedact, customPatterns);
    const findings = scanResult.findings;

    if (findings.length === 0) {
      return {
        originalLength: text.length,
        redactedText: text,
        totalRedacted: 0,
        redactedCategories: {},
      };
    }

    // Sort findings descending by startOffset so replacements don't shift subsequent offsets
    const sorted = [...findings].sort((a, b) => b.startOffset - a.startOffset);

    let redacted = text;
    const redactedCategories: Record<string, number> = {};

    for (const f of sorted) {
      const tag = `[REDACTED_${f.category.toUpperCase()}]`;
      redacted = redacted.substring(0, f.startOffset) + tag + redacted.substring(f.endOffset);
      redactedCategories[f.category] = (redactedCategories[f.category] || 0) + 1;
    }

    return {
      originalLength: text.length,
      redactedText: redacted,
      totalRedacted: findings.length,
      redactedCategories,
    };
  }

  /**
   * Recursively traverses and redacts sensitive information inside JSON objects and payloads
   */
  public static redactObject<T = unknown>(obj: T, categoriesToRedact?: string[]): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.redactText(obj, categoriesToRedact).redactedText as unknown as T;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item, categoriesToRedact)) as unknown as T;
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        // Obvious credential key names are immediately replaced if string
        const lowerKey = key.toLowerCase();
        if (
          (lowerKey.includes('password') ||
           lowerKey.includes('secret') ||
           lowerKey.includes('apikey') ||
           lowerKey.includes('api_key') ||
           lowerKey.includes('token') ||
           lowerKey.includes('authorization') ||
           lowerKey.includes('private_key')) &&
          typeof val === 'string'
        ) {
          result[key] = '[REDACTED_CREDENTIAL]';
        } else {
          result[key] = this.redactObject(val, categoriesToRedact);
        }
      }
      return result as T;
    }

    return obj;
  }
}

