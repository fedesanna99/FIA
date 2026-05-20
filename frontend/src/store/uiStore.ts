import { create } from "zustand";

export type DialogKind = "node" | "element" | "load" | "constraint" | "mesh" | "new" | "help" | null;

interface UIState {
  openDialog: DialogKind;
  setOpenDialog: (d: DialogKind) => void;

  editNodeId: number | null;
  openEditNode: (id: number) => void;

  editElementId: number | null;
  openEditElement: (id: number) => void;

  editLoadId: number | null;
  openEditLoad: (id: number) => void;

  editConstraintId: number | null;
  openEditConstraint: (id: number) => void;
}

const RESET_EDITS = {
  editNodeId: null,
  editElementId: null,
  editLoadId: null,
  editConstraintId: null,
};

export const useUIStore = create<UIState>((set) => ({
  openDialog: null,
  setOpenDialog: (d) =>
    set({
      openDialog: d,
      ...(d === null ? RESET_EDITS : {}),
    }),
  editNodeId: null,
  openEditNode: (id) => set({ ...RESET_EDITS, editNodeId: id, openDialog: "node" }),
  editElementId: null,
  openEditElement: (id) => set({ ...RESET_EDITS, editElementId: id, openDialog: "element" }),
  editLoadId: null,
  openEditLoad: (id) => set({ ...RESET_EDITS, editLoadId: id, openDialog: "load" }),
  editConstraintId: null,
  openEditConstraint: (id) => set({ ...RESET_EDITS, editConstraintId: id, openDialog: "constraint" }),
}));
