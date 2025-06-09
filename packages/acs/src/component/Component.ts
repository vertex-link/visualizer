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



export default abstract class Component {
  public readonly id: string;
  private readonly _actor: Actor;

  private _initialized = false;
  private _hasBeenActivated: boolean = false;
  public get hasBeenActivated(): boolean {
    return this._hasBeenActivated;
  }

  constructor(actor: Actor) {
    if (!actor || !(actor instanceof Actor)) {
      throw new Error("Component constructor: Valid Actor instance is required.");
    }
    this._actor = actor;
    this.id = generateUUID();
  }
  
  get actor() {
    return this._actor;
  }
  
  get isInitialized(): boolean {
    return this._initialized;
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

    this._initialized = false;
  }
}