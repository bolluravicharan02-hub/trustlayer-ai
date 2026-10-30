import { AlertSeverity } from '../schemas/index.js';

export interface ScoreModifier {
  ruleCode: string;
  name: string;
  points: number;
  reason: string;
}

export interface RiskScoreResult {
  score: number;
  severity: AlertSeverity;
  modifiers: ScoreModifier[];
}

export class RiskScoreService {
  /**
   * Calculates a bounded, deterministic risk score from 0 to 100
   * according to configured security modifiers and maps to severity bands.
   */
  public static calculate(baseScore = 0, modifiers: ScoreModifier[]): RiskScoreResult {
    // Deduplicate modifiers by ruleCode so the same evidence isn't counted twice
    const uniqueModifiers: ScoreModifier[] = [];
    const seenRules = new Set<string>();

    for (const mod of modifiers) {
      if (!seenRules.has(mod.ruleCode)) {
        seenRules.add(mod.ruleCode);
        uniqueModifiers.push(mod);
      }
    }

    let total = baseScore;
    for (const mod of uniqueModifiers) {
      total += mod.points;
    }

    // Cap between 0 and 100
    const finalScore = Math.max(0, Math.min(100, Math.round(total)));

    let severity: AlertSeverity = 'informational';
    if (finalScore >= 90) {
      severity = 'critical';
    } else if (finalScore >= 75) {
      severity = 'high';
    } else if (finalScore >= 50) {
      severity = 'medium';
    } else if (finalScore >= 25) {
      severity = 'low';
    }

    return {
      score: finalScore,
      severity,
      modifiers: uniqueModifiers,
    };
  }
}

