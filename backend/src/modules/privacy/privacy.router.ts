import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requireOrgMember } from '../../middleware/authorization.middleware.js';
import { validateBody } from '../../middleware/validation.middleware.js';
import { withTenantTransaction } from '../../database/tenant-transaction.js';
import { PrivacyScannerService } from '../../services/privacy-scanner.service.js';
import { RedactionService } from '../../services/redaction.service.js';
import { AuditChainService } from '../../services/audit-chain.service.js';
import { AIInvestigationService } from '../../services/ai-investigation.service.js';
import {
  PrivacyScanRequestSchema,
  RedactionRequestSchema,
  PrivacyFindingStatusEnum
} from '../../schemas/index.js';
import { z } from 'zod';

export const privacyRouter = Router();

// Perform Privacy Scan
privacyRouter.post(
  '/privacy/scan',
  requireAuth,
  requireOrgMember('analyst'),
  validateBody(PrivacyScanRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { content, categories, redact = true } = req.body;

    try {
      const scanResult = PrivacyScannerService.scan(content, categories);

      let redactedOutput: string | null = null;
      if (redact) {
        redactedOutput = RedactionService.redactText(content, categories).redactedText;
      }

      // Optional AI privacy risk summary
      const aiSummary = await AIInvestigationService.explainPrivacyRisks(
        scanResult.findings.map(f => ({
          category: f.category,
          safePreview: f.safePreview,
          detectionMethod: f.detectionMethod,
        }))
      );

      // Persist safe scan metadata in database
      const savedScan = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const scanRes = await client.query(
            `INSERT INTO privacy_scans (
              organization_id, created_by, scan_type, total_findings,
              redacted_count, risk_level, status, input_digest
            ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7)
            RETURNING id, created_at`,
            [
              req.organization!.id,
              req.user!.id,
              'interactive_scan',
              scanResult.totalFindings,
              redact ? scanResult.totalFindings : 0,
              scanResult.riskLevel,
              scanResult.inputDigest,
            ]
          );

          const scanId = scanRes.rows[0].id;

          // Insert individual safe findings
          for (const finding of scanResult.findings) {
            await client.query(
              `INSERT INTO privacy_findings (
                organization_id, scan_id, category, start_offset, end_offset,
                safe_preview, confidence, detection_method, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                req.organization!.id,
                scanId,
                finding.category,
                finding.startOffset,
                finding.endOffset,
                finding.safePreview,
                finding.confidence,
                finding.detectionMethod,
                redact ? 'redacted' : 'detected',
              ]
            );
          }

          // Record audit log
          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'privacy.scanned',
            resourceType: 'privacy_scan',
            resourceId: scanId,
            metadata: {
              totalFindings: scanResult.totalFindings,
              riskLevel: scanResult.riskLevel,
              redacted: Boolean(redact),
            },
          });

          return {
            scanId,
            createdAt: scanRes.rows[0].created_at,
          };
        }
      );

      res.status(201).json({
        success: true,
        data: {
          scanId: savedScan.scanId,
          totalFindings: scanResult.totalFindings,
          riskLevel: scanResult.riskLevel,
          inputDigest: scanResult.inputDigest,
          findings: scanResult.findings,
          redactedOutput,
          aiAdvisory: aiSummary,
          createdAt: savedScan.createdAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// Standalone Redact API
privacyRouter.post(
  '/privacy/redact',
  requireAuth,
  requireOrgMember('analyst'),
  validateBody(RedactionRequestSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { content, categories } = req.body;

    try {
      const result = RedactionService.redactText(content, categories);

      res.json({
        success: true,
        data: {
          redactedText: result.redactedText,
          totalRedacted: result.totalRedacted,
          redactedCategories: result.redactedCategories,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// List privacy scans
privacyRouter.get(
  '/privacy/scans',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scans = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `SELECT s.id, s.scan_type as "scanType", s.total_findings as "totalFindings",
                    s.redacted_count as "redactedCount", s.risk_level as "riskLevel",
                    s.status, s.input_digest as "inputDigest", s.created_at as "createdAt",
                    u.full_name as "createdByName"
             FROM privacy_scans s
             JOIN users u ON u.id = s.created_by
             WHERE s.organization_id = $1
             ORDER BY s.created_at DESC
             LIMIT 50`,
            [req.organization!.id]
          );
          return res.rows;
        }
      );

      res.json({
        success: true,
        data: scans,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Get scan details and findings
privacyRouter.get(
  '/privacy/scans/:id',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scanData = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const scanRes = await client.query(
            `SELECT s.id, s.scan_type as "scanType", s.total_findings as "totalFindings",
                    s.redacted_count as "redactedCount", s.risk_level as "riskLevel",
                    s.status, s.input_digest as "inputDigest", s.created_at as "createdAt",
                    u.full_name as "createdByName"
             FROM privacy_scans s
             JOIN users u ON u.id = s.created_by
             WHERE s.id = $1 AND s.organization_id = $2`,
            [req.params.id, req.organization!.id]
          );

          if (scanRes.rows.length === 0) return null;

          const findingsRes = await client.query(
            `SELECT id, category, start_offset as "startOffset", end_offset as "endOffset",
                    safe_preview as "safePreview", confidence, detection_method as "detectionMethod",
                    status, created_at as "createdAt"
             FROM privacy_findings
             WHERE scan_id = $1 AND organization_id = $2
             ORDER BY start_offset ASC`,
            [req.params.id, req.organization!.id]
          );

          return {
            ...scanRes.rows[0],
            findings: findingsRes.rows,
          };
        }
      );

      if (!scanData) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Scan not found' } });
        return;
      }

      res.json({
        success: true,
        data: scanData,
      });
    } catch (err) {
      next(err);
    }
  }
);

// Privacy Statistics
privacyRouter.get(
  '/privacy/stats',
  requireAuth,
  requireOrgMember('viewer'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const totalFindingsRes = await client.query(
            'SELECT COUNT(*) as total FROM privacy_findings WHERE organization_id = $1',
            [req.organization!.id]
          );

          const totalScansRes = await client.query(
            'SELECT COUNT(*) as total FROM privacy_scans WHERE organization_id = $1',
            [req.organization!.id]
          );

          const byCategoryRes = await client.query(
            `SELECT category, COUNT(*) as count
             FROM privacy_findings
             WHERE organization_id = $1
             GROUP BY category
             ORDER BY count DESC`,
            [req.organization!.id]
          );

          const byStatusRes = await client.query(
            `SELECT status, COUNT(*) as count
             FROM privacy_findings
             WHERE organization_id = $1
             GROUP BY status`,
            [req.organization!.id]
          );

          return {
            totalFindings: parseInt(totalFindingsRes.rows[0].total, 10),
            totalScans: parseInt(totalScansRes.rows[0].total, 10),
            byCategory: byCategoryRes.rows.map(r => ({ category: r.category, count: parseInt(r.count, 10) })),
            byStatus: byStatusRes.rows.map(r => ({ status: r.status, count: parseInt(r.count, 10) })),
          };
        }
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (err) {
      next(err);
    }
  }
);

const UpdateFindingStatusSchema = z.object({
  status: z.enum(['detected', 'reviewed', 'redacted', 'dismissed']),
});

// Update finding status
privacyRouter.patch(
  '/privacy/findings/:id/status',
  requireAuth,
  requireOrgMember('analyst'),
  validateBody(UpdateFindingStatusSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { status } = req.body;

    try {
      const updated = await withTenantTransaction(
        { organizationId: req.organization!.id, userId: req.user!.id, role: req.organization!.role },
        async (client) => {
          const res = await client.query(
            `UPDATE privacy_findings
             SET status = $1
             WHERE id = $2 AND organization_id = $3
             RETURNING id, category, status`,
            [status, req.params.id, req.organization!.id]
          );

          if (res.rows.length === 0) {
            throw new Error('Finding not found');
          }

          await AuditChainService.record(client, {
            organizationId: req.organization!.id,
            actorUserId: req.user!.id,
            action: 'privacy.finding_status_updated',
            resourceType: 'privacy_finding',
            resourceId: req.params.id,
            metadata: { newStatus: status },
          });

          return res.rows[0];
        }
      );

      res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

