/**
 * API AI Copilot — domande sul modello.
 * Backend: `POST /api/ai/ask` (FASE 21).
 */
import { api } from "./client";

export interface CopilotRequest {
  model_id: string;
  question: string;
  /** Storia conversazione opzionale (per multi-turn). */
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface CopilotAnswer {
  answer: string;
  provider: "GeminiProvider" | "MockProvider" | string;
  elapsed_ms: number;
  prompt_tokens_approx: number;
}

export const aiApi = {
  ask: (req: CopilotRequest) =>
    api.post<CopilotAnswer>("/api/ai/ask", req).then(r => r.data),
};
