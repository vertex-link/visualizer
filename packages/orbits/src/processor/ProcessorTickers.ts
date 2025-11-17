import type { Event, EventClass, IEventBus } from "../events/Event";
import type { ProcessorTicker } from "./Processor";

/**
 * Collection of common ticker implementations
 */

// biome-ignore lint/complexity/noStaticOnlyClass: This is a utility class
export class Tickers {
  /**
   * Creates a ticker that uses requestAnimationFrame for smooth rendering.
   * Automatically calculates deltaTime between frames.
   */
  static animationFrame(): ProcessorTicker {
    return (executeTasks, isRunning) => {
      let lastTime = 0;
      let animationId: number;

      const tick = (currentTime: number) => {
        if (!isRunning()) return;

        const deltaTime = lastTime === 0 ? 0 : (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        executeTasks(deltaTime);
        animationId = requestAnimationFrame(tick);
      };

      animationId = requestAnimationFrame(tick);

      // Return cleanup function
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    };
  }

  /**
   * Creates a ticker with a fixed interval using setInterval.
   * @param intervalMs Interval in milliseconds between ticks
   */
  static fixedInterval(intervalMs: number): ProcessorTicker {
    return (executeTasks, isRunning) => {
      const deltaTime = intervalMs / 1000;
      const intervalId = setInterval(() => {
        if (isRunning()) {
          executeTasks(deltaTime);
        }
      }, intervalMs);

      return () => clearInterval(intervalId);
    };
  }

  /**
   * Creates a ticker with a target FPS using setInterval.
   * @param fps Target frames per second
   */
  static fixedFPS(fps: number): ProcessorTicker {
    return Tickers.fixedInterval(1000 / fps);
  }

  /**
   * Creates a ticker that responds to DOM events on EventTarget objects.
   * @param eventTarget DOM EventTarget to listen for events on
   * @param eventType Type of DOM event to listen for
   */
  static domEventDriven<T extends EventTarget>(eventTarget: T, eventType: string): ProcessorTicker {
    return (executeTasks, isRunning) => {
      let lastTime = performance.now();

      const handler = () => {
        if (!isRunning()) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        executeTasks(deltaTime);
      };

      eventTarget.addEventListener(eventType, handler);

      return () => {
        eventTarget.removeEventListener(eventType, handler);
      };
    };
  }

  /**
   * Creates a ticker that responds to your typed EventBus events.
   * Integrates perfectly with your Event system.
   * @param eventBus The EventBus instance to listen on
   * @param eventClass The typed Event class to listen for
   * @param context Optional context for the event handler
   */
  static eventDriven<T extends Event>(
    eventBus: IEventBus,
    eventClass: EventClass<T>,
    context?: unknown,
  ): ProcessorTicker {
    return (executeTasks, isRunning) => {
      let lastTime = performance.now();

      const handler = (event: T) => {
        if (!isRunning()) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // Pass event as additional argument to executeTasks
        executeTasks(deltaTime, event);
      };

      eventBus.on(eventClass, handler, context);

      return () => {
        eventBus.off(eventClass, handler);
      };
    };
  }

  /**
   * Creates a ticker that responds to multiple EventBus events.
   * Executes when ANY of the specified events are fired.
   * @param eventBus The EventBus instance to listen on
   * @param eventClasses Array of Event classes to listen for
   * @param context Optional context for event handlers
   */
  static multiEventDriven(
    eventBus: IEventBus,
    eventClasses: EventClass[],
    context?: unknown,
  ): ProcessorTicker {
    return (executeTasks, isRunning) => {
      let lastTime = performance.now();
      const cleanupFunctions: (() => void)[] = [];

      for (const eventClass of eventClasses) {
        const handler = (event: Event) => {
          if (!isRunning()) return;

          const currentTime = performance.now();
          const deltaTime = (currentTime - lastTime) / 1000;
          lastTime = currentTime;

          executeTasks(deltaTime, event);
        };

        eventBus.on(eventClass, handler, context);
        cleanupFunctions.push(() => eventBus.off(eventClass, handler));
      }

      return () => {
        cleanupFunctions.forEach((cleanup) => {
          cleanup();
        });
      };
    };
  }

  /**
   * Creates a ticker that only executes when a condition is met.
   * @param baseTicker The underlying ticker to use
   * @param condition Function that returns true when execution should happen
   */
  static conditional(baseTicker: ProcessorTicker, condition: () => boolean): ProcessorTicker {
    return (executeTasks, isRunning) => {
      const conditionalExecute = (deltaTime: number, ...args: any[]) => {
        if (condition()) {
          executeTasks(deltaTime, ...args);
        }
      };

      return baseTicker(conditionalExecute, isRunning);
    };
  }
}
