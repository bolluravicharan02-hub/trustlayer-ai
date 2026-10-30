import { parse as parseCsv } from 'csv-parse/sync';
import { RedactionService } from './redaction.service.js';
import { PrivacyScannerService } from './privacy-scanner.service.js';
import { SecurityEventInput } from './detection-engine.service.js';

export interface ParseResult {
  events: SecurityEventInput[];
  totalParsed: number;
  totalSensitiveDetected: number;
  errors: string[];
}

export class ImportParserService {
  /**
   * Safely parses JSON string or buffer containing an array of events
   */
  public static parseJson(
    buffer: Buffer | string,
    organizationId: string,
    applyRedaction = true
  ): ParseResult {
    const errors: string[] = [];
    const events: SecurityEventInput[] = [];
    let totalSensitive = 0;

    try {
      const text = buffer.toString('utf8');
      const parsed = JSON.parse(text);
      const rawList = Array.isArray(parsed) ? parsed : [parsed];

      if (rawList.length > 5000) {
        throw new Error('Upload exceeds maximum limit of 5,000 records');
      }

      for (let i = 0; i < rawList.length; i++) {
        const item = rawList[i];
        if (!item || typeof item !== 'object') {
          errors.push(`Row ${i + 1}: Record is not a valid JSON object`);
          continue;
        }

        const eventType = item.eventType || item.event_type || item.type || 'unknown_event';
        const source = item.source || item.system || 'upload';
        const occurredAt = item.occurredAt || item.occurred_at || item.timestamp || new Date().toISOString();
        const actorIdentifier = item.actorIdentifier || item.actor || item.user || item.user_id || null;
        const sourceIp = item.sourceIp || item.source_ip || item.ip || null;
        const description = item.description || item.message || '';

        // Check privacy & redact payload if requested
        const rawPayload = item.payload || item.metadata || item;
        let sanitizedPayload = rawPayload;

        const scanRes = PrivacyScannerService.scan(JSON.stringify(rawPayload) + ' ' + description);
        totalSensitive += scanRes.totalFindings;

        if (applyRedaction) {
          sanitizedPayload = RedactionService.redactObject(rawPayload);
        }

        events.push({
          organizationId,
          eventType: String(eventType).substring(0, 120),
          source: String(source).substring(0, 120),
          sourceEventId: item.id ? String(item.id) : (item.source_event_id ? String(item.source_event_id) : null),
          actorIdentifier: actorIdentifier ? String(actorIdentifier).substring(0, 255) : null,
          sourceIp: sourceIp ? String(sourceIp) : null,
          occurredAt: new Date(occurredAt),
          sanitizedPayload: typeof sanitizedPayload === 'object' && sanitizedPayload !== null ? (sanitizedPayload as Record<string, unknown>) : {},
          description: applyRedaction ? RedactionService.redactText(description).redactedText : description,
        });
      }
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : 'Invalid JSON format');
    }

    return {
      events,
      totalParsed: events.length,
      totalSensitiveDetected: totalSensitive,
      errors,
    };
  }

  /**
   * Safely parses CSV string or buffer into normalized security events
   */
  public static parseCsv(
    buffer: Buffer | string,
    organizationId: string,
    applyRedaction = true
  ): ParseResult {
    const errors: string[] = [];
    const events: SecurityEventInput[] = [];
    let totalSensitive = 0;

    try {
      const records = parseCsv(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        max_record_size: 1048576, // 1MB per row max
      });

      if (records.length > 5000) {
        throw new Error('Upload exceeds maximum limit of 5,000 records');
      }

      for (let i = 0; i < records.length; i++) {
        const row = records[i] as Record<string, string>;
        const eventType = row.event_type || row.eventType || row.type || row.action || 'csv_event';
        const source = row.source || row.system || 'csv_import';
        const occurredAt = row.occurred_at || row.occurredAt || row.timestamp || row.date || new Date().toISOString();
        const actorIdentifier = row.actor_identifier || row.actor || row.user || row.email || null;
        const sourceIp = row.source_ip || row.sourceIp || row.ip || null;
        const description = row.description || row.message || row.details || '';

        const scanRes = PrivacyScannerService.scan(JSON.stringify(row) + ' ' + description);
        totalSensitive += scanRes.totalFindings;

        const payload = { ...row };
        // Remove primary extracted columns from nested payload
        delete payload.event_type;
        delete payload.eventType;
        delete payload.source;
        delete payload.occurred_at;
        delete payload.occurredAt;
        delete payload.timestamp;

        const sanitizedPayload = applyRedaction ? RedactionService.redactObject(payload) : payload;

        events.push({
          organizationId,
          eventType: String(eventType).substring(0, 120),
          source: String(source).substring(0, 120),
          sourceEventId: row.id || row.event_id || null,
          actorIdentifier: actorIdentifier ? String(actorIdentifier).substring(0, 255) : null,
          sourceIp: sourceIp ? String(sourceIp) : null,
          occurredAt: new Date(occurredAt),
          sanitizedPayload: sanitizedPayload as Record<string, unknown>,
          description: applyRedaction ? RedactionService.redactText(description).redactedText : description,
        });
      }
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : 'Invalid CSV format');
    }

    return {
      events,
      totalParsed: events.length,
      totalSensitiveDetected: totalSensitive,
      errors,
    };
  }
}

