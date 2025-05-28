
export enum ResourceStatus {
    UNLOADED,
    LOADING,
    LOADED,
    FAILED_TO_LOAD,
    UNLOADING,
}

/**
 * Abstract base class for all engine resources.
 * Resources are provided with a service registry at construction time
 * to resolve any services they might need for loading or unloading.
 */
export abstract class Resource {
    public readonly uuid: string;
    public readonly name: string;
    public status: ResourceStatus = ResourceStatus.UNLOADED;
    public data: unknown = null;

    /**
     * The service registry provided at construction, for use by derived classes
     * in their performLoad/performUnload methods.
     */
    protected readonly serviceRegistry: IServiceRegistry;

    /**
     * @param name A human-readable name for the resource.
     * @param serviceRegistry The service registry for resolving necessary services.
     * @param uuid An optional unique identifier. If not provided, one will be generated.
     */
    protected constructor(name: string, serviceRegistry: IServiceRegistry, uuid?: string) {
        this.name = name;
        this.serviceRegistry = serviceRegistry;
        this.uuid = uuid || `resource-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    }

    /**
     * Initiates the loading of the resource.
     * Manages status and calls the subclass-specific `performLoad`.
     */
    public async load(): Promise<void> {
        if (this.status === ResourceStatus.LOADED || this.status === ResourceStatus.LOADING) {
            return Promise.resolve();
        }

        this.status = ResourceStatus.LOADING;
        // console.debug(`Loading resource "${this.name}" (${this.uuid})...`);

        try {
            await this.performLoad(); // serviceRegistry is available via this.serviceRegistry
            this.status = ResourceStatus.LOADED;
            // console.info(`Resource "${this.name}" (${this.uuid}) loaded successfully.`);
        } catch (error) {
            this.status = ResourceStatus.FAILED_TO_LOAD;
            this.data = null;
            console.error(`Failed to load resource "${this.name}" (${this.uuid}):`, error);
            throw error;
        }
    }

    /**
     * Initiates the unloading of the resource.
     * Manages status and calls the subclass-specific `performUnload`.
     */
    public async unload(): Promise<void> {
        if (this.status === ResourceStatus.UNLOADED || this.status === ResourceStatus.UNLOADING) {
            return Promise.resolve();
        }
        if (this.status === ResourceStatus.LOADING) {
            console.warn(`Resource "${this.name}" (${this.uuid}) is currently loading. Unload will proceed but may be interrupted.`);
        }

        const previousStatus = this.status;
        this.status = ResourceStatus.UNLOADING;
        // console.debug(`Unloading resource "${this.name}" (${this.uuid})...`);

        try {
            await this.performUnload(); // serviceRegistry is available via this.serviceRegistry
        } catch (error) {
            console.error(`Error during unload of resource "${this.name}" (${this.uuid}), but proceeding to mark as unloaded:`, error);
        } finally {
            this.status = ResourceStatus.UNLOADED;
            this.data = null;
            // console.info(`Resource "${this.name}" (${this.uuid}) marked as unloaded (from status: ${ResourceStatus[previousStatus]}).`);
        }
    }

    public isLoaded(): boolean {
        return this.status === ResourceStatus.LOADED;
    }

    /**
     * Abstract method for derived classes to implement loading logic.
     * Should use `this.serviceRegistry` to resolve any needed services.
     * Should populate `this.data` upon successful loading.
     * @protected
     */
    protected abstract performLoad(): Promise<void>;

    /**
     * Abstract method for derived classes to implement unloading logic.
     * Should use `this.serviceRegistry` to resolve any needed services if necessary for cleanup.
     * Should clear `this.data`.
     * @protected
     */
    protected abstract performUnload(): Promise<void>;
}
