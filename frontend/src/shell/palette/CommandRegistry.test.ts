/**
 * CommandRegistry tests (brief Step 4.8).
 *
 * 6 test minimi: register/unregister, duplicate, fuzzy search, group by
 * category, execute, enabled() guard.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CommandRegistry } from "./CommandRegistry";


beforeEach(() => {
  CommandRegistry.clear();
});


describe("CommandRegistry", () => {
  it("registers and retrieves entries", () => {
    CommandRegistry.register({
      id: "test-1",
      name: "Test command",
      category: "action",
      action: () => {},
    });
    expect(CommandRegistry.all()).toHaveLength(1);
  });

  it("warns on duplicate id but overwrites", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    CommandRegistry.register({
      id: "x", name: "A", category: "action", action: () => {},
    });
    CommandRegistry.register({
      id: "x", name: "B", category: "action", action: () => {},
    });
    expect(CommandRegistry.all()).toHaveLength(1);
    expect(CommandRegistry.all()[0].name).toBe("B");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("fuzzy search matches across name + keywords + path", () => {
    CommandRegistry.register({
      id: "save",
      name: "Salva modello",
      category: "action",
      path: "Workspace",
      keywords: ["save", "salva"],
      action: () => {},
    });
    // Match parziale italiano
    const r1 = CommandRegistry.search({ query: "salv" });
    expect(r1.total).toBe(1);
    // Match alias inglese
    const r2 = CommandRegistry.search({ query: "save" });
    expect(r2.total).toBe(1);
    // Match path
    const r3 = CommandRegistry.search({ query: "work" });
    expect(r3.total).toBe(1);
    // Nessun match
    const r4 = CommandRegistry.search({ query: "xyz" });
    expect(r4.total).toBe(0);
  });

  it("groups by category", () => {
    CommandRegistry.register({ id: "a1", name: "A", category: "action", action: () => {} });
    CommandRegistry.register({ id: "n1", name: "B", category: "navigation", action: () => {} });
    const r = CommandRegistry.search({ query: "" });
    expect(r.byCategory.action).toHaveLength(1);
    expect(r.byCategory.navigation).toHaveLength(1);
  });

  it("executes commands by id", async () => {
    let called = false;
    CommandRegistry.register({
      id: "run",
      name: "Run",
      category: "action",
      action: () => { called = true; },
    });
    await CommandRegistry.execute("run");
    expect(called).toBe(true);
  });

  it("respects enabled() guard (no execute, no in all())", async () => {
    let called = false;
    CommandRegistry.register({
      id: "blocked",
      name: "Blocked",
      category: "action",
      enabled: () => false,
      action: () => { called = true; },
    });
    await CommandRegistry.execute("blocked");
    expect(called).toBe(false);
    // Disabled NON appare in all() (filtered)
    expect(CommandRegistry.all()).toHaveLength(0);
  });

  it("registerAll returns cleanup that unregisters all", () => {
    const cleanup = CommandRegistry.registerAll([
      { id: "a", name: "A", category: "action", action: () => {} },
      { id: "b", name: "B", category: "action", action: () => {} },
    ]);
    expect(CommandRegistry.all()).toHaveLength(2);
    cleanup();
    expect(CommandRegistry.all()).toHaveLength(0);
  });

  it("unregister removes by id", () => {
    CommandRegistry.register({
      id: "to-remove", name: "X", category: "action", action: () => {},
    });
    expect(CommandRegistry.all()).toHaveLength(1);
    CommandRegistry.unregister("to-remove");
    expect(CommandRegistry.all()).toHaveLength(0);
  });

  it("filters by category in search", () => {
    CommandRegistry.register({ id: "act", name: "Action", category: "action", action: () => {} });
    CommandRegistry.register({ id: "set", name: "Setting", category: "setting", action: () => {} });
    CommandRegistry.register({ id: "help", name: "Help", category: "help", action: () => {} });
    const r = CommandRegistry.search({ query: "", categories: ["action", "setting"] });
    expect(r.total).toBe(2);
    expect(r.byCategory.action).toHaveLength(1);
    expect(r.byCategory.setting).toHaveLength(1);
    expect(r.byCategory.help).toHaveLength(0);
  });

  it("subscribe notifies on mutation", () => {
    let notified = 0;
    const unsub = CommandRegistry.subscribe(() => { notified++; });
    CommandRegistry.register({ id: "a", name: "A", category: "action", action: () => {} });
    expect(notified).toBe(1);
    CommandRegistry.unregister("a");
    expect(notified).toBe(2);
    unsub();
    CommandRegistry.register({ id: "b", name: "B", category: "action", action: () => {} });
    expect(notified).toBe(2); // unsub: no piu' chiamato
  });
});
