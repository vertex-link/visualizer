import { Resource } from "./Resource";
import { ShaderResource } from "./ShaderResource";
import { VertexLayout } from "../rendering/interfaces/IPipeline";
import { WebGPUPipeline } from "./../webgpu/WebGPUPipeline";
import {ServiceRegistry} from "@vertex-link/acs";

/**
 * Uniform data types supported by materials.
 */
export type UniformValue = number | number[] | Float32Array | Int32Array | Uint32Array;

/**
 * Uniform descriptor for material properties.
 */
export interface UniformDescriptor {
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
    private pipeline: WebGPUPipeline | null = null;
    private uniformBuffer: ArrayBuffer | null = null;
    private uniformData: Map<string, UniformDescriptor> = new Map();

    // Direct device reference instead of going through service
    private device: GPUDevice | null = null;
    private preferredFormat: GPUTextureFormat = 'bgra8unorm';

    // Compiled state
    public isCompiled: boolean = false;
    public version: number = 1;

    constructor(name: string, serviceRegistry: ServiceRegistry, uuid?: string) {
        super(name, serviceRegistry, uuid);
    }

    /**
     * Set the GPU device and format for compilation (called by processor/manager)
     */
    setDevice(device: GPUDevice, preferredFormat: GPUTextureFormat = 'bgra8unorm'): void {
        this.device = device;
        this.preferredFormat = preferredFormat;
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
    getPipeline(): GPURenderPipeline | null {
        if (!this.isCompiled || !this.pipeline) {
            console.warn(`MaterialResource "${this.name}": Pipeline requested but not ready (compiled: ${this.isCompiled}, pipeline exists: ${!!this.pipeline})`);
            return null;
        }

        try {
            const gpuPipeline = this.pipeline.getGPURenderPipeline();
            if (!gpuPipeline) {
                console.error(`MaterialResource "${this.name}": WebGPUPipeline.getGPURenderPipeline() returned null`);
                return null;
            }
            return gpuPipeline;
        } catch (error) {
            console.error(`MaterialResource "${this.name}": Error getting GPU pipeline:`, error);
            return null;
        }
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
            console.warn(`MaterialResource "<span class="math-inline">\{this\.name\}"\: Uniform "</span>{name}" not found`);
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
     * Requires device to be set first!
     */
    async compile(): Promise<void> {
        if (this.isCompiled || !this.isLoaded()) {
            console.log(`MaterialResource "${this.name}": Already compiled or not loaded (compiled: ${this.isCompiled}, loaded: ${this.isLoaded()})`);
            return;
        }

        if (!this.device) {
            throw new Error(`MaterialResource "${this.name}": No GPU device set for compilation. Call setDevice() first.`);
        }

        if (!this.materialDescriptor) {
            throw new Error(`MaterialResource "${this.name}": Cannot compile without material data`);
        }

        console.log(`🔄 MaterialResource "${this.name}": Starting compilation...`);

        try {
            // Ensure shader is compiled and has device
            const shader = this.materialDescriptor.shader;
            console.log(`MaterialResource "${this.name}": Checking shader compilation...`);

            if (!shader.isCompiled) {
                console.log(`MaterialResource "${this.name}": Compiling shader...`);
                shader.setDevice(this.device);
                await shader.compile();
            }

            console.log(`MaterialResource "${this.name}": Creating pipeline...`);
            // Create render pipeline
            this.pipeline = await this.createPipeline();

            this.isCompiled = true;
            console.log(`✅ MaterialResource "${this.name}" compiled successfully`);

        } catch (error) {
            console.error(`❌ Failed to compile MaterialResource "${this.name}":`, error);
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
        this.device = null;

        console.debug(`MaterialResource "${this.name}" unloaded`);
    }

    /**
     * Create render pipeline from material descriptor.
     */
    private async createPipeline(): Promise<WebGPUPipeline> {
        if (!this.materialDescriptor || !this.device) {
            throw new Error('No material data or device for pipeline creation');
        }

        const shader = this.materialDescriptor.shader;

        // Get compiled shader modules
        const vertexShader = shader.getCompiledShader('vertex');
        const fragmentShader = shader.getCompiledShader('fragment');

        if (!vertexShader || !fragmentShader) {
            throw new Error(`MaterialResource "${this.name}": Missing required shader stages`);
        }

        // Create pipeline descriptor using the WebGPUPipeline constructor format
        const pipelineDescriptor = {
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

        // Create pipeline directly using WebGPUPipeline
        return new WebGPUPipeline(this.device, pipelineDescriptor, this.preferredFormat);
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

    /**
     * Update uniform buffer with proper WebGPU alignment
     */
    private updateUniformBuffer(): void {
        if (this.uniformData.size === 0) {
            this.uniformBuffer = null;
            return;
        }

        // Calculate total buffer size with proper WebGPU alignment
        let totalSize = 0;
        const uniformEntries = Array.from(this.uniformData.entries());

        // Sort by name for consistent layout (not by binding)
        uniformEntries.sort(([a], [b]) => a.localeCompare(b));

        for (const [name, uniform] of uniformEntries) {
            // WebGPU requires specific alignment for different types
            const alignment = this.getUniformAlignment(uniform.type);
            totalSize = Math.ceil(totalSize / alignment) * alignment;
            totalSize += uniform.size;
        }

        // Round up to multiple of 16 (required by WebGPU)
        totalSize = Math.ceil(totalSize / 16) * 16;

        // Create buffer
        this.uniformBuffer = new ArrayBuffer(totalSize);
        const view = new DataView(this.uniformBuffer);

        // Pack uniform data with proper alignment
        let offset = 0;
        for (const [name, uniform] of uniformEntries) {
            const alignment = this.getUniformAlignment(uniform.type);
            offset = Math.ceil(offset / alignment) * alignment;

            this.packUniformValue(view, offset, uniform);
            offset += uniform.size;
        }
    }

    /**
     * Get required alignment for uniform types (WebGPU spec)
     */
    private getUniformAlignment(type: string): number {
        switch (type) {
            case 'float':
            case 'int':
            case 'uint':
                return 4;
            case 'vec2':
                return 8;
            case 'vec3':
            case 'vec4':
                return 16;
            case 'mat4':
                return 16; // Each column is vec4 aligned
            default:
                return 4;
        }
    }

    /**
     * Create basic material with corrected uniform layout
     */
    static createBasicMaterial(
        name: string,
        serviceRegistry: ServiceRegistry,
        shader: ShaderResource,
        color: number[] = [1.0, 0.5, 0.2, 1.0]
    ): MaterialResource {
        const material = new MaterialResource(name, serviceRegistry);

        // Identity matrices for initialization
        const identity = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);

        const uniforms: Record<string, UniformDescriptor> = {
            // Order matters for buffer layout - keep consistent
            viewProjection: { // Renamed from mvpMatrix
                type: 'mat4',
                size: 64,
                value: new Float32Array(identity)
            },
            model: { // Renamed from modelMatrix
                type: 'mat4',
                size: 64,
                value: new Float32Array(identity)
            },
            color: {
                type: 'vec4',
                size: 16,
                value: new Float32Array(color)
            }
        };

        const vertexLayout: VertexLayout = {
            stride: 32, // position(12) + normal(12) + uv(8)
            attributes: [
                { location: 0, format: 'float32x3', offset: 0 },  // position
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

        material.setMaterialData(descriptor);
        return material;
    }
}