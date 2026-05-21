/**
 * AICopilotPanel (alpha.30) — refactor visivo mockup v1.3.
 *
 * Layout completo:
 *   ┌────────────────────────────────────────┐
 *   │ [✨ gradient]  AI Copilot               │
 *   │               Gemini Flash · ctx attivo │
 *   ├────────────────────────────────────────┤
 *   │ 🔗 Contesto: Portal · 11 N · 10 EL      │  ← banner
 *   ├────────────────────────────────────────┤
 *   │ [AI avatar]  Risposta...                │
 *   │                                         │
 *   │       [User] Domanda...                 │
 *   ├────────────────────────────────────────┤
 *   │ [chip] [chip] [chip] [chip]             │  ← suggestions
 *   ├────────────────────────────────────────┤
 *   │ [textarea] Chiedi...           [↑ blu] │
 *   └────────────────────────────────────────┘
 *
 * Logica/API invariate: useMutation su aiApi.ask, history multi-turn,
 * stato lastMeta per Badge provider/elapsed/tokens.
 */
import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, ArrowUp, Trash2, Link2 } from "lucide-react";
import { aiApi, type CopilotAnswer } from "../../api/ai";
import { useModelStore } from "../../store/modelStore";
import { toast } from "../../store/toastStore";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const EXAMPLES = [
  "Quanti nodi ed elementi?",
  "Elemento con UR più alto?",
  "Ottimizzazioni peso",
  "Riassumi carichi",
];

const GRADIENT_AI = "linear-gradient(135deg, #185fa5 0%, #534ab7 100%)";
const GRADIENT_USER = "linear-gradient(135deg, #534ab7, #7f77dd)";

function userInitials(): string {
  // Placeholder iniziali — quando l'auth user sara' propagato qui, useremo email.
  return "GR";
}

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
        history: history.slice(-8),
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

  const providerLabel = lastMeta?.provider ?? "Gemini Flash";

  return (
    <div className="flex flex-col h-full bg-bg-panel">
      {/* Header: avatar gradient + titolo + sotto-titolo */}
      <div className="flex items-center gap-2.5 p-3.5 border-b border-border flex-shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ background: GRADIENT_AI }}
        >
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-ink">AI Copilot</div>
          <div className="text-[11px] text-ink-dim font-mono truncate">
            {providerLabel} · contesto {model ? "attivo" : "vuoto"}
          </div>
        </div>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => { setHistory([]); setLastMeta(null); }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-ink-muted hover:bg-bg-hover hover:text-ink flex-shrink-0"
            title="Reset chat"
            aria-label="Reset chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Context banner */}
      {model && (
        <div className="bg-bg-info text-ink-info text-[11px] font-mono px-3.5 py-2 border-b border-border flex items-center gap-2 flex-shrink-0">
          <Link2 className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">
            Contesto: {model.name} · {model.nodes?.length ?? 0} N · {model.elements?.length ?? 0} EL
          </span>
        </div>
      )}

      {/* Messaggi */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-0"
      >
        {history.length === 0 && (
          <div className="text-center text-ink-dim text-xs py-8">
            {model
              ? "Chiedi qualcosa sul tuo modello o scegli un suggerimento qui sotto."
              : "Carica un modello per iniziare la conversazione."}
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <Avatar role={m.role} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-semibold text-ink-muted mb-1">
                {m.role === "user" ? "Tu" : "Copilot"}
              </div>
              <div className="text-sm text-ink leading-relaxed whitespace-pre-wrap break-words">
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {mut.isPending && (
          <div className="flex gap-2.5 items-start">
            <Avatar role="assistant" />
            <div className="flex-1">
              <div className="text-[11px] font-semibold text-ink-muted mb-1">Copilot</div>
              <div className="text-sm text-ink-dim italic">Pensando…</div>
            </div>
          </div>
        )}
        {lastMeta && (
          <div className="text-[10px] text-ink-dim font-mono pt-2 border-t border-border/50">
            {lastMeta.provider} · {lastMeta.elapsed_ms}ms · ≈{lastMeta.prompt_tokens_approx} tok
          </div>
        )}
      </div>

      {/* Suggestions chips */}
      <div className="px-3.5 py-2.5 border-t border-border flex flex-wrap gap-1.5 flex-shrink-0">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            disabled={!model || mut.isPending}
            className="px-2.5 py-1 bg-bg border border-border rounded-full text-[11px] text-ink-muted hover:bg-bg-hover hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-bg flex-shrink-0">
        <textarea
          className="w-full text-sm px-3 py-2 rounded-md bg-bg-panel border border-border text-ink placeholder:text-ink-dim resize-none focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
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
        <div className="flex justify-between items-center mt-2">
          <div className="text-[11px] text-ink-dim font-mono">{providerLabel}</div>
          <button
            type="button"
            onClick={() => send(input)}
            disabled={!model || !input.trim() || mut.isPending}
            className="w-7 h-7 rounded-md bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Invia messaggio"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({ role }: { role: "user" | "assistant" }) {
  if (role === "user") {
    return (
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0"
        style={{ background: GRADIENT_USER }}
      >
        {userInitials()}
      </div>
    );
  }
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0"
      style={{ background: GRADIENT_AI }}
    >
      <Sparkles className="w-3.5 h-3.5" />
    </div>
  );
}
