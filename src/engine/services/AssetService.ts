// src/engine/services/AssetService.ts - Corrected Implementation

import { IService, ServiceKey, ServiceRegistry } from "../../core/Service.ts";
import { MeshResource, MeshDescriptor } from "../resources/MeshResource.ts";
import { ShaderResource, ShaderDescriptor } from "../resources/ShaderResource.ts";
import { MaterialResource, MaterialDescriptor, UniformDescriptor } from "../resources/MaterialResource.ts";
import { GeometryUtils } from "../resources/GeometryUtils.ts";
import { VertexLayout } from "../rendering/interfaces/IPipeline.ts";

// Service key for dependency injection
export const IAssetServiceKey: ServiceKey = Symbol.for('IAssetService');

/**
 * Asset loading options for customizing load behavior.
 */
export interface AssetLoadOptions {
    /** Force reload even if already cached */
    forceReload?: boolean;
    /** Custom cache key (defaults to path/name) */
    cacheKey?: string;
    /** Load dependencies automatically */
    loadDependencies?: boolean;
}

/**
 * Interface for the Asset Service.
 * Manages loading, caching, and creation of engine resources.
 */
export interface IAssetService extends IService {
    // Resource loading
    loadMesh(path: string, options?: AssetLoadOptions): Promise<MeshResource>;
    loadShader(path: string, options?: AssetLoadOptions): Promise<ShaderResource>;
    loadMaterial(path: string, options?: AssetLoadOptions): Promise<MaterialResource>;

    // Resource creation
    createMesh(name: string, descriptor: MeshDescriptor): Promise<MeshResource>;
    createShader(name: string, descriptor: ShaderDescriptor): Promise<ShaderResource>;
    createMaterial(name: string, descriptor: MaterialDescriptor): Promise<MaterialResource>;

    // Procedural geometry creation
    createBoxMesh(name: string, width?: number, height?: number, depth?: number): Promise<MeshResource>;
    createSphereMesh(name: string, radius?: number, segments?: number, rings?: number): Promise<MeshResource>;
    createPlaneMesh(name: string, width?: number, depth?: number, segmentsW?: number, segmentsD?: number): Promise<MeshResource>;
    createQuadMesh(name: string, width?: number, height?: number): Promise<MeshResource>;

    // Basic shader creation
    createBasicColorShader(name: string): Promise<ShaderResource>;
    createBasicTexturedShader(name: string): Promise<ShaderResource>;

    // Material creation helpers
    createBasicMaterial(name: string, shader: ShaderResource, color?: number[]): Promise<MaterialResource>;

    // Cache management
    getResource<T>(key: string): T | undefined;
    hasResource(key: string): boolean;
    removeResource(key: string): boolean;
    clearCache(): void;
    getCacheStats(): { count: number; keys: string[] };
}

/**
 * Implementation of the Asset Service.
 * Provides resource loading, creation, and caching functionality.
 */
export class AssetService implements IAssetService {
    private serviceRegistry: ServiceRegistry;
    private resourceCache: Map<string, any> = new Map();
    private loadingPromises: Map<string, Promise<any>> = new Map();

    constructor(serviceRegistry: ServiceRegistry) {
        this.serviceRegistry = serviceRegistry;
    }

    /**
     * Initialize the asset service.
     */
    async initialize(): Promise<void> {
        console.log('AssetService initialized');
    }

    /**
     * Load a mesh resource from a file path.
     */
    async loadMesh(path: string, options?: AssetLoadOptions): Promise<MeshResource> {
        const cacheKey = options?.cacheKey || `mesh:${path}`;

        // Check cache first
        if (!options?.forceReload && this.resourceCache.has(cacheKey)) {
            return this.resourceCache.get(cacheKey);
        }

        // Check if already loading
        if (this.loadingPromises.has(cacheKey)) {
            return await this.loadingPromises.get(cacheKey);
        }

        // Start loading
        const loadPromise = this.performMeshLoad(path, cacheKey);
        this.loadingPromises.set(cacheKey, loadPromise);

        try {
            const mesh = await loadPromise;
            this.resourceCache.set(cacheKey, mesh);
            return mesh;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    /**
     * Load a shader resource from a file path.
     */
    async loadShader(path: string, options?: AssetLoadOptions): Promise<ShaderResource> {
        const cacheKey = options?.cacheKey || `shader:${path}`;

        // Check cache first
        if (!options?.forceReload && this.resourceCache.has(cacheKey)) {
            return this.resourceCache.get(cacheKey);
        }

        // Check if already loading
        if (this.loadingPromises.has(cacheKey)) {
            return await this.loadingPromises.get(cacheKey);
        }

        // Start loading
        const loadPromise = this.performShaderLoad(path, cacheKey);
        this.loadingPromises.set(cacheKey, loadPromise);

        try {
            const shader = await loadPromise;
            this.resourceCache.set(cacheKey, shader);
            return shader;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    /**
     * Load a material resource from a file path.
     */
    async loadMaterial(path: string, options?: AssetLoadOptions): Promise<MaterialResource> {
        const cacheKey = options?.cacheKey || `material:${path}`;

        // Check cache first
        if (!options?.forceReload && this.resourceCache.has(cacheKey)) {
            return this.resourceCache.get(cacheKey);
        }

        // Check if already loading
        if (this.loadingPromises.has(cacheKey)) {
            return await this.loadingPromises.get(cacheKey);
        }

        // Start loading
        const loadPromise = this.performMaterialLoad(path, cacheKey, options);
        this.loadingPromises.set(cacheKey, loadPromise);

        try {
            const material = await loadPromise;
            this.resourceCache.set(cacheKey, material);
            return material;
        } finally {
            this.loadingPromises.delete(cacheKey);
        }
    }

    /**
     * Create a mesh resource from a descriptor.
     */
    async createMesh(name: string, descriptor: MeshDescriptor): Promise<MeshResource> {
        const mesh = new MeshResource(name, this.serviceRegistry);
        mesh.setMeshData(descriptor);
        await mesh.load();

        // Cache the created mesh
        this.resourceCache.set(`mesh:${name}`, mesh);
        return mesh;
    }

    /**
     * Create a shader resource from a descriptor.
     */
    async createShader(name: string, descriptor: ShaderDescriptor): Promise<ShaderResource> {
        const shader = new ShaderResource(name, this.serviceRegistry);
        shader.setShaderData(descriptor);
        await shader.load();

        // Cache the created shader
        this.resourceCache.set(`shader:${name}`, shader);
        return shader;
    }

    /**
     * Create a material resource from a descriptor.
     */
    async createMaterial(name: string, descriptor: MaterialDescriptor): Promise<MaterialResource> {
        const material = new MaterialResource(name, this.serviceRegistry);
        material.setMaterialData(descriptor);
        await material.load();

        // Cache the created material
        this.resourceCache.set(`material:${name}`, material);
        return material;
    }

    /**
     * Create a box mesh using procedural generation.
     */
    async createBoxMesh(
        name: string,
        width: number = 2,
        height: number = 2,
        depth: number = 2
    ): Promise<MeshResource> {
        const descriptor = GeometryUtils.createBox(width, height, depth, true, true);
        return await this.createMesh(name, descriptor);
    }

    /**
     * Create a sphere mesh using procedural generation.
     */
    async createSphereMesh(
        name: string,
        radius: number = 1,
        segments: number = 16,
        rings: number = 12
    ): Promise<MeshResource> {
        const descriptor = GeometryUtils.createSphere(radius, segments, rings, true, true);
        return await this.createMesh(name, descriptor);
    }

    /**
     * Create a plane mesh using procedural generation.
     */
    async createPlaneMesh(
        name: string,
        width: number = 2,
        depth: number = 2,
        segmentsW: number = 1,
        segmentsD: number = 1
    ): Promise<MeshResource> {
        const descriptor = GeometryUtils.createPlane(width, depth, segmentsW, segmentsD, true, true);
        return await this.createMesh(name, descriptor);
    }

    /**
     * Create a quad mesh using procedural generation.
     */
    async createQuadMesh(name: string, width: number = 2, height: number = 2): Promise<MeshResource> {
        const descriptor = GeometryUtils.createQuad(width, height, true);
        return await this.createMesh(name, descriptor);
    }

    /**
     * Create a basic color shader.
     */
    async createBasicColorShader(name: string): Promise<ShaderResource> {
        const shaderSource = `
struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
}

struct Uniforms {
    mvpMatrix: mat4x4f,
    modelMatrix: mat4x4f,
    color: vec4f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    
    let worldPos4 = uniforms.modelMatrix * vec4f(input.position, 1.0);
    output.worldPos = worldPos4.xyz;
    
    // Transform normal to world space (assuming uniform scaling)
    output.normal = (uniforms.modelMatrix * vec4f(input.normal, 0.0)).xyz;
    output.uv = input.uv;
    
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    // Simple diffuse lighting with fixed light direction
    let lightDir = normalize(vec3f(1.0, 1.0, 1.0));
    let normal = normalize(input.normal);
    let diffuse = max(dot(normal, lightDir), 0.2); // Ambient minimum
    
    let finalColor = uniforms.color.rgb * diffuse;
    return vec4f(finalColor, uniforms.color.a);
}
`;

        const descriptor: ShaderDescriptor = {
            vertexSource: shaderSource,
            fragmentSource: shaderSource,
            entryPoints: {
                vertex: 'vs_main',
                fragment: 'fs_main'
            }
        };

        return await this.createShader(name, descriptor);
    }

    /**
     * Create a basic textured shader.
     */
    async createBasicTexturedShader(name: string): Promise<ShaderResource> {
        // Placeholder for textured shader - will be implemented when texture support is added
        console.warn('Textured shaders not yet implemented, creating color shader instead');
        return await this.createBasicColorShader(name);
    }

    /**
     * Create a basic material with color.
     */
    async createBasicMaterial(
        name: string,
        shader: ShaderResource,
        color: number[] = [1.0, 0.5, 0.2, 1.0]
    ): Promise<MaterialResource> {
        const uniforms: Record<string, UniformDescriptor> = {
            mvpMatrix: {
                binding: 0,
                type: 'mat4',
                size: 64, // 16 floats * 4 bytes
                value: new Float32Array(16) // Identity matrix initially
            },
            modelMatrix: {
                binding: 1,
                type: 'mat4',
                size: 64,
                value: new Float32Array(16) // Identity matrix initially
            },
            color: {
                binding: 2,
                type: 'vec4',
                size: 16, // 4 floats * 4 bytes
                value: color
            }
        };

        const vertexLayout: VertexLayout = {
            stride: 32, // position(12) + normal(12) + uv(8)
            attributes: [
                { location: 0, format: 'float32x3', offset: 0 }, // position
                { location: 1, format: 'float32x3', offset: 12 }, // normal
                { location: 2, format: 'float32x2', offset: 24 }  // uv
            ]
        };

        const descriptor: MaterialDescriptor = {
            shader,
            uniforms,
            vertexLayout,
            renderState: {
                cullMode: 'back',
                depthWrite: true,
                depthTest: true,
                blendMode: 'none'
            }
        };

        return await this.createMaterial(name, descriptor);
    }

    /**
     * Get a cached resource.
     */
    getResource<T>(key: string): T | undefined {
        return this.resourceCache.get(key);
    }

    /**
     * Check if a resource is cached.
     */
    hasResource(key: string): boolean {
        return this.resourceCache.has(key);
    }

    /**
     * Remove a resource from cache.
     */
    removeResource(key: string): boolean {
        return this.resourceCache.delete(key);
    }

    /**
     * Clear all cached resources.
     */
    clearCache(): void {
        this.resourceCache.clear();
        this.loadingPromises.clear();
    }

    /**
     * Get cache statistics.
     */
    getCacheStats(): { count: number; keys: string[] } {
        return {
            count: this.resourceCache.size,
            keys: Array.from(this.resourceCache.keys())
        };
    }

    /**
     * Dispose of the asset service.
     */
    async dispose(): Promise<void> {
        // Unload all cached resources
        for (const resource of this.resourceCache.values()) {
            if (resource && typeof resource.unload === 'function') {
                try {
                    await resource.unload();
                } catch (error) {
                    console.error('Error unloading resource during AssetService disposal:', error);
                }
            }
        }

        this.clearCache();
        console.log('AssetService disposed');
    }

    /**
     * Load mesh from file (placeholder implementation).
     */
    private async performMeshLoad(path: string, cacheKey: string): Promise<MeshResource> {
        // For Phase 2, we'll create a simple box mesh as placeholder
        // Future: Implement actual file loading (OBJ, GLTF, etc.)
        console.warn(`Mesh file loading not yet implemented for "${path}", creating default box`);

        const descriptor = GeometryUtils.createBox(2, 2, 2, true, true);
        return await this.createMesh(cacheKey, descriptor);
    }

    /**
     * Load shader from file (placeholder implementation).
     */
    private async performShaderLoad(path: string, cacheKey: string): Promise<ShaderResource> {
        // For Phase 2, we'll try to fetch the shader file
        // Future: Implement more sophisticated shader loading with includes, etc.

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${response.statusText}`);
            }

            const source = await response.text();
            const descriptor: ShaderDescriptor = {
                vertexSource: source,
                fragmentSource: source,
                entryPoints: {
                    vertex: 'vs_main',
                    fragment: 'fs_main'
                }
            };

            return await this.createShader(cacheKey, descriptor);

        } catch (error) {
            console.error(`Failed to load shader from "${path}":`, error);
            // Fallback to basic shader
            return await this.createBasicColorShader(cacheKey);
        }
    }

    /**
     * Load material from file (placeholder implementation).
     */
    private async performMaterialLoad(
        path: string,
        cacheKey: string,
        options?: AssetLoadOptions
    ): Promise<MaterialResource> {
        // For Phase 2, create a basic material with default shader
        // Future: Implement material file format (JSON, etc.)
        console.warn(`Material file loading not yet implemented for "${path}", creating default material`);

        const shader = await this.createBasicColorShader(`${cacheKey}_shader`);
        return await this.createBasicMaterial(cacheKey, shader);
    }
}