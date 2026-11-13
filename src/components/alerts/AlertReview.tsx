import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { HealthAlert } from "../../types/healthTimeline";
import { healthTimelineRepository } from "../../storage/healthTimelineRepository";

interface AlertReviewProps {
  astronautId?: string;
  reviewerId?: string;
}

function severityClasses(severity: HealthAlert["severity"]): string {
  switch (severity) {
    case "critical":
      return "text-astra-red border-astra-red/30 bg-astra-red/10";
    case "high":
      return "text-astra-amber border-astra-amber/30 bg-astra-amber/10";
    case "moderate":
      return "text-astra-cyan border-astra-cyan/30 bg-astra-cyan/10";
    default:
      return "text-astra-slate border-astra-border/50 bg-white/5";
  }
}

export function AlertReview({ astronautId, reviewerId = "medical" }: AlertReviewProps) {
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = astronautId
        ? await healthTimelineRepository.getAlerts(astronautId)
        : await healthTimelineRepository.getAllAlerts();
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [astronautId]);

  async function acknowledge(id: string) {
    setBusyId(id);
    try {
      await healthTimelineRepository.acknowledgeAlert(id, reviewerId);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-astra-slate">
        <div className="animate-spin w-6 h-6 border-2 border-astra-cyan border-t-transparent rounded-full" />
      </div>
    );
  }

  const unack = alerts.filter((a) => !a.acknowledged);

  return (
    <div className="rounded-xl border border-astra-border/50 bg-black/40 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-astra-cyan" />
          <h3 className="text-sm font-semibold text-white">Rule-Based Alerts</h3>
        </div>
        <span className="text-xs font-mono text-astra-slate">
          {unack.length} open / {alerts.length} total
        </span>
      </div>

      {alerts.length === 0 ? (
        <p className="text-sm text-astra-slate">No alerts triggered.</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-lg border p-4 ${severityClasses(alert.severity)} ${
                alert.acknowledged ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle size={14} />
                    <span className="text-xs font-mono uppercase">{alert.severity}</span>
                    <span className="text-xs text-white/70">{new Date(alert.triggeredAt).toLocaleString()}</span>
                  </div>
                  <div className="text-sm font-semibold text-white mb-1">{alert.title}</div>
                  <p className="text-sm text-white/90">{alert.message}</p>
                  <div className="mt-2 text-xs text-white/60 font-mono">
                    Rule: {alert.ruleId} • Events: {alert.eventIds.length} • Astronaut: {alert.astronautId}
                  </div>
                  {alert.acknowledged && (
                    <div className="mt-2 text-xs text-astra-green inline-flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Acknowledged by {alert.acknowledgedBy ?? "unknown"} at{" "}
                      {alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleString() : "—"}
                    </div>
                  )}
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledge(alert.id)}
                    disabled={busyId === alert.id}
                    className="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20 text-white border border-white/10 disabled:opacity-50"
                  >
                    {busyId === alert.id ? "Saving..." : "Acknowledge"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
