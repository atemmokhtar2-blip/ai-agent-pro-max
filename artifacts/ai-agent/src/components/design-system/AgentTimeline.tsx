import { AIPulse } from "./AIPulse";
import { NeuralGrid } from "./NeuralGrid";
import { DataCore } from "./DataCore";
import { FlowEngine } from "./FlowEngine";
import { Guardian } from "./Guardian";
import { LaunchSequence } from "./LaunchSequence";
import { BlueprintCore } from "./BlueprintCore";

export type StageStatus = "pending" | "running" | "complete";

export interface StageState {
  id: number;
  name: string;
  status: StageStatus;
}

interface AgentTimelineProps {
  stages: StageState[];
  compact?: boolean;
}

const PRIMARY = "#6366f1";
const DIM = "#64748b";

function StageIcon({ stageId, status }: { stageId: number; status: StageStatus }) {
  const active = status === "running";
  const sz = 32;

  switch (stageId) {
    case 1: return <AIPulse size={sz} color={status === "complete" ? PRIMARY : status === "running" ? PRIMARY : DIM} active={active} />;
    case 2: return <NeuralGrid width={sz} height={sz} color={status === "complete" ? PRIMARY : status === "running" ? PRIMARY : DIM} active={active} />;
    case 3: return <FlowEngine width={sz} height={sz} color={status === "complete" ? PRIMARY : status === "running" ? PRIMARY : DIM} active={active} />;
    case 4: return <DataCore size={sz} color={status === "complete" ? PRIMARY : status === "running" ? PRIMARY : DIM} active={active} />;
    case 5: return <FlowEngine width={sz} height={sz} color={status === "complete" ? "#06b6d4" : status === "running" ? "#06b6d4" : DIM} active={active} />;
    case 6: return <Guardian size={sz} color={status === "complete" ? "#10b981" : status === "running" ? "#10b981" : DIM} active={active} />;
    case 7: return <LaunchSequence size={sz} color={status === "complete" ? "#f59e0b" : status === "running" ? "#f59e0b" : DIM} active={active} progress={status === "complete" ? 1 : status === "running" ? 0.6 : 0} />;
    case 8: return <BlueprintCore size={sz} color={status === "complete" ? "#22c55e" : status === "running" ? PRIMARY : DIM} active={active} complete={status === "complete"} />;
    default: return <AIPulse size={sz} color={DIM} active={false} />;
  }
}

function StatusDot({ status }: { status: StageStatus }) {
  if (status === "complete") {
    return (
      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500/20 ring-1 ring-green-500/50">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-green-400">
          <polyline points="1.5,4 3,5.5 6.5,2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (status === "running") {
    return (
      <div className="relative flex h-4 w-4 items-center justify-center">
        <span className="absolute h-full w-full animate-ping rounded-full bg-primary/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </div>
    );
  }
  return <div className="h-4 w-4 rounded-full border border-border bg-muted/40" />;
}

export function AgentTimeline({ stages, compact = false }: AgentTimelineProps) {
  if (compact) {
    // Compact horizontal version for mobile
    return (
      <div className="flex items-center gap-1 overflow-x-auto py-2 px-1">
        {stages.map((stage, i) => (
          <div key={stage.id} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-0.5">
              <StatusDot status={stage.status} />
              <span
                className={`text-[9px] font-medium truncate max-w-[48px] text-center leading-tight ${
                  stage.status === "running" ? "text-primary" :
                  stage.status === "complete" ? "text-foreground/60" : "text-muted-foreground/40"
                }`}
              >
                {stage.name.split(" ")[0]}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div className={`h-px w-4 flex-shrink-0 ${
                stage.status === "complete" ? "bg-green-500/40" : "bg-border"
              }`} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 py-2">
      {stages.map((stage, i) => {
        const isLast = i === stages.length - 1;
        return (
          <div key={stage.id} className="flex gap-3">
            {/* Left column: connector line + icon */}
            <div className="flex flex-col items-center">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center">
                <StageIcon stageId={stage.id} status={stage.status} />
              </div>
              {!isLast && (
                <div
                  className={`w-px flex-1 min-h-[16px] mt-0.5 transition-colors duration-500 ${
                    stage.status === "complete" ? "bg-green-500/30" : "bg-border/40"
                  }`}
                />
              )}
            </div>

            {/* Right column: stage info */}
            <div className={`flex flex-col pb-4 ${isLast ? "" : ""}`}>
              <div className="flex items-center gap-2 mt-1">
                <StatusDot status={stage.status} />
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${
                    stage.status === "running"
                      ? "text-primary"
                      : stage.status === "complete"
                      ? "text-foreground/70"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {stage.name}
                </span>
              </div>
              {stage.status === "running" && (
                <span className="ml-6 mt-0.5 text-[10px] text-primary/60 animate-pulse">
                  Processing...
                </span>
              )}
              {stage.status === "complete" && (
                <span className="ml-6 mt-0.5 text-[10px] text-muted-foreground/40">
                  Complete
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
