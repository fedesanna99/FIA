/**
 * CollabPanel — sessione collaborativa real-time (FASE 22).
 *
 * Connetti / disconnetti dalla WebSocket /ws/collab/{model_id}. Mostra
 * partecipanti attivi (presenza) e le ultime op ricevute (audit log).
 * L'editing è già gestito dagli store esistenti; questo pannello visualizza
 * solo lo stato di sessione.
 */
import { useState, useRef, useEffect } from "react";
import { Users, Plug, PlugZap, Activity } from "lucide-react";
import {
  openCollabSocket,
  type CollabMessage,
  sendCollabCursor,
} from "../../api/collab";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Field, Input } from "../ui/Input";
import { Badge } from "../ui/Badge";

interface Participant {
  client_id: string;
  name?: string;
  cursor?: { x: number; y: number; z: number };
  lastSeen: number;
}

interface LogEntry {
  ts: number;
  client_id: string;
  text: string;
  variant: "info" | "warn" | "success";
}

export function CollabPanel() {
  const model = useModelStore((s) => s.model);
  const [name, setName] = useState("");
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [log, setLog] = useState<LogEntry[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const clientIdRef = useRef<string>(
    `client_${Math.random().toString(36).slice(2, 10)}`,
  );

  const connect = () => {
    if (!model) {
      toast("error", "Nessun modello attivo");
      return;
    }
    if (wsRef.current) return;
    const ws = openCollabSocket(model.id, {
      onOpen: () => {
        setConnected(true);
        ws.send(JSON.stringify({
          type: "join",
          client_id: clientIdRef.current,
          name: name || "Anonimo",
        }));
        toast("success", "Connesso alla sessione collaborativa");
      },
      onMessage: (msg: CollabMessage) => {
        setParticipants((m) => {
          const next = new Map(m);
          const ex = next.get(msg.client_id) ?? {
            client_id: msg.client_id,
            lastSeen: Date.now(),
          };
          ex.name = msg.name ?? ex.name;
          if (msg.x != null && msg.y != null && msg.z != null) {
            ex.cursor = { x: msg.x, y: msg.y, z: msg.z };
          }
          ex.lastSeen = Date.now();
          next.set(msg.client_id, ex);
          return next;
        });
        if (msg.type === "leave") {
          setParticipants((m) => {
            const next = new Map(m);
            next.delete(msg.client_id);
            return next;
          });
          appendLog(msg.client_id, "ha lasciato la sessione", "warn");
        } else if (msg.type === "join") {
          appendLog(msg.client_id, `si è unito (${msg.name ?? "Anonimo"})`, "success");
        } else if (msg.type === "op" && msg.op) {
          appendLog(msg.client_id, `op: ${msg.op.kind}`, "info");
        }
      },
      onClose: () => {
        setConnected(false);
        wsRef.current = null;
        setParticipants(new Map());
        toast("info", "Sessione collaborativa chiusa");
      },
      onError: () => toast("error", "Errore WebSocket collab"),
    });
    wsRef.current = ws;
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Cleanup
  useEffect(() => () => disconnect(), []);

  function appendLog(client_id: string, text: string, variant: LogEntry["variant"]) {
    setLog((l) => [{ ts: Date.now(), client_id, text, variant }, ...l].slice(0, 30));
  }

  // Debug: invia cursor periodico (centro origine)
  const ping = () => {
    if (wsRef.current && connected) {
      sendCollabCursor(wsRef.current, clientIdRef.current, 0, 0, 0);
      toast("info", "Cursor ping inviato");
    }
  };

  return (
    <div className="p-3 space-y-3">
      <Card
        title="Sessione collaborativa"
        description="WebSocket Lamport-ordered. Backend FASE 22. L'editing si propaga via lo store esistente; qui controlli solo presenza."
      >
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nome utente" hint="visibile agli altri partecipanti">
            <Input value={name} onChange={(e) => setName(e.target.value)}
                   placeholder="es. Mario Rossi" disabled={connected} />
          </Field>
          <Field label="Client ID" hint="auto-generato">
            <Input value={clientIdRef.current} readOnly className="opacity-60" />
          </Field>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {!connected ? (
            <Button variant="primary" size="sm"
                    iconLeft={<Plug className="h-3.5 w-3.5" />}
                    disabled={!model} onClick={connect}>
              Connetti
            </Button>
          ) : (
            <Button variant="danger" size="sm"
                    iconLeft={<PlugZap className="h-3.5 w-3.5" />}
                    onClick={disconnect}>
              Disconnetti
            </Button>
          )}
          {connected && (
            <Button variant="ghost" size="sm"
                    iconLeft={<Activity className="h-3.5 w-3.5" />}
                    onClick={ping}>
              Ping cursor
            </Button>
          )}
          <Badge size="sm" variant={connected ? "success" : "muted"}>
            {connected ? "ONLINE" : "offline"}
          </Badge>
        </div>
      </Card>

      <Card title={`Partecipanti (${participants.size})`}>
        {participants.size === 0 && (
          <div className="text-xs text-ink-dim italic">Nessun partecipante connesso.</div>
        )}
        <div className="space-y-1">
          {Array.from(participants.values()).map((p) => (
            <div key={p.client_id} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5">
                <Users className="h-3 w-3 text-ink-dim" />
                <span>{p.name ?? "Anonimo"}</span>
                {p.client_id === clientIdRef.current && <Badge size="sm" variant="accent">tu</Badge>}
              </span>
              {p.cursor && (
                <span className="font-mono text-[10px] text-ink-dim">
                  ({p.cursor.x.toFixed(1)}, {p.cursor.y.toFixed(1)}, {p.cursor.z.toFixed(1)})
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Log eventi" description="Ultime op ricevute via WebSocket.">
        {log.length === 0 && (
          <div className="text-xs text-ink-dim italic">In attesa di eventi…</div>
        )}
        <div className="space-y-0.5 max-h-32 overflow-auto">
          {log.map((e, i) => {
            const color = e.variant === "success" ? "text-success"
                        : e.variant === "warn" ? "text-warn"
                        : "text-ink";
            return (
              <div key={i} className={`text-[10px] font-mono ${color}`}>
                [{new Date(e.ts).toLocaleTimeString()}] {e.client_id.slice(0, 12)}: {e.text}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
