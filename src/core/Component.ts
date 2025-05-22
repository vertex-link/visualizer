import Actor from "./Actor.ts";

export type ComponentClass<T = Component> = new (...args: any[]) => T;

export default abstract class Component {
    #actor: Actor;
    #dependencies = new Map<ComponentClass, Component | undefined>();
    #initialized = false;
    
    constructor(actor: Actor) {
        this.#actor = actor;
    }
    
    addDependency(componentClass: ComponentClass) {
        this.#dependencies.set(componentClass, undefined);
    }

    private async initialize() {
        console.group(`Initializing ${this.constructor.name} Component`);
        console.log(`All Dependencies resolved. Initializing: ${this.constructor.name}`);
        this.#initialized = true;
        console.groupEnd();
    }

    checkAndResolveDependencies() {
        console.group("Checking Dependencies for Component");

        if (this.#initialized) {
            console.groupEnd();
            return true;
        }

        const areAllDependenciesResolved = this.resolveDependencies();
        console.groupEnd();

        if (areAllDependenciesResolved) {
            this.initialize();
        }

        return areAllDependenciesResolved;
    }

    private resolveDependencies(): boolean {
        console.log("Resolving dependencies");

        for (const [requiredDependency] of this.#dependencies) {
            const isAvailable = this.actor.isComponentAvail(requiredDependency);

            if (!isAvailable) {
                console.warn(
                    `Not all dependencies met for: ${this.constructor.name}`,
                    `Requires: ${requiredDependency.name}`
                );
                return false;
            }

            console.log(
                `Dependency met: ${this.constructor.name}`,
                `Requires: ${requiredDependency.name}`
            );

            this.#dependencies.set(
                requiredDependency,
                this.actor.getComponent(requiredDependency)
            );
        }

        console.log("Successfully resolved all dependencies");
        return true;
    }

    get actor() {
        if (!this.#actor) throw new Error("Actor not set");
        return this.#actor;
    }
}