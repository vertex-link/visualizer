
/**
 * Base class for core framework events
 */
export abstract class CoreEvent extends Event {
    // Core framework events have a core prefix
}

/**
 * Entity created event
 */
export class EntityCreatedEvent extends CoreEvent {
    constructor(
        public readonly entity: any,
        public readonly container?: any
    ) {
        super(entity);
    }
}

/**
 * Entity destroyed event
 */
export class EntityDestroyedEvent extends CoreEvent {
    constructor(
        public readonly entity: any,
        public readonly container?: any
    ) {
        super(entity);
    }
}

/**
 * Component added event
 */
export class ComponentAddedEvent extends CoreEvent {
    constructor(
        public readonly entity: any,
        public readonly component: any,
        public readonly componentType: string
    ) {
        super(component);
    }
}

/**
 * Component removed event
 */
export class ComponentRemovedEvent extends CoreEvent {
    constructor(
        public readonly entity: any,
        public readonly component: any,
        public readonly componentType: string
    ) {
        super(component);
    }
}