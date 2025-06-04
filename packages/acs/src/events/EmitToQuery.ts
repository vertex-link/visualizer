import { QueryBuilder } from '../scene/QueryBuilder';
import { IQueryDataProvider } from '../scene/QueryCondition';
import { IEventBus } from './EventBus.js';

/**
 * Emit event to all actors matching a query
 * Each actor receives the event with itself as the target
 */
export function emitToQuery<T extends Event>(
  eventBus: IEventBus,
  query: QueryBuilder,
  dataProvider: IQueryDataProvider,
  event: T
): void {
  const targets = query.execute(dataProvider);

  // Emit individual events for each target
  targets.forEach(target => {
    // Clone the event to avoid mutation issues
    const targetedEvent = Object.create(
      Object.getPrototypeOf(event),
      Object.getOwnPropertyDescriptors(event)
    );
    targetedEvent.target = target;

    eventBus.emit(targetedEvent);
  });
}
