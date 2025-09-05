import type { IService } from "../Service";
import type { Event, EventClass, EventHandler } from "./Event";

// ==================== Event Bus Interface ====================

export const IEventBusKey = Symbol.for("IEventBus");

export interface IEventBus extends IService {
  emit<T extends Event>(event: T): void;
  on<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>, context?: any): void;
  off<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>): void;
  once<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>, context?: any): void;
  clear(): void;
  cleanupContext(context: any): void;
}

// ==================== Event Bus Implementation ====================

export class EventBus implements IEventBus {
  private eventTarget = new EventTarget();
  private handlerCleanup = new Map<Function, () => void>();
  private contextHandlers = new WeakMap<any, Set<Function>>();

  emit<T extends Event>(event: T): void {
    const customEvent = new CustomEvent(event.type, {
      detail: event,
    });

    this.eventTarget.dispatchEvent(customEvent);
  }

  on<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>, context?: any): void {
    const eventType = eventClass.eventType;

    const wrappedHandler: EventListener = (evt: globalThis.Event) => {
      if (evt instanceof CustomEvent) {
        handler(evt.detail as T);
      }
    };

    // Store cleanup function
    this.handlerCleanup.set(handler, () => {
      this.eventTarget.removeEventListener(eventType, wrappedHandler);
    });

    // Track context for bulk cleanup
    if (context) {
      if (!this.contextHandlers.has(context)) {
        this.contextHandlers.set(context, new Set());
      }
      this.contextHandlers.get(context)!.add(handler);
    }

    this.eventTarget.addEventListener(eventType, wrappedHandler);
  }

  off<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>): void {
    const cleanup = this.handlerCleanup.get(handler);
    if (cleanup) {
      cleanup();
      this.handlerCleanup.delete(handler);
    }
  }

  once<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>, context?: any): void {
    const onceHandler = (event: T) => {
      handler(event);
      this.off(eventClass, onceHandler);
    };
    this.on(eventClass, onceHandler, context);
  }

  cleanupContext(context: any): void {
    const handlers = this.contextHandlers.get(context);
    if (handlers) {
      handlers.forEach((handler) => {
        const cleanup = this.handlerCleanup.get(handler);
        if (cleanup) {
          cleanup();
          this.handlerCleanup.delete(handler);
        }
      });
      this.contextHandlers.delete(context);
    }
  }

  clear(): void {
    this.handlerCleanup.forEach((cleanup) => cleanup());
    this.handlerCleanup.clear();
    this.contextHandlers = new WeakMap();
  }
}

// ==================== Global Event API ====================

let defaultEventBus: IEventBus | null = null;

/**
 * Initialize the default event bus
 */
export function initializeEventBus(eventBus: IEventBus) {
  defaultEventBus = eventBus;
  return eventBus;
}

/**
 * Get the default event bus (throws if not initialized)
 */
export function getEventBus(): IEventBus {
  let bus = defaultEventBus;

  if (!bus) {
    bus = initializeEventBus(new EventBus());
  }

  return bus;
}

/**
 * Emit an event using the default event bus
 */
export function emit<T extends Event>(event: T): void {
  getEventBus().emit(event);
}

/**
 * Listen to events using the default event bus
 */
export function on<T extends Event>(
  eventClass: EventClass<T>,
  handler: EventHandler<T>,
  context?: any,
): void {
  getEventBus().on(eventClass, handler, context);
}

/**
 * Remove event listener from default event bus
 */
export function off<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>): void {
  getEventBus().off(eventClass, handler);
}

/**
 * Listen to event once using default event bus
 */
export function once<T extends Event>(
  eventClass: EventClass<T>,
  handler: EventHandler<T>,
  context?: any,
): void {
  getEventBus().once(eventClass, handler, context);
}
