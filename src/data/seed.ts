import type { HealthEvent } from "../types/healthTimeline";
import { healthTimelineRepository } from "../storage/healthTimelineRepository";
import { alertEngine } from "../services/alerts";

const DEMO_ASTRONAUT_ID = "astro-1";
const RECORDS_KEY = "astra.records";
const MINUTE_MS = 60 * 1000;

interface DemoRecord {
  id: string;
  astronautId: string;
  source: "symptom" | "wellbeing";
  timestamp: number;
  description?: string;
  severity?: "low" | "medium" | "high";
  stress?: number;
  mood?: number;
  fatigue?: number;
  reason?: string;
}

function readRecordArray(storage: Storage): DemoRecord[] {
  try {
    const raw = storage.getItem(RECORDS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DemoRecord[]) : [];
  } catch {
    return [];
  }
}

function extractSymptoms(description: string): string[] {
  const normalized = description.toLowerCase();
  const candidates = [
    "blurry vision",
    "blurred vision",
    "vision change",
    "headache",
    "cold sore",
    "rash",
    "shingles",
    "confusion",
    "disorientation",
    "impaired judgment",
  ];

  return candidates.filter((candidate) => normalized.includes(candidate));
}

function toHealthEvent(record: DemoRecord): HealthEvent {
  if (record.source === "wellbeing") {
    return {
      id: record.id,
      astronautId: record.astronautId,
      actor: record.astronautId,
      type: "stress_checkin",
      timestamp: record.timestamp,
      source: "manual",
      summary: "Wellbeing check-in: elevated stress and fatigue",
      payload: {
        recordType: "wellbeing",
        stress: record.stress,
        mood: record.mood,
        fatigue: record.fatigue,
        score: record.stress,
        reason: record.reason,
      },
    };
  }

  return {
    id: record.id,
    astronautId: record.astronautId,
    actor: record.astronautId,
    type: "ai_symptom_log",
    timestamp: record.timestamp,
    source: "ai_assistant",
    summary: record.description ?? "Symptom report",
    payload: {
      recordType: "symptom",
      description: record.description,
      symptoms: extractSymptoms(record.description ?? ""),
      severity: record.severity,
      reason: record.reason,
    },
  };
}

export async function seedClinicalDemoData(): Promise<void> {
  const storage = typeof window !== "undefined" ? window.localStorage : null;
  const now = Date.now();

  const demoRecords: DemoRecord[] = [
    {
      id: "demo-symptom-headache-vision",
      astronautId: DEMO_ASTRONAUT_ID,
      source: "symptom",
      description: "Severe headache and blurry vision",
      severity: "medium",
      reason: "Headache and blurry vision reported during mission operations",
      timestamp: now - 120 * MINUTE_MS,
    },
    {
      id: "demo-symptom-cold-sore-confusion",
      astronautId: DEMO_ASTRONAUT_ID,
      source: "symptom",
      description: "Noticed a cold sore and feeling confused",
      severity: "high",
      reason: "Cold sore and confusion reported after a high-stress check-in",
      timestamp: now - 90 * MINUTE_MS,
    },
    {
      id: "demo-wellbeing-stress-8",
      astronautId: DEMO_ASTRONAUT_ID,
      source: "wellbeing",
      stress: 8,
      mood: 3,
      fatigue: 9,
      reason: "Self-reported stress 8/10, mood 3/10, and fatigue 9/10",
      timestamp: now - 30 * MINUTE_MS,
    },
  ];

  await healthTimelineRepository.saveEvents(demoRecords.map(toHealthEvent));
  await alertEngine.evaluateAstronaut(DEMO_ASTRONAUT_ID);

  if (storage) {
    const byId = new Map(readRecordArray(storage).map((record) => [record.id, record]));
    for (const record of demoRecords) {
      byId.set(record.id, record);
    }
    storage.setItem(RECORDS_KEY, JSON.stringify([...byId.values()]));
  }
}