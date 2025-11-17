import { SceneChangedEvent } from "../events/CoreEvents";
import { EventBus, type IEventBus } from "../events/EventBus";
import type { Processor } from "../processor/Processor";
import { Scene } from "../scene/Scene";

/**
 * The Context is the container for an entire application world, including its scene,
 * services, resources, and processors. It is a passive data container that is
 * brought to life by an Engine.
 */
export class Context {
  // The static registry for all named contexts. The 'default' key is special.
  private static registry = new Map<string | symbol, Context>();
  // The stack for managing active scopes via `runWith`.
  private static stack: Context[] = [];

  // Instance properties
  public scene: Scene = new Scene();
  public readonly processors: Processor[] = [];
  public eventBus: IEventBus = new EventBus(); // Or initialize with a default EventBus

  /**
   * Gets the currently active context.
   * If called outside of a `Context.runWith` scope, it falls back to the
   * lazily-created default context.
   */
  public static current(): Context {
    const active = Context.stack[Context.stack.length - 1];
    if (active) {
      return active;
    }
    return Context.default();
  }

  /**
   * Gets, or lazily creates, the singleton default context.
   * This is the heart of the "automagic" zero-setup experience.
   */
  public static default(): Context {
    if (!Context.registry.has("default")) {
      Context.registry.set("default", new Context());
    }
    return Context.registry.get("default")!;
  }

  /**
   * Runs a given function within the scope of a specific context.
   * Any call to `useContext()` or `Context.current()` within the function
   * will resolve to the provided context.
   */
  public static runWith<T>(context: Context, fn: () => T): T {
    Context.stack.push(context);
    try {
      return fn();
    } finally {
      Context.stack.pop();
    }
  }

  // --- Instance Methods ---

  public setScene(scene: Scene): void {
    const previousScene = this.scene;
    this.scene = scene;

    // Emit scene changed event
    this.eventBus.emit(
      new SceneChangedEvent({
        scene,
        previousScene,
      }),
    );
  }

  public addProcessor(processor: Processor): void {
    this.processors.push(processor);
  }
}

/**
 * A user-facing helper function to get the current context.
 * This is the primary way components and resources should get context access.
 */
export function useContext(): Context {
  return Context.current();
}
