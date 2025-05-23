// src/core/Component.ts
import Actor from "./Actor.ts";
import { generateUUID } from "../utils/uuid.ts"; //

// Existing ComponentClass type
export type ComponentClass<T extends Component = Component> = new (actor: Actor, ...args: any[]) => T; //

/**
 * Utility type to extract the constructor parameters of a ComponentClass,
 * excluding the first 'actor' argument.
 *
 * @template T - A Component constructor type.
 * @returns A tuple representing the types of the arguments after 'actor'.
 */
export type ComponentConstructorParameters<
    T extends new (actor: Actor, ...args: any[]) => any
> = T extends new (actor: Actor, ...args: infer P) => any ? P : never;

export default abstract class Component {
    public readonly id: string; //
    readonly #actor: Actor; //

    #dependencies = new Map<ComponentClass<any>, Component | undefined>(); //
    #initialized = false; //

    constructor(actor: Actor) {
        if (!actor || !(actor instanceof Actor)) { //
            throw new Error("Component constructor: Valid Actor instance is required."); //
        }
        this.#actor = actor; //
        this.id = generateUUID(); // Assign a unique ID to the component instance
        // console.debug(`Component '${this.constructor.name}' (ID: ${this.id}) created for Actor '${actor.label}'.`);
    }

    public get actor(): Actor { //
        return this.#actor; //
    }

    protected addDependency(componentClass: ComponentClass<any>): void { //
        if (this.#initialized) { //
            console.warn(`Component '${this.constructor.name}': Cannot add dependency after initialization.`); //
            return; //
        }
        this.#dependencies.set(componentClass, undefined); //
    }

    public checkAndResolveDependencies(): boolean { //
        if (this.#initialized) { //
            return true; //
        }

        let allResolved = true; //
        if (this.#dependencies.size > 0) { //
            for (const [requiredClass, resolvedInstance] of this.#dependencies) { //
                if (resolvedInstance) continue; //

                if (this.actor.hasComponent(requiredClass)) { //
                    this.#dependencies.set(requiredClass, this.actor.getComponent(requiredClass)); //
                } else {
                    allResolved = false; //
                    break; //
                }
            }
        }

        if (allResolved) { //
            this.#initialized = true; //
            if (typeof (this as any).initialize === 'function') { //
                try {
                    (this as any).initialize(); //
                } catch (e) {
                    console.error(`Error during initialize() of component ${this.constructor.name} (ID: ${this.id}):`, e) //
                }
            }
        }
        return this.#initialized; //
    }

    protected getDependency<T extends Component>(componentClass: ComponentClass<T>): T { //
        if (!this.#dependencies.has(componentClass)) { //
            throw new Error(`Component '${this.constructor.name}': Dependency on '${componentClass.name}' was not declared.`); //
        }
        const instance = this.#dependencies.get(componentClass) as T | undefined; //
        if (!instance || !this.#initialized) { //
            throw new Error(`Component '${this.constructor.name}': Dependency on '${componentClass.name}' is not yet resolved or component not initialized.`); //
        }
        return instance; //
    }

    public dispose?(): void; //
    public initialize?(): void; //
}