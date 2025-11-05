import { Resource, type Context } from "@vertex-link/space";
import { WebGPUProcessor } from "../../processors/WebGPUProcessor";

/**
 * Shadow map type - different projection strategies.
 */
export enum ShadowMapType {
  /** Single 2D depth texture (for directional/spot lights) */
  SINGLE = "single",
  /** Cube map with 6 faces (for point lights - omnidirectional) */
  CUBE = "cube",
}

/**
 * Shadow map configuration.
 */
export interface ShadowMapDescriptor {
  /** Shadow map type */
  type: ShadowMapType;
  /** Resolution (width/height in pixels) */
  resolution: number;
  /** Depth format - default is 'depth24plus' */
  format?: GPUTextureFormat;
}

/**
 * Resource that holds a shadow map depth texture.
 * Attached to light actors via ResourceComponent.
 *
 * For directional lights: Single 2D depth texture
 * For point lights: Cube map (6 faces)
 */
export class ShadowMapResource extends Resource<ShadowMapDescriptor> {
  private texture: GPUTexture | null = null;
  private view: GPUTextureView | null = null;
  public isCompiled = false;

  private device: GPUDevice | null = null;

  constructor(name: string, descriptor: ShadowMapDescriptor, context?: Context) {
    super(name, descriptor, context);
  }

  /**
   * Get the shadow map texture.
   */
  getTexture(): GPUTexture | null {
    return this.texture;
  }

  /**
   * Get the texture view for rendering.
   */
  getView(): GPUTextureView | null {
    return this.view;
  }

  /**
   * Get shadow map resolution.
   */
  get resolution(): number {
    return this.payload?.resolution || 1024;
  }

  /**
   * Get shadow map type.
   */
  get type(): ShadowMapType {
    return this.payload?.type || ShadowMapType.SINGLE;
  }

  protected async loadInternal(): Promise<ShadowMapDescriptor> {
    return this.payload;
  }

  /**
   * Compile shadow map - create GPU depth texture.
   */
  async compile(context: Context): Promise<void> {
    const webgpuProcessor = context.processors.find(
      (p) => p instanceof WebGPUProcessor,
    ) as WebGPUProcessor | undefined;

    if (!webgpuProcessor) {
      throw new Error(
        "Cannot compile ShadowMapResource: WebGPUProcessor not found in context.",
      );
    }

    const device = webgpuProcessor.renderer.device;
    this.device = device;

    if (!device) {
      throw new Error(
        `ShadowMapResource "${this.name}": WebGPU device not available.`,
      );
    }

    if (!this.payload) {
      throw new Error(
        `ShadowMapResource "${this.name}": Cannot compile without descriptor`,
      );
    }

    // Create depth texture
    const format = this.payload.format || "depth24plus";
    const resolution = this.payload.resolution;

    const textureDescriptor: GPUTextureDescriptor = {
      label: `${this.name}_ShadowMap`,
      size: {
        width: resolution,
        height: resolution,
        depthOrArrayLayers: this.payload.type === ShadowMapType.CUBE ? 6 : 1,
      },
      format,
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
      dimension: this.payload.type === ShadowMapType.CUBE ? "2d" : "2d",
    };

    this.texture = device.createTexture(textureDescriptor);

    // Create view
    this.view = this.texture.createView({
      label: `${this.name}_ShadowMapView`,
      dimension: this.payload.type === ShadowMapType.CUBE ? "cube" : "2d",
      arrayLayerCount: this.payload.type === ShadowMapType.CUBE ? 6 : 1,
    });

    this.isCompiled = true;
    console.debug(
      `ShadowMapResource "${this.name}" compiled (${this.payload.type}, ${resolution}x${resolution})`,
    );
  }

  /**
   * Cleanup GPU resources.
   */
  protected async performUnload(): Promise<void> {
    if (this.texture) {
      this.texture.destroy();
      this.texture = null;
    }
    this.view = null;
    this.isCompiled = false;
    this.device = null;

    console.debug(`ShadowMapResource "${this.name}" unloaded`);
  }
}
