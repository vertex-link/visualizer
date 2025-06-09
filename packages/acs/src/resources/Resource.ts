export enum ResourceStatus {
  UNLOADED,
  LOADING,
  LOADED,
  FAILED
}

export abstract class Resource<TData = unknown> {
  public readonly id = crypto.randomUUID();
  public readonly name: string;
  public status: ResourceStatus = ResourceStatus.UNLOADED;
  public payload: TData;
  public error: Error | null = null;

  private loadPromise: Promise<void> | null = null;

  constructor(name: string, payload: TData) {
    this.name = name;
    this.payload = payload;
    this.loadPromise = this.performLoad();
  }

  async whenLoaded() {
    await this.loadPromise;
    return this;
  }

  async load(): Promise<void> {
    if (this.status === ResourceStatus.LOADED) return;
    if (this.loadPromise) return this.loadPromise;

    this.status = ResourceStatus.LOADING;
    this.loadPromise = this.performLoad();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async performLoad(): Promise<void> {
    try {
      this.payload = await this.loadInternal();
      this.status = ResourceStatus.LOADED;

      // Auto-compile if available
      if (this.compile) {
        await this.compile();
      }
    } catch (error) {
      this.status = ResourceStatus.FAILED;
      this.error = error as Error;
      throw error;
    }
  }

  /**
   * Get the resource data (waits for load if needed)
   */
  async get(): Promise<TData> {
    await this.whenLoaded();
    if (this.status === ResourceStatus.FAILED) {
      throw this.error!;
    }
    return this.payload!;
  }

  protected abstract loadInternal(): Promise<TData>;

  // Optional compilation for engine resources
  compile?(): Promise<void>;

  isLoaded(): boolean {
    return this.status === ResourceStatus.LOADED;
  }
}
