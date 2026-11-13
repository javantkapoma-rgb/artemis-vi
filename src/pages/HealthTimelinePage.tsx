import { useState } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { HealthTimeline } from "../components/timeline/HealthTimeline";
import { AlertReview } from "../components/alerts/AlertReview";
import { alertEngine } from "../services/alerts";

interface HealthTimelinePageProps {
  astronautId?: string;
  onBack?: () => void;
}

export function HealthTimelinePage({ astronautId = "default-astronaut", onBack }: HealthTimelinePageProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [running, setRunning] = useState(false);

  async function runEvaluation() {
    setRunning(true);
    try {
      await alertEngine.evaluateAstronaut(astronautId);
      setRefreshKey((k) => k + 1);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-astra-navy">
      <header className="border-b border-astra-border/50 bg-black/50 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-astra-cyan hover:text-white transition"
              >
                <ChevronLeft size={18} /> Back
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">Central Health Timeline</h1>
              <p className="text-xs text-astra-slate">
                Rule-based trend and alert engine — events, actors, timestamps, and review workflow.
              </p>
            </div>
          </div>
          <button
            onClick={runEvaluation}
            disabled={running}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-astra-cyan/20 text-astra-cyan hover:bg-astra-cyan/30 border border-astra-cyan/30 disabled:opacity-50"
          >
            <RefreshCw size={14} className={running ? "animate-spin" : ""} />
            {running ? "Evaluating..." : "Run Alert Engine"}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-xl border border-astra-border/50 bg-black/20 min-h-[420px]">
            <HealthTimeline key={`timeline-${refreshKey}`} astronautId={astronautId} />
          </div>
          <div className="lg:col-span-1">
            <AlertReview key={`alerts-${refreshKey}`} astronautId={astronautId} reviewerId="medical" />
          </div>
        </div>
      </div>
    </div>
  );
}
