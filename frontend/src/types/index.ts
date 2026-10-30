export type Role = 'owner' | 'admin' | 'analyst' | 'viewer';
export type AlertSeverity = 'informational' | 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'open' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive';
export type PrivacyFindingStatus = 'detected' | 'reviewed' | 'redacted' | 'dismissed';

export interface User {
  id: string;
  fullName: string;
  email: string;
  isActive?: boolean;
  clerkUserId?: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: Role;
  settings?: Record<string, unknown>;
  joinedAt?: string;
  createdAt?: string;
}

export interface SecurityEvent {
  id: string;
  organizationId: string;
  eventType: string;
  source: string;
  sourceEventId?: string | null;
  actorIdentifier?: string | null;
  sourceIp?: string | null;
  occurredAt: string;
  sanitizedPayload: Record<string, unknown>;
  privacyScanned?: boolean;
  ingestionSource: 'manual' | 'csv' | 'json' | 'api';
  createdAt: string;
  alerts?: SecurityAlert[];
}

export interface SecurityAlert {
  id: string;
  eventId?: string | null;
  ruleCode: string;
  title: string;
  description: string;
  category: string;
  severity: AlertSeverity;
  riskScore: number;
  evidence: Array<{ key: string; value: unknown; description: string }>;
  recommendedActions: Array<{
    action: string;
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    requiresApproval: boolean;
  }>;
  status: AlertStatus;
  assignedTo?: string | null;
  assignedToName?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  event?: SecurityEvent | null;
  notes?: Array<{
    id: string;
    note: string;
    createdAt: string;
    authorName: string;
  }>;
  aiRuns?: AIAnalysisRun[];
}

export interface PrivacyFinding {
  id: string;
  category: string;
  startOffset: number;
  endOffset: number;
  safePreview: string;
  confidence: number;
  detectionMethod: string;
  status: PrivacyFindingStatus;
  createdAt: string;
}

export interface PrivacyScan {
  id: string;
  scanType: string;
  totalFindings: number;
  redactedCount: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  inputDigest: string;
  createdAt: string;
  createdByName?: string;
  findings?: PrivacyFinding[];
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description?: string;
  category: string;
  policyType: string;
  configuration: Record<string, unknown>;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  createdByName?: string;
}

export interface AIAnalysisRun {
  id: string;
  alertId?: string | null;
  alertTitle?: string | null;
  modelName: string;
  analysisType: string;
  promptVersion: string;
  inputDigest: string;
  output: {
    summary: string;
    likely_intent?: string;
    observations?: Array<{ description: string; evidence: string; confidence: number }>;
    alternative_explanations?: string[];
    potential_impact?: string;
    recommended_actions?: Array<{ action: string; reason: string; priority: string; requires_approval: boolean }>;
    missing_context?: string[];
    requires_human_review?: boolean;
    limitations?: string[];
  } | null;
  status: 'pending' | 'completed' | 'failed';
  errorCode?: string | null;
  latencyMs?: number | null;
  createdAt: string;
  completedAt?: string | null;
  requestedByName?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata: Record<string, unknown>;
  previousHash: string;
  entryHash: string;
  createdAt: string;
  actorName?: string | null;
  actorEmail?: string | null;
}

export interface DashboardSummary {
  totalEvents: number;
  openAlerts: number;
  criticalAlerts: number;
  privacyFindings: number;
  redactedItems: number;
  resolvedIncidents: number;
}

