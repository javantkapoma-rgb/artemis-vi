import type {
  AlertEvaluationResult,
  AlertRule,
  HealthEvent,
} from "../types/healthTimeline";
import { CLINICAL_THRESHOLDS } from "./clinicalReference";

const DAY_MS = 24 * 60 * 60 * 1000;
const WELLBEING_WINDOW_MS = 7 * DAY_MS;

function isSymptomEvent(event: HealthEvent): boolean {
  return event.type === "ai_symptom_log" || event.payload.recordType === "symptom";
}

function symptomText(event: HealthEvent): string {
  const parts: string[] = [];

  if (typeof event.summary === "string") parts.push(event.summary);
  if (typeof event.payload.description === "string") parts.push(event.payload.description);
  if (typeof event.payload.symptom === "string") parts.push(event.payload.symptom);

  const symptoms = event.payload.symptoms;
  if (Array.isArray(symptoms)) {
    for (const item of symptoms) {
      if (typeof item === "string") parts.push(item);
    }
  }

  return parts.join(" ").toLowerCase();
}

function readStress(event: HealthEvent): number | null {
  const value =
    event.payload.stress ??
    event.payload.score ??
    event.payload.stressScore ??
    event.payload.level;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function latestTimestamp(events: HealthEvent[]): number {
  return events.reduce(
    (latest, event) => Math.max(latest, event.timestamp),
    Date.now(),
  );
}

export const sansRiskRule: AlertRule = {
  id: "sans-risk",
  name: "SANS Risk",
  description:
    "Flags concurrent visual changes and headache as a possible Spaceflight-Associated Neuro-ocular Syndrome (SANS) cluster.",
  severity: "high",
  enabled: true,
  evaluate: (events): AlertEvaluationResult => {
    const symptomEvents = events
      .filter(isSymptomEvent)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (symptomEvents.length === 0) return { triggered: false };

    const visionReport = symptomEvents.find((event) =>
      /blurr?y vision|blurred vision|vision change|visual change|visual disturbance/.test(
        symptomText(event),
      ),
    );

    const headacheReport = symptomEvents.find((event) =>
      /headache|head ache|head pain|severe head/.test(symptomText(event)),
    );

    if (!visionReport || !headacheReport) return { triggered: false };

    return {
      triggered: true,
      title: "SANS Risk — Neuro-ocular Symptom Cluster",
      message:
        "NASA HRP guidance flags concurrent visual changes (e.g., blurry vision) and headache as a possible Spaceflight-Associated Neuro-ocular Syndrome (SANS) cluster. Cephalad fluid shift and elevated intracranial pressure in microgravity can produce optic disc edema and globe flattening. Schedule a flight-surgeon review and fundoscopic/OCT evaluation before the next high-risk mission phase.",
      eventIds: Array.from(new Set([visionReport.id, headacheReport.id])),
    };
  },
};

export const latentVirusReactivationRule: AlertRule = {
  id: "latent-virus-reactivation",
  name: "Latent Virus Reactivation",
  description:
    "Flags herpes-family lesions reported during a high-stress wellbeing check-in as possible immune dysregulation.",
  severity: "moderate",
  enabled: true,
  evaluate: (events): AlertEvaluationResult => {
    const referenceNow = latestTimestamp(events);
    const windowStart = referenceNow - WELLBEING_WINDOW_MS;

    const reactivationReport = events
      .filter(isSymptomEvent)
      .filter((event) => /cold sore|herpes|shingles|rash/.test(symptomText(event)))
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (!reactivationReport) return { triggered: false };

    const highStressCheckin = events
      .filter(
        (event) =>
          event.type === "stress_checkin" && event.timestamp >= windowStart,
      )
      .map((event) => ({ event, stress: readStress(event) }))
      .filter(
        (entry): entry is { event: HealthEvent; stress: number } =>
          entry.stress !== null,
      )
      .filter(
        (entry) =>
          entry.stress >= CLINICAL_THRESHOLDS.psychological.stressHighAtOrAbove,
      )
      .sort((a, b) => b.event.timestamp - a.event.timestamp)[0];

    if (!highStressCheckin) return { triggered: false };

    return {
      triggered: true,
      title: "Latent Virus Reactivation — Stress-Linked Immune Dysregulation",
      message:
        "NASA HRP immunology research links spaceflight stress and circadian disruption to reactivation of latent herpesviruses (HSV-1, VZV, EBV, CMV), a measurable marker of immune dysregulation. A cold sore, rash, or shingles reported alongside a high-stress check-in (stress " +
        highStressCheckin.stress +
        "/" +
        CLINICAL_THRESHOLDS.psychological.stressScaleMax +
        ") warrants flight-surgeon review and consideration of antiviral evaluation.",
      eventIds: [reactivationReport.id, highStressCheckin.event.id],
    };
  },
};

export const environmentalHazardRule: AlertRule = {
  id: "environmental-co2-hypoxia",
  name: "Environmental Hazard (CO2 / Hypoxia)",
  description:
    "Flags confusion, disorientation, or impaired judgment as possible cabin CO2 buildup or hypoxia.",
  severity: "critical",
  enabled: true,
  evaluate: (events): AlertEvaluationResult => {
    const neuroReport = events
      .filter(isSymptomEvent)
      .sort((a, b) => b.timestamp - a.timestamp)
      .find((event) =>
        /confusion|disoriented|disorientation|impaired judgment|impaired decision|difficulty concentrating/.test(
          symptomText(event),
        ),
      );

    if (!neuroReport) return { triggered: false };

    return {
      triggered: true,
      title: "Environmental Hazard — Possible CO2 Buildup / Hypoxia",
      message:
        "Acute confusion, disorientation, or impaired judgment can be early neurological signs of hypercapnia or hypoxia. Verify cabin CO2 against the " +
        CLINICAL_THRESHOLDS.environmental.cabinCo2MaxMmHg +
        " mmHg limit: in microgravity, exhaled CO2 can accumulate in poorly ventilated areas and around sleeping crew, producing these symptoms. Check ventilation, crew-quarter CO2, and oxygen partial pressure immediately.",
      eventIds: [neuroReport.id],
    };
  },
};

export const CLINICAL_ALERT_RULES: AlertRule[] = [
  sansRiskRule,
  latentVirusReactivationRule,
  environmentalHazardRule,
];