import { ShaderResource } from "./ShaderResource";
import {MaterialResource, UniformDescriptor} from "./MaterialResource";
import {MeshDescriptor, MeshResource} from "./MeshResource";
import {Resource} from "../resources/Resource";
import {Component, emit, Event, EventBus, IService} from "@vertex-link/acs";
import {VertexLayout} from "@vertex-link/engine/rendering/interfaces/IPipeline";

// Resource events
export class ResourceLoadedEvent extends Event<{ resource: Resource }> {
    static readonly eventType = 'resource.loaded';
}

export class ResourceUnloadedEvent extends Event<{ resource: Resource }> {
    static readonly eventType = 'resource.unloaded';
}

export class ResourceFailedEvent extends Event<{ resource: Resource; error: Error }> {
    static readonly eventType = 'resource.failed';
}

// Service key for resource manager
export const IResourceManagerKey = Symbol.for("IResourceManager");

/**
 * Resource handle - provides safe access to resources
 */
export class ResourceHandle<T extends Resource = Resource> {
    constructor(
        private manager: ResourceManager,
        private resourceId: string
    ) {}

    /**
     * Get the resource (loads if needed)
     */
    async get(): Promise<T | null> {
        return this.manager.getResource<T>(this.resourceId);
    }

    /**
     * Get resource synchronously (returns null if not loaded)
     */
    getSync(): T | null {
        return this.manager.getResourceSync<T>(this.resourceId);
    }

    /**
     * Check if resource is loaded
     */
    isLoaded(): boolean {
        const resource = this.getSync();
        return resource?.isLoaded() ?? false;
    }

    /**
     * Preload the resource
     */
    async preload(): Promise<void> {
        await this.get();
    }
}

/**
 * Resource factory interface
 */
export interface ResourceFactory<T extends Resource = Resource> {
    create(name: string, data: any): T;
}

/**
 * Resource manager service - integrated with ECS
 */
export class ResourceManager implements IService {
    private resources = new Map<string, Resource>();
    private factories = new Map<string, ResourceFactory>();
    private device: GPUDevice | null = null;
    private loadingPromises = new Map<string, Promise<void>>();

    constructor(private eventBus?: EventBus) {}

    /**
     * Initialize the resource manager
     */
    async initialize(): Promise<void> {
        // Register default factories
        this.registerFactory('shader', {
            create: (name, data) => {
                const shader = new ShaderResource(name, null as any);
                shader.setShaderData(data);
                return shader;
            }
        });

        this.registerFactory('material', {
            create: (name, data) => {
                const material = new MaterialResource(name, null as any);
                material.setMaterialData(data);
                return material;
            }
        });

        this.registerFactory('mesh', {
            create: (name, data) => {
                const mesh = new MeshResource(name, null as any);
                mesh.setMeshData(data);
                return mesh;
            }
        });

        console.log("📦 ResourceManager initialized");
    }

    /**
     * Set the GPU device for resource compilation
     */
    setDevice(device: GPUDevice): void {
        this.device = device;
    }

    /**
     * Register a resource factory
     */
    registerFactory<T extends Resource>(type: string, factory: ResourceFactory<T>): void {
        this.factories.set(type, factory);
    }

    /**
     * Create a resource handle
     */
    createHandle<T extends Resource>(resourceId: string): ResourceHandle<T> {
        return new ResourceHandle<T>(this, resourceId);
    }

    /**
     * Add a resource to the manager
     */
    addResource(resource: Resource): ResourceHandle {
        this.resources.set(resource.uuid, resource);
        return this.createHandle(resource.uuid);
    }

    /**
     * Create and add a resource
     */
    createResource<T extends Resource>(
        type: string,
        name: string,
        data: any
    ): ResourceHandle<T> | null {
        const factory = this.factories.get(type);
        if (!factory) {
            console.error(`No factory registered for resource type: ${type}`);
            return null;
        }

        const resource = factory.create(name, data) as T;
        return this.addResource(resource) as ResourceHandle<T>;
    }

    /**
     * Get a resource by ID (loads if needed)
     */
    async getResource<T extends Resource>(resourceId: string): Promise<T | null> {
        const resource = this.resources.get(resourceId) as T;
        if (!resource) return null;

        // Load if needed
        if (!resource.isLoaded()) {
            await this.loadResource(resource);
        }

        return resource;
    }

    /**
     * Get resource synchronously
     */
    getResourceSync<T extends Resource>(resourceId: string): T | null {
        return this.resources.get(resourceId) as T || null;
    }

    /**
     * Load a resource
     */
    private async loadResource(resource: Resource): Promise<void> {
        // Check if already loading
        const existingPromise = this.loadingPromises.get(resource.uuid);
        if (existingPromise) {
            return existingPromise;
        }

        // Create loading promise
        const loadPromise = (async () => {
            try {
                await resource.load();

                // Auto-compile if device available
                if (this.device && 'setDevice' in resource) {
                    (resource as any).setDevice(this.device);
                    if ('compile' in resource) {
                        await (resource as any).compile();
                    }
                }

                // Emit loaded event
                emit(new ResourceLoadedEvent({ resource }));

            } catch (error) {
                console.error(`Failed to load resource ${resource.name}:`, error);
                emit(new ResourceFailedEvent({
                    resource,
                    error: error as Error
                }));
                throw error;
            } finally {
                this.loadingPromises.delete(resource.uuid);
            }
        })();

        this.loadingPromises.set(resource.uuid, loadPromise);
        return loadPromise;
    }

    /**
     * Unload a resource
     */
    async unloadResource(resourceId: string): Promise<void> {
        const resource = this.resources.get(resourceId);
        if (!resource) return;

        await resource.unload();
        this.resources.delete(resourceId);

        emit(new ResourceUnloadedEvent({ resource }));
    }

    /**
     * Preload multiple resources
     */
    async preloadResources(resourceIds: string[]): Promise<void> {
        const promises = resourceIds.map(id => this.getResource(id));
        await Promise.all(promises);
    }

    /**
     * Get statistics
     */
    getStats(): {
        totalResources: number;
        loadedResources: number;
        compiledResources: number;
        resourcesByType: Map<string, number>;
    } {
        let loaded = 0;
        let compiled = 0;
        const byType = new Map<string, number>();

        for (const resource of this.resources.values()) {
            if (resource.isLoaded()) loaded++;
            if ((resource as any).isCompiled) compiled++;

            const type = resource.constructor.name;
            byType.set(type, (byType.get(type) || 0) + 1);
        }

        return {
            totalResources: this.resources.size,
            loadedResources: loaded,
            compiledResources: compiled,
            resourcesByType: byType
        };
    }

    /**
     * Dispose the resource manager
     */
    async dispose(): Promise<void> {
        // Unload all resources
        const promises = Array.from(this.resources.keys()).map(id =>
            this.unloadResource(id)
        );
        await Promise.all(promises);

        this.resources.clear();
        this.factories.clear();
        this.loadingPromises.clear();
    }
}

/**
 * Resource component - attaches resources to actors
 */
export class ResourceComponent extends Component {
    private handles = new Map<string, ResourceHandle>();

    /**
     * Attach a resource handle
     */
    attachResource(name: string, handle: ResourceHandle): void {
        this.handles.set(name, handle);
    }

    /**
     * Get a resource handle
     */
    getResourceHandle<T extends Resource>(name: string): ResourceHandle<T> | undefined {
        return this.handles.get(name) as ResourceHandle<T>;
    }

    /**
     * Get a resource (async)
     */
    async getResource<T extends Resource>(name: string): Promise<T | null> {
        const handle = this.handles.get(name);
        return handle ? handle.get() as Promise<T | null> : null;
    }

    /**
     * Preload all attached resources
     */
    async preloadAll(): Promise<void> {
        const promises = Array.from(this.handles.values()).map(h => h.preload());
        await Promise.all(promises);
    }
}

// Helper functions for easy resource creation
export function createShaderHandle(
    manager: ResourceManager,
    name: string,
    vertexSource: string,
    fragmentSource: string
): ResourceHandle<ShaderResource> | null {
    return manager.createResource<ShaderResource>('shader', name, {
        vertexSource,
        fragmentSource,
        entryPoints: {
            vertex: 'vs_main',
            fragment: 'fs_main'
        }
    });
}

export async function createMaterialHandle(
    resourceManager: ResourceManager,
    name: string,
    shaderHandle: ResourceHandle,
    uniforms: Record<string, UniformDescriptor>,
    vertexLayout?: VertexLayout
): Promise<ResourceHandle | null> {
    try {
        if (!shaderHandle) {
            throw new Error(`No shader handle provided for material ${name}`);
        }

        // Wait for shader to be available FIRST
        const shader = await shaderHandle.get() as ShaderResource;
        if (!shader) {
            throw new Error(`Invalid shader handle for material ${name} - shader resource is null`);
        }

        // Create material resource
        const materialResource = new MaterialResource(name, resourceManager['serviceRegistry']);
        
        // Set the material data SYNCHRONOUSLY before adding to resource manager
        materialResource.setMaterialData({
            shader: shader,
            uniforms: uniforms,
            vertexLayout: vertexLayout,
            renderState: {
                cullMode: 'back',
                depthWrite: true,
                depthTest: true,
                blendMode: 'none',
                wireframe: false
            }
        });
        
        // Add to resource manager AFTER data is set
        const handle = resourceManager.addResource(materialResource);
        
        console.log(`✅ Created material handle "${name}" with data set`);
        
        return handle;
    } catch (error) {
        console.error(`❌ Failed to create material handle "${name}":`, error);
        return null;
    }
}

// Add this function to ResourceManager.ts to properly create mesh handles

/**
 * Create a mesh handle from mesh descriptor
 */
export function createMeshHandle(
    resourceManager: ResourceManager,
    name: string,
    descriptor: MeshDescriptor
): ResourceHandle | null {
    try {
        const meshResource = new MeshResource(name, resourceManager['serviceRegistry']);
        
        // Set the mesh data
        meshResource.setMeshData(descriptor);
        
        // Add to resource manager
        const handle = resourceManager.addResource(meshResource);
        
        console.log(`✅ Created mesh handle "${name}" with ${descriptor.vertices.length / (descriptor.vertexStride / 4)} vertices`);
        
        return handle;
    } catch (error) {
        console.error(`❌ Failed to create mesh handle "${name}":`, error);
        return null;
    }
}