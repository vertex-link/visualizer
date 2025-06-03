import Actor from '../Actor.ts';
import { ComponentClass } from '../component/Component.ts';
import { ComponentTypeRegistry } from '../component/ComponentRegistry.ts';
import { QueryBuilder } from './QueryBuilder.ts';
import { IQueryDataProvider } from './QueryCondition.ts';
import {
    IEventBus,
    EventBus, getEventBus,
} from '../events/EventBus.ts';
import {EntityCreatedEvent, EntityDestroyedEvent} from "../events/CoreEvents";
import {emitToQuery} from "../events/EmitToQuery";

/**
 * Core Scene class - manages actors and provides efficient queries
 * Can optionally share an event bus with other scenes
 */
export class Scene implements IQueryDataProvider {
    public readonly name: string;
    public readonly eventBus: IEventBus;

    // Core storage
    private actors: Set<Actor> = new Set();

    // Indices for efficient queries
    private tagIndex = new Map<string, Set<Actor>>();
    private componentIndex = new Map<number, Set<Actor>>();

    /**
     * Create a scene with optional shared event bus
     * @param name Scene name
     * @param eventBus Optional shared event bus. If not provided, creates its own.
     */
    constructor(name: string = 'Scene', eventBus: IEventBus = getEventBus()) {
        this.name = name;
        this.eventBus = eventBus;
    }

    // ==================== Actor Management ====================

    /**
     * Add an actor to the scene
     */
    addActor(actor: Actor): void {
        if (this.actors.has(actor)) return;

        this.actors.add(actor);
        this.indexActor(actor);

        // Emit core framework event
        this.eventBus.emit(new EntityCreatedEvent(actor, this));
    }

    /**
     * Remove an actor from the scene
     */
    removeActor(actor: Actor): boolean {
        if (!this.actors.has(actor)) return false;

        this.actors.delete(actor);
        this.deindexActor(actor);

        // Emit core framework event
        this.eventBus.emit(new EntityDestroyedEvent(actor, this));

        return true;
    }

    /**
     * Get actor by ID
     */
    getActor(id: string): Actor | undefined {
        for (const actor of this.actors) {
            if (actor.id === id) return actor;
        }
        return undefined;
    }

    /**
     * Get actors by label
     */
    getActorsByLabel(label: string): Actor[] {
        return Array.from(this.actors).filter(actor => actor.label === label);
    }

    /**
     * Get total actor count
     */
    getActorCount(): number {
        return this.actors.size;
    }

    // ==================== Query System ====================

    /**
     * Create a new query builder connected to this scene's event bus
     */
    query<T extends Actor = Actor>(): SceneQueryBuilder<T> {
        return new SceneQueryBuilder<T>(this, this.eventBus);
    }

    // ==================== Event Integration ====================

    /**
     * Emit event to actors matching the query
     */
    emitToQuery<E extends Event>(queryBuilder: QueryBuilder, event: E): void {
        emitToQuery(this.eventBus, queryBuilder, this, event);
    }

    /**
     * Emit an event using this scene's event bus
     */
    emit<E extends Event>(event: E): void {
        // Add scene context to the event
        (event as any).sourceScene = this;
        this.eventBus.emit(event);
    }

    // ==================== IQueryDataProvider Implementation ====================

    getAllActors(): Set<Actor> {
        return new Set(this.actors);
    }

    getActorsWithAnyTag(tags: string[]): Set<Actor> {
        const result = new Set<Actor>();
        for (const tag of tags) {
            const taggedActors = this.tagIndex.get(tag);
            if (taggedActors) {
                taggedActors.forEach(actor => result.add(actor));
            }
        }
        return result;
    }

    getActorsWithAllComponents(components: ComponentClass[]): Set<Actor> {
        if (components.length === 0) return new Set();

        // Start with actors that have the first component
        const firstId = ComponentTypeRegistry.getId(components[0]);
        let result = this.componentIndex.get(firstId);
        if (!result) return new Set();

        result = new Set(result); // Copy to avoid modifying original

        // Intersect with each additional component
        for (let i = 1; i < components.length; i++) {
            const componentId = ComponentTypeRegistry.getId(components[i]);
            const componentActors = this.componentIndex.get(componentId);

            if (!componentActors) return new Set();

            // Keep only actors in both sets
            for (const actor of result) {
                if (!componentActors.has(actor)) {
                    result.delete(actor);
                }
            }

            if (result.size === 0) return new Set();
        }

        return result;
    }

    getActorsWithoutTags(tags: string[]): Set<Actor> {
        const actorsWithTags = this.getActorsWithAnyTag(tags);
        const result = new Set<Actor>();

        for (const actor of this.actors) {
            if (!actorsWithTags.has(actor)) {
                result.add(actor);
            }
        }

        return result;
    }

    // ==================== Indexing ====================

    /**
     * Add actor to indices
     */
    private indexActor(actor: Actor): void {
        // Index by components
        const components = actor.getAllComponents();
        for (const component of components) {
            const componentId = ComponentTypeRegistry.getId(component.constructor as ComponentClass);
            this.addToComponentIndex(componentId, actor);
        }

        // TODO: Index by tags when tag system is implemented on Actor
    }

    /**
     * Remove actor from indices
     */
    private deindexActor(actor: Actor): void {
        // Remove from component indices
        for (const [componentId, actorSet] of this.componentIndex) {
            actorSet.delete(actor);
            if (actorSet.size === 0) {
                this.componentIndex.delete(componentId);
            }
        }

        // Remove from tag indices
        for (const [tag, actorSet] of this.tagIndex) {
            actorSet.delete(actor);
            if (actorSet.size === 0) {
                this.tagIndex.delete(tag);
            }
        }
    }

    /**
     * Add actor to component index
     */
    private addToComponentIndex(componentId: number, actor: Actor): void {
        let actorSet = this.componentIndex.get(componentId);
        if (!actorSet) {
            actorSet = new Set();
            this.componentIndex.set(componentId, actorSet);
        }
        actorSet.add(actor);
    }

    /**
     * Update indices when actor changes (call manually when needed)
     */
    updateActorIndices(actor: Actor): void {
        if (!this.actors.has(actor)) return;

        this.deindexActor(actor);
        this.indexActor(actor);
    }

    // ==================== Cleanup ====================

    /**
     * Clear all actors
     */
    clear(): void {
        // Emit destroyed events for all actors
        this.actors.forEach(actor => {
            this.eventBus.emit(new EntityDestroyedEvent(actor, this));
        });

        this.actors.clear();
        this.tagIndex.clear();
        this.componentIndex.clear();
    }

    /**
     * Dispose scene
     */
    dispose(): void {
        this.clear();
        // Note: Don't clear the event bus as it might be shared
    }
}

// ==================== Enhanced Query Builder ====================

/**
 * Query builder that's connected to a scene's event bus for emit functionality
 */
export class SceneQueryBuilder<T extends Actor = Actor> extends QueryBuilder<T> {
    constructor(
        private scene: Scene,
        private eventBus: IEventBus
    ) {
        super();
    }

    /**
     * Emit event to all actors matching this query
     */
    emit<E extends Event>(event: E): void {
        emitToQuery(this.eventBus, this, this.scene, event);
    }

    /**
     * Execute the query (override to use our scene)
     */
    execute(): T[] {
        return super.execute(this.scene);
    }
}
