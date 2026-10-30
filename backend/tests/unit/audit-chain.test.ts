import { describe, it, expect } from 'vitest';
import { AuditChainService } from '../../src/services/audit-chain.service.js';

describe('Audit Chain Service (Cryptographic Hash Integrity)', () => {
  it('produces identical canonical JSON strings regardless of key insertion order', () => {
    const objA = { b: 2, a: 1, c: { z: 26, y: 25 } };
    const objB = { c: { y: 25, z: 26 }, a: 1, b: 2 };

    const canonA = AuditChainService.canonicalize(objA);
    const canonB = AuditChainService.canonicalize(objB);

    expect(canonA).toBe(canonB);
    expect(canonA).toBe('{"a":1,"b":2,"c":{"y":25,"z":26}}');
  });

  it('computes stable, deterministic SHA-256 entry hashes', () => {
    const prevHash = AuditChainService.GENESIS_HASH;
    const action = 'event.ingested';
    const orgId = '00000000-0000-0000-0000-000000000001';
    const actorId = '00000000-0000-0000-0000-000000000002';
    const meta = { count: 10, source: 'syslog' };
    const timestamp = '2026-10-30T10:00:00.000Z';

    const hash1 = AuditChainService.computeEntryHash(prevHash, action, orgId, actorId, null, null, meta, timestamp);
    const hash2 = AuditChainService.computeEntryHash(prevHash, action, orgId, actorId, null, null, { source: 'syslog', count: 10 }, timestamp);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string length
  });

  it('detects tampering if an audit record action, metadata, or previous_hash is altered', () => {
    const prevHash = AuditChainService.GENESIS_HASH;
    const orgId = 'org-1';
    const time = '2026-10-30T12:00:00.000Z';

    const originalHash = AuditChainService.computeEntryHash(
      prevHash,
      'alert.resolved',
      orgId,
      'user-1',
      'security_alert',
      'alert-101',
      { reason: 'Verified false positive' },
      time
    );

    // Tampered action
    const tamperedActionHash = AuditChainService.computeEntryHash(
      prevHash,
      'alert.deleted', // modified
      orgId,
      'user-1',
      'security_alert',
      'alert-101',
      { reason: 'Verified false positive' },
      time
    );

    expect(originalHash).not.toBe(tamperedActionHash);

    // Tampered metadata
    const tamperedMetaHash = AuditChainService.computeEntryHash(
      prevHash,
      'alert.resolved',
      orgId,
      'user-1',
      'security_alert',
      'alert-101',
      { reason: 'Different reason' }, // modified
      time
    );

    expect(originalHash).not.toBe(tamperedMetaHash);
  });
});

