// src/core/component/Component.ts
import Actor from "../Actor.ts";
import { generateUUID } from "../../utils/uuid.ts";
import { emit } from "../events/Event.ts";
import {
    registerEventListeners,
    unregisterEventListeners,
} from "../events/Decorators.ts";
import { ComponentAddedEvent, ComponentRemovedEvent, ComponentInitializedEvent } from "../events/CoreEvents.ts";
import {COMPONENT_DEPENDENCIES_KEY, ComponentDependencyMetadata} from "./Decorators.ts";

export type ComponentClass<T extends Component = Component> = new (actor: Actor, ...args: any[]) => T;

export type ComponentConstructorParameters<
    T extends new (actor: Actor, ...args: any[]) => any
> = T extends new (actor: Actor, ...args: infer P) => any ? P : never;

// ==================== Component Base Class ====================

export default abstract class Component {
    public readonly id: string;
    readonly #actor: Actor;

    #dependencies = new Map<ComponentClass, Component | undefined>();
    #dependencyMetadata: ComponentDependencyMetadata[] = [];
    #initialized = false;
    #initializing = false; // For circular dependency detection

    constructor(actor: Actor) {
        if (!actor || !(actor instanceof Actor)) {
            throw new Error("Component constructor: Valid Actor instance is required.");
        }
        this.#actor = actor;
        this.id = generateUUID();

        // Set up dependency injection from decorators
        this.setupDependencyInjection();
    }

    public get actor(): Actor {
        return this.#actor;
    }

    /**
     * Set up dependency injection from decorators
     */
    private setupDependencyInjection(): void {
        // Get metadata through the standard reflection approach
        this.#dependencyMetadata =
            Reflect.getOwnMetadata(COMPONENT_DEPENDENCIES_KEY, Object.getPrototypeOf(this)) || [];

        // Also check for directly stored metadata on the constructor
        const constructor = this.constructor as any;
        if (constructor._componentDependencies) {
            this.#dependencyMetadata = [
                ...this.#dependencyMetadata,
                ...constructor._componentDependencies
            ];

            console.log(`[DEBUG] Found ${constructor._componentDependencies.length} direct dependencies on ${constructor.name}`);
        }

        // If we still have no dependencies, try to scan up the prototype chain
        if (this.#dependencyMetadata.length === 0) {
            let proto = Object.getPrototypeOf(this);
            while (proto && proto !== Object.prototype) {
                const metadataOnProto = Reflect.getOwnMetadata(COMPONENT_DEPENDENCIES_KEY, proto);
                if (metadataOnProto) {
                    this.#dependencyMetadata = [...this.#dependencyMetadata, ...metadataOnProto];
                    console.log(`[DEBUG] Found ${metadataOnProto.length} dependencies on prototype chain for ${this.constructor.name}`);
                    break;
                }
                proto = Object.getPrototypeOf(proto);
            }
        }

        for (const dep of this.#dependencyMetadata) {
            // Register dependency
            this.#dependencies.set(dep.componentClass, undefined);

            // Set up getter on the property for direct access
            Object.defineProperty(this, dep.propertyKey, {
                get: () => {
                    const instance = this.#dependencies.get(dep.componentClass);

                    if (!instance && !dep.optional) {
                        throw new Error(
                            `Required dependency ${dep.componentClass.name} not available in ${this.constructor.name}. ` +
                            `Make sure the component is added to the actor first.`
                        );
                    }

                    return instance;
                },
                enumerable: true,
                configurable: true
            });
        }
    }

    /**
     * Check and resolve dependencies with circular dependency detection
     */
    public checkAndResolveDependencies(): boolean {
        if (this.#initialized) {
            return true;
        }

        if (this.#initializing) {
            // Circular dependency detected
            console.warn(
                `Circular dependency detected in ${this.constructor.name}. ` +
                `Component is trying to initialize while already initializing.`
            );
            return false;
        }

        this.#initializing = true;

        try {
            // Check all dependencies
            let allResolved = true;

            for (const dep of this.#dependencyMetadata) {
                const existing = this.#dependencies.get(dep.componentClass);
                if (existing) continue;

                const component = this.actor.getComponent(dep.componentClass);

                if (component) {
                    // Ensure the dependency is initialized first
                    if (!component.isInitialized) {
                        const depResolved = component.checkAndResolveDependencies();
                        if (!depResolved && !dep.optional) {
                            allResolved = false;
                            break;
                        }
                    }

                    this.#dependencies.set(dep.componentClass, component);
                } else if (!dep.optional) {
                    allResolved = false;
                    break;
                }
            }

            if (allResolved) {
                this.#initialized = true;

                // Register event listeners
                this.registerComponentEventListeners();

                // Call lifecycle hooks
                this.onDependenciesResolved();

                // Emit events
                emit(new ComponentInitializedEvent({
                    actor: this.actor,
                    component: this
                }));

                emit(new ComponentAddedEvent({
                    actor: this.actor,
                    component: this,
                    componentType: this.constructor.name
                }));

                // Legacy initialize support
                if (typeof (this as any).initialize === 'function') {
                    try {
                        (this as any).initialize();
                    } catch (e) {
                        console.error(
                            `Error during initialize() of component ${this.constructor.name} (ID: ${this.id}):`,
                            e
                        );
                    }
                }
            }

            return allResolved;
        } finally {
            this.#initializing = false;
        }
    }

    /**
     * Register event listeners from @OnEvent decorators
     */
    private registerComponentEventListeners(): void {
        try {
            const scene = (this.actor as any).scene;
            const eventBus = scene?.eventBus;

            if (eventBus) {
                registerEventListeners(this, eventBus);
            } else {
                registerEventListeners(this);
            }
        } catch (error) {
            console.warn(
                `Could not register event listeners for ${this.constructor.name}: ` +
                `No event bus available`
            );
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
     * Check if component has been initialized
     */
    public get isInitialized(): boolean {
        return this.#initialized;
    }

    /**
     * Get dependency resolution details for debugging
     */
    public getDependencyInfo(): {
        dependencies: Array<{
            name: string;
            required: boolean;
            resolved: boolean;
        }>;
        initialized: boolean;
        hasCircularDependency: boolean;
    } {
        const dependencies = this.#dependencyMetadata.map(dep => ({
            name: dep.componentClass.name,
            required: !dep.optional,
            resolved: this.#dependencies.get(dep.componentClass) !== undefined
        }));

        return {
            dependencies,
            initialized: this.#initialized,
            hasCircularDependency: this.#initializing
        };
    }

    /**
     * Dispose component and clean up
     */
    public dispose(): void {
        // Emit removal event
        emit(new ComponentRemovedEvent({
            actor: this.actor,
            component: this,
            componentType: this.constructor.name
        }));

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
            // Silent fail
        }

        // Clear dependencies
        this.#dependencies.clear();
        this.#initialized = false;
    }
}