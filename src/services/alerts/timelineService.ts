import type { HealthEvent } from "../../types/healthTimeline";
import { healthTimelineRepository } from "../../storage/healthTimelineRepository";
import { alertEngine } from "./alertEngine";

export interface TimelineEventInput extends Omit<HealthEvent, "id" | "timestamp"> {
  id?: string;
  timestamp?: number;
}

export async function recordHealthEvent(input: TimelineEventInput): Promise<HealthEvent> {
  const event: HealthEvent = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    timestamp: input.timestamp ?? Date.now(),
  };

  await healthTimelineRepository.saveEvent(event);
  await alertEngine.evaluateAstronaut(event.astronautId);
  return event;
}

export async function recordHealthEvents(inputs: TimelineEventInput[]): Promise<HealthEvent[]> {
  const events = inputs.map((input) => ({
    ...input,
    id: input.id ?? crypto.randomUUID(),
    timestamp: input.timestamp ?? Date.now(),
  })) as HealthEvent[];

  await healthTimelineRepository.saveEvents(events);

  const astronautIds = new Set(events.map((event) => event.astronautId));
  for (const astronautId of astronautIds) {
    await alertEngine.evaluateAstronaut(astronautId);
  }

  return events;
}
