import { describe, it, expect } from 'vitest';
import { DetectionEngineService, SecurityEventInput } from '../../src/services/detection-engine.service.js';
import { RiskScoreService } from '../../src/services/risk-score.service.js';

describe('Deterministic Threat Detection Engine', () => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  it('triggers RULE_BRUTE_FORCE when >= 5 login failures occur within 5 minutes', () => {
    const now = Date.now();
    const recent: SecurityEventInput[] = [1, 2, 3, 4].map(i => ({
      id: `ev-${i}`,
      organizationId: orgId,
      eventType: 'auth.login_failed',
      source: 'auth_service',
      actorIdentifier: 'target.user@example.com',
      sourceIp: '203.0.113.10',
      occurredAt: new Date(now - i * 30 * 1000),
      sanitizedPayload: {},
    }));

    const currentEvent: SecurityEventInput = {
      id: 'ev-5',
      organizationId: orgId,
      eventType: 'auth.login_failed',
      source: 'auth_service',
      actorIdentifier: 'target.user@example.com',
      sourceIp: '203.0.113.10',
      occurredAt: new Date(now),
      sanitizedPayload: {},
    };

    const alerts = DetectionEngineService.evaluateEvent(currentEvent, recent);

    expect(alerts.length).toBeGreaterThanOrEqual(1);
    const bruteForceAlert = alerts.find(a => a.ruleCode === 'RULE_BRUTE_FORCE');
    expect(bruteForceAlert).toBeDefined();
    expect(bruteForceAlert?.category).toBe('authentication');
    expect(bruteForceAlert?.riskScore).toBeGreaterThanOrEqual(50);
    expect(bruteForceAlert?.severity).toMatch(/medium|high|critical/);
  });

  it('does NOT trigger brute force if failure count is below threshold (< 5)', () => {
    const now = Date.now();
    const recent: SecurityEventInput[] = [1, 2].map(i => ({
      id: `ev-${i}`,
      organizationId: orgId,
      eventType: 'auth.login_failed',
      source: 'auth_service',
      actorIdentifier: 'user@example.com',
      sourceIp: '1.2.3.4',
      occurredAt: new Date(now - i * 60 * 1000),
      sanitizedPayload: {},
    }));

    const currentEvent: SecurityEventInput = {
      id: 'ev-3',
      organizationId: orgId,
      eventType: 'auth.login_failed',
      source: 'auth_service',
      actorIdentifier: 'user@example.com',
      sourceIp: '1.2.3.4',
      occurredAt: new Date(now),
      sanitizedPayload: {},
    };

    const alerts = DetectionEngineService.evaluateEvent(currentEvent, recent);
    const bruteForceAlert = alerts.find(a => a.ruleCode === 'RULE_BRUTE_FORCE');
    expect(bruteForceAlert).toBeUndefined();
  });

  it('triggers RULE_PRIV_ESCALATION on unexpected administrative elevation', () => {
    const event: SecurityEventInput = {
      id: 'ev-priv-1',
      organizationId: orgId,
      eventType: 'iam.privilege_escalation',
      source: 'cloud_iam',
      actorIdentifier: 'temp.contractor',
      sourceIp: '10.0.0.5',
      occurredAt: new Date(),
      sanitizedPayload: { role: 'admin', previousRole: 'viewer', approved: false },
      description: 'Unauthorized role assignment',
    };

    const alerts = DetectionEngineService.evaluateEvent(event);
    const privAlert = alerts.find(a => a.ruleCode === 'RULE_PRIV_ESCALATION');

    expect(privAlert).toBeDefined();
    expect(privAlert?.category).toBe('privilege_escalation');
    expect(privAlert?.riskScore).toBeGreaterThanOrEqual(75);
    expect(privAlert?.severity).toMatch(/high|critical/);
  });

  it('triggers RULE_SUSPICIOUS_EXPORT on large record extractions', () => {
    const event: SecurityEventInput = {
      id: 'ev-export-1',
      organizationId: orgId,
      eventType: 'data.export',
      source: 'bi_portal',
      actorIdentifier: 'analyst@example.com',
      sourceIp: '192.168.1.50',
      occurredAt: new Date(),
      sanitizedPayload: { record_count: 5000, byte_size: 25000000 },
    };

    const alerts = DetectionEngineService.evaluateEvent(event);
    const exportAlert = alerts.find(a => a.ruleCode === 'RULE_SUSPICIOUS_EXPORT');

    expect(exportAlert).toBeDefined();
    expect(exportAlert?.category).toBe('data_exfiltration');
    expect(exportAlert?.riskScore).toBeGreaterThanOrEqual(50);
  });

  it('triggers RULE_SENSITIVE_DATA_EXPOSURE when an API key is in the event log', () => {
    const event: SecurityEventInput = {
      id: 'ev-leak-1',
      organizationId: orgId,
      eventType: 'app.error',
      source: 'api_server',
      actorIdentifier: 'system',
      sourceIp: '127.0.0.1',
      occurredAt: new Date(),
      sanitizedPayload: { key: 'sk-abcdef12345678901234567890' },
      description: 'Connection failed using sk-abcdef12345678901234567890',
    };

    const alerts = DetectionEngineService.evaluateEvent(event);
    const leakAlert = alerts.find(a => a.ruleCode === 'RULE_SENSITIVE_DATA_EXPOSURE');

    expect(leakAlert).toBeDefined();
    expect(leakAlert?.category).toBe('data_exposure');
    expect(leakAlert?.severity).toMatch(/high|critical/);
  });
});

describe('Risk Score Service', () => {
  it('bounds risk score between 0 and 100', () => {
    const resOver = RiskScoreService.calculate(80, [
      { ruleCode: 'R1', name: 'M1', points: 40, reason: 'Test 1' },
      { ruleCode: 'R2', name: 'M2', points: 30, reason: 'Test 2' },
    ]);
    expect(resOver.score).toBe(100);
    expect(resOver.severity).toBe('critical');

    const resUnder = RiskScoreService.calculate(5, [
      { ruleCode: 'R3', name: 'M3', points: -20, reason: 'Test 3' },
    ]);
    expect(resUnder.score).toBe(0);
    expect(resUnder.severity).toBe('informational');
  });

  it('deduplicates modifiers by ruleCode to prevent double counting', () => {
    const res = RiskScoreService.calculate(10, [
      { ruleCode: 'DUP_RULE', name: 'Duplicate 1', points: 25, reason: 'Reason 1' },
      { ruleCode: 'DUP_RULE', name: 'Duplicate 2', points: 25, reason: 'Reason 2' },
    ]);
    expect(res.score).toBe(35); // 10 + 25 (only once)
  });
});

