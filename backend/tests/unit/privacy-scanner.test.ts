import { describe, it, expect } from 'vitest';
import { PrivacyScannerService } from '../../src/services/privacy-scanner.service.js';
import { RedactionService } from '../../src/services/redaction.service.js';

describe('Privacy Scanner Service', () => {
  it('correctly validates credit card numbers using Luhn algorithm', () => {
    // Valid test card numbers
    expect(PrivacyScannerService.passesLuhn('4532015112830366')).toBe(true);
    expect(PrivacyScannerService.passesLuhn('4532-0151-1283-0366')).toBe(true);

    // Invalid numbers
    expect(PrivacyScannerService.passesLuhn('4532015112830367')).toBe(false);
    expect(PrivacyScannerService.passesLuhn('12345')).toBe(false); // too short
    expect(PrivacyScannerService.passesLuhn('not-a-number')).toBe(false);
  });

  it('detects and categorizes emails, API keys, and JWT tokens', () => {
    const sampleText = `
      User ravi@example.com connected with token sk-abcdef12345678901234567890.
      Session bearer: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w
    `;

    const result = PrivacyScannerService.scan(sampleText);

    expect(result.totalFindings).toBeGreaterThanOrEqual(3);
    const categories = result.findings.map(f => f.category);
    expect(categories).toContain('email');
    expect(categories).toContain('api_key');
    expect(categories).toContain('jwt');
    expect(result.riskLevel).toBe('critical');
  });

  it('generates safe masked previews without exposing raw secrets', () => {
    const rawSecret = 'sk-99887766554433221100aabbccdd';
    const preview = PrivacyScannerService.createSafePreview('api_key', rawSecret);

    expect(preview).toContain('sk-***');
    expect(preview).not.toBe(rawSecret);
    expect(preview.includes('9988776655')).toBe(false);

    const email = 'security.officer@enterprise.org';
    const emailPreview = PrivacyScannerService.createSafePreview('email', email);
    expect(emailPreview).toContain('@enterprise.org');
    expect(emailPreview.includes('security.officer')).toBe(false);
  });
});

describe('Automatic Data Redaction Service', () => {
  it('redacts sensitive values with category-specific placeholders', () => {
    const input = 'Alert: ravi@example.com logged in with key sk-123456789012345678901234.';
    const result = RedactionService.redactText(input);

    expect(result.redactedText).toContain('[REDACTED_EMAIL]');
    expect(result.redactedText).toContain('[REDACTED_API_KEY]');
    expect(result.redactedText).not.toContain('ravi@example.com');
    expect(result.redactedText).not.toContain('sk-1234567890');
    expect(result.totalRedacted).toBe(2);
  });

  it('recursively redacts complex JSON objects and sanitizes credential keys', () => {
    const inputObject = {
      event: 'user_action',
      apiKey: 'raw-secret-key-value',
      user: {
        email: 'john@company.com',
        notes: 'User called from phone +1 (555) 234-5678',
      },
      metadata: [
        { token: 'sk-98765432109876543210' }
      ]
    };

    const redacted = RedactionService.redactObject(inputObject) as any;

    expect(redacted.apiKey).toBe('[REDACTED_CREDENTIAL]');
    expect(redacted.user.email).toBe('[REDACTED_EMAIL]');
    expect(redacted.user.notes).toContain('[REDACTED_PHONE]');
    expect(redacted.metadata[0].token).toBe('[REDACTED_CREDENTIAL]');
  });
});

