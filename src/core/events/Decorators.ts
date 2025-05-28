
// ==================== Decorator Support ====================

import {EventClass, getEventBus, IEventBus} from "./EventBus.ts";

const EVENT_LISTENERS_KEY = Symbol('eventListeners');

interface EventListenerMetadata {
    eventClass: EventClass<Event>;
    methodName: string | symbol;
    once?: boolean;
}

/**
 * Decorator for listening to events
 */
export function OnEvent<T extends Event>(
    eventClass: EventClass<T>,
    once: boolean = false
) {
    return function (target: any, propertyKey: string | symbol) {
        const listeners: EventListenerMetadata[] = Reflect.getOwnMetadata(EVENT_LISTENERS_KEY, target) || [];
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

/**
 * Register event listeners from decorators
 */
export function registerEventListeners(instance: any, eventBus?: IEventBus): void {
    const bus = eventBus || getEventBus();
    const listeners: EventListenerMetadata[] = Reflect.getOwnMetadata(EVENT_LISTENERS_KEY, Object.getPrototypeOf(instance)) || [];

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
 * Unregister event listeners for an instance
 */
export function unregisterEventListeners(instance: any, eventBus?: IEventBus): void {
    const bus = eventBus || defaultEventBus;
    if (!bus) return;
    bus.cleanupContext(instance);
}
