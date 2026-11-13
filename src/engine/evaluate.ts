import type { HealthAlert } from "../types/healthTimeline";
import { alertEngine } from "../services/alerts/alertEngine";

export { DEFAULT_ALERT_RULES } from "../services/alerts/defaultRules";
export { CLINICAL_ALERT_RULES } from "./clinicalRules";

export function evaluateAll(): Promise<HealthAlert[]> {
  return alertEngine.evaluateAll();
}