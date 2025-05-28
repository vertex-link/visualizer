import { Event, EventClass, EventHandler, IEventBus, getEventBus } from './Event.ts';

// ==================== Decorator Metadata ====================

const EVENT_LISTENERS_KEY = Symbol('eventListeners');

interface EventListenerMetadata<T extends Event = Event> {
    eventClass: EventClass<T>;
    methodName: string | symbol;
    once?: boolean;
}

// ==================== Event Decorators ====================

/**
 * Decorator for listening to events with full type safety
 * @param eventClass The event class to listen for
 * @param once Whether to only listen once
 */
export function OnEvent<T extends Event>(
    eventClass: EventClass<T>,
    once: boolean = false
) {
    return function <This>(
        target: This,
        propertyKey: string | symbol,
        descriptor: TypedPropertyDescriptor<EventHandler<T>>
    ) {
        // Ensure the method signature matches the expected event handler
        const listeners: EventListenerMetadata[] =
            Reflect.getOwnMetadata(EVENT_LISTENERS_KEY, target) || [];

        listeners.push({
            eventClass,
            methodName: propertyKey,
            once
        });

        Reflect.defineMetadata(EVENT_LISTENERS_KEY, listeners, target);
    };
}

/**
 * Decorator for one-time event listening
 */
export function OnceEvent<T extends Event>(eventClass: EventClass<T>) {
    return OnEvent<T>(eventClass, true);
}

// ==================== Registration Functions ====================

/**
 * Register event listeners from decorators
 */
export function registerEventListeners(
    instance: any,
    eventBus?: IEventBus
): void {
    const bus = eventBus || getEventBus();
    const prototype = Object.getPrototypeOf(instance);
    const listeners: EventListenerMetadata[] =
        Reflect.getOwnMetadata(EVENT_LISTENERS_KEY, prototype) || [];

    for (const listener of listeners) {
        const handler = (event: Event) => {
            (instance as any)[listener.methodName](event);
        };

        if (listener.once) {
            bus.once(listener.eventClass, handler, instance);
        } else {
            bus.on(listener.eventClass, handler, instance);
        }
    }
}

/**
 * Unregister all event listeners for an instance
 */
export function unregisterEventListeners(
    instance: any,
    eventBus?: IEventBus
): void {
    const bus = eventBus || getEventBus();
    bus.cleanupContext(instance);
}