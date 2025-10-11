// Lightweight, framework-agnostic context helpers to replace decorators with
// composable-like, context-aware functions. Designed to work with the current
// OOP style by acting as thin utilities. No globals from engine/acs required.

export type Context = {
  actor?: unknown;
  component?: unknown;
  scene?: unknown;
  eventBus?: unknown;
  processors?: Map<string | symbol, unknown> | Record<string | symbol, unknown>;
};

// Internal stack to support nested scopes; use only for synchronous flows.
const ctxStack: Context[] = [];

/**
 * Run a function within a provided context. All useX() helpers will resolve
 * against this context for the sync duration of the callback.
 */
export function runWithContext<T>(ctx: Context, fn: () => T): T {
  ctxStack.push(ctx);
  try {
    return fn();
  } finally {
    ctxStack.pop();
  }
}

/** Get current context or throw if strict and none present. */
export function getCurrentContext(strict: true): Context;
export function getCurrentContext(strict?: boolean): Context | undefined;
export function getCurrentContext(strict = true): Context | undefined {
  const current = ctxStack[ctxStack.length - 1];
  if (!current && strict) {
    throw new Error("No current context. Ensure you're calling useX() inside runWithContext(...).");
  }
  return current;
}

function ensure<T>(value: T | undefined, name: string): T {
  if (value === undefined || value === null) {
    throw new Error(`${name} is not available in the current context.`);
  }
  return value as T;
}

// Composable-like helpers
export function useActor<T = unknown>(): T {
  const ctx = getCurrentContext();
  return ensure<T>(ctx?.actor as T, "actor");
}

export function useComponent<T = unknown>(): T {
  const ctx = getCurrentContext();
  return ensure<T>(ctx?.component as T, "component");
}

export function useScene<T = unknown>(): T {
  const ctx = getCurrentContext();
  return ensure<T>(ctx?.scene as T, "scene");
}

export function useEventBus<T = unknown>(): T {
  const ctx = getCurrentContext();
  return ensure<T>(ctx?.eventBus as T, "eventBus");
}

export function useProcessor<T = unknown>(key: string | symbol): T {
  const ctx = getCurrentContext();
  const source = ctx?.processors;
  let value: unknown;
  if (source && typeof (source as any).get === "function") {
    value = (source as Map<string | symbol, unknown>).get(key);
  } else if (source && typeof source === "object") {
    value = (source as Record<string | symbol, unknown>)[key as any];
  }
  return ensure<T>(value as T, `processor(${String(key)})`);
}

/** Utility to create a new context by shallow-merging values atop the current one. */
export function deriveContext(partial: Context): Context {
  const base = getCurrentContext(false) ?? {};
  return { ...base, ...partial };
}

/**
 * Helper for OOP-style classes: run a method with a provided context.
 * Example:
 *   class MyComponent { update() { return withContext({ component: this }, () => { ... }) }}
 */
export function withContext<T>(ctx: Context, fn: () => T): T {
  return runWithContext(ctx, fn);
}
