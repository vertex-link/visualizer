import type { Context } from "../composables/context";

export enum ResourceStatus {
  UNLOADED = 0,
  LOADING = 1,
  LOADED = 2,
  FAILED = 3,
}

export abstract class Resource<TData = unknown> {
  public readonly id = crypto.randomUUID();
  public readonly name: string;
  public status: ResourceStatus = ResourceStatus.UNLOADED;
  public payload: TData;
  public isCompiled = false;
  public error: Error | null = null;

  private readyPromise: Promise<void>;

  constructor(name: string, payload: TData, context?: Context) {
    this.name = name;
    this.payload = payload;
    this.readyPromise = this.loadAndCompile(context);
  }

  /**
   * The core lifecycle method called by the constructor.
   * It loads data and then immediately tries to compile.
   */
  private async loadAndCompile(context?: Context): Promise<void> {
    // Prevent re-entry
    if (this.status !== ResourceStatus.UNLOADED) return;

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
}
