/// <reference types="@webgpu/types" />

import { Resource, ResourceStatus } from "./Resource.ts";
import { ServiceRegistry } from "../../core/Service.ts";
import { WebGPURenderer } from "../../webgpu/WebGPURenderer.ts";

/**
 * Shader stage types supported by the engine.
 */
export enum ShaderStage {
    VERTEX = 'vertex',
    FRAGMENT = 'fragment',
    COMPUTE = 'compute'
}

/**
 * Shader source descriptor for creating shader resources.
 */
export interface ShaderDescriptor {
    vertexSource?: string;
    fragmentSource?: string;
    computeSource?: string;
    entryPoints?: {
        vertex?: string;
        fragment?: string;
        compute?: string;
    };
}

/**
 * Compiled shader module wrapper.
 */
export interface CompiledShader {
    stage: ShaderStage;
    module: GPUShaderModule;
    entryPoint: string;
    source: string;
}

/**
 * Resource that holds shader source code and manages compilation.
 * Supports vertex, fragment, and compute shaders.
 */
export class ShaderResource extends Resource {
    private shaderDescriptor: ShaderDescriptor | null = null;
    private compiledShaders: Map<ShaderStage, CompiledShader> = new Map();
    public isCompiled: boolean = false;
    public version: number = 1;

    // Direct device reference instead of going through service
    private device: GPUDevice | null = null;

    constructor(name: string, serviceRegistry: ServiceRegistry, uuid?: string) {
        super(name, serviceRegistry, uuid);
    }

    /**
     * Set the GPU device for compilation (called by processor/manager)
     */
    setDevice(device: GPUDevice): void {
        this.device = device;
    }

    /**
     * Get available shader stages.
     */
    get availableStages(): ShaderStage[] {
        if (!this.shaderDescriptor) return [];

        const stages: ShaderStage[] = [];
        if (this.shaderDescriptor.vertexSource) stages.push(ShaderStage.VERTEX);
        if (this.shaderDescriptor.fragmentSource) stages.push(ShaderStage.FRAGMENT);
        if (this.shaderDescriptor.computeSource) stages.push(ShaderStage.COMPUTE);

        return stages;
    }

    /**
     * Check if shader has a specific stage.
     */
    hasStage(stage: ShaderStage): boolean {
        return this.availableStages.includes(stage);
    }

    /**
     * Get compiled shader for a specific stage.
     */
    getCompiledShader(stage: ShaderStage): CompiledShader | null {
        return this.compiledShaders.get(stage) || null;
    }

    /**
     * Get vertex shader source.
     */
    get vertexSource(): string | undefined {
        return this.shaderDescriptor?.vertexSource;
    }

    /**
     * Get fragment shader source.
     */
    get fragmentSource(): string | undefined {
        return this.shaderDescriptor?.fragmentSource;
    }

    /**
     * Get compute shader source.
     */
    get computeSource(): string | undefined {
        return this.shaderDescriptor?.computeSource;
    }

    /**
     * Get entry point for a shader stage.
     */
    getEntryPoint(stage: ShaderStage): string {
        const entryPoints = this.shaderDescriptor?.entryPoints;

        switch (stage) {
            case ShaderStage.VERTEX:
                return entryPoints?.vertex || 'vs_main';
            case ShaderStage.FRAGMENT:
                return entryPoints?.fragment || 'fs_main';
            case ShaderStage.COMPUTE:
                return entryPoints?.compute || 'cs_main';
            default:
                return 'main';
        }
    }

    /**
     * Set shader data from descriptor.
     */
    setShaderData(descriptor: ShaderDescriptor): void {
        this.shaderDescriptor = descriptor;
        this.isCompiled = false; // Need to recompile
        this.data = descriptor; // Store as resource data
    }

    /**
     * Create shader from source strings.
     */
    static createFromSource(
        name: string,
        serviceRegistry: ServiceRegistry,
        vertexSource?: string,
        fragmentSource?: string,
        computeSource?: string
    ): ShaderResource {
        const shader = new ShaderResource(name, serviceRegistry);

        shader.setShaderData({
            vertexSource,
            fragmentSource,
            computeSource,
            entryPoints: {
                vertex: 'vs_main',
                fragment: 'fs_main',
                compute: 'cs_main'
            }
        });

        return shader;
    }

    /**
     * Create shader from combined WGSL source (contains both vertex and fragment).
     */
    static createFromWGSL(
        name: string,
        serviceRegistry: ServiceRegistry,
        source: string,
        stages: { vertex?: string, fragment?: string, compute?: string } = {}
    ): ShaderResource {
        const shader = new ShaderResource(name, serviceRegistry);

        shader.setShaderData({
            vertexSource: stages.vertex !== undefined ? source : undefined,
            fragmentSource: stages.fragment !== undefined ? source : undefined,
            computeSource: stages.compute !== undefined ? source : undefined,
            entryPoints: {
                vertex: stages.vertex || 'vs_main',
                fragment: stages.fragment || 'fs_main',
                compute: stages.compute || 'cs_main'
            }
        });

        return shader;
    }

    /**
     * Load shader source code.
     */
    protected async performLoad(): Promise<void> {
        if (!this.shaderDescriptor) {
            throw new Error(`ShaderResource "${this.name}": No shader data provided`);
        }

        // Validate that at least one stage is provided
        if (this.availableStages.length === 0) {
            throw new Error(`ShaderResource "${this.name}": No shader stages provided`);
        }

        this.data = this.shaderDescriptor;
        console.debug(`ShaderResource "${this.name}" loaded with stages: ${this.availableStages.join(', ')}`);
    }

    /**
     * Compile shader source into GPU modules.
     * Requires device to be set first!
     */
    async compile(): Promise<void> {
        if (this.isCompiled || !this.isLoaded()) {
            return;
        }

        if (!this.device) {
            throw new Error(`ShaderResource "${this.name}": No GPU device set for compilation. Call setDevice() first.`);
        }

        if (!this.shaderDescriptor) {
            throw new Error(`ShaderResource "${this.name}": Cannot compile without shader data`);
        }

        try {
            // Clear previous compilation
            this.compiledShaders.clear();

            // Compile each available stage
            for (const stage of this.availableStages) {
                const compiled = await this.compileStage(stage);
                this.compiledShaders.set(stage, compiled);
            }

            this.isCompiled = true;
            console.debug(`ShaderResource "${this.name}" compiled successfully`);

        } catch (error) {
            console.error(`Failed to compile ShaderResource "${this.name}":`, error);
            this.compiledShaders.clear();
            throw error;
        }
    }

    /**
     * Unload shader data and free GPU resources.
     */
    protected async performUnload(): Promise<void> {
        // Clear compiled shaders (GPU modules don't need explicit cleanup in WebGPU)
        this.compiledShaders.clear();
        this.isCompiled = false;
        this.shaderDescriptor = null;
        this.device = null;

        console.debug(`ShaderResource "${this.name}" unloaded`);
    }

    /**
     * Compile a specific shader stage.
     */
    private async compileStage(stage: ShaderStage): Promise<CompiledShader> {
        if (!this.shaderDescriptor || !this.device) {
            throw new Error('No shader data or device for compilation');
        }

        let source: string;
        switch (stage) {
            case ShaderStage.VERTEX: source = this.shaderDescriptor.vertexSource!; break;
            case ShaderStage.FRAGMENT: source = this.shaderDescriptor.fragmentSource!; break;
            case ShaderStage.COMPUTE: source = this.shaderDescriptor.computeSource!; break;
            default: throw new Error(`Unsupported shader stage: ${stage}`);
        }

        // Compile through device directly
        const module = this.device.createShaderModule({
            code: source,
            label: `${this.name}_${stage}`
        });

        return {
            stage,
            module,
            entryPoint: this.getEntryPoint(stage),
            source
        };
    }

    /**
     * Validate WGSL shader source (basic validation).
     */
    validateSource(source: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Basic WGSL validation
        if (!source.trim()) {
            errors.push('Shader source is empty');
        }

        // Check for required entry points based on available stages
        if (this.hasStage(ShaderStage.VERTEX) && !source.includes('@vertex')) {
            errors.push('Vertex stage requires @vertex entry point');
        }

        if (this.hasStage(ShaderStage.FRAGMENT) && !source.includes('@fragment')) {
            errors.push('Fragment stage requires @fragment entry point');
        }

        if (this.hasStage(ShaderStage.COMPUTE) && !source.includes('@compute')) {
            errors.push('Compute stage requires @compute entry point');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Future streaming support - create delta for changed shader source.
     */
    createDelta?(sinceVersion: number): unknown {
        // Placeholder for future streaming implementation
        if (sinceVersion < this.version) {
            return {
                type: 'shader_delta',
                resourceId: this.uuid,
                fromVersion: sinceVersion,
                toVersion: this.version,
                // Would include source code changes
            };
        }
        return null;
    }
}