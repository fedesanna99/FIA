/**
 * Store per commenti/annotazioni su nodi ed elementi del modello FEA.
 *
 * Ogni commento ha:
 *   - id: incrementale unico nella sessione
 *   - target: { kind: "node" | "element" | "model" | "position", id?, position? }
 *   - text: contenuto markdown-light (no rendering ricco lato store)
 *   - author: stringa libera (es. email utente o "anonymous")
 *   - createdAt: timestamp ISO (ms)
 *
 * Persistenza: la store mantiene tutto in memoria. La persistenza
 * server-side è opzionale e gestita da chiamate REST esterne al store.
 */
import { create } from "zustand";

export type CommentTarget =
  | { kind: "node"; id: number }
  | { kind: "element"; id: number }
  | { kind: "model" }
  | { kind: "position"; x: number; y: number; z: number };

export interface Comment {
  id: number;
  target: CommentTarget;
  text: string;
  author: string;
  createdAt: number; // epoch ms
}

interface CommentsState {
  comments: Comment[];
  add: (target: CommentTarget, text: string, author?: string) => Comment;
  remove: (id: number) => void;
  update: (id: number, text: string) => void;
  clear: () => void;
  byTarget: (target: CommentTarget) => Comment[];
}

const _matchTarget = (a: CommentTarget, b: CommentTarget): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === "node" && b.kind === "node") return a.id === b.id;
  if (a.kind === "element" && b.kind === "element") return a.id === b.id;
  if (a.kind === "model") return true;
  if (a.kind === "position" && b.kind === "position")
    return a.x === b.x && a.y === b.y && a.z === b.z;
  return false;
};

let _nextId = 1;

export const useCommentsStore = create<CommentsState>((set, get) => ({
  comments: [],

  add: (target, text, author = "anonymous") => {
    const c: Comment = {
      id: _nextId++,
      target,
      text,
      author,
      createdAt: Date.now(),
    };
    set((s) => ({ comments: [...s.comments, c] }));
    return c;
  },

  remove: (id) =>
    set((s) => ({ comments: s.comments.filter((c) => c.id !== id) })),

  update: (id, text) =>
    set((s) => ({
      comments: s.comments.map((c) => (c.id === id ? { ...c, text } : c)),
    })),

  clear: () => {
    set({ comments: [] });
    _nextId = 1;
  },

  byTarget: (target) =>
    get().comments.filter((c) => _matchTarget(c.target, target)),
}));
