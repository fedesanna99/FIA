/**
 * JobsPanel — lista job dell'utente con filtro per status e cancel inline.
 * Sprint 1 — A5 (queue + worker backend, frontend list).
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, RefreshCw, Radio } from "lucide-react";

import {
  cancelJob, listJobs, openJobsSocket,
  type Job, type JobEvent, type JobStatus,
} from "../../../api/jobs";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { EmptyState } from "../../ui/EmptyState";
import { DEFAULT_USER_ID } from "../../../hooks/useCostPreview";


const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "In coda",
  running: "In esecuzione",
  done: "Completato",
  failed: "Fallito",
  cancelled: "Annullato",
};


function badgeVariantFor(status: JobStatus): "info" | "warn" | "success" | "default" {
  switch (status) {
    case "running": return "info";
    case "done": return "success";
    case "failed": return "warn";
    case "cancelled": return "warn";
    default: return "default";
  }
}


export function JobsPanel({ userId = DEFAULT_USER_ID }: { userId?: string }) {
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<JobEvent | null>(null);
  const qc = useQueryClient();

  const query = useQuery<Job[]>({
    queryKey: ["jobs", userId, statusFilter],
    queryFn: () => listJobs({
      user_id: userId,
      status: statusFilter === "all" ? undefined : statusFilter,
    }),
    // Polling fallback ogni 15s anche con WS connesso (resilienza a reconnect mancati).
    refetchInterval: 15_000,
  });

  // WS realtime: ogni evento job_* invalida la query.
  useEffect(() => {
    const ws = openJobsSocket(userId, (ev) => {
      setLastEvent(ev);
      qc.invalidateQueries({ queryKey: ["jobs", userId] });
    });
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);
    return () => { try { ws.close(); } catch { /* noop */ } };
  }, [userId, qc]);

  const cancel = useMutation({
    mutationFn: (jobId: string) => cancelJob(jobId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs", userId] }),
  });

  const jobs = query.data ?? [];
  const selectedJob = jobs.find((j) => j.job_id === selected) ?? null;

  return (
    <div className="p-3 space-y-3" data-testid="jobs-panel">
      <Card title="Job queue" description={`Coda persistente per ${userId}.`}>
        <div className="flex items-center gap-2 mb-2">
          <select
            data-testid="jobs-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as JobStatus | "all")}
            className="text-xs border border-border rounded px-2 py-1 bg-bg"
          >
            <option value="all">Tutti gli stati</option>
            {(Object.keys(STATUS_LABELS) as JobStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <Button
            variant="ghost" size="sm"
            iconLeft={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => query.refetch()}
          >
            Refresh
          </Button>
          <Badge
            size="sm"
            variant={wsConnected ? "success" : "default"}
            data-testid="jobs-ws-status"
          >
            <Radio className="h-3 w-3 mr-1 inline" />
            {wsConnected ? "live" : "offline"}
          </Badge>
          {lastEvent && (
            <span className="text-[10px] text-ink-3 font-mono ml-auto truncate" data-testid="jobs-last-event">
              {lastEvent.type}: {lastEvent.job_id?.slice(0, 8) ?? "—"}
            </span>
          )}
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            title="Nessun job"
            description="I solve a coda compaiono qui (priorita', stato, eventuali errori)."
          />
        ) : (
          <ul className="divide-y divide-border" data-testid="jobs-list">
            {jobs.map((j) => (
              <li
                key={j.job_id}
                className="py-1.5 flex items-center gap-2 text-xs cursor-pointer hover:bg-bg/40"
                data-testid={`job-row-${j.job_id}`}
                onClick={() => setSelected(j.job_id)}
              >
                <Badge size="sm" variant={badgeVariantFor(j.status)} data-testid={`job-badge-${j.job_id}`}>
                  {STATUS_LABELS[j.status]}
                </Badge>
                <span className="flex-1 font-mono truncate">{j.solver} / {j.model_id}</span>
                <span className="text-ink-3">{j.priority}</span>
                {(j.status === "queued" || j.status === "running") && (
                  <Button
                    variant="ghost" size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      cancel.mutate(j.job_id);
                    }}
                    iconLeft={<Trash2 className="h-3 w-3" />}
                    data-testid={`job-cancel-${j.job_id}`}
                  >
                    Cancel
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selectedJob && (
        <Card title={`Dettaglio job ${selectedJob.job_id.slice(0, 8)}...`} data-testid="job-detail">
          <pre className="text-[10px] font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(selectedJob, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
