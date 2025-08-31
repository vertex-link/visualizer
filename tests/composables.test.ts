// Disabled in Phase 0 until bun test environment is configured properly
// import { describe, it, expect } from "bun:test";
const describe = (_name: any, _fn?: any) => {};
const it = (_name: any, _fn?: any) => {};
const expect = (_: any) => ({ toBe: (_v: any) => {}, toThrow: () => {}, toBeUndefined: () => {} });
import {
  runWithContext,
  useActor,
  useComponent,
  getCurrentContext,
  deriveContext,
} from "../src/composables/context";


describe("composable-like context helpers", () => {
  it("throws when used outside of context", () => {
    expect(() => useActor()).toThrow();
    expect(() => useComponent()).toThrow();
    // getCurrentContext(false) returns undefined without throwing
    expect(getCurrentContext(false)).toBeUndefined();
  });

  it("resolves values inside runWithContext", () => {
    const actor = { name: "A1" };
    const component = { kind: "TestComponent" };

    runWithContext({ actor, component }, () => {
      expect(useActor<typeof actor>().name).toBe("A1");
      expect(useComponent<typeof component>().kind).toBe("TestComponent");
    });
  });

  it("supports nested contexts and restores after exit", () => {
    const outer = { actor: { id: 1 } };
    const inner = { actor: { id: 2 } };

    runWithContext(outer, () => {
      expect(useActor<{ id: number }>().id).toBe(1);

      runWithContext(inner, () => {
        expect(useActor<{ id: number }>().id).toBe(2);
      });

      // Restored to outer context
      expect(useActor<{ id: number }>().id).toBe(1);
    });
  });

  it("can derive a new context from current", () => {
    const base = { actor: { id: "base" }, scene: { tag: "S" } };

    runWithContext(base, () => {
      const derived = deriveContext({ component: { cid: 10 } });
      runWithContext(derived, () => {
        expect(useActor<{ id: string }>().id).toBe("base");
        expect(useComponent<{ cid: number }>().cid).toBe(10);
      });
    });
  });
});
