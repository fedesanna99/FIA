/**
 * notificationsStore.test.ts (v1.7-polish-pass2 T2).
 * Smoke test sul nuovo store dedicato.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useNotificationsStore, notify } from "./notificationsStore";


beforeEach(() => {
  useNotificationsStore.setState({ items: [] });
});


describe("notificationsStore", () => {
  it("push aggiunge un item con read=false e timestamp", () => {
    useNotificationsStore.getState().push({ level: "info", title: "Test" });
    const items = useNotificationsStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ level: "info", title: "Test", read: false });
    expect(items[0].ts).toBeGreaterThan(0);
  });

  it("notify() helper aggiunge alla pila in modo imperativo", () => {
    notify("error", "Crash solver", "Stack trace nel log");
    const items = useNotificationsStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].level).toBe("error");
    expect(items[0].message).toBe("Stack trace nel log");
  });

  it("ordine: il piu' recente in testa", () => {
    notify("info", "Prima");
    notify("info", "Seconda");
    const items = useNotificationsStore.getState().items;
    expect(items[0].title).toBe("Seconda");
    expect(items[1].title).toBe("Prima");
  });

  it("markRead marca singola notifica", () => {
    notify("info", "Test");
    const id = useNotificationsStore.getState().items[0].id;
    useNotificationsStore.getState().markRead(id);
    expect(useNotificationsStore.getState().items[0].read).toBe(true);
  });

  it("markAllRead marca tutte", () => {
    notify("info", "A");
    notify("info", "B");
    notify("info", "C");
    useNotificationsStore.getState().markAllRead();
    const items = useNotificationsStore.getState().items;
    expect(items.every((n) => n.read)).toBe(true);
  });

  it("dismiss rimuove la notifica", () => {
    notify("info", "Test");
    const id = useNotificationsStore.getState().items[0].id;
    useNotificationsStore.getState().dismiss(id);
    expect(useNotificationsStore.getState().items).toHaveLength(0);
  });

  it("cap a 50 items: drop il più vecchio", () => {
    for (let i = 0; i < 55; i++) {
      notify("info", `Item ${i}`);
    }
    const items = useNotificationsStore.getState().items;
    expect(items).toHaveLength(50);
    // Il più recente è in testa.
    expect(items[0].title).toBe("Item 54");
    // I primi 5 sono stati droppati.
    expect(items.find((n) => n.title === "Item 0")).toBeUndefined();
  });

  it("clear svuota tutto", () => {
    notify("info", "A");
    notify("info", "B");
    useNotificationsStore.getState().clear();
    expect(useNotificationsStore.getState().items).toHaveLength(0);
  });
});
