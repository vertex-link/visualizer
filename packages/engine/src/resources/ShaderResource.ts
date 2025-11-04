import { Resource, type Context } from "@vertex-link/space";
import { WebGPUProcessor } from "../processors/WebGPUProcessor";

/**
 * Shader stage types supported by the engine.
 */
export enum ShaderStage {
  VERTEX = "vertex",
  FRAGMENT = "fragment",
  COMPUTE = "compute",
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
export class ShaderResource extends Resource<ShaderDescriptor> {
  private compiledShaders: Map<ShaderStage, CompiledShader> = new Map();
  public isCompiled = false;
  public version = 1;

  // Direct device reference instead of going through service
  private device: GPUDevice | null = null;

  constructor(name: string, shaderDescriptor: ShaderDescriptor, context?: Context) {
    super(name, shaderDescriptor, context);
    this.isCompiled = false; // Need to recompile
  }

  /**
   * Get available shader stages.
   */
  get availableStages(): ShaderStage[] {
    if (!this.payload) return [];

    const stages: ShaderStage[] = [];
    if (this.payload.vertexSource) stages.push(ShaderStage.VERTEX);
    if (this.payload.fragmentSource) stages.push(ShaderStage.FRAGMENT);
    if (this.payload.computeSource) stages.push(ShaderStage.COMPUTE);

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
    return this.payload?.vertexSource;
  }

  /**
   * Get fragment shader source.
   */
  get fragmentSource(): string | undefined {
    return this.payload?.fragmentSource;
  }

  /**
   * Get compute shader source.
   */
  get computeSource(): string | undefined {
    return this.payload?.computeSource;
  }

  /**
   * Get entry point for a shader stage.
   */
  getEntryPoint(stage: ShaderStage): string {
    const entryPoints = this.payload?.entryPoints;

    switch (stage) {
      case ShaderStage.VERTEX:
        return entryPoints?.vertex || "vs_main";
      case ShaderStage.FRAGMENT:
        return entryPoints?.fragment || "fs_main";
      case ShaderStage.COMPUTE:
        return entryPoints?.compute || "cs_main";
      default:
        return "main";
    }
  }

  protected async loadInternal(): Promise<ShaderDescriptor> {
    console.log("load internal shader");
    return this.payload;
  }

  /**
   * Compile shader source into GPU modules.
   * Requires device to be set first!
   */
  async compile(context: Context): Promise<void> {
    const webgpuProcessor = context.processors.find(p => p instanceof WebGPUProcessor) as WebGPUProcessor | undefined;
    if (!webgpuProcessor) {
      throw new Error("Cannot compile ShaderResource: WebGPUProcessor not found in context.");
    }
    const device = webgpuProcessor.renderer.device;
    this.device = device;

    if (!device) {
      throw new Error(
        `ShaderResource "${this.name}": WebGPU device not available.`,
      );
    }

    if (!this.payload) {
      throw new Error(
        `ShaderResource "${this.name}": Cannot compile without shader data`,
      );
    }

    this.compiledShaders.clear();

    for (const stage of this.availableStages) {
      const source = this.getSourceForStage(stage);
      const module = device.createShaderModule ({
        code: source,
        label: `${this.name}_${stage}`,
      });
      this.compiledShaders.set(stage, {
        stage,
        module,
        entryPoint: this.getEntryPoint(stage),
        source,
      });
    }

    console.debug(`ShaderResource "${this.name}" compiled successfully`);
  }

  private getSourceForStage(stage: ShaderStage): string {
    switch (stage) {
      case ShaderStage.VERTEX:
        return this.payload.vertexSource!;
      case ShaderStage.FRAGMENT:
        return this.payload.fragmentSource!;
      case ShaderStage.COMPUTE:
        return this.payload.computeSource!;
      default:
        throw new Error(`Unsupported shader stage: ${stage}`);
    }
  }

  /**
   * Unload shader data and free GPU resources.
   */
  protected async performUnload(): Promise<void> {
    // Clear compiled shaders (GPU modules don't need explicit cleanup in WebGPU)
    this.compiledShaders.clear();
    this.isCompiled = false;
    (this.payload as any) = null;
    this.device = null;

    console.debug(`ShaderResource "${this.name}" unloaded`);
  }

  /**
   * Validate WGSL shader source (basic validation).
   */
  validateSource(source: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic WGSL validation
    if (!source.trim()) {
      errors.push("Shader source is empty");
    }

    // Check for required entry points based on available stages
    if (this.hasStage(ShaderStage.VERTEX) && !source.includes("@vertex")) {
      errors.push("Vertex stage requires @vertex entry point");
    }

    if (this.hasStage(ShaderStage.FRAGMENT) && !source.includes("@fragment")) {
      errors.push("Fragment stage requires @fragment entry point");
    }

    if (this.hasStage(ShaderStage.COMPUTE) && !source.includes("@compute")) {
      errors.push("Compute stage requires @compute entry point");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Future streaming support - create delta for changed shader source.
   */
  createDelta?(sinceVersion: number): unknown {
    // Placeholder for future streaming implementation
    if (sinceVersion < this.version) {
      return {
        type: "shader_delta",
        resourceId: this.id,
        fromVersion: sinceVersion,
        toVersion: this.version,
        // Would include source code changes
      };
    }
    return null;
  }
}
