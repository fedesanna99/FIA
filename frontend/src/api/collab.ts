/**
 * Collab session via WebSocket — FASE 22.
 * Backend: `WS /ws/collab/{model_id}`.
 *
 * Protocollo (JSON per messaggio):
 *   { type: "join",   client_id: string, name: string }
 *   { type: "op",     client_id, lamport, op: { kind: "node_add"|"node_update"|..., payload } }
 *   { type: "cursor", client_id, x: number, y: number, z: number }
 *   { type: "leave",  client_id }
 */

export type CollabOpKind =
  | "node_add" | "node_update" | "node_delete"
  | "element_add" | "element_update" | "element_delete"
  | "load_add" | "load_update" | "load_delete"
  | "constraint_add" | "constraint_update" | "constraint_delete";

export interface CollabOp {
  kind: CollabOpKind;
  payload: unknown;
}

export interface CollabMessage {
  type: "join" | "op" | "cursor" | "leave" | "ack";
  client_id: string;
  name?: string;
  lamport?: number;
  op?: CollabOp;
  x?: number;
  y?: number;
  z?: number;
}

export function openCollabSocket(
  modelId: string,
  handlers: {
    onMessage?: (msg: CollabMessage) => void;
    onOpen?: () => void;
    onClose?: (ev: CloseEvent) => void;
    onError?: (ev: Event) => void;
  },
): WebSocket {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const ws = new WebSocket(`${proto}://${host}/ws/collab/${modelId}`);
  if (handlers.onOpen)  ws.onopen  = handlers.onOpen;
  if (handlers.onClose) ws.onclose = handlers.onClose;
  if (handlers.onError) ws.onerror = handlers.onError;
  ws.onmessage = (ev) => {
    try {
      const parsed = JSON.parse(ev.data) as CollabMessage;
      handlers.onMessage?.(parsed);
    } catch {
      // ignore malformed messages
    }
  };
  return ws;
}

export function sendCollabOp(ws: WebSocket, op: CollabOp, clientId: string, lamport: number): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "op", client_id: clientId, lamport, op } satisfies CollabMessage));
}

export function sendCollabCursor(ws: WebSocket, clientId: string, x: number, y: number, z: number): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "cursor", client_id: clientId, x, y, z } satisfies CollabMessage));
}
