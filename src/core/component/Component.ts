
import Actor from "./../Actor.ts";
import { generateUUID } from "./../../utils/uuid.ts";
import { emit } from "../events/EventBus.ts";
import {registerEventListeners, unregisterEventListeners} from "../events/Decorators.ts";
import {ComponentAddedEvent, ComponentRemovedEvent} from "../events/CoreEvents.ts";

// Existing ComponentClass type
export type ComponentClass<T extends Component = Component> = new (actor: Actor, ...args: any[]) => T;

/**
 * Utility type to extract the constructor parameters of a ComponentClass,
 * excluding the first 'actor' argument.
 */
export type ComponentConstructorParameters<
    T extends new (actor: Actor, ...args: any[]) => any
> = T extends new (actor: Actor, ...args: infer P) => any ? P : never;

// ==================== Dependency Injection System ====================

// Metadata key for dependency injection
const COMPONENT_DEPENDENCIES_KEY = Symbol('componentDependencies');

interface ComponentDependencyMetadata {
    componentClass: ComponentClass;
    propertyKey: string | symbol;
}

/**
 * Decorator for component dependencies - throws if not present
 * Usage: @AddComponent(HealthComponent) private health!: HealthComponent;
 */
export function AddComponent<T extends Component>(componentClass: ComponentClass<T>) {
    return function (target: any, propertyKey: string | symbol) {
        const dependencies: ComponentDependencyMetadata[] = Reflect.getOwnMetadata(COMPONENT_DEPENDENCIES_KEY, target) || [];
        dependencies.push({
            componentClass,
            propertyKey
        });
        Reflect.defineMetadata(COMPONENT_DEPENDENCIES_KEY, dependencies, target);
    };
}

export default abstract class Component {
    public readonly id: string;
    readonly #actor: Actor;

    #dependencies = new Map<ComponentClass<any>, Component | undefined>();
    #initialized = false;

    constructor(actor: Actor) {
        if (!actor || !(actor instanceof Actor)) {
            throw new Error("Component constructor: Valid Actor instance is required.");
        }
        this.#actor = actor;
        this.id = generateUUID();

        // Set up dependency injection from decorators
        this.setupDependencyInjection();

        // console.debug(`Component '${this.constructor.name}' (ID: ${this.id}) created for Actor '${actor.label}'.`);
    }

    public get actor(): Actor {
        return this.#actor;
    }

    /**
     * Set up dependency injection from @AddComponent decorators
     */
    private setupDependencyInjection(): void {
        const dependencies: ComponentDependencyMetadata[] = Reflect.getOwnMetadata(COMPONENT_DEPENDENCIES_KEY, Object.getPrototypeOf(this)) || [];

        for (const dep of dependencies) {
            // Register dependency in the existing system
            this.#dependencies.set(dep.componentClass, undefined);

            // Set up getter on the property for direct access
            Object.defineProperty(this, dep.propertyKey, {
                get: () => {
                    const instance = this.#dependencies.get(dep.componentClass);
                    if (!instance) {
                        throw new Error(`Required dependency ${dep.componentClass.name} not available in ${this.constructor.name}. Make sure the component is added to the actor first.`);
                    }
                    return instance;
                },
                enumerable: true,
                configurable: true
            });
        }
    }
    
    public checkAndResolveDependencies(): boolean {
        if (this.#initialized) {
            return true;
        }

        let allResolved = true;
        if (this.#dependencies.size > 0) {
            for (const [requiredClass, resolvedInstance] of this.#dependencies) {
                if (resolvedInstance) continue;

                if (this.actor.hasComponent(requiredClass)) {
                    this.#dependencies.set(requiredClass, this.actor.getComponent(requiredClass));
                } else {
                    allResolved = false;
                    break;
                }
            }
        }

        if (allResolved) {
            this.#initialized = true;

            // Register event listeners from decorators
            this.registerComponentEventListeners();

            // Call the lifecycle hooks
            this.onDependenciesResolved();

            // Emit component added event
            emit(new ComponentAddedEvent(this.actor, this, this.constructor.name));

            // Then call initialize for backwards compatibility
            if (typeof (this as any).initialize === 'function') {
                try {
                    (this as any).initialize();
                } catch (e) {
                    console.error(`Error during initialize() of component ${this.constructor.name} (ID: ${this.id}):`, e);
                }
            }
        }
        return this.#initialized;
    }

    /**
     * Register event listeners from @OnEvent decorators
     */
    private registerComponentEventListeners(): void {
        try {
            // Try to get the scene's event bus from the actor
            const scene = (this.actor as any).scene;
            const eventBus = scene?.eventBus;

            if (eventBus) {
                // Use the scene's event bus if available
                registerEventListeners(this, eventBus);
            } else {
                // Fall back to default event bus
                registerEventListeners(this);
            }
        } catch (error) {
            // If no default event bus is set up, just log a warning
            console.warn(`Could not register event listeners for ${this.constructor.name}: No event bus available`);
        }
    }

    /**
     * Called when all dependencies are resolved and component is ready
     * Override this in your components for setup that requires dependencies
     */
    protected onDependenciesResolved(): void {
        // Override in subclasses
    }

    /**
     * Check if component has been initialized (all dependencies resolved)
     */
    public get isInitialized(): boolean {
        return this.#initialized;
    }

    /**
     * Dispose component and clean up event listeners
     */
    public dispose(): void {
        // Emit component removed event
        emit(new ComponentRemovedEvent(this.actor, this, this.constructor.name));

        // Unregister event listeners
        try {
            const scene = (this.actor as any).scene;
            const eventBus = scene?.eventBus;

            if (eventBus) {
                unregisterEventListeners(this, eventBus);
            } else {
                unregisterEventListeners(this);
            }
        } catch (error) {
            // If no event bus available, just continue
        }
    }
}