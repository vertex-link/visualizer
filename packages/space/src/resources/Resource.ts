import { Context } from "../composables/context";

export enum ResourceStatus {
  UNLOADED = 0,
  LOADING = 1,
  LOADED = 2,
  FAILED = 3,
}

/**
 * Descriptor for a resource slot
 */
export interface SlotDescriptor {
  type: new (...args: any[]) => Resource; // Type constraint
  binding?: number; // WebGPU binding index (for shader resources)
  required: boolean; // Must be filled before resource is complete
  defaultResource?: Resource; // Fallback resource
}

/**
 * Resource slot instance
 */
export interface ResourceSlot {
  name: string;
  descriptor: SlotDescriptor;
  resource: Resource | null;
}

export abstract class Resource<TData = unknown> {
  public readonly id = crypto.randomUUID();
  public readonly name: string;
  public status: ResourceStatus = ResourceStatus.UNLOADED;
  public payload: TData;
  public isCompiled = false;
  public error: Error | null = null;

  private readyPromise: Promise<void>;

  // Slot system for resource composition
  private slots = new Map<string, ResourceSlot>();

  constructor(name: string, payload: TData, context?: Context) {
    this.name = name;
    this.payload = payload;
    this.readyPromise = this.loadAndCompile(context);
  }

  /**
   * The core lifecycle method called by the constructor.
   * It loads data and then immediately tries to compile.
   */
  private async loadAndCompile(_context?: Context): Promise<void> {
    // Prevent re-entry
    if (this.status !== ResourceStatus.UNLOADED) return;
    const context = _context || Context.current();

    this.status = ResourceStatus.LOADING;
    try {
      // 1. Load the resource data
      this.payload = await this.loadInternal();

      // 2. After loading, attempt to compile if the method is implemented
      if (typeof this.compile === "function") {
        console.log(
          `🔧 Resource "${this.name}" (ID: ${this.id}) calling compile(). isCompiled before: ${this.isCompiled}`,
        );
        if (!context) {
          throw new Error(
            `Resource "${this.name}" has a compile() method but no context was provided.`,
          );
        }
        await this.compile(context);
        console.log(
          `🔧 Resource "${this.name}" (ID: ${this.id}) compile() finished. Setting isCompiled = true`,
        );
        this.isCompiled = true;
        console.log(
          `🔧 Resource "${this.name}" (ID: ${this.id}) isCompiled now: ${this.isCompiled}`,
        );
      } else {
        // If there is no compile step, the resource is considered compiled by default.
        console.log(
          `🔧 Resource "${this.name}" (ID: ${this.id}) no compile method. Setting isCompiled = true`,
        );
        this.isCompiled = true;
        console.log(
          `🔧 Resource "${this.name}" (ID: ${this.id}) isCompiled now: ${this.isCompiled}`,
        );
      }

      this.status = ResourceStatus.LOADED;
      console.debug(`✅ Resource "${this.name}" is ready.`);
    } catch (err) {
      this.status = ResourceStatus.FAILED;
      this.error = err as Error;
      console.error(`❌ Failed to initialize resource "${this.name}":`, err);
      // Re-throw so consumers of whenReady() can catch it if they need to.
      throw err;
    }
  }

  /**
   * Returns a promise that resolves when the resource is fully loaded and compiled.
   * Useful for knowing when a resource is safe to use after creation.
   */
  public async whenReady(): Promise<this> {
    // This promise is the same one that the constructor kicks off.
    await this.readyPromise;
    return this;
  }

  /**
   * Subclasses implement this to define how their data is loaded.
   */
  protected async loadInternal(): Promise<TData> {
    return this.payload;
  }

  /**
   * If implemented by a subclass, this method is responsible for compiling
   * the resource. It should acquire any dependencies (like a GPU device) it needs.
   */
  compile?(context: Context): Promise<void>;

  /**
   * Checks if the resource has successfully completed its entire lifecycle.
   */
  isLoaded(): boolean {
    return this.status === ResourceStatus.LOADED;
  }

  // === SLOT SYSTEM ===

  /**
   * Define a slot (called by subclass constructors/loadInternal)
   */
  protected defineSlot(name: string, descriptor: SlotDescriptor): void {
    this.slots.set(name, {
      name,
      descriptor,
      resource: descriptor.defaultResource || null,
    });
  }

  /**
   * Get or set a slot value
   * - slot(name) → get resource from slot
   * - slot(name, resource) → set resource in slot (creates slot if doesn't exist)
   * - slot(name, resource, descriptor) → set resource and define slot
   */
  public slot<T extends Resource>(name: string): T | undefined;
  public slot<T extends Resource>(name: string, resource: T): this;
  public slot<T extends Resource>(
    name: string,
    resource: T,
    descriptor: SlotDescriptor
  ): this;
  public slot<T extends Resource>(
    name: string,
    resource?: T,
    descriptor?: SlotDescriptor
  ): T | undefined | this {
    // Getter: slot(name)
    if (resource === undefined) {
      const slot = this.slots.get(name);
      return slot?.resource as T | undefined;
    }

    // Setter: slot(name, resource) or slot(name, resource, descriptor)
    let slot = this.slots.get(name);

    if (!slot) {
      // Create new slot if doesn't exist
      if (!descriptor) {
        // Infer descriptor from resource
        descriptor = {
          type: resource.constructor as new (...args: any[]) => Resource,
          required: false,
        };
      }
      slot = {
        name,
        descriptor,
        resource: null,
      };
      this.slots.set(name, slot);
    }

    // Type validation
    if (!(resource instanceof slot.descriptor.type)) {
      throw new Error(
        `Resource "${this.name}" slot "${name}" expects ${slot.descriptor.type.name}, got ${resource.constructor.name}`
      );
    }

    slot.resource = resource;
    return this; // Fluent API
  }

  /**
   * Get all slots (read-only)
   */
  public getSlots(): ReadonlyMap<string, ResourceSlot> {
    return this.slots;
  }

  /**
   * Check if all required slots are filled
   */
  public areSlotsComplete(): boolean {
    for (const [name, slot] of this.slots) {
      if (slot.descriptor.required && !slot.resource) {
        console.warn(
          `Resource "${this.name}" missing required slot "${name}"`
        );
        return false;
      }
    }
    return true;
  }

  /**
   * Get list of missing required slots
   */
  public getMissingSlots(): string[] {
    const missing: string[] = [];
    for (const [name, slot] of this.slots) {
      if (slot.descriptor.required && !slot.resource) {
        missing.push(name);
      }
    }
    return missing;
  }

  /**
   * Wait for all slot resources to be ready
   */
  protected async waitForSlots(): Promise<void> {
    const promises: Promise<any>[] = [];

    for (const [name, slot] of this.slots) {
      if (slot.resource) {
        promises.push(slot.resource.whenReady());
      } else if (slot.descriptor.required) {
        throw new Error(
          `Required slot "${name}" not filled in resource "${this.name}"`
        );
      }
    }

    await Promise.all(promises);
  }
}
