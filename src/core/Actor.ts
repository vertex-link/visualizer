// src/core/Actor.ts
import Component, {ComponentClass, ComponentConstructorParameters} from "./Component.ts";
import System from "./System.ts"; // Assuming System.actors is still relevant
import { HOOKED_METHODS_METADATA_KEY, HookedMethodMetadata } from './processor/Decorators.ts';
import { ProcessorRegistry } from './processor/ProcessorRegistry.ts';
import { IProcessable } from './processor/Processor.ts';
import { generateUUID } from "../utils/uuid.ts";

export default class Actor {
    public readonly label: string;
    public readonly id: string; // Unique ID for the actor instance
    private _components: Map<string, Component> = new Map<string, Component>();

    constructor(label: string) {
        this.label = label;
        this.id = generateUUID(); // Assign a unique ID upon creation

        // Register decorated methods defined directly on this Actor class (or its parent Actor classes)
        this._registerDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));

        System.actors.push(this); // If you still use System.actors for global tracking
        // console.debug(`Actor '${this.label}' (ID: ${this.id}) created.`);
        return this;
    }

    /**
     * Registers methods decorated with @Update (or specific variants like @RenderUpdate)
     * for a given instance (Actor or Component) with the appropriate Processor.
     * @param instance The Actor or Component instance.
     * @param instanceId The unique ID of the instance.
     * @param prototype The prototype of the instance's class (to get metadata from).
     * @param idPrefix A prefix for the processable ID, useful for components to ensure uniqueness.
     */
    private _registerDecoratedMethodsForInstance(instance: any, instanceId: string, prototype: any, idPrefix: string = ''): void {
        if (!prototype) return; // Reached the end of the prototype chain

        const hookedMethods: HookedMethodMetadata[] = Reflect.getOwnMetadata(HOOKED_METHODS_METADATA_KEY, prototype) || [];

        for (const hook of hookedMethods) {
            const processor = ProcessorRegistry.get(hook.processorName);
            if (processor) {
                const method = instance[hook.propertyKey]; // Get the method from the instance
                if (typeof method === 'function') {
                    // Create a unique ID for this specific method on this specific instance
                    const processableId = `${idPrefix}${instanceId}:${String(hook.propertyKey)}`;
                    const processable: IProcessable = {
                        id: processableId,
                        update: method.bind(instance), // IMPORTANT: Bind 'this' to the instance
                        context: instance, // Explicitly pass context, though .bind() often suffices
                    };
                    processor.addTask(processable);
                    // console.debug(`Registered method '${String(hook.propertyKey)}' of '${instance.constructor.name}' (ID: ${instanceId}) with processor '${hook.processorName}'. Processable ID: ${processableId}`);
                } else {
                    console.warn(`Actor/Component (ID: ${instanceId}): Decorated property '${String(hook.propertyKey)}' on prototype '${prototype.constructor.name}' is not a function.`);
                }
            } else {
                console.warn(`Actor/Component (ID: ${instanceId}): Processor '${hook.processorName}' not found for method '${String(hook.propertyKey)}' on prototype '${prototype.constructor.name}'.`);
            }
        }
        // Recursively check parent prototypes for inherited decorated methods
        this._registerDecoratedMethodsForInstance(instance, instanceId, Object.getPrototypeOf(prototype), idPrefix);
    }

    /**
     * Unregisters methods for a given instance from their respective Processors.
     * @param instance The Actor or Component instance.
     * @param instanceId The unique ID of the instance.
     * @param prototype The prototype of the instance's class.
     * @param idPrefix A prefix for the processable ID.
     */
    private _unregisterDecoratedMethodsForInstance(instance: any, instanceId: string, prototype: any, idPrefix: string = ''): void {
        if (!prototype) return;

        const hookedMethods: HookedMethodMetadata[] = Reflect.getOwnMetadata(HOOKED_METHODS_METADATA_KEY, prototype) || [];
        for (const hook of hookedMethods) {
            const processor = ProcessorRegistry.get(hook.processorName);
            if (processor) {
                const processableId = `${idPrefix}${instanceId}:${String(hook.propertyKey)}`;
                processor.removeTask(processableId);
                // console.debug(`Unregistered method '${String(hook.propertyKey)}' of '${instance.constructor.name}' (ID: ${instanceId}) from processor '${hook.processorName}'. Processable ID: ${processableId}`);
            }
        }
        this._unregisterDecoratedMethodsForInstance(instance, instanceId, Object.getPrototypeOf(prototype), idPrefix);
    }


    private isComponentDuplicate(component: Component): boolean {
        return Array.from(this._components.values()).some(comp => comp === component);
    }

    private validateComponent(label: string, component: Component): void {
        if (this._components.has(label)) {
            throw new Error(`Actor '${this.label}': Component with label '${label}' already exists.`);
        }
        if (this.isComponentDuplicate(component)) {
            throw new Error(`Actor '${this.label}': Component instance (ID: ${component.id}) is already added, possibly under a different label.`);
        }
    }

    private updateDependencies(): void {
        // This logic might need to be revisited if components have complex inter-dependencies
        // that are resolved after initial addition. For now, assuming it's called after adds/removes.
        this._components.forEach(component => {
            if (typeof (component as any).checkAndResolveDependencies === 'function') {
                (component as any).checkAndResolveDependencies();
            }
        });
    }

    /**
     * Adds a component to the actor with type-safe arguments.
     * @param label A unique label for this component within the actor.
     * @param componentClass The class of the component to add.
     * @param args Additional arguments to pass to the component's constructor, matching its signature (after 'actor').
     * @returns The newly created component instance.
     */
    public addComponent<C extends new (actor: Actor, ...args: any[]) => Component>( // Generic C for ComponentClass
        label: string,
        componentClass: C,
        ...args: ComponentConstructorParameters<C> // Use utility type for ...args
    ): InstanceType<C> { // Return the specific instance type T
        if (!label || label.trim() === "") { //
            throw new Error(`Actor '${this.label}': Component label cannot be empty.`); //
        }

        const component = new componentClass(this, ...args); // Spread args here

        this.validateComponent(label, component); //
        this._components.set(label, component); //

        this._registerDecoratedMethodsForInstance(
            component,
            component.id,
            Object.getPrototypeOf(component),
            `actor_${this.id}_comp_` //
        );

        if (this._isInitialized) { //
            this.updateDependencies(); //
        }
        return this
        //return component as InstanceType<C>; // Return the strongly-typed instance
    }

    public removeComponent(label: string): boolean {
        const component = this._components.get(label);
        if (component) {
            // console.debug(`Actor '${this.label}': Attempting to remove component '${label}' (ID: ${component.id}).`);
            // Unregister component's decorated methods
            this._unregisterDecoratedMethodsForInstance(
                component,
                component.id,
                Object.getPrototypeOf(component),
                `actor_${this.id}_comp_`
            );

            // Optional: Call a dispose/destroy method on the component if it exists
            if (typeof (component as any).dispose === 'function') {
                (component as any).dispose();
            }

            this._components.delete(label);
            this.updateDependencies();
            // console.debug(`Actor '${this.label}': Removed component '${label}'. Total components: ${this._components.size}`);
            return true;
        }
        // console.warn(`Actor '${this.label}': Component with label '${label}' not found for removal.`);
        return false;
    }

    public getComponent<T extends Component>(componentClass: new (...args: any[]) => T): T {
        for (const component of this._components.values()) {
            if (component instanceof componentClass) {
                return component as T;
            }
        }
        throw new Error(`Actor '${this.label}': Component of type '${componentClass.name}' not found.`);
    }

    public hasComponent<T extends Component>(componentClass: new (...args: any[]) => T): boolean {
        for (const component of this._components.values()) {
            if (component instanceof componentClass) {
                return true;
            }
        }
        return false;
    }

    /**
     * Call this method when the actor is no longer needed to clean up its resources,
     * including unregistering its methods and its components' methods from processors.
     */
    public destroy(): void {
        // console.debug(`Actor '${this.label}' (ID: ${this.id}): Initiating destruction.`);
        // Unregister actor's own decorated methods
        this._unregisterDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));

        // Unregister and dispose components
        const componentLabels = Array.from(this._components.keys());
        for (const label of componentLabels) {
            this.removeComponent(label); // This handles unregistering component methods and optional dispose
        }
        this._components.clear();

        // Remove actor from global tracking if applicable
        const index = System.actors.indexOf(this);
        if (index > -1) {
            System.actors.splice(index, 1);
        }
        // console.info(`Actor '${this.label}' (ID: ${this.id}) destroyed. System actors count: ${System.actors.length}`);
    }
}
