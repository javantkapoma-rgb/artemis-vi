import type { AlertRule, HealthAlert, HealthEvent } from "../../types/healthTimeline";
import { healthTimelineRepository } from "../../storage/healthTimelineRepository";
import { DEFAULT_ALERT_RULES } from "./defaultRules";

function createAlertId(ruleId: string, astronautId: string, eventIds: string[]): string {
  const key = [ruleId, astronautId, ...eventIds].sort().join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `alert-${hash.toString(16)}`;
}

export class AlertEngine {
  private rules: AlertRule[] = [];

  constructor(initialRules: AlertRule[] = DEFAULT_ALERT_RULES) {
    this.rules = initialRules;
  }

  setRules(rules: AlertRule[]): void {
    this.rules = rules;
  }

  getRules(): AlertRule[] {
    return this.rules;
  }

  async evaluateAstronaut(astronautId: string, events?: HealthEvent[]): Promise<HealthAlert[]> {
    const sourceEvents = events ?? (await healthTimelineRepository.getEvents(astronautId));
    const existingAlerts = await healthTimelineRepository.getAlerts(astronautId);
    const existingIds = new Set(existingAlerts.map((alert) => alert.id));
    const triggered: HealthAlert[] = [];

    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      const result = rule.evaluate(sourceEvents);
      if (!result.triggered) continue;

      const eventIds = result.eventIds ?? [];
      const alert: HealthAlert = {
        id: createAlertId(rule.id, astronautId, eventIds),
        eventIds,
        astronautId,
        ruleId: rule.id,
        severity: rule.severity,
        title: result.title ?? rule.name,
        message: result.message ?? rule.description,
        triggeredAt: Date.now(),
        acknowledged: false,
      };

      if (existingIds.has(alert.id)) continue;

      await healthTimelineRepository.saveAlert(alert);
      triggered.push(alert);
    }

    return triggered;
  }

  async evaluateAll(): Promise<HealthAlert[]> {
    const events = await healthTimelineRepository.getAllEvents();
    const byAstronaut = new Map<string, HealthEvent[]>();
    for (const event of events) {
      const bucket = byAstronaut.get(event.astronautId) ?? [];
      bucket.push(event);
      byAstronaut.set(event.astronautId, bucket);
    }

    const results: HealthAlert[] = [];
    for (const [astronautId, astronautEvents] of byAstronaut.entries()) {
      const alerts = await this.evaluateAstronaut(astronautId, astronautEvents);
      results.push(...alerts);
    }
    return results;
  }
}

export const alertEngine = new AlertEngine();
