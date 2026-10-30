import { z } from 'zod';

// ============================================================================
// Authentication & Organization Schemas
// ============================================================================

export const RegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().email('Invalid email address').max(255),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  confirmPassword: z.string(),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters').max(180),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const UserProfileSchema = z.object({
  fullName: z.string().min(2).max(120),
});

export const OrganizationSchema = z.object({
  name: z.string().min(2).max(180),
  slug: z.string().min(2).max(180).regex(/^[a-z0-9-]+$/, 'Slug must be URL-safe (lowercase alphanumeric and hyphens)').optional(),
  settings: z.record(z.unknown()).default({}),
});

export const RoleEnum = z.enum(['owner', 'admin', 'analyst', 'viewer']);
export type Role = z.infer<typeof RoleEnum>;

export const UpdateMemberRoleSchema = z.object({
  role: RoleEnum,
});

export const InvitationSchema = z.object({
  email: z.string().email(),
  role: RoleEnum,
});

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

// ============================================================================
// Security Event Schemas
// ============================================================================

export const SecurityEventSchema = z.object({
  eventType: z.string().min(1).max(120),
  source: z.string().min(1).max(120),
  sourceEventId: z.string().max(255).optional().nullable(),
  actorIdentifier: z.string().max(255).optional().nullable(),
  sourceIp: z.string().ip({ message: 'Invalid IP address' }).optional().nullable().or(z.literal('')),
  occurredAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T.*$/)),
  sanitizedPayload: z.record(z.unknown()).default({}),
  description: z.string().max(2000).optional(),
  ingestionSource: z.enum(['manual', 'csv', 'json', 'api']).default('manual'),
});

export const SecurityEventImportSchema = z.object({
  events: z.array(z.record(z.unknown())).min(1, 'At least one event record required').max(5000),
  defaultSource: z.string().default('upload'),
  applyRedaction: z.boolean().default(true),
});

// ============================================================================
// Alert & Incident Management Schemas
// ============================================================================

export const AlertSeverityEnum = z.enum(['informational', 'low', 'medium', 'high', 'critical']);
export type AlertSeverity = z.infer<typeof AlertSeverityEnum>;

export const AlertStatusEnum = z.enum(['open', 'acknowledged', 'investigating', 'resolved', 'false_positive']);
export type AlertStatus = z.infer<typeof AlertStatusEnum>;

export const AlertStatusUpdateSchema = z.object({
  status: AlertStatusEnum,
  reason: z.string().max(1000).optional(),
});

export const AlertAssignmentSchema = z.object({
  assignedTo: z.string().uuid().nullable(),
});

export const InvestigationNoteSchema = z.object({
  note: z.string().min(1, 'Note cannot be empty').max(5000),
});

// ============================================================================
// Privacy Scanner & Redaction Schemas
// ============================================================================

export const PrivacyFindingStatusEnum = z.enum(['detected', 'reviewed', 'redacted', 'dismissed']);
export type PrivacyFindingStatus = z.infer<typeof PrivacyFindingStatusEnum>;

export const PrivacyCategoryEnum = z.enum([
  'email',
  'phone',
  'payment_card',
  'api_key',
  'auth_token',
  'jwt',
  'private_key',
  'ip_address',
  'custom'
]);

export const PrivacyScanRequestSchema = z.object({
  content: z.string().min(1, 'Content to scan is required').max(1000000), // Max 1MB
  categories: z.array(PrivacyCategoryEnum).optional(),
  redact: z.boolean().default(true),
});

export const RedactionRequestSchema = z.object({
  content: z.string().min(1).max(1000000),
  categories: z.array(PrivacyCategoryEnum).optional(),
  replacementPrefix: z.string().default('[REDACTED_'),
});

// ============================================================================
// Security Policies Schemas
// ============================================================================

export const PolicyCategoryEnum = z.enum([
  'authentication',
  'sensitive_data',
  'suspicious_export',
  'privilege_escalation',
  'unusual_access',
  'retention',
  'ai_governance'
]);

export const SecurityPolicySchema = z.object({
  name: z.string().min(2).max(180),
  description: z.string().max(1000).optional(),
  category: PolicyCategoryEnum,
  policyType: z.string().min(2).max(100),
  configuration: z.record(z.unknown()),
  isEnabled: z.boolean().default(true),
});

export const UpdateSecurityPolicySchema = SecurityPolicySchema.partial();

// ============================================================================
// AI Schemas (Section 15 Strict Schemas)
// ============================================================================

export const AIInvestigationResponseSchema = z.object({
  summary: z.string(),
  likely_intent: z.enum(['benign', 'suspicious', 'potentially_malicious', 'unknown']),
  observations: z.array(
    z.object({
      description: z.string(),
      evidence: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
  alternative_explanations: z.array(z.string()),
  potential_impact: z.string(),
  recommended_actions: z.array(
    z.object({
      action: z.string(),
      reason: z.string(),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      requires_approval: z.boolean(),
    })
  ),
  missing_context: z.array(z.string()),
  requires_human_review: z.boolean(),
  limitations: z.array(z.string()),
});

export const AIPrivacyResponseSchema = z.object({
  summary: z.string(),
  overall_risk: z.enum(['low', 'medium', 'high', 'critical']),
  findings: z.array(
    z.object({
      category: z.string(),
      risk_explanation: z.string(),
      recommended_protection: z.string(),
    })
  ),
  recommended_actions: z.array(z.string()),
  requires_human_review: z.boolean(),
  limitations: z.array(z.string()),
});

export const AIPolicyResponseSchema = z.object({
  summary: z.string(),
  configuration_quality: z.enum(['good', 'needs_improvement', 'high_risk', 'insufficient_information']),
  issues: z.array(
    z.object({
      issue: z.string(),
      reason: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })
  ),
  recommendations: z.array(z.string()),
  requires_human_review: z.boolean(),
});

export const AITrustExplanationSchema = z.object({
  explanation: z.string(),
  deterministic_evidence: z.array(z.string()),
  ai_generated_insights: z.array(z.string()),
  uncertainties: z.array(z.string()),
  human_review_required: z.boolean(),
});

// ============================================================================
// Query & Export Schemas
// ============================================================================

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const EventFilterQuerySchema = PaginationQuerySchema.extend({
  eventType: z.string().optional(),
  source: z.string().optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

export const AlertFilterQuerySchema = PaginationQuerySchema.extend({
  severity: AlertSeverityEnum.optional(),
  status: AlertStatusEnum.optional(),
  category: z.string().optional(),
});

export const ExportRequestSchema = z.object({
  type: z.enum(['overview', 'alerts', 'privacy', 'activity', 'audit']),
  format: z.enum(['json', 'csv']).default('json'),
  maskSensitive: z.boolean().default(true),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
