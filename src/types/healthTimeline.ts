export type HealthEventType =
  | "sleep_start"
  | "sleep_wake"
  | "stress_checkin"
  | "posture_assessment"
  | "ai_symptom_log"
  | "medical_note"
  | "alert_triggered";

export type AlertSeverity = "info" | "moderate" | "high" | "critical";

export type EventSource = "manual" | "wearable" | "camera" | "ai_assistant" | "system";

export interface HealthEvent {
  id: string;
  astronautId: string;
  actor: string;
  type: HealthEventType;
  timestamp: number;
  source: EventSource;
  summary: string;
  payload: Record<string, unknown>;
  metadata?: {
    location?: string;
    deviceId?: string;
    notes?: string;
  };
}

export interface HealthAlert {
  id: string;
  eventIds: string[];
  astronautId: string;
  ruleId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  triggeredAt: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
}

export interface AlertEvaluationResult {
  triggered: boolean;
  title?: string;
  message?: string;
  eventIds?: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  enabled: boolean;
  evaluate: (events: HealthEvent[]) => AlertEvaluationResult;
}
