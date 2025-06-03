import { Event, EventClass, IEventBus, getEventBus } from './Event.ts';

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
    return function (
        originalMethod: any,
        context: ClassMethodDecoratorContext
    ) {
        const { kind, name: propertyKey } = context;

        if (kind !== "method") {
            throw new Error(`@OnEvent decorator can only be applied to methods. Attempted to apply to ${String(propertyKey)} of kind ${kind}.`);
        }

        context.addInitializer(function () {
            // 'this' refers to the instance of the class
            const instance = this;
            const targetPrototype = Object.getPrototypeOf(instance);

            // Get or initialize metadata array
            const listeners: EventListenerMetadata[] = 
                Reflect.getOwnMetadata(EVENT_LISTENERS_KEY, targetPrototype) || [];

            // Add this listener to the metadata
            listeners.push({
                eventClass,
                methodName: propertyKey,
                once
            });

            // Store updated metadata
            Reflect.defineMetadata(EVENT_LISTENERS_KEY, listeners, targetPrototype);

            // Register this event listener immediately for this instance
            const bus = getEventBus();
            
            const handler = (event: Event) => {
                console.log(`[EVENT_HANDLER_ENTRY] @OnEvent(${event.constructor.name}) triggered for ${instance.constructor.name}.${String(propertyKey)}`);
                (instance as any)[propertyKey](event);
            };

            if (once) {
                bus.once(eventClass, handler, instance);
            } else {
                bus.on(eventClass, handler, instance);
            }
            
            console.log(`[EVENT_SYSTEM] Registered ${eventClass.eventType} -> ${String(propertyKey)} for instance of ${instance.constructor.name}`);
        });
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
 * Note: With Stage 3 decorators, registration happens automatically during
 * instance initialization via addInitializer, but this function is kept
 * for compatibility with code that explicitly calls it
 */
export function registerEventListeners(
    instance: any,
    eventBus?: IEventBus
): void {
    const bus = eventBus || getEventBus();
    
    // For backward compatibility, check if there are any legacy decorators
    // and register them manually
    let currentProto = Object.getPrototypeOf(instance);
    const allListeners: EventListenerMetadata[] = [];
    
    while (currentProto && currentProto !== Object.prototype) {
        const listeners: EventListenerMetadata[] = 
            Reflect.getMetadata(EVENT_LISTENERS_KEY, currentProto) || [];
        
        allListeners.push(...listeners);
        currentProto = Object.getPrototypeOf(currentProto);
    }

    console.log(`[EVENT_SYSTEM] Registering ${allListeners.length} listeners from metadata for ${instance.constructor.name}`);
    
    for (const listener of allListeners) {
        console.log(`[EVENT_SYSTEM] Registering ${listener.eventClass.eventType} -> ${String(listener.methodName)}`);
        
        const handler = (event: Event) => {
            console.log(`[EVENT_HANDLER_ENTRY] @OnEvent(${event.constructor.name}) triggered for ${instance.constructor.name}.${String(listener.methodName)}`);
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