// src/core/Actor.ts - Scene-managed approach

import Component, {ComponentClass, ComponentConstructorParameters} from "./component/Component.ts";
import { HOOKED_METHODS_METADATA_KEY, HookedMethodMetadata } from './processor/Decorators.ts';
import { ProcessorRegistry } from './processor/ProcessorRegistry.ts';
import { IProcessable } from './processor/Processor.ts';
import { generateUUID } from "../utils/uuid.ts";
import {ComponentTypeRegistry} from "./component/ComponentRegistry.ts";

export default class Actor {
    public readonly label: string;
    public readonly id: string;
    private componentMask: bigint = 0n;
    private components: (Component | undefined)[] = [];
    private isInitialized: boolean = false;

    constructor(label: string) {
        this.label = label;
        this.id = generateUUID();
        this.performInitialization();
    }

    private performInitialization(): void {
        if (this.isInitialized) return;

        this.onInitialize();
        this.registerDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));
        // REMOVED: System.actors.push(this) - Scene is now responsible for actor management
        this.updateDependencies();
        this.isInitialized = true;
        console.debug(`Actor '${this.label}' (ID: ${this.id}) initialized.`);
    }

    protected onInitialize(): void {
        // Subclasses can override this for custom initialization
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
                console.warn(`Actor (ID: ${instanceId}): Processor '${hook.processorName}' not found for method '${String(hook.propertyKey)}'.`);
            }
        }
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

        if (componentId >= this.components.length) {
            this.components.length = componentId + 1;
        }
        this.components[componentId] = component;
        this.componentMask |= (1n << BigInt(componentId));

        this.registerDecoratedMethodsForInstance(
            component,
            component.id,
            Object.getPrototypeOf(component),
            `actor_${this.id}_comp_`
        );

        if (this.isInitialized) {
            if (typeof (component as any).checkAndResolveDependencies === 'function') {
                (component as any).checkAndResolveDependencies();
            }
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
            this.componentMask &= ~(1n << BigInt(componentId));

            if (this.isInitialized) {
                this.updateDependencies();
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
        return (this.componentMask & (1n << BigInt(componentId))) !== 0n;
    }

    public getAllComponents(): Component[] {
        return this.components.filter(c => c !== undefined) as Component[];
    }

    public destroy(): void {
        // Unregister actor's own decorated methods
        this.unregisterDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));

        // Dispose all components
        for (let i = this.components.length - 1; i >= 0; i--) {
            const component = this.components[i];
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
            }
        }
        this.components = [];
        this.componentMask = 0n;

        // REMOVED: System.actors.splice() - Scene handles removal
        this.isInitialized = false;
        console.debug(`Actor '${this.label}' (ID: ${this.id}) destroyed.`);
    }
}