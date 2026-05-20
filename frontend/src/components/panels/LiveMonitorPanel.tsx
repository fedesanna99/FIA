/**
 * LiveMonitorPanel — monitor live dell'analisi corrente.
 *
 * Sorgenti dei log:
 *  - WebSocket /ws/analysis/{modelId}: messaggi {progress, message} emessi
 *    dai solver lunghi via broadcast_progress (FastAPI side).
 *  - Stato locale `useAnalysisStore`: isRunning, progress, progressMessage
 *    (eventi sintetici "Avvio analisi…", "Completato", "Errore: …").
 *
 * UX:
 *  - log scroll auto in fondo (a meno che l'utente non scrolli su)
 *  - chip running/idle, barra progress, conteggio eventi
 *  - bottone "Pulisci" e "Pausa auto-scroll"
 */
import { useEffect, useRef, useState } from "react";
import { Activity, Trash2, Pause, Play } from "lucide-react";
import { useAnalysisStore } from "../../store/analysisStore";
import { useModelStore } from "../../store/modelStore";
import { openProgressSocket } from "../../api/client";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";

interface LogEvent {
  ts: number;          // timestamp ms
  source: "ws" | "local";
  progress: number;    // 0..1
  message: string;
}

const MAX_EVENTS = 500;

export function LiveMonitorPanel() {
  const model = useModelStore((s) => s.model);
  const isRunning = useAnalysisStore((s) => s.isRunning);
  const progress = useAnalysisStore((s) => s.progress);
  const progressMessage = useAnalysisStore((s) => s.progressMessage);

  const [events, setEvents] = useState<LogEvent[]>([]);
  const [autoscroll, setAutoscroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const lastLocalRef = useRef<string>("");

  // WebSocket dedicato (parallelo a quello aperto da useRunAnalysis, ma indipendente)
  useEffect(() => {
    if (!model) return;
    const ws = openProgressSocket(model.id, (p) => {
      setEvents((evs) => {
        const next = [...evs, { ts: Date.now(), source: "ws" as const, progress: p.progress, message: p.message }];
        return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
      });
    });
    return () => {
      try { ws.close(); } catch { /* ignore */ }
    };
  }, [model?.id]);

  // Aggancio agli eventi sintetici dello store locale (isRunning / progress)
  useEffect(() => {
    const sig = `${isRunning}|${progress.toFixed(3)}|${progressMessage}`;
    if (sig === lastLocalRef.current) return;
    lastLocalRef.current = sig;
    if (!progressMessage && !isRunning) return;
    setEvents((evs) => {
      const next = [...evs, {
        ts: Date.now(),
        source: "local" as const,
        progress,
        message: progressMessage || (isRunning ? "Esecuzione…" : "Pronto"),
      }];
      return next.length > MAX_EVENTS ? next.slice(-MAX_EVENTS) : next;
    });
  }, [isRunning, progress, progressMessage]);

  // Auto-scroll al fondo
  useEffect(() => {
    if (!autoscroll || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events, autoscroll]);

  const clear = () => setEvents([]);

  return (
    <div className="p-3 space-y-3 flex flex-col h-full">
      <Card
        title="Monitor live"
        description="Eventi del solver via WebSocket + segnali dello store locale."
      >
        <div className="flex items-center gap-2 text-xs">
          <Badge variant={isRunning ? "warn" : "success"} size="sm">
            <Activity className="h-3 w-3 mr-0.5" />
            {isRunning ? "Esecuzione" : "Idle"}
          </Badge>
          <span className="text-ink-dim">
            {events.length} event{events.length === 1 ? "o" : "i"}
          </span>
          <div className="flex-1" />
          <Button
            size="sm" variant="ghost"
            iconLeft={autoscroll ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            onClick={() => setAutoscroll((v) => !v)}
            title={autoscroll ? "Pausa auto-scroll" : "Riprendi auto-scroll"}
          >
            {autoscroll ? "Pausa" : "Riprendi"}
          </Button>
          <Button
            size="sm" variant="ghost"
            iconLeft={<Trash2 className="h-3.5 w-3.5" />}
            onClick={clear}
            disabled={events.length === 0}
          >
            Pulisci
          </Button>
        </div>
        {isRunning && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <div className="flex-1 h-1.5 bg-border rounded overflow-hidden">
              <div
                className="h-full bg-accent-primary transition-all"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="numeric text-ink w-10 text-right">{Math.round(progress * 100)}%</span>
          </div>
        )}
      </Card>

      <Card title="Log eventi" description="Scroll automatico al fondo; clic Pausa per scorrere." className="flex-1 min-h-0 flex flex-col">
        {events.length === 0 ? (
          <EmptyState
            title="Nessun evento ancora"
            description="Avvia un'analisi dalla TopBar (▶ Esegui) o da un pannello dedicato. Gli eventi del solver appariranno qui in tempo reale."
          />
        ) : (
          <div
            ref={logRef}
            className="flex-1 min-h-0 overflow-auto bg-bg/40 border border-border rounded p-2 font-mono text-[10px] leading-tight"
          >
            {events.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 py-0.5 border-b border-border/30 last:border-b-0"
              >
                <span className="text-ink-dim w-16 flex-shrink-0">
                  {formatTs(e.ts)}
                </span>
                <span className={`w-8 flex-shrink-0 font-bold ${
                  e.source === "ws" ? "text-accent" : "text-ink-muted"
                }`}>
                  {e.source.toUpperCase()}
                </span>
                <span className="w-12 flex-shrink-0 text-accent-primary tabular-nums">
                  {(e.progress * 100).toFixed(1)}%
                </span>
                <span className="text-ink truncate">{e.message}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function formatTs(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad3(d.getMilliseconds())}`;
}
function pad(n: number): string { return n < 10 ? `0${n}` : String(n); }
function pad3(n: number): string { return n < 10 ? `00${n}` : n < 100 ? `0${n}` : String(n); }
