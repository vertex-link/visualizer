import { Resource, type Context } from "@vertex-link/space";
import { WebGPUProcessor } from "../processors/WebGPUProcessor";

/**
 * Sampler configuration descriptor
 */
export interface SamplerDescriptor {
  magFilter?: GPUFilterMode; // "linear" | "nearest"
  minFilter?: GPUFilterMode;
  mipmapFilter?: GPUMipmapFilterMode; // "linear" | "nearest"
  addressModeU?: GPUAddressMode; // "repeat" | "clamp-to-edge" | "mirror-repeat"
  addressModeV?: GPUAddressMode;
  addressModeW?: GPUAddressMode;
  lodMinClamp?: number;
  lodMaxClamp?: number;
  compare?: GPUCompareFunction; // For shadow maps
  maxAnisotropy?: number; // 1-16, higher = better quality
}

/**
 * SamplerResource - Automatically deduplicates identical samplers
 * Uses static class-level cache for automatic sharing
 */
export class SamplerResource extends Resource<SamplerDescriptor> {
  // Static cache for automatic deduplication (shared across all instances)
  private static compiledSamplers = new Map<string, GPUSampler>();

  private gpuSampler: GPUSampler | null = null;
  private descriptorKey: string = "";

  protected async loadInternal(): Promise<SamplerDescriptor> {
    // Apply defaults and normalize descriptor
    const descriptor: SamplerDescriptor = {
      magFilter: this.payload.magFilter || "linear",
      minFilter: this.payload.minFilter || "linear",
      mipmapFilter: this.payload.mipmapFilter || "linear",
      addressModeU: this.payload.addressModeU || "repeat",
      addressModeV: this.payload.addressModeV || "repeat",
      addressModeW: this.payload.addressModeW || "repeat",
      maxAnisotropy: this.payload.maxAnisotropy || 1,
    };

    // Optional properties
    if (this.payload.lodMinClamp !== undefined) {
      descriptor.lodMinClamp = this.payload.lodMinClamp;
    }
    if (this.payload.lodMaxClamp !== undefined) {
      descriptor.lodMaxClamp = this.payload.lodMaxClamp;
    }
    if (this.payload.compare !== undefined) {
      descriptor.compare = this.payload.compare;
    }

    // Generate key for deduplication
    this.descriptorKey = this.generateKey(descriptor);

    return descriptor;
  }

  async compile(context: Context): Promise<void> {
    // Check if identical sampler already exists in static cache
    if (SamplerResource.compiledSamplers.has(this.descriptorKey)) {
      this.gpuSampler = SamplerResource.compiledSamplers.get(
        this.descriptorKey
      )!;
      console.log(
        `♻️ SamplerResource "${this.name}" reusing sampler: ${this.descriptorKey}`
      );
      this.isCompiled = true;
      return;
    }

    // Create new sampler
    const webgpuProcessor = context.processors.find(
      (p) => p instanceof WebGPUProcessor
    ) as WebGPUProcessor;

    if (!webgpuProcessor?.renderer.device) {
      throw new Error("SamplerResource: WebGPU device not available");
    }

    const device = webgpuProcessor.renderer.device;

    // Create GPUSampler
    this.gpuSampler = device.createSampler({
      ...this.payload,
      label: `${this.name}_${this.descriptorKey}`,
    });

    // Cache for future reuse
    SamplerResource.compiledSamplers.set(this.descriptorKey, this.gpuSampler);

    console.log(
      `🎨 SamplerResource "${this.name}" created new sampler: ${this.descriptorKey}`
    );
    this.isCompiled = true;
  }

  /**
   * Get the compiled GPU sampler
   */
  getSampler(): GPUSampler {
    if (!this.gpuSampler) {
      throw new Error(`SamplerResource "${this.name}" not compiled`);
    }
    return this.gpuSampler;
  }

  /**
   * Generate cache key from descriptor for deduplication
   */
  private generateKey(desc: SamplerDescriptor): string {
    const parts = [
      desc.magFilter || "linear",
      desc.minFilter || "linear",
      desc.mipmapFilter || "linear",
      desc.addressModeU || "repeat",
      desc.addressModeV || "repeat",
      desc.addressModeW || "repeat",
      desc.maxAnisotropy || 1,
    ];

    if (desc.compare !== undefined) {
      parts.push(desc.compare);
    }
    if (desc.lodMinClamp !== undefined) {
      parts.push(`lod_min_${desc.lodMinClamp}`);
    }
    if (desc.lodMaxClamp !== undefined) {
      parts.push(`lod_max_${desc.lodMaxClamp}`);
    }

    return parts.join("_");
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      totalSamplers: SamplerResource.compiledSamplers.size,
      keys: Array.from(SamplerResource.compiledSamplers.keys()),
    };
  }
}
