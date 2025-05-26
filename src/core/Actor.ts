// src/core/Actor.ts
import Component, {ComponentClass, ComponentConstructorParameters} from "./component/Component.ts";
import System from "./System.ts";
import { HOOKED_METHODS_METADATA_KEY, HookedMethodMetadata } from './processor/Decorators.ts';
import { ProcessorRegistry } from './processor/ProcessorRegistry.ts';
import { IProcessable } from './processor/Processor.ts';
import { generateUUID } from "../utils/uuid.ts";
import {ComponentTypeRegistry} from "./component/ComponentRegistry.ts";

export default class Actor {
    public readonly label: string;
    public readonly id: string;
    private componentMask: bigint = 0n;
    private components: (Component | undefined)[] = []; // Stores component instances by their type ID
    private isInitialized: boolean = false;

    constructor(label: string) {
        this.label = label;
        this.id = generateUUID();
        // Initialization is now synchronous within the constructor or called immediately.
        this.performInitialization();
    }

    private performInitialization(): void {
        if (this.isInitialized) return;
        
        this.onInitialize(); // Call subclass-specific initialization
        this.registerDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));
        System.actors.push(this); // Add to global actor list
        this.updateDependencies(); // Resolve component dependencies
        this.isInitialized = true;
        console.debug(`Actor '${this.label}' (ID: ${this.id}) fully initialized.`);
    }

    protected onInitialize(): void {
        // Subclasses can override this method for custom initialization logic
        // that needs to run after the actor's base setup but before components are fully active.
    }

    private registerDecoratedMethodsForInstance(instance: any, instanceId: string, prototype: any, idPrefix: string = ''): void {
        if (!prototype) return;

        const hookedMethods: HookedMethodMetadata[] = Reflect.getOwnMetadata(HOOKED_METHODS_METADATA_KEY, prototype) || [];
        for (const hook of hookedMethods) {
            const processor = ProcessorRegistry.get(hook.processorName);
            if (processor) {
                const processableId = `${idPrefix}${instanceId}:${String(hook.propertyKey)}`;
                const task: IProcessable = {
                    id: processableId,
                    update: (instance as any)[hook.propertyKey].bind(instance),
                    context: instance
                };
                processor.addTask(task);
            } else {
                console.warn(`Actor/Component (ID: ${instanceId}): Processor '${hook.processorName}' not found for method '${String(hook.propertyKey)}' on prototype '${prototype.constructor.name}'.`);
            }
        }
        // Recursively register for parent prototypes
        this.registerDecoratedMethodsForInstance(instance, instanceId, Object.getPrototypeOf(prototype), idPrefix);
    }

    private unregisterDecoratedMethodsForInstance(instance: any, instanceId: string, prototype: any, idPrefix: string = ''): void {
        if (!prototype) return;

        const hookedMethods: HookedMethodMetadata[] = Reflect.getOwnMetadata(HOOKED_METHODS_METADATA_KEY, prototype) || [];
        for (const hook of hookedMethods) {
            const processor = ProcessorRegistry.get(hook.processorName);
            if (processor) {
                const processableId = `${idPrefix}${instanceId}:${String(hook.propertyKey)}`;
                processor.removeTask(processableId);
            }
        }
        // Recursively unregister for parent prototypes
        this.unregisterDecoratedMethodsForInstance(instance, instanceId, Object.getPrototypeOf(prototype), idPrefix);
    }

    private updateDependencies(): void {
        for (const component of this.components) {
            if (component && typeof (component as any).checkAndResolveDependencies === 'function') {
                (component as any).checkAndResolveDependencies();
            }
        }
    }

    public addComponent<C extends ComponentClass>(
        componentClass: C,
        ...args: ComponentConstructorParameters<C>
    ): InstanceType<C> {
        const componentId = ComponentTypeRegistry.getId(componentClass);
        if (this.hasComponent(componentClass)) {
            throw new Error(`Actor '${this.label}': Component of type '${componentClass.name}' already exists.`);
        }

        const component = new componentClass(this, ...args) as InstanceType<C>;
        
        // Ensure components array is large enough
        if (componentId >= this.components.length) {
            this.components.length = componentId + 1;
        }
        this.components[componentId] = component;
        this.componentMask |= (1n << BigInt(componentId));

        this.registerDecoratedMethodsForInstance(
            component,
            component.id, // The component's own unique instance ID
            Object.getPrototypeOf(component),
            `actor_${this.id}_comp_`
        );

        if (this.isInitialized) {
             // Initialize the component if actor is already initialized
            if (typeof (component as any).checkAndResolveDependencies === 'function') {
                (component as any).checkAndResolveDependencies();
            }
            // Potentially, other components might depend on this new one.
            this.updateDependencies();
        }
        return component;
    }

    public removeComponent(componentClass: ComponentClass): boolean {
        const componentId = ComponentTypeRegistry.getId(componentClass);
        if (!this.hasComponent(componentClass)) {
            return false;
        }

        const component = this.components[componentId];
        if (component) {
            this.unregisterDecoratedMethodsForInstance(
                component,
                component.id,
                Object.getPrototypeOf(component),
                `actor_${this.id}_comp_`
            );

            if (typeof (component as any).dispose === 'function') {
                (component as any).dispose();
            }

            this.components[componentId] = undefined;
            this.componentMask &= ~(1n << BigInt(componentId)); // Clear the bit

            if (this.isInitialized) {
                this.updateDependencies(); // Dependencies might change
            }
            return true;
        }
        return false;
    }

    public getComponent<C extends ComponentClass>(componentClass: C): InstanceType<C> | undefined {
        const componentId = ComponentTypeRegistry.getId(componentClass);
        if ((this.componentMask & (1n << BigInt(componentId))) !== 0n) {
            return this.components[componentId] as InstanceType<C> | undefined;
        }
        return undefined;
    }

    public hasComponent(componentClass: ComponentClass): boolean {
        const componentId = ComponentTypeRegistry.getId(componentClass);
        // Check if componentId is within bounds of currently known components for this actor
        // and if the bit is set in the mask.
        return (this.componentMask & (1n << BigInt(componentId))) !== 0n;
    }
    
    public getAllComponents(): Component[] {
        return this.components.filter(c => c !== undefined) as Component[];
    }

    public destroy(): void {
        // Unregister actor's own decorated methods
        this.unregisterDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));

        // Dispose and unregister all components
        // Iterate backward in case dispose logic modifies the components array (though it shouldn't directly)
        for (let i = this.components.length - 1; i >= 0; i--) {
            const component = this.components[i];
            if (component) {
                 // We need the ComponentClass to correctly call removeComponent which handles unregistration and bitmask
                // This assumes component instance has a way to get its class, or we find it by iterating ComponentTypeRegistry
                // For simplicity here, let's assume we can find its ComponentClass if needed,
                // or directly call the necessary cleanup.
                // A more robust way would be to have component store its typeId or class.
                // However, the current Component design does not store its ComponentClass directly.
                // So, we manually do parts of removeComponent's job:
                this.unregisterDecoratedMethodsForInstance(
                    component,
                    component.id,
                    Object.getPrototypeOf(component),
                    `actor_${this.id}_comp_`
                );
                if (typeof (component as any).dispose === 'function') {
                    (component as any).dispose();
                }
            }
        }
        this.components = [];
        this.componentMask = 0n;

        // Remove actor from the system
        const index = System.actors.indexOf(this);
        if (index > -1) {
            System.actors.splice(index, 1);
        }
        this.isInitialized = false; // Mark as not initialized
        console.debug(`Actor '${this.label}' (ID: ${this.id}) destroyed.`);
    }
}