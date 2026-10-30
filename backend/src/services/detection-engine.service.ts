import { PrivacyScannerService } from './privacy-scanner.service.js';
import { RiskScoreService, ScoreModifier } from './risk-score.service.js';
import { AlertSeverity } from '../schemas/index.js';

export interface SecurityEventInput {
  id?: string;
  organizationId: string;
  eventType: string;
  source: string;
  sourceEventId?: string | null;
  actorIdentifier?: string | null;
  sourceIp?: string | null;
  occurredAt: string | Date;
  sanitizedPayload: Record<string, unknown>;
  description?: string;
}

export interface DetectedAlert {
  eventId?: string;
  ruleCode: string;
  title: string;
  description: string;
  category: string;
  severity: AlertSeverity;
  riskScore: number;
  evidence: Array<{ key: string; value: unknown; description: string }>;
  recommendedActions: Array<{ action: string; reason: string; priority: 'low' | 'medium' | 'high' | 'urgent'; requiresApproval: boolean }>;
}

export class DetectionEngineService {
  /**
   * Evaluates a security event against deterministic detection rules
   * optionally comparing against recent events in the ingestion window.
   */
  public static evaluateEvent(
    event: SecurityEventInput,
    recentEvents: SecurityEventInput[] = []
  ): DetectedAlert[] {
    const alerts: DetectedAlert[] = [];
    const eventType = (event.eventType || '').toLowerCase();
    const payload = event.sanitizedPayload || {};
    const description = (event.description || '').toLowerCase();

    // ------------------------------------------------------------------------
    // Rule A: Brute-Force Login Detection (RULE_BRUTE_FORCE)
    // ------------------------------------------------------------------------
    const isLoginFailure =
      eventType.includes('login_failed') ||
      eventType.includes('auth_failed') ||
      eventType.includes('authentication_failure') ||
      description.includes('failed login') ||
      description.includes('invalid credentials');

    if (isLoginFailure) {
      const eventTime = new Date(event.occurredAt).getTime();
      const fiveMinutesAgo = eventTime - 5 * 60 * 1000;

      // Count failures from same IP or actor within 5 minutes
      const failedCount = recentEvents.filter(e => {
        const t = new Date(e.occurredAt).getTime();
        const type = (e.eventType || '').toLowerCase();
        const matchesType = type.includes('login_failed') || type.includes('auth_failed');
        const matchesActor = (event.actorIdentifier && e.actorIdentifier === event.actorIdentifier);
        const matchesIp = (event.sourceIp && e.sourceIp === e.sourceIp);
        return matchesType && (matchesActor || matchesIp) && t >= fiveMinutesAgo && t <= eventTime;
      }).length + 1; // +1 includes current event

      if (failedCount >= 5) {
        const modifiers: ScoreModifier[] = [
          {
            ruleCode: 'RULE_BRUTE_FORCE',
            name: 'Repeated authentication failures',
            points: 25,
            reason: `${failedCount} failed authentication attempts recorded within 5 minutes.`,
          },
        ];

        if (failedCount >= 10) {
          modifiers.push({
            ruleCode: 'RULE_BRUTE_FORCE_HIGH_VELOCITY',
            name: 'High velocity credential attack',
            points: 20,
            reason: 'High-velocity brute force threshold exceeded (>10 attempts).',
          });
        }

        const scoreRes = RiskScoreService.calculate(40, modifiers);

        alerts.push({
          eventId: event.id,
          ruleCode: 'RULE_BRUTE_FORCE',
          title: `Brute-force authentication anomaly detected (${failedCount} failures)`,
          description: `Multiple failed authentication attempts (${failedCount}) were recorded from source IP '${event.sourceIp || 'unknown'}' or targeting user '${event.actorIdentifier || 'unknown'}' within a 5-minute window.`,
          category: 'authentication',
          severity: scoreRes.severity,
          riskScore: scoreRes.score,
          evidence: [
            { key: 'failed_attempts_count', value: failedCount, description: 'Number of failed attempts within 5 minutes' },
            { key: 'source_ip', value: event.sourceIp || 'unknown', description: 'Originating IP address' },
            { key: 'target_actor', value: event.actorIdentifier || 'unknown', description: 'Target user identity' },
            { key: 'detection_rule', value: 'RULE_BRUTE_FORCE', description: 'Deterministic threshold: >= 5 failures in 5 min' },
          ],
          recommendedActions: [
            {
              action: 'Verify user credentials status and notify account owner',
              reason: 'Confirm whether the account owner is experiencing login issues or if credentials are leaked.',
              priority: 'high',
              requiresApproval: false,
            },
            {
              action: 'Temporarily apply IP rate limiting or CAPTCHA challenge',
              reason: 'Mitigate automated credential stuffing without locking legitimate accounts.',
              priority: 'medium',
              requiresApproval: true,
            },
          ],
        });
      }
    }

    // ------------------------------------------------------------------------
    // Rule B: Privilege Escalation Detection (RULE_PRIV_ESCALATION)
    // ------------------------------------------------------------------------
    const isPrivEscalation =
      eventType.includes('privilege_escalation') ||
      eventType.includes('role_assigned') ||
      eventType.includes('permission_grant') ||
      eventType.includes('admin_promoted') ||
      (payload.role === 'admin' || payload.role === 'owner') && (payload.previousRole === 'viewer' || payload.previousRole === 'analyst');

    if (isPrivEscalation) {
      const modifiers: ScoreModifier[] = [
        {
          ruleCode: 'RULE_PRIV_ESCALATION',
          name: 'Privilege escalation',
          points: 35,
          reason: 'Elevated role or administrative permission granted to user.',
        },
      ];

      if (payload.approved === false || payload.out_of_band === true) {
        modifiers.push({
          ruleCode: 'RULE_UNAPPROVED_CHANGE',
          name: 'Policy violation: unapproved elevation',
          points: 15,
          reason: 'Elevation occurred outside established authorization approval workflow.',
        });
      }

      const scoreRes = RiskScoreService.calculate(45, modifiers);

      alerts.push({
        eventId: event.id,
        ruleCode: 'RULE_PRIV_ESCALATION',
        title: 'Unexpected Administrative Privilege Escalation',
        description: `User '${event.actorIdentifier || 'unknown'}' or resource received administrative privileges (${JSON.stringify(payload.role || 'admin')}).`,
        category: 'privilege_escalation',
        severity: scoreRes.severity,
        riskScore: scoreRes.score,
        evidence: [
          { key: 'event_type', value: event.eventType, description: 'Type of permission change event' },
          { key: 'actor', value: event.actorIdentifier || 'unknown', description: 'Subject of privilege modification' },
          { key: 'assigned_role', value: payload.role || 'administrator', description: 'New role assigned' },
          { key: 'source', value: event.source, description: 'Event source subsystem' },
        ],
        recommendedActions: [
          {
            action: 'Review change request ticket or manager authorization for this role promotion',
            reason: 'Determine if this elevation was planned and approved by authorized leadership.',
            priority: 'urgent',
            requiresApproval: false,
          },
          {
            action: 'Revert role assignment if authorization cannot be verified',
            reason: 'Prevent unauthorized administrative access to organizational tenant data.',
            priority: 'urgent',
            requiresApproval: true,
          },
        ],
      });
    }

    // ------------------------------------------------------------------------
    // Rule C: Suspicious Data Export Detection (RULE_SUSPICIOUS_EXPORT)
    // ------------------------------------------------------------------------
    const isExportEvent =
      eventType.includes('export') ||
      eventType.includes('download') ||
      eventType.includes('exfiltration') ||
      eventType.includes('bulk_query');

    const recordCount = Number(payload.record_count || payload.recordCount || payload.count || 0);
    const byteSize = Number(payload.byte_size || payload.byteSize || payload.size || 0);
    const isRestrictedResource = Boolean(payload.restricted || payload.sensitive_data || description.includes('sensitive') || description.includes('restricted'));

    if (isExportEvent && (recordCount >= 1000 || byteSize >= 50000000 || isRestrictedResource)) {
      const modifiers: ScoreModifier[] = [
        {
          ruleCode: 'RULE_SUSPICIOUS_EXPORT',
          name: 'Suspicious large export',
          points: 25,
          reason: `High volume data extraction detected (${recordCount} records, ${byteSize} bytes).`,
        },
      ];

      if (isRestrictedResource) {
        modifiers.push({
          ruleCode: 'RULE_RESTRICTED_EXPORT',
          name: 'Restricted resource access',
          points: 20,
          reason: 'Data export involves designated restricted or confidential resource.',
        });
      }

      const scoreRes = RiskScoreService.calculate(35, modifiers);

      alerts.push({
        eventId: event.id,
        ruleCode: 'RULE_SUSPICIOUS_EXPORT',
        title: `Suspicious Data Export Detected (${recordCount} records)`,
        description: `An unusually large or restricted data export was initiated by '${event.actorIdentifier || 'unknown'}' from resource '${payload.resource || event.source}'.`,
        category: 'data_exfiltration',
        severity: scoreRes.severity,
        riskScore: scoreRes.score,
        evidence: [
          { key: 'record_count', value: recordCount, description: 'Total records extracted' },
          { key: 'byte_size', value: byteSize, description: 'Payload size in bytes' },
          { key: 'actor', value: event.actorIdentifier || 'unknown', description: 'Exporting user identifier' },
          { key: 'source_ip', value: event.sourceIp || 'unknown', description: 'Originating client IP' },
        ],
        recommendedActions: [
          {
            action: 'Audit exported dataset classification and recipient location',
            reason: 'Verify whether exported data complies with organization export policy.',
            priority: 'high',
            requiresApproval: false,
          },
          {
            action: 'Restrict further bulk exports for this user pending review',
            reason: 'Mitigate risk of extensive corporate data loss or exfiltration.',
            priority: 'high',
            requiresApproval: true,
          },
        ],
      });
    }

    // ------------------------------------------------------------------------
    // Rule D: Unusual Access Pattern (RULE_UNUSUAL_ACCESS)
    // ------------------------------------------------------------------------
    const occurredDate = new Date(event.occurredAt);
    const utcHour = occurredDate.getUTCHours();
    // Default off-hours: between 23:00 and 05:00 UTC if flagged as critical access
    const isOffHours = utcHour >= 23 || utcHour <= 5;
    const isCriticalOperation =
      eventType.includes('delete') ||
      eventType.includes('wipe') ||
      eventType.includes('key_rotation') ||
      eventType.includes('policy_override');

    if (isOffHours && isCriticalOperation) {
      const modifiers: ScoreModifier[] = [
        {
          ruleCode: 'RULE_UNUSUAL_ACCESS',
          name: 'Restricted resource access / Off-hours activity',
          points: 20,
          reason: `Critical operational action executed during non-standard hours (${utcHour}:00 UTC).`,
        },
      ];

      const scoreRes = RiskScoreService.calculate(30, modifiers);

      alerts.push({
        eventId: event.id,
        ruleCode: 'RULE_UNUSUAL_ACCESS',
        title: `Unusual Off-Hours Operational Activity (${utcHour}:00 UTC)`,
        description: `Critical operation '${event.eventType}' executed by '${event.actorIdentifier || 'unknown'}' outside normal operational windows.`,
        category: 'suspicious_activity',
        severity: scoreRes.severity,
        riskScore: scoreRes.score,
        evidence: [
          { key: 'event_type', value: event.eventType, description: 'Operation executed' },
          { key: 'utc_hour', value: `${utcHour}:00 UTC`, description: 'Execution timestamp hour' },
          { key: 'actor', value: event.actorIdentifier || 'unknown', description: 'Executing identity' },
        ],
        recommendedActions: [
          {
            action: 'Confirm off-hours maintenance ticket or on-call emergency status',
            reason: 'Ensure action was performed by an authorized team member during scheduled maintenance.',
            priority: 'medium',
            requiresApproval: false,
          },
        ],
      });
    }

    // ------------------------------------------------------------------------
    // Rule E: Sensitive Data Exposure Detection (RULE_SENSITIVE_DATA_EXPOSURE)
    // ------------------------------------------------------------------------
    const fullTextToScan = JSON.stringify(payload) + ' ' + (event.description || '');
    const privacyCheck = PrivacyScannerService.scan(fullTextToScan, ['api_key', 'payment_card', 'private_key', 'jwt']);

    if (privacyCheck.totalFindings > 0) {
      const modifiers: ScoreModifier[] = [
        {
          ruleCode: 'RULE_SENSITIVE_DATA_EXPOSURE',
          name: 'High-risk configured event: Sensitive Secret Exposed',
          points: 30,
          reason: `Event content contains ${privacyCheck.totalFindings} exposed sensitive secret(s) (${privacyCheck.findings.map(f => f.category).join(', ')}).`,
        },
      ];

      const scoreRes = RiskScoreService.calculate(45, modifiers);

      alerts.push({
        eventId: event.id,
        ruleCode: 'RULE_SENSITIVE_DATA_EXPOSURE',
        title: `Critical Secret / Sensitive Data Exposed in Log Event`,
        description: `Unredacted sensitive credentials or tokens (${privacyCheck.findings.map(f => f.category).join(', ')}) were detected in the ingested event data.`,
        category: 'data_exposure',
        severity: scoreRes.severity,
        riskScore: scoreRes.score,
        evidence: privacyCheck.findings.map(f => ({
          key: f.category,
          value: f.safePreview,
          description: `Detected via ${f.detectionMethod} with confidence ${f.confidence}`,
        })),
        recommendedActions: [
          {
            action: 'Revoke and rotate any exposed API keys or tokens immediately',
            reason: 'Secrets visible in logs are susceptible to exposure to third parties and unauthorized actors.',
            priority: 'urgent',
            requiresApproval: true,
          },
          {
            action: 'Verify that client applications sanitize payloads before emitting logs',
            reason: 'Prevent further secret leakage at the application logging boundary.',
            priority: 'high',
            requiresApproval: false,
          },
        ],
      });
    }

    // ------------------------------------------------------------------------
    // Rule F: Known High-Risk Suspicious Event (RULE_SUSPICIOUS_EVENT)
    // ------------------------------------------------------------------------
    const isKnownHighRisk =
      eventType.includes('malware') ||
      eventType.includes('ransomware') ||
      eventType.includes('token_theft') ||
      eventType.includes('session_hijack') ||
      eventType.includes('unauthorized_admin');

    if (isKnownHighRisk) {
      const modifiers: ScoreModifier[] = [
        {
          ruleCode: 'RULE_SUSPICIOUS_EVENT',
          name: 'High-risk security event classification',
          points: 30,
          reason: `Ingested event matched known critical indicator '${event.eventType}'.`,
        },
      ];

      const scoreRes = RiskScoreService.calculate(55, modifiers);

      alerts.push({
        eventId: event.id,
        ruleCode: 'RULE_SUSPICIOUS_EVENT',
        title: `High-Risk Threat Indicator: ${event.eventType}`,
        description: `A security telemetry event matching a high-risk security threat pattern was recorded from source '${event.source}'.`,
        category: 'suspicious_activity',
        severity: scoreRes.severity,
        riskScore: scoreRes.score,
        evidence: [
          { key: 'event_type', value: event.eventType, description: 'Matched high-risk threat signature' },
          { key: 'source', value: event.source, description: 'Source security monitoring agent' },
          { key: 'actor', value: event.actorIdentifier || 'unknown', description: 'Associated actor identity' },
        ],
        recommendedActions: [
          {
            action: 'Isolate affected host or terminate active user session',
            reason: 'Prevent potential lateral movement or persistent unauthorized execution.',
            priority: 'urgent',
            requiresApproval: true,
          },
          {
            action: 'Collect endpoint memory capture or cloud access logs',
            reason: 'Preserve forensic telemetry for forensic analysis.',
            priority: 'high',
            requiresApproval: false,
          },
        ],
      });
    }

    return alerts;
  }
}

