import { Resource } from "@vertex-link/acs";
import { ShaderResource, ShaderStage } from "./ShaderResource";
import { VertexLayout } from "../rendering/interfaces/IPipeline";
import { WebGPUPipeline } from "./../webgpu/WebGPUPipeline";

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
 * Simplified MaterialResource - no service registry, no resource manager
 * Resources auto-load and auto-compile when used
 */
export class MaterialResource extends Resource<MaterialDescriptor> {
  private device: GPUDevice | null = null;
  private pipeline: WebGPUPipeline | null = null;
  private uniformBuffer: ArrayBuffer | null = null;
  private uniformData: Map<string, UniformDescriptor> = new Map();
  public isCompiled: boolean = false;
  private preferredFormat: GPUTextureFormat = 'bgra8unorm';

  constructor(name: string, materialData: MaterialDescriptor) {
    super(name, materialData);

    // Process uniforms immediately
    if (materialData.uniforms) {
      for (const [name, uniform] of Object.entries(materialData.uniforms)) {
        this.uniformData.set(name, uniform);
      }
    }
  }

  protected async loadInternal(): Promise<MaterialDescriptor> {
    // Ensure shader is loaded first
    await this.payload.shader.whenLoaded();

    // Update uniform buffer
    this.updateUniformBuffer();

    return this.payload;
  }

  async compile(): Promise<void> {
    if (this.isCompiled || !this.isLoaded()) {
      return;
    }

    // Get device from global processor or similar
    this.device = this.getDevice();
    if (!this.device) {
      throw new Error(`MaterialResource "${this.name}": No GPU device available for compilation`);
    }

    try {
      // Ensure shader is compiled
      const shader = this.payload.shader;
      if (!shader.isCompiled) {
        (shader as any).setDevice(this.device); // Cast needed for legacy method
        await shader.compile();
      }

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
   * Get the compiled render pipeline
   */
  getPipeline(): GPURenderPipeline | null {
    if (!this.isCompiled || !this.pipeline) {
      return null;
    }

    try {
      return this.pipeline.getGPURenderPipeline();
    } catch (error) {
      console.error(`MaterialResource "${this.name}": Error getting GPU pipeline:`, error);
      return null;
    }
  }

  /**
   * Get uniform buffer data
   */
  getUniformBuffer(): ArrayBuffer | null {
    return this.uniformBuffer;
  }

  /**
   * Get render state configuration
   */
  get renderState() {
    return this.payload.renderState || {};
  }

  /**
   * Get vertex layout for this material
   */
  get vertexLayout(): VertexLayout | undefined {
    return this.payload.vertexLayout;
  }

  /**
   * Set a uniform value
   */
  setUniform(name: string, value: UniformValue): void {
    const uniform = this.uniformData.get(name);
    if (!uniform) {
      console.warn(`MaterialResource "${this.name}": Uniform "${name}" not found`);
      return;
    }

    uniform.value = value;
    this.updateUniformBuffer();
  }

  /**
   * Get a uniform value
   */
  getUniform(name: string): UniformValue | undefined {
    return this.uniformData.get(name)?.value;
  }

  /**
   * Get all uniform names
   */
  getUniformNames(): string[] {
    return Array.from(this.uniformData.keys());
  }

  /**
   * Create render pipeline from material descriptor
   */
  private async createPipeline(): Promise<WebGPUPipeline> {
    if (!this.device) {
      throw new Error('No device available for pipeline creation');
    }

    const shader = this.payload.shader;

    // Get compiled shader modules
    const vertexShader = (shader as any).getCompiledShader(ShaderStage.VERTEX);
    const fragmentShader = (shader as any).getCompiledShader(ShaderStage.FRAGMENT);

    if (!vertexShader || !fragmentShader) {
      throw new Error(`MaterialResource "${this.name}": Missing required shader stages`);
    }

    // Create pipeline descriptor
    const pipelineDescriptor = {
      vertexShader: shader.vertexSource || '',
      fragmentShader: shader.fragmentSource || '',
      vertexLayout: this.payload.vertexLayout || {
        stride: 12, // Default: position only (3 floats)
        attributes: [{
          location: 0,
          format: 'float32x3',
          offset: 0
        }]
      },
      label: `${this.name}_pipeline`
    };

    return new WebGPUPipeline(this.device, pipelineDescriptor, this.preferredFormat);
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

    // Sort by name for consistent layout
    uniformEntries.sort(([a], [b]) => a.localeCompare(b));

    for (const [name, uniform] of uniformEntries) {
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
   * Pack a uniform value into the buffer
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
        return 16;
      default:
        return 4;
    }
  }

  /**
   * Get GPU device - simplified approach (you'll need to implement this)
   */
  private getDevice(): GPUDevice | null {
    // TODO: Get device from global WebGPUProcessor or similar
    // This is a simplified approach for the refactor
    // In practice, you might pass device during compilation or get from processor registry

    // For now, return null and implement device injection separately
    return (globalThis as any).__webgpu_device__ || null;
  }

  /**
   * Create basic material with standard uniforms
   */
  static createBasic(
    name: string,
    shader: ShaderResource,
    color: number[] = [1.0, 0.5, 0.2, 1.0]
  ): MaterialResource {
    // Identity matrices for initialization
    const identity = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);

    const uniforms: Record<string, UniformDescriptor> = {
      viewProjection: {
        type: 'mat4',
        size: 64,
        value: new Float32Array(identity)
      },
      model: {
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

    return new MaterialResource(name, descriptor);
  }
}
