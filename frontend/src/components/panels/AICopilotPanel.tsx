/**
 * AICopilotPanel — chat sul modello attivo (FASE 21).
 *
 * Backend: POST /api/ai/ask  (provider = Gemini o MockProvider).
 * Conversazione multi-turn (history viene rinviata ad ogni domanda).
 */
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Send, User, Trash2 } from "lucide-react";
import { aiApi, type CopilotAnswer } from "../../api/ai";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLES = [
  "Quanti nodi ed elementi ha il modello?",
  "Qual è l'elemento con il rapporto utilizzazione più alto?",
  "Suggerisci ottimizzazioni per ridurre peso strutturale.",
  "Riassumi le condizioni di carico.",
];

export function AICopilotPanel() {
  const model = useModelStore((s) => s.model);
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [lastMeta, setLastMeta] = useState<Pick<CopilotAnswer, "provider" | "elapsed_ms" | "prompt_tokens_approx"> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const mut = useMutation({
    mutationFn: (q: string) => {
      if (!model) throw new Error("Nessun modello attivo");
      return aiApi.ask({
        model_id: model.id,
        question: q,
        history: history.slice(-8), // last 4 turn pairs
      });
    },
    onSuccess: (r) => {
      setHistory((h) => [...h, { role: "assistant", content: r.answer }]);
      setLastMeta({
        provider: r.provider,
        elapsed_ms: r.elapsed_ms,
        prompt_tokens_approx: r.prompt_tokens_approx,
      });
    },
    onError: (e) => toast("error", `Errore AI: ${(e as Error).message}`),
  });

  const send = (q: string) => {
    if (!q.trim() || mut.isPending) return;
    setHistory((h) => [...h, { role: "user", content: q.trim() }]);
    setInput("");
    mut.mutate(q.trim());
  };

  return (
    <div className="p-3 flex flex-col h-full gap-3">
      <Card
        title="Domande sul modello"
        description="Chat con AI Copilot — il modello attivo viene riassunto e inviato come contesto. Provider: Gemini o MockProvider in fallback."
        actions={
          history.length > 0 && (
            <Button variant="ghost" size="xs" iconLeft={<Trash2 className="h-3 w-3" />}
                    onClick={() => { setHistory([]); setLastMeta(null); }}>
              Reset
            </Button>
          )
        }
      >
        {history.length === 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] text-ink-dim uppercase tracking-wider">Suggerimenti:</div>
            {EXAMPLES.map((q, i) => (
              <button key={i}
                className="block w-full text-left text-xs px-2 py-1 rounded bg-bg/40 border border-border hover:bg-bg-hover hover:border-accent/50 transition-colors"
                onClick={() => send(q)}
                disabled={!model || mut.isPending}>
                {q}
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Conversazione */}
      <div ref={scrollRef}
           className="flex-1 overflow-y-auto space-y-2 px-1 min-h-0">
        {history.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center flex-shrink-0">
                <Bot className="h-3.5 w-3.5 text-accent" />
              </div>
            )}
            <div className={`text-xs rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-wrap
              ${m.role === "user"
                ? "bg-accent/15 border border-accent/40 text-ink"
                : "bg-bg-elevated border border-border text-ink"}`}>
              {m.content}
            </div>
            {m.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-bg-elevated border border-border flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-ink-dim" />
              </div>
            )}
          </div>
        ))}
        {mut.isPending && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-accent animate-pulse" />
            </div>
            <div className="text-xs text-ink-dim italic">Pensando…</div>
          </div>
        )}
      </div>

      {/* Footer meta */}
      {lastMeta && (
        <div className="flex items-center gap-1.5 text-[10px]">
          <Badge size="sm" variant="info">{lastMeta.provider}</Badge>
          <Badge size="sm" variant="muted">{lastMeta.elapsed_ms}ms</Badge>
          <Badge size="sm" variant="muted">≈{lastMeta.prompt_tokens_approx} tok</Badge>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <textarea
          className="flex-1 text-sm px-3 py-2 rounded-md bg-bg-elevated border border-border text-ink placeholder:text-ink-dim resize-none focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          rows={2}
          placeholder={model ? "Chiedi qualcosa sul modello…" : "Nessun modello attivo"}
          value={input}
          disabled={!model || mut.isPending}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <Button
          variant="primary" size="sm"
          iconLeft={<Send className="h-3.5 w-3.5" />}
          disabled={!model || !input.trim() || mut.isPending}
          onClick={() => send(input)}>
          Invia
        </Button>
      </div>
    </div>
  );
}
