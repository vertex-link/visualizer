
/**
 * Query target interface for event emission
 */
export interface QueryTarget {
    execute(provider: any): any[];
}

/**
 * Emit events to query results
 */
export function emitToQuery<T extends Event>(
    eventBus: IEventBus,
    query: QueryTarget,
    dataProvider: any,
    event: T
): void {
    const targets = query.execute(dataProvider);

    targets.forEach(target => {
        // Create a targeted event for each target
        event.target = target;

        eventBus.emit(event);
    });
}