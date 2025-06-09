import "reflect-metadata"
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

  constructor(label: string) {
    this.label = label;
    this.id = generateUUID();
    this.performInitialization();
  }

  private performInitialization(): void {
    if (this.isInitialized) return;

    this.onBeforeInitialize();
    this.registerDecoratedMethodsForInstance(this, this.id, Object.getPrototypeOf(this));
    this.onInitialize();
    this.isInitialized = true;
    console.debug(`Actor '${this.label}' (ID: ${this.id}) initialized.`);
  }

  protected onInitialize(): void {
    // Subclasses override this for initialization
  }

  protected onBeforeInitialize(): void {
    // Subclasses override this to add components
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

    // Register component's decorated methods
    this.registerDecoratedMethodsForInstance(
        component,
        component.id,
        Object.getPrototypeOf(component),
        `actor_${this.id}_comp_`
    );

    return component;
  }

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
}