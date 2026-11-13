import type { AlertRule, HealthEvent } from "../../types/healthTimeline";
import { CLINICAL_ALERT_RULES } from "../../engine/clinicalRules";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function sleepDurationMs(event: HealthEvent): number | null {
  const value = event.payload.durationMs ?? event.payload.duration ?? event.payload.sleepDurationMs;
  return typeof value === "number" ? value : null;
}

function stressScore(event: HealthEvent): number | null {
  const value = event.payload.score ?? event.payload.stressScore ?? event.payload.level;
  return typeof value === "number" ? value : null;
}

function eventDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
}

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: "sleep-critical-under-5h",
    name: "Immediate Cognitive/Fatigue Warning",
    description: "Sleep duration below 5 hours for a single sleep session.",
    severity: "critical",
    enabled: true,
    evaluate: (events) => {
      const critical = events
        .filter((event) => event.type === "sleep_wake")
        .filter((event) => {
          const duration = sleepDurationMs(event);
          return duration !== null && duration < 5 * HOUR_MS;
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      if (critical.length === 0) return { triggered: false };
      const latest = critical[0];
      return {
        triggered: true,
        title: "Immediate Cognitive/Fatigue Warning",
        message: "Sleep session under 5.0 hours detected. Immediate review recommended.",
        eventIds: [latest.id],
      };
    },
  },
  {
    id: "sleep-moderate-under-6h-two-days",
    name: "Moderate Fatigue Alert",
    description: "Sleep duration below 6 hours for 2+ consecutive days.",
    severity: "moderate",
    enabled: true,
    evaluate: (events) => {
      const sleepEvents = events
        .filter((event) => event.type === "sleep_wake")
        .filter((event) => {
          const duration = sleepDurationMs(event);
          return duration !== null && duration < 6 * HOUR_MS;
        })
        .sort((a, b) => b.timestamp - a.timestamp);

      if (sleepEvents.length < 2) return { triggered: false };

      const byDay = new Map<string, HealthEvent>();
      for (const event of sleepEvents) {
        const key = eventDayKey(event.timestamp);
        const existing = byDay.get(key);
        if (!existing || event.timestamp > existing.timestamp) {
          byDay.set(key, event);
        }
      }

      const uniqueDays = Array.from(byDay.values()).sort((a, b) => b.timestamp - a.timestamp);
      for (let i = 0; i < uniqueDays.length - 1; i++) {
        const current = uniqueDays[i];
        const next = uniqueDays[i + 1];
        const deltaDays = Math.round((new Date(current.timestamp).setUTCHours(0, 0, 0, 0) - new Date(next.timestamp).setUTCHours(0, 0, 0, 0)) / DAY_MS);
        if (deltaDays === 1) {
          return {
            triggered: true,
            title: "Moderate Fatigue Alert",
            message: "Sleep duration below 6.0 hours for 2 consecutive days.",
            eventIds: [current.id, next.id],
          };
        }
      }

      return { triggered: false };
    },
  },
  {
    id: "stress-high-with-symptom",
    name: "Priority Medical Review",
    description: "Stress score >= 4/5 and a physical symptom logged in recent events.",
    severity: "high",
    enabled: true,
    evaluate: (events) => {
      const sorted = [...events].sort((a, b) => b.timestamp - a.timestamp);
      const recent = sorted.slice(0, 30);
      const highStress = recent.find((event) => {
        if (event.type !== "stress_checkin") return false;
        const score = stressScore(event);
        return score !== null && score >= 4;
      });
      const symptom = recent.find((event) => event.type === "ai_symptom_log");

      if (!highStress || !symptom) return { triggered: false };

      return {
        triggered: true,
        title: "Priority Medical Review",
        message: "Stress score >= 4/10 with a logged physical symptom. Priority medical review required.",
        eventIds: [highStress.id, symptom.id],
      };
    },
  },
  ...CLINICAL_ALERT_RULES,
];
