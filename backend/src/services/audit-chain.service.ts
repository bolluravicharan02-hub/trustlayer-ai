import crypto from 'crypto';
import pg from 'pg';
import { logger } from '../utils/logger.js';
import { RedactionService } from './redaction.service.js';

export interface AuditRecordInput {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface VerificationResult {
  isValid: boolean;
  totalRecords: number;
  headHash: string | null;
  verifiedAt: string;
  brokenIndex?: number;
  reason?: string;
}

export class AuditChainService {
  public static readonly GENESIS_HASH = '0'.repeat(64);

  /**
   * Deterministically canonicalizes an object into a stable sorted JSON string
   */
  public static canonicalize(obj: unknown): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map(item => this.canonicalize(item)).join(',') + ']';
    }
    const keys = Object.keys(obj as Record<string, unknown>).sort();
    const parts = keys.map(k => `${JSON.stringify(k)}:${this.canonicalize((obj as Record<string, unknown>)[k])}`);
    return '{' + parts.join(',') + '}';
  }

  /**
   * Computes the SHA-256 entry hash from canonical representation
   */
  public static computeEntryHash(
    previousHash: string,
    action: string,
    organizationId: string,
    actorUserId: string | null,
    resourceType: string | null,
    resourceId: string | null,
    metadata: Record<string, unknown>,
    createdAtIso: string
  ): string {
    const canonicalMetadata = this.canonicalize(metadata);
    const payload = `${previousHash}|${action}|${organizationId}|${actorUserId || ''}|${resourceType || ''}|${resourceId || ''}|${canonicalMetadata}|${createdAtIso}`;
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Records an audit log entry in the append-only hash chain inside a transaction
   */
  public static async record(
    client: pg.PoolClient,
    input: AuditRecordInput
  ): Promise<{ id: string; entryHash: string }> {
    // 1. Sanitize metadata so secrets are never in audit logs
    const safeMetadata = RedactionService.redactObject(input.metadata || {}) as Record<string, unknown>;

    // 2. Lock organization row and fetch latest audit head hash
    const orgRes = await client.query(
      'SELECT audit_head_hash FROM organizations WHERE id = $1 FOR UPDATE',
      [input.organizationId]
    );

    if (orgRes.rows.length === 0) {
      throw new Error(`Organization not found for audit entry: ${input.organizationId}`);
    }

    const previousHash = orgRes.rows[0].audit_head_hash || this.GENESIS_HASH;
    const nowIso = new Date().toISOString();

    // 3. Compute deterministic entry hash
    const entryHash = this.computeEntryHash(
      previousHash,
      input.action,
      input.organizationId,
      input.actorUserId || null,
      input.resourceType || null,
      input.resourceId || null,
      safeMetadata,
      nowIso
    );

    // 4. Insert append-only record
    const insertRes = await client.query(
      `INSERT INTO audit_logs (
        organization_id, actor_user_id, action, resource_type, resource_id,
        metadata, previous_hash, entry_hash, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        input.organizationId,
        input.actorUserId || null,
        input.action,
        input.resourceType || null,
        input.resourceId || null,
        JSON.stringify(safeMetadata),
        previousHash,
        entryHash,
        nowIso,
      ]
    );

    // 5. Update organization head hash
    await client.query(
      'UPDATE organizations SET audit_head_hash = $1 WHERE id = $2',
      [entryHash, input.organizationId]
    );

    logger.debug({ action: input.action, orgId: input.organizationId, entryHash }, 'Audit log entry recorded');

    return {
      id: insertRes.rows[0].id,
      entryHash,
    };
  }

  /**
   * Verifies the full SHA-256 hash chain for an organization
   */
  public static async verifyIntegrity(
    client: pg.PoolClient,
    organizationId: string
  ): Promise<VerificationResult> {
    const orgRes = await client.query(
      'SELECT audit_head_hash FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (orgRes.rows.length === 0) {
      return {
        isValid: false,
        totalRecords: 0,
        headHash: null,
        verifiedAt: new Date().toISOString(),
        reason: 'Organization does not exist',
      };
    }

    const currentHead = orgRes.rows[0].audit_head_hash;

    // Fetch all logs in ascending chronological order
    const logsRes = await client.query(
      `SELECT id, actor_user_id, action, resource_type, resource_id,
              metadata, previous_hash, entry_hash, created_at
       FROM audit_logs
       WHERE organization_id = $1
       ORDER BY created_at ASC`,
      [organizationId]
    );

    const logs = logsRes.rows;
    if (logs.length === 0) {
      return {
        isValid: currentHead === null,
        totalRecords: 0,
        headHash: currentHead,
        verifiedAt: new Date().toISOString(),
      };
    }

    let expectedPrev = this.GENESIS_HASH;

    for (let i = 0; i < logs.length; i++) {
      const record = logs[i];
      const createdAtIso = new Date(record.created_at).toISOString();

      if (record.previous_hash !== expectedPrev) {
        return {
          isValid: false,
          totalRecords: logs.length,
          headHash: currentHead,
          verifiedAt: new Date().toISOString(),
          brokenIndex: i,
          reason: `Previous hash mismatch at index ${i}. Expected ${expectedPrev}, found ${record.previous_hash}`,
        };
      }

      const meta = typeof record.metadata === 'string' ? JSON.parse(record.metadata) : record.metadata;
      const computedHash = this.computeEntryHash(
        record.previous_hash,
        record.action,
        organizationId,
        record.actor_user_id,
        record.resource_type,
        record.resource_id,
        meta,
        createdAtIso
      );

      if (computedHash !== record.entry_hash) {
        return {
          isValid: false,
          totalRecords: logs.length,
          headHash: currentHead,
          verifiedAt: new Date().toISOString(),
          brokenIndex: i,
          reason: `Entry hash mismatch at index ${i}. Record tampered or modified.`,
        };
      }

      expectedPrev = record.entry_hash;
    }

    if (expectedPrev !== currentHead) {
      return {
        isValid: false,
        totalRecords: logs.length,
        headHash: currentHead,
        verifiedAt: new Date().toISOString(),
        reason: `Organization head hash does not match latest entry hash.`,
      };
    }

    return {
      isValid: true,
      totalRecords: logs.length,
      headHash: currentHead,
      verifiedAt: new Date().toISOString(),
    };
  }
}

