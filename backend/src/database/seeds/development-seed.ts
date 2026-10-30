import argon2 from 'argon2';
import { adminPool } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import { AuditChainService } from '../../services/audit-chain.service.js';
import { DetectionEngineService, SecurityEventInput } from '../../services/detection-engine.service.js';
import { RedactionService } from '../../services/redaction.service.js';

async function seed() {
  logger.info('🌱 Starting TrustLayer AI development database seeding...');
  const client = await adminPool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create or get Demo User
    const passwordHash = await argon2.hash('DemoSecurity2026!', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const userRes = await client.query(
      `INSERT INTO users (full_name, email, password_hash, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, full_name, email`,
      ['Alex Rivera', 'alex.security@acmecorp.internal', passwordHash]
    );
    const ownerUser = userRes.rows[0];

    const analystRes = await client.query(
      `INSERT INTO users (full_name, email, password_hash, is_active)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id, full_name, email`,
      ['Maya Lin', 'maya.analyst@acmecorp.internal', passwordHash]
    );
    const analystUser = analystRes.rows[0];

    // 2. Create Demo Organization
    const orgRes = await client.query(
      `INSERT INTO organizations (name, slug, settings)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, slug`,
      [
        'Acme Defense Labs',
        'acme-defense-labs',
        JSON.stringify({ defaultRetentionDays: 90, requireHumanApproval: true }),
      ]
    );
    const org = orgRes.rows[0];

    // 3. Link Memberships
    await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'owner'`,
      [org.id, ownerUser.id]
    );

    await client.query(
      `INSERT INTO organization_memberships (organization_id, user_id, role, status)
       VALUES ($1, $2, 'analyst', 'active')
       ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'analyst'`,
      [org.id, analystUser.id]
    );

    // Initial Genesis Audit Entry
    await AuditChainService.record(client, {
      organizationId: org.id,
      actorUserId: ownerUser.id,
      action: 'organization.provisioned',
      resourceType: 'organization',
      resourceId: org.id,
      metadata: { organizationName: org.name, slug: org.slug },
    });

    // 4. Create Predefined Security Policies
    const samplePolicies = [
      {
        name: 'Authentication Brute Force Threshold',
        description: 'Generates alerts when >= 5 failed logins occur within 5 minutes from a single IP or user.',
        category: 'authentication',
        policyType: 'brute_force_rule',
        configuration: { threshold: 5, windowMinutes: 5, action: 'alert' },
      },
      {
        name: 'Data Exfiltration Sentinel',
        description: 'Detects and flags bulk export events involving more than 1,000 records or restricted datasets.',
        category: 'suspicious_export',
        policyType: 'export_volume_rule',
        configuration: { maxRecordLimit: 1000, maxByteLimit: 50000000 },
      },
      {
        name: 'Sensitive Secret Redaction Policy',
        description: 'Mandates automated redaction for API keys, JWTs, and payment cards prior to persistence or AI analysis.',
        category: 'sensitive_data',
        policyType: 'privacy_redaction_rule',
        configuration: { categories: ['api_key', 'jwt', 'payment_card', 'private_key'], autoRedact: true },
      },
    ];

    for (const pol of samplePolicies) {
      const polRes = await client.query(
        `INSERT INTO security_policies (organization_id, name, description, category, policy_type, configuration, is_enabled, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         ON CONFLICT (organization_id, name) DO UPDATE SET configuration = EXCLUDED.configuration
         RETURNING id`,
        [org.id, pol.name, pol.description, pol.category, pol.policyType, JSON.stringify(pol.configuration), ownerUser.id]
      );

      await AuditChainService.record(client, {
        organizationId: org.id,
        actorUserId: ownerUser.id,
        action: 'policy.created',
        resourceType: 'security_policy',
        resourceId: polRes.rows[0].id,
        metadata: { name: pol.name, category: pol.category },
      });
    }

    // 5. Ingest Realistic Security Events
    const now = Date.now();
    const rawEvents: Array<{
      eventType: string;
      source: string;
      actorIdentifier: string | null;
      sourceIp: string | null;
      occurredAt: Date;
      payload: Record<string, unknown>;
      description: string;
    }> = [
      // Brute force series
      {
        eventType: 'auth.login_failed',
        source: 'sso_gateway',
        actorIdentifier: 'dev.user@acme.com',
        sourceIp: '198.51.100.42',
        occurredAt: new Date(now - 4 * 60 * 1000),
        payload: { attempt: 1, reason: 'invalid_password', userAgent: 'curl/7.68.0' },
        description: 'Authentication failure for dev.user@acme.com',
      },
      {
        eventType: 'auth.login_failed',
        source: 'sso_gateway',
        actorIdentifier: 'dev.user@acme.com',
        sourceIp: '198.51.100.42',
        occurredAt: new Date(now - 3 * 60 * 1000),
        payload: { attempt: 2, reason: 'invalid_password' },
        description: 'Authentication failure for dev.user@acme.com',
      },
      {
        eventType: 'auth.login_failed',
        source: 'sso_gateway',
        actorIdentifier: 'dev.user@acme.com',
        sourceIp: '198.51.100.42',
        occurredAt: new Date(now - 2 * 60 * 1000),
        payload: { attempt: 3, reason: 'invalid_password' },
        description: 'Authentication failure for dev.user@acme.com',
      },
      {
        eventType: 'auth.login_failed',
        source: 'sso_gateway',
        actorIdentifier: 'dev.user@acme.com',
        sourceIp: '198.51.100.42',
        occurredAt: new Date(now - 1 * 60 * 1000),
        payload: { attempt: 4, reason: 'invalid_password' },
        description: 'Authentication failure for dev.user@acme.com',
      },
      {
        eventType: 'auth.login_failed',
        source: 'sso_gateway',
        actorIdentifier: 'dev.user@acme.com',
        sourceIp: '198.51.100.42',
        occurredAt: new Date(now - 30 * 1000),
        payload: { attempt: 5, reason: 'invalid_password' },
        description: 'Authentication failure for dev.user@acme.com (threshold exceeded)',
      },
      // Privilege escalation
      {
        eventType: 'iam.privilege_escalation',
        source: 'iam_service',
        actorIdentifier: 'service_account_sync',
        sourceIp: '10.0.12.8',
        occurredAt: new Date(now - 45 * 60 * 1000),
        payload: { targetUser: 'contractor.guest@acme.com', role: 'admin', previousRole: 'viewer', approved: false },
        description: 'Contractor promoted to Administrator outside change window',
      },
      // Suspicious data export
      {
        eventType: 'storage.data_export',
        source: 'analytics_warehouse',
        actorIdentifier: 'alex.rivera',
        sourceIp: '192.168.1.105',
        occurredAt: new Date(now - 90 * 60 * 1000),
        payload: { resource: 'customer_billing_vault', record_count: 8500, byte_size: 68000000, restricted: true },
        description: 'Bulk download of 8,500 customer financial and billing records',
      },
      // Exposed secret in log
      {
        eventType: 'app.debug_log',
        source: 'payment_worker_v2',
        actorIdentifier: 'worker-node-9',
        sourceIp: '10.244.3.15',
        occurredAt: new Date(now - 120 * 60 * 1000),
        payload: {
          message: 'Failed to authenticate payment gateway with key sk-9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c and token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        },
        description: 'Debug exception containing unredacted API key and JWT auth header',
      },
      // Unusual off-hours critical action
      {
        eventType: 'cloud.database_delete_snapshot',
        source: 'cloud_control_plane',
        actorIdentifier: 'automated_ci_runner',
        sourceIp: '54.210.88.19',
        occurredAt: new Date(now - 180 * 60 * 1000),
        payload: { snapshotId: 'snap-prod-daily-20261029', region: 'us-east-1' },
        description: 'Production database backup snapshot deleted during off-hours maintenance window',
      },
    ];

    const historicalContext: SecurityEventInput[] = [];

    for (const ev of rawEvents) {
      // 1. Redact payload
      const sanitizedPayload = RedactionService.redactObject(ev.payload);
      const sanitizedDescription = RedactionService.redactText(ev.description).redactedText;

      const evRes = await client.query(
        `INSERT INTO security_events (
          organization_id, event_type, source, actor_identifier, source_ip,
          occurred_at, sanitized_payload, privacy_scanned, ingestion_source, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'api', $8)
        RETURNING id`,
        [
          org.id,
          ev.eventType,
          ev.source,
          ev.actorIdentifier,
          ev.sourceIp,
          ev.occurredAt,
          JSON.stringify(sanitizedPayload),
          ownerUser.id,
        ]
      );

      const eventId = evRes.rows[0].id;
      const currentEv: SecurityEventInput = {
        id: eventId,
        organizationId: org.id,
        eventType: ev.eventType,
        source: ev.source,
        actorIdentifier: ev.actorIdentifier,
        sourceIp: ev.sourceIp,
        occurredAt: ev.occurredAt,
        sanitizedPayload,
        description: sanitizedDescription,
      };

      historicalContext.push(currentEv);

      // Evaluate detection rules
      const detectedAlerts = DetectionEngineService.evaluateEvent(currentEv, historicalContext);

      for (const alert of detectedAlerts) {
        const alertRes = await client.query(
          `INSERT INTO security_alerts (
            organization_id, event_id, rule_code, title, description,
            category, severity, risk_score, evidence, recommended_actions, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
          ON CONFLICT (event_id, rule_code) WHERE event_id IS NOT NULL DO NOTHING
          RETURNING id`,
          [
            org.id,
            eventId,
            alert.ruleCode,
            alert.title,
            alert.description,
            alert.category,
            alert.severity,
            alert.riskScore,
            JSON.stringify(alert.evidence),
            JSON.stringify(alert.recommendedActions),
          ]
        );

        if (alertRes.rows.length > 0) {
          await AuditChainService.record(client, {
            organizationId: org.id,
            actorUserId: ownerUser.id,
            action: 'alert.created',
            resourceType: 'security_alert',
            resourceId: alertRes.rows[0].id,
            metadata: { ruleCode: alert.ruleCode, severity: alert.severity, riskScore: alert.riskScore },
          });
        }
      }

      await AuditChainService.record(client, {
        organizationId: org.id,
        actorUserId: ownerUser.id,
        action: 'event.ingested',
        resourceType: 'security_event',
        resourceId: eventId,
        metadata: { eventType: ev.eventType, source: ev.source },
      });
    }

    // 6. Verify Hash Chain Integrity
    const verification = await AuditChainService.verifyIntegrity(client, org.id);
    if (!verification.isValid) {
      throw new Error(`Audit hash chain verification failed during seed: ${verification.reason}`);
    }

    await client.query('COMMIT');
    logger.info(`✨ Development database seeded successfully!`);
    logger.info(`🏢 Organization: ${org.name} (${org.id})`);
    logger.info(`👤 Owner Account: ${ownerUser.email} / DemoSecurity2026!`);
    logger.info(`👤 Analyst Account: ${analystUser.email} / DemoSecurity2026!`);
    logger.info(`🔐 Audit Hash Chain Verified: ${verification.totalRecords} records, Head: ${verification.headHash?.substring(0, 16)}...`);
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Error seeding database');
    throw err;
  } finally {
    client.release();
    await adminPool.end();
  }
}

seed().catch((err) => {
  logger.error({ err }, 'Fatal seeding failure');
  process.exit(1);
});

