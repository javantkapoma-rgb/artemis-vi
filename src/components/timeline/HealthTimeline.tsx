import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Brain, Clock, Moon, Stethoscope, User } from "lucide-react";
import type { HealthAlert, HealthEvent } from "../../types/healthTimeline";
import { healthTimelineRepository } from "../../storage/healthTimelineRepository";

interface HealthTimelineProps {
  astronautId?: string;
  onSelectEvent?: (event: HealthEvent) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

function formatDuration(ms: number | undefined): string {
  if (!ms || !Number.isFinite(ms)) return "—";
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function eventIcon(type: HealthEvent["type"]) {
  switch (type) {
    case "sleep_start":
    case "sleep_wake":
      return <Moon size={14} />;
    case "stress_checkin":
      return <Brain size={14} />;
    case "posture_assessment":
      return <Activity size={14} />;
    case "ai_symptom_log":
      return <Stethoscope size={14} />;
    case "alert_triggered":
      return <AlertTriangle size={14} />;
    default:
      return <Clock size={14} />;
  }
}

function eventLabel(type: HealthEvent["type"]): string {
  switch (type) {
    case "sleep_start":
      return "Sleep Start";
    case "sleep_wake":
      return "Sleep Wake";
    case "stress_checkin":
      return "Stress Check-in";
    case "posture_assessment":
      return "Posture Assessment";
    case "ai_symptom_log":
      return "AI Symptom Log";
    case "medical_note":
      return "Medical Note";
    case "alert_triggered":
      return "Alert Triggered";
    default:
      return type;
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-astra-red";
    case "high":
      return "text-astra-amber";
    case "moderate":
      return "text-astra-cyan";
    default:
      return "text-astra-slate";
  }
}

export function HealthTimeline({ astronautId, onSelectEvent }: HealthTimelineProps) {
  const [events, setEvents] = useState<HealthEvent[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [loadedEvents, loadedAlerts] = await Promise.all([
          astronautId ? healthTimelineRepository.getEvents(astronautId) : healthTimelineRepository.getAllEvents(),
          astronautId ? healthTimelineRepository.getAlerts(astronautId) : healthTimelineRepository.getAllAlerts(),
        ]);
        if (!active) return;
        setEvents(loadedEvents);
        setAlerts(loadedAlerts);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [astronautId]);

  const alertIdsByEvent = useMemo(() => {
    const map = new Map<string, HealthAlert[]>();
    for (const alert of alerts) {
      for (const eventId of alert.eventIds) {
        const list = map.get(eventId) ?? [];
        list.push(alert);
        map.set(eventId, list);
      }
    }
    return map;
  }, [alerts]);

  function getDurationMs(event: HealthEvent): number | undefined {
    const value = event.payload.durationMs ?? event.payload.duration ?? event.payload.sleepDurationMs;
    return typeof value === "number" ? value : undefined;
  }

  function getStressScore(event: HealthEvent): number | undefined {
    const value = event.payload.score ?? event.payload.stressScore ?? event.payload.level;
    return typeof value === "number" ? value : undefined;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-astra-slate">
        <div className="animate-spin w-6 h-6 border-2 border-astra-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 text-astra-slate">
          <Clock size={24} />
        </div>
        <h3 className="text-white font-semibold mb-2">No health events yet</h3>
        <p className="text-astra-slate text-sm max-w-xs">
          Sleep, stress, posture, and symptom events will appear here once logged.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Central Health Timeline</h2>
            <p className="text-astra-slate text-sm">
              Unified view of actions, actors, timestamps, and alert-linked health events.
            </p>
          </div>
          <div className="text-xs text-astra-slate">{events.length} events</div>
        </div>

        <div className="space-y-3">
          {events.map((event) => {
            const linkedAlerts = alertIdsByEvent.get(event.id) ?? [];
            const duration = getDurationMs(event);
            const stress = getStressScore(event);

            return (
              <button
                key={event.id}
                onClick={() => onSelectEvent?.(event)}
                className="w-full text-left rounded-xl border border-astra-border/50 bg-black/40 hover:bg-white/5 transition p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-astra-cyan/10 text-astra-cyan flex items-center justify-center shrink-0">
                      {eventIcon(event.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-white">{eventLabel(event.type)}</span>
                        <span className="text-xs font-mono text-astra-slate">{formatTime(event.timestamp)}</span>
                      </div>
                      <p className="text-sm text-white/90 mb-2 break-words">{event.summary}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-astra-slate">
                        <span className="inline-flex items-center gap-1">
                          <User size={12} /> {event.actor}
                        </span>
                        <span>Source: {event.source}</span>
                        {event.astronautId && <span>Astronaut: {event.astronautId}</span>}
                        {duration !== undefined && <span>Duration: {formatDuration(duration)}</span>}
                        {stress !== undefined && <span>Stress: {stress}/5</span>}
                        {typeof event.payload.reason === "string" && <span>Why: {event.payload.reason}</span>}
                        {typeof event.metadata?.notes === "string" && event.metadata.notes && (
                          <span>Notes: {event.metadata.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {linkedAlerts.length > 0 ? (
                      linkedAlerts.map((alert) => (
                        <span
                          key={alert.id}
                          className={`text-xs font-mono px-2 py-1 rounded border border-white/10 bg-white/5 ${severityColor(alert.severity)}`}
                          title={alert.message}
                        >
                          {alert.severity.toUpperCase()}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs font-mono text-astra-slate">No alerts</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
