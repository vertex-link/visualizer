import { Resource, type Context } from "@vertex-link/space";
import { WebGPUProcessor } from "../processors/WebGPUProcessor";
import { SamplerResource } from "./SamplerResource";

/**
 * Image/Texture descriptor
 */
export interface ImageDescriptor {
  source: string | ArrayBuffer | ImageBitmap;
  format?: "image/png" | "image/jpeg" | "image/webp";
  generateMipmaps?: boolean;
  sRGB?: boolean; // Use sRGB color space
}

/**
 * ImageResource - Texture with a sampler slot
 * The sampler slot can be filled with a SamplerResource
 */
export class ImageResource extends Resource<ImageDescriptor> {
  private texture: GPUTexture | null = null;
  private textureView: GPUTextureView | null = null;
  private imageBitmap: ImageBitmap | null = null;
  private width: number = 0;
  private height: number = 0;

  constructor(name: string, descriptor: ImageDescriptor, context?: Context) {
    super(name, descriptor, context);

    // Define sampler slot with default linear-repeat sampler
    this.defineSlot("sampler", {
      type: SamplerResource,
      required: true,
      defaultResource: new SamplerResource("DefaultLinearRepeat", {
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "repeat",
        addressModeV: "repeat",
      }),
    });
  }

  protected async loadInternal(): Promise<ImageDescriptor> {
    // Load image data based on source type
    if (typeof this.payload.source === "string") {
      // Load from URL
      const response = await fetch(this.payload.source);
      if (!response.ok) {
        throw new Error(
          `Failed to load image "${this.payload.source}": ${response.statusText}`
        );
      }
      const blob = await response.blob();
      this.imageBitmap = await createImageBitmap(blob, {
        colorSpaceConversion: this.payload.sRGB ? "default" : "none",
      });
    } else if (this.payload.source instanceof ArrayBuffer) {
      // Load from ArrayBuffer
      const blob = new Blob([this.payload.source]);
      this.imageBitmap = await createImageBitmap(blob, {
        colorSpaceConversion: this.payload.sRGB ? "default" : "none",
      });
    } else {
      // Already ImageBitmap
      this.imageBitmap = this.payload.source;
    }

    this.width = this.imageBitmap.width;
    this.height = this.imageBitmap.height;

    console.log(
      `📸 ImageResource "${this.name}" loaded: ${this.width}x${this.height}`
    );

    return this.payload;
  }

  async compile(context: Context): Promise<void> {
    // Ensure sampler slot is ready
    await this.waitForSlots();

    // Get device from WebGPUProcessor
    const webgpuProcessor = context.processors.find(
      (p) => p instanceof WebGPUProcessor
    ) as WebGPUProcessor;

    if (!webgpuProcessor?.renderer.device) {
      throw new Error("ImageResource: WebGPU device not available");
    }

    const device = webgpuProcessor.renderer.device;

    // Calculate mip levels
    const mipLevelCount = this.payload.generateMipmaps
      ? this.calculateMipLevels()
      : 1;

    // Create GPU texture
    this.texture = device.createTexture({
      size: [this.width, this.height],
      format: this.payload.sRGB ? "rgba8unorm-srgb" : "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
      mipLevelCount,
      label: `${this.name}_texture`,
    });

    // Upload image data
    if (this.imageBitmap) {
      device.queue.copyExternalImageToTexture(
        { source: this.imageBitmap },
        { texture: this.texture },
        [this.width, this.height]
      );

      // Generate mipmaps if requested
      if (this.payload.generateMipmaps) {
        this.generateMipmaps(device);
      }
    }

    // Create texture view
    this.textureView = this.texture.createView({
      label: `${this.name}_view`,
    });

    console.log(`✅ ImageResource "${this.name}" compiled`);
    this.isCompiled = true;
  }

  /**
   * Get the compiled texture view
   */
  getTextureView(): GPUTextureView {
    if (!this.textureView) {
      throw new Error(`ImageResource "${this.name}" not compiled`);
    }
    return this.textureView;
  }

  /**
   * Get the sampler from the slot
   */
  getSampler(): GPUSampler {
    const samplerResource = this.slot<SamplerResource>("sampler");
    if (!samplerResource) {
      throw new Error(`ImageResource "${this.name}" has no sampler in slot`);
    }
    return samplerResource.getSampler();
  }

  /**
   * Get texture dimensions
   */
  getSize(): [number, number] {
    return [this.width, this.height];
  }

  /**
   * Calculate number of mip levels
   */
  private calculateMipLevels(): number {
    return Math.floor(Math.log2(Math.max(this.width, this.height))) + 1;
  }

  /**
   * Generate mipmaps (placeholder - requires compute shader implementation)
   */
  private generateMipmaps(device: GPUDevice): void {
    // TODO: Implement mipmap generation using compute shader or blit
    console.warn(`Mipmap generation not yet implemented for "${this.name}"`);
  }

  /**
   * Dispose GPU resources
   */
  dispose(): void {
    if (this.texture) {
      this.texture.destroy();
      this.texture = null;
    }
    this.textureView = null;
    this.imageBitmap = null;
    this.isCompiled = false;
  }
}
