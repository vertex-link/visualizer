// src/engine/resources/Resource.ts - Phase 2 Implementation
// Based on existing ServiceRegistry system

import { ServiceRegistry } from "../../core/Service.ts";

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
 *
 * Phase 2 Extensions: Added compilation support and future streaming hooks.
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
    protected readonly serviceRegistry: ServiceRegistry;

    // ======== Phase 2 Additions ========

    /**
     * Whether the resource has been compiled into GPU-ready format.
     * Used by MeshResource, ShaderResource, and MaterialResource.
     */
    public isCompiled: boolean = false;

    /**
     * Resource version for streaming and hot-reload support.
     * Incremented when resource data changes.
     */
    public version: number = 1;

    /**
     * Optional layout descriptor for streaming support.
     * Will be properly typed when buffer streaming is implemented.
     */
    public layout?: unknown; // Future: BufferLayout | ShaderLayout | MaterialLayout

    // ======== End Phase 2 Additions ========

    /**
     * @param name A human-readable name for the resource.
     * @param serviceRegistry The service registry for resolving necessary services.
     * @param uuid An optional unique identifier. If not provided, one will be generated.
     */
    protected constructor(name: string, serviceRegistry: ServiceRegistry, uuid?: string) {
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
            // Phase 2: Reset compilation state
            this.isCompiled = false;
            // console.info(`Resource "${this.name}" (${this.uuid}) marked as unloaded (from status: ${ResourceStatus[previousStatus]}).`);
        }
    }

    public isLoaded(): boolean {
        return this.status === ResourceStatus.LOADED;
    }

    // ======== Phase 2 Additions ========

    /**
     * Compile the resource into GPU-ready format.
     * Default implementation does nothing - override in subclasses that need compilation.
     */
    public async compile(): Promise<void> {
        // Default: no compilation needed
        this.isCompiled = true;
    }

    /**
     * Check if the resource has been compiled.
     */
    public isResourceCompiled(): boolean {
        return this.isCompiled;
    }

    /**
     * Increment the resource version (for change tracking).
     */
    protected incrementVersion(): void {
        this.version++;
    }

    /**
     * Create a delta representation of changes since a specific version.
     * Used for streaming updates. Default implementation returns null.
     * Override in subclasses that support streaming.
     *
     * @param sinceVersion The version to create delta from
     * @returns Delta object or null if no changes or streaming not supported
     */
    public createDelta?(sinceVersion: number): unknown {
        // Default: no streaming support
        return null;
    }

    /**
     * Apply a delta to update the resource.
     * Used for streaming updates. Default implementation does nothing.
     * Override in subclasses that support streaming.
     *
     * @param delta The delta to apply
     */
    public applyDelta?(delta: unknown): void {
        // Default: no streaming support
    }

    /**
     * Set the resource layout for streaming support.
     * Will be properly typed when streaming is fully implemented.
     */
    public setLayout(layout: unknown): void {
        this.layout = layout;
    }

    /**
     * Get debug information about the resource.
     */
    public getDebugInfo(): Record<string, unknown> {
        return {
            name: this.name,
            uuid: this.uuid,
            status: ResourceStatus[this.status],
            isLoaded: this.isLoaded(),
            isCompiled: this.isCompiled,
            version: this.version,
            hasLayout: this.layout !== undefined,
            dataSize: this.data instanceof ArrayBuffer ? this.data.byteLength :
                this.data instanceof Float32Array ? this.data.byteLength :
                    this.data ? JSON.stringify(this.data).length : 0
        };
    }

    // ======== End Phase 2 Additions ========

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