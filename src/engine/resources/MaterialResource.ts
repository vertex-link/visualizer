// src/engine/resources/MaterialResource.ts

import { Resource, ResourceStatus } from "./Resource.ts";
import { ServiceRegistry } from "./../../core/Service.ts";
import { ShaderResource } from "./ShaderResource.ts";
import { IPipeline, PipelineDescriptor, VertexLayout } from "../rendering/interfaces/IPipeline.ts";

/**
 * Uniform data types supported by materials.
 */
export type UniformValue = number | number[] | Float32Array | Int32Array | Uint32Array;

/**
 * Uniform descriptor for material properties.
 */
export interface UniformDescriptor {
    binding: number;
    type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'mat4' | 'int' | 'uint';
    size: number; // Size in bytes
    value: UniformValue;
}

/**
 * Material descriptor for creating material resources.
 */
export interface MaterialDescriptor {
    shader: ShaderResource;
    uniforms?: Record<string, UniformDescriptor>;
    vertexLayout?: VertexLayout;
    renderState?: {
        cullMode?: 'none' | 'front' | 'back';
        depthWrite?: boolean;
        depthTest?: boolean;
        blendMode?: 'none' | 'alpha' | 'additive';
        wireframe?: boolean;
    };
}

/**
 * Resource that combines shaders with uniform data to create render materials.
 * Manages render pipeline creation and uniform buffer updates.
 */
export class MaterialResource extends Resource {
    private materialDescriptor: MaterialDescriptor | null = null;
    private pipeline: IPipeline | null = null;
    private uniformBuffer: ArrayBuffer | null = null;
    private uniformData: Map<string, UniformDescriptor> = new Map();

    // Compiled state
    public isCompiled: boolean = false;

    // Future streaming support
    public version: number = 1;

    constructor(name: string, serviceRegistry: ServiceRegistry, uuid?: string) {
        super(name, serviceRegistry, uuid);
    }

    /**
     * Get the associated shader resource.
     */
    get shader(): ShaderResource | null {
        return this.materialDescriptor?.shader || null;
    }

    /**
     * Get the compiled render pipeline.
     */
    getPipeline(): IPipeline | null {
        return this.pipeline;
    }

    /**
     * Get uniform buffer data.
     */
    getUniformBuffer(): ArrayBuffer | null {
        return this.uniformBuffer;
    }

    /**
     * Get render state configuration.
     */
    get renderState() {
        return this.materialDescriptor?.renderState || {};
    }

    /**
     * Get vertex layout for this material.
     */
    get vertexLayout(): VertexLayout | undefined {
        return this.materialDescriptor?.vertexLayout;
    }

    /**
     * Set material data from descriptor.
     */
    setMaterialData(descriptor: MaterialDescriptor): void {
        this.materialDescriptor = descriptor;
        this.isCompiled = false; // Need to recompile

        // Process uniforms
        this.uniformData.clear();
        if (descriptor.uniforms) {
            for (const [name, uniform] of Object.entries(descriptor.uniforms)) {
                this.uniformData.set(name, uniform);
            }
        }

        this.data = descriptor; // Store as resource data
    }

    /**
     * Create material from shader and uniforms.
     */
    static createFromShader(
        name: string,
        serviceRegistry: ServiceRegistry,
        shader: ShaderResource,
        uniforms?: Record<string, UniformDescriptor>,
        vertexLayout?: VertexLayout
    ): MaterialResource {
        const material = new MaterialResource(name, serviceRegistry);

        material.setMaterialData({
            shader,
            uniforms,
            vertexLayout,
            renderState: {
                cullMode: 'back',
                depthWrite: true,
                depthTest: true,
                blendMode: 'none',
                wireframe: false
            }
        });

        return material;
    }

    /**
     * Set a uniform value.
     */
    setUniform(name: string, value: UniformValue): void {
        const uniform = this.uniformData.get(name);
        if (!uniform) {
            console.warn(`MaterialResource "${this.name}": Uniform "${name}" not found`);
            return;
        }

        // Update uniform value
        uniform.value = value;

        // Mark for uniform buffer update
        this.updateUniformBuffer();
    }

    /**
     * Get a uniform value.
     */
    getUniform(name: string): UniformValue | undefined {
        return this.uniformData.get(name)?.value;
    }

    /**
     * Get all uniform names.
     */
    getUniformNames(): string[] {
        return Array.from(this.uniformData.keys());
    }

    /**
     * Load material data.
     */
    protected async performLoad(): Promise<void> {
        // For Phase 2, we assume material data is already set via setMaterialData
        // Future: Load from material definition files

        if (!this.materialDescriptor) {
            throw new Error(`MaterialResource "${this.name}": No material data provided`);
        }

        // Ensure shader is loaded
        if (!this.materialDescriptor.shader.isLoaded()) {
            await this.materialDescriptor.shader.load();
        }

        this.data = this.materialDescriptor;
        this.updateUniformBuffer();

        console.debug(`MaterialResource "${this.name}" loaded`);
    }

    /**
     * Compile material into render pipeline.
     */
    async compile(): Promise<void> {
        if (this.isCompiled || !this.isLoaded()) {
            return;
        }

        if (!this.materialDescriptor) {
            throw new Error(`MaterialResource "${this.name}": Cannot compile without material data`);
        }

        try {
            // Ensure shader is compiled
            if (!this.materialDescriptor.shader.isCompiled) {
                await this.materialDescriptor.shader.compile();
            }

            // Get renderer from service registry
            const renderer = this.getRenderer();
            if (!renderer) {
                throw new Error(`MaterialResource "${this.name}": No renderer available for compilation`);
            }

            // Create render pipeline
            this.pipeline = await this.createPipeline(renderer);

            this.isCompiled = true;
            console.debug(`MaterialResource "${this.name}" compiled successfully`);

        } catch (error) {
            console.error(`Failed to compile MaterialResource "${this.name}":`, error);
            throw error;
        }
    }

    /**
     * Unload material data and free GPU resources.
     */
    protected async performUnload(): Promise<void> {
        // Destroy pipeline
        if (this.pipeline) {
            this.pipeline.destroy();
            this.pipeline = null;
        }

        this.isCompiled = false;
        this.materialDescriptor = null;
        this.uniformData.clear();
        this.uniformBuffer = null;

        console.debug(`MaterialResource "${this.name}" unloaded`);
    }

    /**
     * Create render pipeline from material descriptor.
     */
    private async createPipeline(renderer: IRenderer): Promise<IPipeline> {
        if (!this.materialDescriptor) {
            throw new Error('No material data for pipeline creation');
        }

        const shader = this.materialDescriptor.shader;

        // Get compiled shader modules
        const vertexShader = shader.getCompiledShader('vertex');
        const fragmentShader = shader.getCompiledShader('fragment');

        if (!vertexShader || !fragmentShader) {
            throw new Error(`MaterialResource "${this.name}": Missing required shader stages`);
        }

        // Create pipeline descriptor
        const pipelineDescriptor: PipelineDescriptor = {
            vertexShader: shader.vertexSource || '',
            fragmentShader: shader.fragmentSource || '',
            vertexLayout: this.materialDescriptor.vertexLayout || {
                stride: 12, // Default: position only (3 floats)
                attributes: [{
                    location: 0,
                    format: 'float32x3',
                    offset: 0
                }]
            },
            label: `${this.name}_pipeline`
        };

        // Create pipeline through renderer
        return await renderer.createPipeline(pipelineDescriptor);
    }

    /**
     * Update uniform buffer with current uniform values.
     */
    private updateUniformBuffer(): void {
        if (this.uniformData.size === 0) {
            this.uniformBuffer = null;
            return;
        }

        // Calculate total buffer size
        let totalSize = 0;
        const sortedUniforms = Array.from(this.uniformData.entries())
            .sort(([, a], [, b]) => a.binding - b.binding);

        for (const [name, uniform] of sortedUniforms) {
            // Align to 16-byte boundaries for uniform buffers (WebGPU requirement)
            totalSize = Math.ceil(totalSize / 16) * 16;
            totalSize += uniform.size;
        }

        // Create buffer
        this.uniformBuffer = new ArrayBuffer(totalSize);
        const view = new DataView(this.uniformBuffer);

        // Pack uniform data
        let offset = 0;
        for (const [name, uniform] of sortedUniforms) {
            // Align offset
            offset = Math.ceil(offset / 16) * 16;

            this.packUniformValue(view, offset, uniform);
            offset += uniform.size;
        }
    }

    /**
     * Pack a uniform value into the buffer.
     */
    private packUniformValue(view: DataView, offset: number, uniform: UniformDescriptor): void {
        const value = uniform.value;

        switch (uniform.type) {
            case 'float':
                view.setFloat32(offset, value as number, true);
                break;

            case 'vec2':
                const vec2 = value as number[];
                view.setFloat32(offset, vec2[0], true);
                view.setFloat32(offset + 4, vec2[1], true);
                break;

            case 'vec3':
                const vec3 = value as number[];
                view.setFloat32(offset, vec3[0], true);
                view.setFloat32(offset + 4, vec3[1], true);
                view.setFloat32(offset + 8, vec3[2], true);
                break;

            case 'vec4':
                const vec4 = value as number[];
                view.setFloat32(offset, vec4[0], true);
                view.setFloat32(offset + 4, vec4[1], true);
                view.setFloat32(offset + 8, vec4[2], true);
                view.setFloat32(offset + 12, vec4[3], true);
                break;

            case 'mat4':
                const mat4 = value as Float32Array;
                for (let i = 0; i < 16; i++) {
                    view.setFloat32(offset + i * 4, mat4[i], true);
                }
                break;

            case 'int':
                view.setInt32(offset, value as number, true);
                break;

            case 'uint':
                view.setUint32(offset, value as number, true);
                break;
        }
    }

    /**
     * Get renderer from service registry (helper method).
     */
    private getRenderer(): IRenderer {
        // This will be properly typed when RenderService is implemented
        const renderService = this.serviceRegistry.resolve(Symbol.for('IRenderService'));
        return renderService?.getRenderer();
    }

    /**
     * Future streaming support - create delta for changed material properties.
     */
    createDelta?(sinceVersion: number): unknown {
        // Placeholder for future streaming implementation
        if (sinceVersion < this.version) {
            return {
                type: 'material_delta',
                resourceId: this.uuid,
                fromVersion: sinceVersion,
                toVersion: this.version,
                // Would include uniform changes, shader updates, etc.
            };
        }
        return null;
    }
}