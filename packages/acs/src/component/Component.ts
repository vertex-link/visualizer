import Actor from "../Actor";
import { ComponentRemovedEvent } from "../events/CoreEvents";
import { emit } from "../events/Event";
import { generateUUID } from "./../utils/uuid";

export type ComponentClass<T extends Component = Component> = new (
  actor: Actor,
  ...args: any[]
) => T;

export type ComponentConstructorParameters<T extends new (actor: Actor, ...args: any[]) => any> =
  T extends new (actor: Actor, ...args: infer P) => any ? P : never;

export default abstract class Component {
  public readonly id: string;
  private readonly _actor: Actor;

  private _initialized = false;
  private _hasBeenActivated = false;
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
    emit(
      new ComponentRemovedEvent({
        actor: this._actor,
        component: this,
        componentType: this.constructor.name,
      }),
    );

    // Decorator-based event cleanup removed; components should clean up explicitly if needed
    this._initialized = false;
  }

  public onInitialize(): void {
    // Can be overridden by subclasses
  }
}
