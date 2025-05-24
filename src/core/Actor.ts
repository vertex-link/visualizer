// src/core/Actor.ts
import Component, {ComponentClass, ComponentConstructorParameters} from "./Component.ts";
import System from "./System.ts";
import { HOOKED_METHODS_METADATA_KEY, HookedMethodMetadata } from './processor/Decorators.ts';
import { ProcessorRegistry } from './processor/ProcessorRegistry.ts';
import { IProcessable } from './processor/Processor.ts';
import { generateUUID } from "../utils/uuid.ts";

export default class Actor {
    public readonly label: string;
    public readonly id: string;
    private _components: Map<string, Component> = new Map<string, Component>();
    private _isInitialized: boolean = false;
    private _isInitializing: boolean = false;

    private _initializationPromise: Promise<void>;
    private _resolveInitialization!: () => void;

    constructor(label: string) {
        this.label = label;
        this.id = generateUUID();

        this._initializationPromise = new Promise(resolve => {
            this._resolveInitialization = resolve;
        });

        this._scheduleInitialization();
    }

    private _scheduleInitialization(): void {
        if (this._isInitializing || this._isInitialized) return;
        this._isInitializing = true;
        queueMicrotask(() => {
            this._performInitialization();
        });
    }

    private _performInitialization(): void {
        if (this._isInitialized) return;
        try {
            this.onInitialize();
            this._registerDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));
            System.actors.push(this);
            this.updateDependencies();
            this._isInitialized = true;
            console.debug(`Actor '${this.label}' (ID: ${this.id}) fully initialized.`);
            this._resolveInitialization(); // Resolve the promise
        } catch (error) {
            console.error(`Actor '${this.label}' (ID: ${this.id}) initialization failed:`, error);
            // Resolve even on error to not leave awaiters hanging, error is logged.
            // Consider rejecting if callers should handle initialization errors via catch.
            this._resolveInitialization(); 
        } finally {
            this._isInitializing = false;
        }
    }

    /**
     * Waits until the actor's asynchronous initialization is complete.
     * Primarily for internal use by other async actor methods.
     */
    protected async waitUntilInitialized(): Promise<void> {
        if (this._isInitialized) {
            return;
        }
        return this._initializationPromise;
    }

    protected onInitialize(): void {
        // Subclasses override this
    }

    // _registerDecoratedMethodsForInstance and _unregisterDecoratedMethodsForInstance remain the same

    private _registerDecoratedMethodsForInstance(instance: any, instanceId: string, prototype: any, idPrefix: string = ''): void {
        if (!prototype) return;

        const hookedMethods: HookedMethodMetadata[] = Reflect.getOwnMetadata(HOOKED_METHODS_METADATA_KEY, prototype) || [];

        for (const hook of hookedMethods) {
            const processor = ProcessorRegistry.get(hook.processorName);
            if (processor) {
                const method = instance[hook.propertyKey];
                if (typeof method === 'function') {
                    const processableId = `${idPrefix}${instanceId}:${String(hook.propertyKey)}`;
                    const processable: IProcessable = {
                        id: processableId,
                        update: method.bind(instance),
                        context: instance,
                    };
                    processor.addTask(processable);
                } else {
                    console.warn(`Actor/Component (ID: ${instanceId}): Decorated property '${String(hook.propertyKey)}' on prototype '${prototype.constructor.name}' is not a function.`);
                }
            } else {
                console.warn(`Actor/Component (ID: ${instanceId}): Processor '${hook.processorName}' not found for method '${String(hook.propertyKey)}' on prototype '${prototype.constructor.name}'.`);
            }
        }
        this._registerDecoratedMethodsForInstance(instance, instanceId, Object.getPrototypeOf(prototype), idPrefix);
    }

    private _unregisterDecoratedMethodsForInstance(instance: any, instanceId: string, prototype: any, idPrefix: string = ''): void {
        if (!prototype) return;

        const hookedMethods: HookedMethodMetadata[] = Reflect.getOwnMetadata(HOOKED_METHODS_METADATA_KEY, prototype) || [];
        for (const hook of hookedMethods) {
            const processor = ProcessorRegistry.get(hook.processorName);
            if (processor) {
                const processableId = `${idPrefix}${instanceId}:${String(hook.propertyKey)}`;
                processor.removeTask(processableId);
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
        this._components.forEach(component => {
            if (typeof (component as any).checkAndResolveDependencies === 'function') {
                (component as any).checkAndResolveDependencies();
            }
        });
    }

    public addComponent<C extends new (actor: Actor, ...args: any[]) => Component>(
        label: string,
        componentClass: C,
        ...args: ComponentConstructorParameters<C>
    ): InstanceType<C> {
        if (!label || label.trim() === "") {
            throw new Error(`Actor '${this.label}': Component label cannot be empty.`);
        }
        const component = new componentClass(this, ...args);
        this.validateComponent(label, component);
        this._components.set(label, component);
        this._registerDecoratedMethodsForInstance(
            component,
            component.id,
            Object.getPrototypeOf(component),
            `actor_${this.id}_comp_`
        );
        // If actor is already initialized, new component might need its dependencies checked.
        // And other components might depend on this new one.
        if (this._isInitialized) {
            this.updateDependencies(); 
        }
        return component as InstanceType<C>;
    }

    public removeComponent(label: string): boolean {
        const component = this._components.get(label);
        if (component) {
            this._unregisterDecoratedMethodsForInstance(
                component,
                component.id,
                Object.getPrototypeOf(component),
                `actor_${this.id}_comp_`
            );
            if (typeof (component as any).dispose === 'function') {
                (component as any).dispose();
            }
            this._components.delete(label);
            // If actor is initialized, dependencies might change.
            if (this._isInitialized) {
                this.updateDependencies();
            }
            return true;
        }
        return false;
    }

    /**
     * Asynchronously gets a component by its class.
     * Waits for actor initialization before attempting to retrieve the component.
     */
    public async getComponent<T extends Component>(componentClass: new (...args: any[]) => T): Promise<T> {
        await this.waitUntilInitialized();
        for (const component of this._components.values()) {
            if (component instanceof componentClass) {
                return component as T;
            }
        }
        throw new Error(`Actor '${this.label}': Component of type '${componentClass.name}' not found.`);
    }

    /**
     * Asynchronously checks if a component of a given class exists.
     * Waits for actor initialization before performing the check.
     */
    public async hasComponent<T extends Component>(componentClass: new (...args: any[]) => T): Promise<boolean> {
        await this.waitUntilInitialized();
        for (const component of this._components.values()) {
            if (component instanceof componentClass) {
                return true;
            }
        }
        return false;
    }
    
    public async destroy(): Promise<void> { // Made async if removeComponent could become async or if waiting is desired
        await this.waitUntilInitialized(); // Ensure init is done before destroying
        console.debug(`Actor '${this.label}' (ID: ${this.id}): Initiating destruction.`);
        this._unregisterDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));

        const componentLabels = Array.from(this._components.keys());
        for (const label of componentLabels) {
            // removeComponent is currently synchronous. If it were to become async, this loop would need 'await'.
            this.removeComponent(label); 
        }
        this._components.clear();

        const index = System.actors.indexOf(this);
        if (index > -1) {
            System.actors.splice(index, 1);
        }

        console.info(`Actor '${this.label}' (ID: ${this.id}) destroyed. System actors count: ${System.actors.length}`);
    }
}