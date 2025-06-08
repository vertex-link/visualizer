import Actor from "../Actor";
import { generateUUID } from "./../utils/uuid";
import { emit } from "../events/Event";
import {
  registerEventListeners,
  unregisterEventListeners,
} from "../events/Decorators";
import { ComponentAddedEvent, ComponentRemovedEvent, ComponentInitializedEvent } from "../events/CoreEvents";

export type ComponentClass<T extends Component = Component> = new (actor: Actor, ...args: any[]) => T;

export type ComponentConstructorParameters<
  T extends new (actor: Actor, ...args: any[]) => any
> = T extends new (actor: Actor, ...args: infer P) => any ? P : never;

interface ComponentDependencyMetadata {
  componentClass: ComponentClass;
  propertyKey: string | symbol;
  optional: boolean;
}

export default abstract class Component {
  public readonly id: string;
  private readonly _actor: Actor;

  private _dependencies = new Map<ComponentClass, Component | undefined>();
  private _dependencyMetadata: ComponentDependencyMetadata[] = [];
  private _initialized = false;
  private _initializing = false;
  private _dependenciesResolved: boolean = false;
  private _hasBeenActivated: boolean = false;

  public get dependenciesResolved(): boolean {
    return this._dependenciesResolved;
  }

  public get hasBeenActivated(): boolean {
    return this._hasBeenActivated;
  }

  constructor(actor: Actor) {
    if (!actor || !(actor instanceof Actor)) {
      throw new Error("Component constructor: Valid Actor instance is required.");
    }
    this._actor = actor;
    this.id = generateUUID();

    // Set up dependency metadata from constructor
    const constructor = this.constructor as any;
    if (constructor._componentDependencies) {
      this._dependencyMetadata = [...constructor._componentDependencies];
      console.log(`[DEBUG] Found ${constructor._componentDependencies.length} dependencies on ${constructor.name}`);
    } else {
      console.log(`[DEBUG] No dependencies found on ${constructor.name}`);
    }
  }

  /**
   * Set up a getter for a specific dependency - called by decorator
   */
  public setupDependencyGetter(componentClass: ComponentClass, propertyKey: string | symbol, optional: boolean): void {
    console.log(`[DEBUG] Setting up getter for ${String(propertyKey)} -> ${componentClass.name}`);
    
    // Register dependency
    this._dependencies.set(componentClass, undefined);

    // Set up the getter
    Object.defineProperty(this, propertyKey, {
      get: () => {
        const component = this._actor.getComponent(componentClass);
        
        console.log(`[DEPENDENCY_DEBUG] Accessing ${String(propertyKey)}:`, {
          componentExists: !!component,
          componentName: component?.constructor?.name,
          componentId: component?.id,
          actorId: this._actor.id
        });

        if (!component && !optional) {
          console.warn(`[DEPENDENCY_ACCESS] Required dependency ${componentClass.name} not available for ${String(propertyKey)}`);
          return undefined;
        }

        return component;
      },
      set: (value) => {
        console.log(`[DEBUG] Manually setting dependency ${String(propertyKey)}:`, value);
        this._dependencies.set(componentClass, value);
      },
      enumerable: true,
      configurable: true
    });
  }

  /**
   * Check if all dependencies are available and resolve them
   */
  public checkAndResolveDependencies(): boolean {
    const constructor = this.constructor as any;
    
    if (!constructor._componentDependencies || constructor._componentDependencies.length === 0) {
      // No dependencies, consider resolved
      if (!this._dependenciesResolved) {
        this._dependenciesResolved = true;
        this.tryActivateComponent();
      }
      return true;
    }

    let allResolved = true;
    
    for (const dependency of constructor._componentDependencies) {
      const { componentClass, optional } = dependency;
      const component = this._actor.getComponent(componentClass);
      
      if (!component && !optional) {
        allResolved = false;
        break;
      }
    }

    if (allResolved && !this._dependenciesResolved) {
      this._dependenciesResolved = true;
      this.tryActivateComponent();
    } else if (!allResolved && this._dependenciesResolved) {
      // Dependencies were removed, deactivate component
      this._dependenciesResolved = false;
      this._hasBeenActivated = false;
      this.onDependenciesLost();
    }

    return allResolved;
  }
  
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Try to activate the component if dependencies are resolved and it hasn't been activated yet
   */
  private tryActivateComponent(): void {
    if (this._dependenciesResolved && !this._hasBeenActivated) {
      this._hasBeenActivated = true;
      console.log(`[DEPENDENCY] Activating component ${this.constructor.name} - all dependencies resolved`);
      this.onDependenciesResolved();
    }
  }

  /**
   * Called when all dependencies are resolved and component is ready
   */
  protected onDependenciesResolved(): void {
    // Override in subclasses
  }

  /**
   * Called when previously resolved dependencies are no longer available
   */
  protected onDependenciesLost(): void {
    // Override in subclasses
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
    const dependencies = this._dependencyMetadata.map(dep => ({
      name: dep.componentClass.name,
      required: !dep.optional,
      resolved: this._dependencies.get(dep.componentClass) !== undefined
    }));

    return {
      dependencies,
      initialized: this._initialized,
      hasCircularDependency: this._initializing
    };
  }

  /**
   * Dispose component and clean up
   */
  public dispose(): void {
    // Emit removal event
    emit(new ComponentRemovedEvent({
      actor: this._actor,
      component: this,
      componentType: this.constructor.name
    }));

    // Unregister event listeners
    try {
      const scene = (this._actor as any).scene;
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
    this._dependencies.clear();
    this._initialized = false;
  }
}