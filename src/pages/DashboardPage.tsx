import { useState } from "react";
import { AssessmentSelector } from "../components/assessment/AssessmentSelector";
import { AssessmentRunner } from "../components/assessment/AssessmentRunner";
import { ResultsDashboard } from "../components/dashboard/ResultsDashboard";
import { HealthTimelinePage } from "./HealthTimelinePage";
import type { AssessmentRecord } from "../types/assessment";
import { Activity, Clock3, ShieldCheck } from "lucide-react";

export function DashboardPage() {
  const [view, setView] = useState<"selector" | "assessment" | "results" | "timeline">("selector");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [record, setRecord] = useState<AssessmentRecord | null>(null);

  if (view === "timeline") {
    return <HealthTimelinePage onBack={() => setView("selector")} />;
  }

  if (view === "results" && record) {
    return <ResultsDashboard record={record} onBack={() => { setView("selector"); setRecord(null); }} />;
  }

  if (view === "assessment" && selectedType) {
    return (
      <AssessmentRunner
        type={selectedType as any}
        onComplete={(rec) => { setRecord(rec); setView("results"); }}
        onExit={() => { setView("selector"); setSelectedType(null); }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-astra-navy">
      <header className="border-b border-astra-border/50 bg-black/50 p-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-astra-cyan flex items-center justify-center">
              <Activity size={20} strokeWidth={2} />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">ASTRA Motion Intelligence</h1>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-astra-slate">
            <button
              onClick={() => setView("timeline")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-astra-cyan/30 text-astra-cyan hover:bg-astra-cyan/10 transition"
              title="Open central health timeline"
            >
              <Clock3 size={14} />
              Health Timeline
            </button>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-1">
              <ShieldCheck size={14} className="text-astra-green" />
              <span>System Online</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Movement Assessment</h2>
            <p className="text-astra-slate">Select an assessment to begin your guided movement evaluation.</p>
          </div>
          <AssessmentSelector onStart={(type) => { setSelectedType(type); setView("assessment"); }} />
        </div>
      </div>
    </div>
  );
}
