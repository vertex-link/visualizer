// src/core/events/Event.ts
import Actor from '../Actor';
import Component from '../component/Component';

// ==================== Base Event Classes ====================

/**
 * Base class for all events in the system
 * Enforces type safety for payloads and provides consistent structure
 */
export abstract class Event<TPayload = unknown> {
  public readonly timestamp = performance.now();
  public readonly payload: TPayload;

  // Optional target - set by emit systems, not constructor
  public target?: Actor | Component;

  // Static type must be defined by each event class
  public static readonly eventType: string;

  constructor(payload: TPayload) {
    this.payload = payload;
  }

  /**
   * Get the event type - uses static eventType to avoid minification issues
   */
  get type(): string {
    return (this.constructor as typeof Event).eventType;
  }
}

// ==================== Type Helpers ====================

/**
 * Extract payload type from an event class
 */
export type EventPayload<T> = T extends Event<infer P> ? P : never;

/**
 * Event handler function type with proper typing
 */
export type EventHandler<T extends Event> = (event: T) => void;

/**
 * Event class constructor type that enforces static eventType
 */
export interface EventClass<T extends Event = Event> {
  new(...args: any[]): T;
  readonly eventType: string;
}

// ==================== Event Bus Implementation ====================

export interface IEventBus {
  emit<T extends Event>(event: T): void;
  on<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>, context?: any): void;
  off<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>): void;
  once<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>, context?: any): void;
  clear(): void;
  cleanupContext(context: any): void;
}

export class EventBus implements IEventBus {
  private eventTarget = new EventTarget();
  private handlerCleanup = new Map<Function, () => void>();
  private contextHandlers = new WeakMap<any, Set<Function>>();

  emit<T extends Event>(event: T): void {
    const customEvent = new CustomEvent(event.type, {
      detail: event
    });

    this.eventTarget.dispatchEvent(customEvent);
  }

  on<T extends Event>(
    eventClass: EventClass<T>,
    handler: EventHandler<T>,
    context?: any
  ): void {
    const eventType = eventClass.eventType;

    const wrappedHandler: EventListener = (evt: globalThis.Event) => {
      // Type guard and assertion to ensure it's a CustomEvent
      if (evt instanceof CustomEvent) {
        const customEvent = evt as CustomEvent<T>;
        handler(customEvent.detail);
      }
    };

    // Attach the handler
    this.eventTarget.addEventListener(eventType, wrappedHandler);

    // Store cleanup function
    this.handlerCleanup.set(handler, () => {
      this.eventTarget.removeEventListener(eventType, wrappedHandler);
    });

    // Context handling remains the same
    if (context) {
      if (!this.contextHandlers.has(context)) {
        this.contextHandlers.set(context, new Set());
      }
      this.contextHandlers.get(context)!.add(handler);
    }
  }

  off<T extends Event>(
    _: EventClass<T>,
    handler: EventHandler<T>
  ): void {
    const cleanup = this.handlerCleanup.get(handler);
    if (cleanup) {
      cleanup();
      this.handlerCleanup.delete(handler);
    }
  }

  once<T extends Event>(
    eventClass: EventClass<T>,
    handler: EventHandler<T>,
    context?: any
  ): void {
    const wrappedHandler: EventHandler<T> = (event) => {
      handler(event);
      this.off(eventClass, wrappedHandler);
    };
    this.on(eventClass, wrappedHandler, context);
  }

  cleanupContext(context: any): void {
    const handlers = this.contextHandlers.get(context);
    if (handlers) {
      handlers.forEach(handler => {
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
    this.handlerCleanup.forEach(cleanup => cleanup());
    this.handlerCleanup.clear();
    this.contextHandlers = new WeakMap();
  }
}

// ==================== Global Event Bus ====================

let defaultEventBus: IEventBus | null = null;

export function initializeEventBus(eventBus: IEventBus): void {
  defaultEventBus = eventBus;
}

export function getEventBus(): IEventBus {
  if (!defaultEventBus) {
    defaultEventBus = new EventBus();
  }
  return defaultEventBus;
}

// Convenience functions
export function emit<T extends Event>(event: T): void {
  getEventBus().emit(event);
}

export function on<T extends Event>(
  eventClass: EventClass<T>,
  handler: EventHandler<T>,
  context?: any
): void {
  getEventBus().on(eventClass, handler, context);
}

export function off<T extends Event>(
  eventClass: EventClass<T>,
  handler: EventHandler<T>
): void {
  getEventBus().off(eventClass, handler);
}
