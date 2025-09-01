import type Component from "./component/Component";
import type { ComponentClass, ComponentConstructorParameters } from "./component/Component";
import { ComponentTypeRegistry } from "./component/ComponentRegistry";
import { generateUUID } from "./utils/uuid";

export default class Actor {
  public readonly label: string;
  public readonly id: string;
  private componentMask = 0n;
  private components: (Component | undefined)[] = [];
  private isInitialized = false;

  constructor(label: string) {
    this.label = label;
    this.id = generateUUID();
    this.performInitialization();
  }

  private performInitialization(): void {
    if (this.isInitialized) return;

    this.onBeforeInitialize();
    // Decorator-based method registration removed.
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

  public addComponent<C extends ComponentClass>(
    componentClass: C,
    ...args: ComponentConstructorParameters<C>
  ): InstanceType<C> {
    const componentId = ComponentTypeRegistry.getId(componentClass);
    if (this.hasComponent(componentClass)) {
      throw new Error(
        `Actor '${this.label}': Component of type '${componentClass.name}' already exists.`,
      );
    }

    const component = new componentClass(this, ...args) as InstanceType<C>;

    if (componentId >= this.components.length) {
      this.components.length = componentId + 1;
    }
    this.components[componentId] = component;
    this.componentMask |= 1n << BigInt(componentId);

    return component;
  }

  public removeComponent(componentClass: ComponentClass): boolean {
    const componentId = ComponentTypeRegistry.getId(componentClass);
    console.debug(
      `Removing component '${componentClass.name}' (ID: ${componentId}) from actor '${this.label}'`,
    );
    if (!this.hasComponent(componentClass)) {
      console.warn(
        `Actor '${this.label}': Cannot remove component of type '${componentClass.name}' - not found`,
      );
      return false;
    }

    const component = this.components[componentId];
    if (!component) {
      console.warn(
        `Actor '${this.label}': Component slot ${componentId} is empty for type '${componentClass.name}'`,
      );
      return false;
    }

    console.debug(
      `Removing component '${componentClass.name}' (ID: ${component.id}) from actor '${this.label}'`,
    );

    // Dispose the component
    if (typeof (component as any).dispose === "function") {
      try {
        (component as any).dispose();
        console.debug(`Disposed component '${componentClass.name}' (ID: ${component.id})`);
      } catch (error) {
        console.error(
          `Error disposing component '${componentClass.name}' (ID: ${component.id}):`,
          error,
        );
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
    return this.components.filter((c) => c !== undefined) as Component[];
  }

  public getInitializedComponents(): Component[] {
    return this.getAllComponents().filter((c) => c.isInitialized);
  }

  public get allComponentsInitialized(): boolean {
    return this.getAllComponents().every((c) => c.isInitialized);
  }

  public destroy(): void {
    console.debug(`Destroying actor '${this.label}' (ID: ${this.id})`);

    // Dispose all components
    for (let i = this.components.length - 1; i >= 0; i--) {
      const component = this.components[i];
      if (component) {
        console.debug(
          `Disposing component during actor destruction: ${component.constructor.name} (ID: ${component.id})`,
        );

        if (typeof (component as any).dispose === "function") {
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
