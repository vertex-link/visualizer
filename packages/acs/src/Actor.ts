import Component, { ComponentClass, ComponentConstructorParameters } from "./component/Component";
import { HOOKED_METHODS_METADATA_KEY, HookedMethodMetadata } from './processor/Decorators';
import { ProcessorRegistry } from './processor/ProcessorRegistry';
import { IProcessable } from './processor/Processor';
import { generateUUID } from "./utils/uuid";
import { ComponentTypeRegistry } from "./component/ComponentRegistry";

export default class Actor {
  public readonly label: string;
  public readonly id: string;
  private componentMask: bigint = 0n;
  private components: (Component | undefined)[] = [];
  private isInitialized: boolean = false;
  private _actorDependencyInjectionSetup = false; // Track if we've set up injection

  constructor(label: string) {
    this.label = label;
    this.id = generateUUID();
    this.performInitialization();
  }

  /**
   * Public method for decorators to set up actor dependency getters
   * This is called by the decorator's addInitializer
   */
  public _setupActorDependencyGetter(dep: any): void {
    const { componentClass, propertyKey, optional } = dep;
    
    console.log(`[DEBUG] Setting up actor getter for ${String(propertyKey)} -> ${componentClass.name}`);
    
    // Set up the getter
    Object.defineProperty(this, propertyKey, {
      get: () => {
        const component = this.getComponent(componentClass);
        
        console.log(`[ACTOR_DEPENDENCY_DEBUG] Accessing ${String(propertyKey)}:`, {
          componentExists: !!component,
          componentName: component?.constructor?.name,
          componentId: component?.id,
          actorId: this.id
        });

        if (!component && !optional) {
          console.warn(`[ACTOR_DEPENDENCY_ACCESS] Required dependency ${componentClass.name} not available for ${String(propertyKey)}`);
          return undefined;
        }

        return component;
      },
      set: (value) => {
        console.log(`[DEBUG] Manually setting actor dependency ${String(propertyKey)}:`, value);
      },
      enumerable: true,
      configurable: true
    });
  }

  /**
   * Ensure actor dependency injection is set up (lazy)
   */
  private ensureActorDependencyInjection(): void {
    if (this._actorDependencyInjectionSetup) return;
    
    this._actorDependencyInjectionSetup = true;
    this.setupActorDependencyInjection();
  }

  /**
   * Set up dependency injection for actor decorators
   */
  private setupActorDependencyInjection(): void {
    const constructor = this.constructor as any;
    
    if (constructor._componentDependencies) {
      console.log(`[DEBUG] Setting up ${constructor._componentDependencies.length} actor dependencies for ${this.label}`);
      
      for (const dep of constructor._componentDependencies) {
        this.setupActorDependencyGetter(dep);
      }
    }
  }

  /**
   * Set up a getter for actor dependency (private version)
   */
  private setupActorDependencyGetter(dep: any): void {
    this._setupActorDependencyGetter(dep);
  }

  private performInitialization(): void {
    if (this.isInitialized) return;

    this.onBeforeInitialize();
    this.registerDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));
    this.updateDependencies();

    // Process component dependencies from the decorator
    this.processComponentDependencies();

    // Schedule a re-check for actor dependencies after decorators have run
    setTimeout(() => {
      this.recheckActorDependencies();
    }, 0);

    this.onInitialize();
    this.isInitialized = true;
    console.debug(`Actor '${this.label}' (ID: ${this.id}) initialized.`);
  }

  /**
   * Re-check actor dependencies after decorators have had time to run
   */
  private recheckActorDependencies(): void {
    const constructor = this.constructor as any;
    
    if (constructor._componentDependencies && !this._actorDependencyInjectionSetup) {
      console.log(`[DEBUG] Late setup: Found ${constructor._componentDependencies.length} actor dependencies for ${this.label}`);
      this.ensureActorDependencyInjection();
    }
  }

  /**
   * Process component dependencies stored by the @RequireComponent decorator
   */
  private processComponentDependencies(): void {
    const constructor = this.constructor as any;

    // Check if the decorator stored dependencies
    if (constructor._componentDependencies) {
      console.log(`[DEBUG] Processing ${constructor._componentDependencies.length} component dependencies for ${this.label}`);

      for (const dependency of constructor._componentDependencies) {
        const { componentClass, propertyKey, optional } = dependency;
        const component = this.getComponent(componentClass);

        if (component) {
          console.log(`[DEBUG] ✅ Found ${componentClass.name} for property ${String(propertyKey)}`);
        } else if (!optional) {
          throw new Error(`❌ Required component ${componentClass.name} not found for property '${String(propertyKey)}' in actor '${this.label}'`);
        } else {
          console.log(`[DEBUG] ⚠️ Optional component ${componentClass.name} not found for property ${String(propertyKey)}`);
        }
      }
    } else {
      console.log(`[DEBUG] No decorator dependencies found on ${this.constructor.name}`);
    }
  }

  protected onInitialize(): void {
    // Subclasses override this for initialization that needs dependencies
    // All decorators and dependencies are now resolved
  }

  protected onBeforeInitialize(): void {
    // Subclasses override this to add components
    // Decorators haven't been processed yet
  }

  private registerDecoratedMethodsForInstance(
      instance: any,
      instanceId: string,
      prototype: any,
      idPrefix: string = ''
  ): void {
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
        console.debug(`Registered method '${String(hook.propertyKey)}' from '${instance.constructor.name}' to processor '${hook.processorName}' with ID '${processableId}'`);
      } else {
        console.warn(`Actor (ID: ${instanceId}): Processor '${hook.processorName}' not found for method '${String(hook.propertyKey)}'.`);
      }
    }

    // Recursively check parent prototypes
    this.registerDecoratedMethodsForInstance(instance, instanceId, Object.getPrototypeOf(prototype), idPrefix);
  }

  private unregisterDecoratedMethodsForInstance(
      instance: any,
      instanceId: string,
      prototype: any,
      idPrefix: string = ''
  ): boolean {
    if (!prototype) return true;

    let allSuccessful = true;
    const hookedMethods: HookedMethodMetadata[] = Reflect.getOwnMetadata(HOOKED_METHODS_METADATA_KEY, prototype) || [];

    for (const hook of hookedMethods) {
      const processor = ProcessorRegistry.get(hook.processorName);
      if (processor) {
        const processableId = `${idPrefix}${instanceId}:${String(hook.propertyKey)}`;
        const success = processor.removeTask(processableId);

        if (success) {
          console.debug(`Successfully unregistered method '${String(hook.propertyKey)}' from '${instance.constructor.name}' (processor '${hook.processorName}', ID '${processableId}')`);
        } else {
          console.warn(`Failed to unregister method '${String(hook.propertyKey)}' from '${instance.constructor.name}' - task ID '${processableId}' not found in processor '${hook.processorName}'`);
          allSuccessful = false;

          // Debug: Log current tasks in processor
          console.debug(`Processor '${hook.processorName}' currently has ${processor.taskCount} tasks`);
        }
      } else {
        console.warn(`Processor '${hook.processorName}' not found during unregistration of method '${String(hook.propertyKey)}' from '${instance.constructor.name}'`);
        allSuccessful = false;
      }
    }

    // Recursively check parent prototypes
    const parentSuccess = this.unregisterDecoratedMethodsForInstance(instance, instanceId, Object.getPrototypeOf(prototype), idPrefix);

    return allSuccessful && parentSuccess;
  }

  /**
   * Enhanced dependency resolution that handles dynamic additions/removals
   */
  private updateDependencies(): void {
    let anyComponentStateChanged = false;

    // Check all components for dependency changes
    for (const component of this.components) {
      if (component && typeof (component as any).checkAndResolveDependencies === 'function') {
        const previousState = (component as any).dependenciesResolved;
        const currentState = (component as any).checkAndResolveDependencies();
        
        if (previousState !== currentState) {
          anyComponentStateChanged = true;
        }
      }
    }

    // If any component state changed, we might need to check actor dependencies too
    if (anyComponentStateChanged) {
      this.checkActorDependencies();
    }
  }

  /**
   * Check and resolve dependencies for the actor itself
   */
  private checkActorDependencies(): void {
    const constructor = this.constructor as any;
    
    if (constructor._componentDependencies) {
      for (const dependency of constructor._componentDependencies) {
        const { componentClass, propertyKey, optional } = dependency;
        const component = this.getComponent(componentClass);

        if (component) {
          console.log(`[ACTOR_DEPENDENCY] ✅ ${componentClass.name} available for ${String(propertyKey)}`);
        } else if (!optional) {
          console.log(`[ACTOR_DEPENDENCY] ❌ Required ${componentClass.name} missing for ${String(propertyKey)}`);
        }
      }
    }
  }

  /**
   * Override addComponent to trigger dependency resolution
   */
  public addComponent<C extends ComponentClass>(
      componentClass: C,
      ...args: ComponentConstructorParameters<C>
  ): InstanceType<C> {
    const componentId = ComponentTypeRegistry.getId(componentClass);
    if (this.hasComponent(componentClass)) {
      throw new Error(`Actor '${this.label}': Component of type '${componentClass.name}' already exists.`);
    }

    // ... existing addComponent logic ...
    const component = new componentClass(this, ...args) as InstanceType<C>;

    if (componentId >= this.components.length) {
      this.components.length = componentId + 1;
    }
    this.components[componentId] = component;
    this.componentMask |= (1n << BigInt(componentId));

    // ... existing storage logic ...

    // Register component's decorated methods
    this.registerDecoratedMethodsForInstance(
        component,
        component.id,
        Object.getPrototypeOf(component),
        `actor_${this.id}_comp_`
    );

    // Trigger dependency resolution for all components
    this.updateDependencies();

    return component;
  }

  /**
   * Override removeComponent to trigger dependency resolution
   */
  public removeComponent(componentClass: ComponentClass): boolean {
    const componentId = ComponentTypeRegistry.getId(componentClass);
    console.debug(`Removing component '${componentClass.name}' (ID: ${componentId}) from actor '${this.label}'`);
    if (!this.hasComponent(componentClass)) {
      console.warn(`Actor '${this.label}': Cannot remove component of type '${componentClass.name}' - not found`);
      return false;
    }

    const component = this.components[componentId];
    if (!component) {
      console.warn(`Actor '${this.label}': Component slot ${componentId} is empty for type '${componentClass.name}'`);
      return false;
    }

    console.debug(`Removing component '${componentClass.name}' (ID: ${component.id}) from actor '${this.label}'`);
    console.debug(`Unregistering decorated methods for component '${componentClass.name}' (ID: ${component.id})`);

    // Unregister component's decorated methods
    const unregisterSuccess = this.unregisterDecoratedMethodsForInstance(
      component,
      component.id,
      Object.getPrototypeOf(component),
      `actor_${this.id}_comp_`
    );

    if (!unregisterSuccess) {
      console.error(`Failed to unregister all methods for component '${componentClass.name}' (ID: ${component.id})`);
    }

    // Dispose the component
    if (typeof (component as any).dispose === 'function') {
      try {
        (component as any).dispose();
        console.debug(`Disposed component '${componentClass.name}' (ID: ${component.id})`);
      } catch (error) {
        console.error(`Error disposing component '${componentClass.name}' (ID: ${component.id}):`, error);
      }
    }

    // Remove from storage
    this.components[componentId] = undefined;
    this.componentMask &= ~(1n << BigInt(componentId));
    
    // After removing component, update all dependencies
    if (this.isInitialized) {
      this.updateDependencies();
    }

    return true;
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

  public getInitializedComponents(): Component[] {
    return this.getAllComponents().filter(c => c.isInitialized);
  }

  public get allComponentsInitialized(): boolean {
    return this.getAllComponents().every(c => c.isInitialized);
  }

  public resolveDependencies(): void {
    this.updateDependencies();
  }

  public getDependencyStatus(): { [componentName: string]: boolean } {
    const status: { [componentName: string]: boolean } = {};
    for (const component of this.getAllComponents()) {
      status[component.constructor.name] = component.isInitialized;
    }
    return status;
  }

  public destroy(): void {
    console.debug(`Destroying actor '${this.label}' (ID: ${this.id})`);

    // Unregister actor's own decorated methods
    const actorUnregisterSuccess = this.unregisterDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));
    if (!actorUnregisterSuccess) {
      console.warn(`Failed to unregister all actor methods for '${this.label}' (ID: ${this.id})`);
    }

    // Dispose all components
    for (let i = this.components.length - 1; i >= 0; i--) {
      const component = this.components[i];
      if (component) {
        console.debug(`Disposing component during actor destruction: ${component.constructor.name} (ID: ${component.id})`);

        // Unregister component methods
        const success = this.unregisterDecoratedMethodsForInstance(
          component,
          component.id,
          Object.getPrototypeOf(component),
          `actor_${this.id}_comp_`
        );

        if (!success) {
          console.warn(`Failed to unregister all methods for component '${component.constructor.name}' during actor destruction`);
        }

        if (typeof (component as any).dispose === 'function') {
          try {
            (component as any).dispose();
          } catch (error) {
            console.error(`Error disposing component during actor destruction:`, error);
          }
        }
      }
    }

    this.components = [];
    this.componentMask = 0n;
    this.isInitialized = false;

    console.debug(`Actor '${this.label}' (ID: ${this.id}) destroyed`);
  }

  /**
   * Get a component with dependency checking for Actor methods
   */
  public getDependency<C extends ComponentClass>(componentClass: C): InstanceType<C> | undefined {
    const component = this.getComponent(componentClass);
    
    if (!component) {
      console.warn(`[ACTOR_METHOD] Dependency ${componentClass.name} not available in actor ${this.label}`);
    }
    
    return component;
  }
}