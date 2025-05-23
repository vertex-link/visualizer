// Defines the expected constructor signature for Component classes.
// It must accept an Actor instance as its first argument.
import Actor from "./Actor.ts";
import {generateUUID} from "../utils/uuid.ts";

export type ComponentClass<T extends Component = Component> = new (actor: Actor, ...args: any[]) => T;

export default abstract class Component {
    public readonly id: string; // Unique ID for this component instance
    readonly #actor: Actor; // Reference to the parent Actor

    // Properties for dependency management (if you keep this system)
    #dependencies = new Map<ComponentClass<any>, Component | undefined>(); // Using ComponentClass<any>
    #initialized = false; // If you use an initialization phase

    constructor(actor: Actor) {
        if (!actor || !(actor instanceof Actor)) {
            throw new Error("Component constructor: Valid Actor instance is required.");
        }
        this.#actor = actor;
        this.id = generateUUID(); // Assign a unique ID to the component instance
        // console.debug(`Component '${this.constructor.name}' (ID: ${this.id}) created for Actor '${actor.label}'.`);
        // Registration of decorated methods is now handled by Actor.addComponent
    }

    /**
     * Provides access to the parent Actor instance.
     */
    public get actor(): Actor {
        return this.#actor;
    }

    // --- Optional: Dependency Management System (if you use it) ---
    /**
     * Declares a dependency on another Component type.
     * Call this in the constructor of derived components.
     * @param componentClass The class of the Component being depended upon.
     */
    protected addDependency(componentClass: ComponentClass<any>): void {
        if (this.#initialized) {
            console.warn(`Component '${this.constructor.name}': Cannot add dependency after initialization.`);
            return;
        }
        this.#dependencies.set(componentClass, undefined);
    }

    /**
     * Called by the Actor to attempt to resolve dependencies and initialize the component.
     * This is part of an optional, more complex initialization flow.
     */
    public checkAndResolveDependencies(): boolean {
        // console.groupCollapsed(`Component '${this.constructor.name}' (ID: ${this.id}): Checking dependencies.`);
        if (this.#initialized) {
            // console.debug("Already initialized.");
            console.groupEnd();
            return true;
        }

        let allResolved = true;
        if (this.#dependencies.size > 0) {
            for (const [requiredClass, resolvedInstance] of this.#dependencies) {
                if (resolvedInstance) continue; // Already resolved this one

                if (this.actor.hasComponent(requiredClass)) {
                    this.#dependencies.set(requiredClass, this.actor.getComponent(requiredClass));
                    // console.debug(`Dependency '${requiredClass.name}' resolved.`);
                } else {
                    // console.warn(`Dependency '${requiredClass.name}' NOT YET RESOLVED.`);
                    allResolved = false;
                    break;
                }
            }
        } else {
            // console.debug("No declared dependencies.");
        }

        if (allResolved) {
            this.#initialized = true;
            // console.debug("All dependencies resolved. Initializing component.");
            if (typeof (this as any).initialize === 'function') {
                try {
                    (this as any).initialize(); // Call initialize if it exists
                    // console.debug("initialize() method called.");
                } catch (e) {
                    console.error(`Error during initialize() of component ${this.constructor.name} (ID: ${this.id}):`, e)
                }
            } else {
                // console.debug("No custom initialize() method found.");
            }
        }
        console.groupEnd();
        return this.#initialized;
    }

    /**
     * Retrieves a resolved dependency. Throws an error if the dependency
     * is not declared or not yet resolved.
     * @param componentClass The class of the Component dependency to retrieve.
     */
    protected getDependency<T extends Component>(componentClass: ComponentClass<T>): T {
        if (!this.#dependencies.has(componentClass)) {
            throw new Error(`Component '${this.constructor.name}': Dependency on '${componentClass.name}' was not declared.`);
        }
        const instance = this.#dependencies.get(componentClass) as T | undefined;
        if (!instance || !this.#initialized) {
            throw new Error(`Component '${this.constructor.name}': Dependency on '${componentClass.name}' is not yet resolved or component not initialized.`);
        }
        return instance;
    }

    /**
     * Optional: A method that can be called by the Actor when the component is removed.
     * Useful for cleaning up resources specific to this component.
     */
    public dispose?(): void;

    /**
     * Optional: A method that can be called after all dependencies are resolved.
     * Useful for one-time setup that relies on other components.
     */
    public initialize?(): void;
}