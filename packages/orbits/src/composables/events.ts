import type { Event, EventClass, EventHandler, IEventBus } from "../events/Event";
import { useContext } from "./context";

/**
 * Subscribes a handler to an event class within the current context.
 * Returns a disposer function to unsubscribe.
 * @param eventClass The class of the event to listen for.
 * @param handler The function to execute when the event is emitted.
 * @param context The `this` context for the handler, typically the component instance.
 * @returns A function that, when called, unsubscribes the handler.
 */
export function useOnEvent<T extends Event>(
  eventClass: EventClass<T>,
  handler: EventHandler<T>,
  context: any,
): () => void {
  const c = useContext();
  const bus = c.eventBus;
  bus.on(eventClass, handler, context);
  return () => bus.off(eventClass, handler);
}

/**
 * Subscribes a handler to a single occurrence of an event class within the current context.
 * Returns a disposer function to unsubscribe.
 * @param eventClass The class of the event to listen for.
 * @param handler The function to execute when the event is emitted.
 * @param context The `this` context for the handler, typically the component instance.
 * @returns A function that, when called, unsubscribes the handler.
 */
export function useOnceEvent<T extends Event>(
  eventClass: EventClass<T>,
  handler: EventHandler<T>,
  context: any,
): () => void {
  const c = useContext();
  const bus = c.eventBus;
  bus.once(eventClass, handler, context);
  return () => bus.off(eventClass, handler);
}
