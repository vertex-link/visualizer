import { Resource, type Context } from "@vertex-link/space";
import { WebGPUProcessor } from "../processors/WebGPUProcessor";
import type { VertexLayout } from "../rendering/interfaces/IPipeline";
import { WebGPUPipeline } from "./../webgpu/WebGPUPipeline";
import { type ShaderResource, ShaderStage } from "./ShaderResource";


/**
 * Uniform data types supported by materials.
 */
export type UniformValue =
  | number
  | number[]
  | Float32Array
  | Int32Array
  | Uint32Array;

/**
 * Uniform descriptor for material properties.
 */
export interface UniformDescriptor {
  type: "float" | "vec2" | "vec3" | "vec4" | "mat4" | "int" | "uint";
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
    cullMode?: "none" | "front" | "back";
    depthWrite?: boolean;
    depthTest?: boolean;
    blendMode?: "none" | "alpha" | "additive";
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
  public isCompiled = false;
  private preferredFormat: GPUTextureFormat = "bgra8unorm";

  constructor(name: string, materialData: MaterialDescriptor, context?: Context) {
    super(name, materialData, context);

    // Process uniforms immediately
    if (materialData.uniforms) {
      for (const [name, uniform] of Object.entries(materialData.uniforms)) {
        this.uniformData.set(name, uniform);
      }
    }
  }

  protected async loadInternal(): Promise<MaterialDescriptor> {
    // Ensure shader is loaded first
    await this.payload.shader.whenReady();

    // Update uniform buffer
    this.updateUniformBuffer();

    return this.payload;
  }

  async compile(context: Context): Promise<void> {
    console.log(
      `🔧 MaterialResource "${this.name}" (ID: ${this.id}) starting compilation. isCompiled: ${this.isCompiled}`,
    );

    const webgpuProcessor = context.processors.find(p => p instanceof WebGPUProcessor) as WebGPUProcessor | undefined;
    if (!webgpuProcessor) {
      throw new Error("Cannot compile MaterialResource: WebGPUProcessor not found in context.");
    }
    const device = webgpuProcessor.renderer.device;

    if (!device) {
      throw new Error(
        `MaterialResource "${this.name}": WebGPU device is not available for compilation.`,
      );
    }
    this.device = device;
    const shader = this.payload.shader;
    // The base class will have already triggered the shader's loadAndCompile process.
    // We can await its `whenReady` promise to ensure it's compiled before we use it.
    await shader.whenReady();

    try {
      this.pipeline = await this.createPipeline(device);
      console.log(
        `✅ MaterialResource "${this.name}" (ID: ${this.id}) compiled successfully. isCompiled: ${this.isCompiled}`,
      );
    } catch (error) {
      console.error(`❌ Failed to compile MaterialResource "${this.name}":`, error);
      throw error;
    }
  }

  /**
   * Get the compiled render pipeline
   */
  getPipeline(): GPURenderPipeline | null {
    if (!this.pipeline) {
      return null;
    }
    return this.pipeline.getGPURenderPipeline();
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

  private async createPipeline(device: GPUDevice): Promise<WebGPUPipeline> {
    const shader = this.payload.shader;

    // This part will now succeed because we awaited the shader's readiness.
    const vertexShader = shader.getCompiledShader(ShaderStage.VERTEX);
    const fragmentShader = shader.getCompiledShader(ShaderStage.FRAGMENT);

    if (!vertexShader || !fragmentShader) {
      // If this error still occurs, the problem lies within ShaderResource.compile itself.
      throw new Error(
        `MaterialResource "${this.name}": Missing required shader stages.`,
      );
    }

    const pipelineDescriptor = {
      vertexShader: shader.vertexSource || "",
      fragmentShader: shader.fragmentSource || "",
      vertexLayout: this.payload.vertexLayout || {
        stride: 12,
        attributes: [{ location: 0, format: "float32x3", offset: 0 }],
      },
      label: `${this.name}_pipeline`,
    };

    return new WebGPUPipeline(device, pipelineDescriptor, this.preferredFormat);
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
  private packUniformValue(
    view: DataView,
    offset: number,
    uniform: UniformDescriptor,
  ): void {
    const value = uniform.value;

    switch (uniform.type) {
      case "float":
        view.setFloat32(offset, value as number, true);
        break;

      case "vec2":
        const vec2 = value as number[];
        view.setFloat32(offset, vec2[0], true);
        view.setFloat32(offset + 4, vec2[1], true);
        break;

      case "vec3":
        const vec3 = value as number[];
        view.setFloat32(offset, vec3[0], true);
        view.setFloat32(offset + 4, vec3[1], true);
        view.setFloat32(offset + 8, vec3[2], true);
        break;

      case "vec4":
        const vec4 = value as number[];
        view.setFloat32(offset, vec4[0], true);
        view.setFloat32(offset + 4, vec4[1], true);
        view.setFloat32(offset + 8, vec4[2], true);
        view.setFloat32(offset + 12, vec4[3], true);
        break;

      case "mat4":
        const mat4 = value as Float32Array;
        for (let i = 0; i < 16; i++) {
          view.setFloat32(offset + i * 4, mat4[i], true);
        }
        break;

      case "int":
        view.setInt32(offset, value as number, true);
        break;

      case "uint":
        view.setUint32(offset, value as number, true);
        break;
    }
  }

  /**
   * Get required alignment for uniform types (WebGPU spec)
   */
  private getUniformAlignment(type: string): number {
    switch (type) {
      case "float":
      case "int":
      case "uint":
        return 4;
      case "vec2":
        return 8;
      case "vec3":
      case "vec4":
        return 16;
      case "mat4":
        return 16;
      default:
        return 4;
    }
  }

  /**
   * Create basic material with standard uniforms
   */
  static createBasic(
    name: string,
    shader: ShaderResource,
    color: number[] = [1.0, 0.5, 0.2, 1.0],
    context?: Context,
  ): MaterialResource {
    // Identity matrices for initialization
    const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    const uniforms: Record<string, UniformDescriptor> = {
      viewProjection: {
        type: "mat4",
        size: 64,
        value: new Float32Array(identity),
      },
      model: {
        type: "mat4",
        size: 64,
        value: new Float32Array(identity),
      },
      color: {
        type: "vec4",
        size: 16,
        value: new Float32Array(color),
      },
    };

    const vertexLayout: VertexLayout = {
      stride: 32, // position(12) + normal(12) + uv(8)
      attributes: [
        { location: 0, format: "float32x3", offset: 0 }, // position
        { location: 1, format: "float32x3", offset: 12 }, // normal
        { location: 2, format: "float32x2", offset: 24 }, // uv
      ],
    };

    const descriptor: MaterialDescriptor = {
      shader,
      uniforms,
      vertexLayout,
      renderState: {
        cullMode: "back",
        depthWrite: true,
        depthTest: true,
        blendMode: "none",
      },
    };

    return new MaterialResource(name, descriptor, context);
  }
}
