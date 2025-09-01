import { BufferUsage } from "./interfaces/IBuffer";

/**
 * Buffer descriptor for resource pool
 */
interface PoolBufferDescriptor {
  size: number;
  usage: BufferUsage;
  data?: ArrayBuffer | ArrayBufferView;
  hash?: string;
  dynamic?: boolean;
}

/**
 * Pipeline descriptor for resource pool
 */
interface PoolPipelineDescriptor {
  vertexShader: string;
  fragmentShader: string;
  vertexLayout: any; // VertexLayout
  renderState?: any;
  hash: string;
}

/**
 * Resource cache entry with reference counting
 */
interface CacheEntry<T> {
  resource: T;
  refCount: number;
  lastUsed: number;
  size?: number;
}

/**
 * GPU Resource Pool - Manages shared GPU resources with automatic cleanup
 * Prevents duplicate buffer/pipeline creation and manages memory efficiently
 */
export class GPUResourcePool {
  private device: GPUDevice | null = null;

  // Resource caches with reference counting
  private bufferCache = new Map<string, CacheEntry<GPUBuffer>>();
  private pipelineCache = new Map<string, CacheEntry<GPURenderPipeline>>();
  private bindGroupCache = new Map<string, CacheEntry<GPUBindGroup>>();

  // Cleanup management
  private readonly maxCacheSize = 1000;
  private readonly maxIdleTime = 30000; // 30 seconds
  private cleanupTimer: number | null = null;

  /**
   * Initialize with WebGPU device
   */
  initialize(device: GPUDevice): void {
    this.device = device;
    this.startCleanupTimer();
    console.log("🗂️ GPUResourcePool initialized");
  }

  /**
   * Get or create a buffer with automatic caching
   */
  getOrCreateBuffer(descriptor: PoolBufferDescriptor): GPUBuffer {
    if (!this.device) {
      throw new Error("GPUResourcePool not initialized");
    }

    // Generate cache key
    const key = this.generateBufferKey(descriptor);

    // Check cache
    const cached = this.bufferCache.get(key);
    if (cached) {
      cached.refCount++;
      cached.lastUsed = performance.now();
      return cached.resource;
    }

    // Create new buffer
    const buffer = this.createBuffer(descriptor);

    // Cache it
    this.bufferCache.set(key, {
      resource: buffer,
      refCount: 1,
      lastUsed: performance.now(),
      size: descriptor.size,
    });

    console.log(`📦 Created buffer: ${key} (${descriptor.size} bytes)`);
    return buffer;
  }

  /**
   * Get or create a render pipeline with automatic caching
   */
  getOrCreatePipeline(descriptor: PoolPipelineDescriptor): GPURenderPipeline {
    if (!this.device) {
      throw new Error("GPUResourcePool not initialized");
    }

    const key = descriptor.hash;

    // Check cache
    const cached = this.pipelineCache.get(key);
    if (cached) {
      cached.refCount++;
      cached.lastUsed = performance.now();
      return cached.resource;
    }

    // Create new pipeline
    const pipeline = this.createPipeline(descriptor);

    // Cache it
    this.pipelineCache.set(key, {
      resource: pipeline,
      refCount: 1,
      lastUsed: performance.now(),
    });

    console.log(`🔧 Created pipeline: ${key}`);
    return pipeline;
  }

  /**
   * Get or create a bind group with automatic caching
   */
  getOrCreateBindGroup(
    layout: GPUBindGroupLayout,
    entries: GPUBindGroupEntry[],
    label?: string,
  ): GPUBindGroup {
    if (!this.device) {
      throw new Error("GPUResourcePool not initialized");
    }

    // Generate cache key from layout and entries
    const key = this.generateBindGroupKey(layout, entries);

    // Check cache
    const cached = this.bindGroupCache.get(key);
    if (cached) {
      cached.refCount++;
      cached.lastUsed = performance.now();
      return cached.resource;
    }

    // Create new bind group
    const bindGroup = this.device.createBindGroup({
      layout,
      entries,
      label: label || `BindGroup_${key}`,
    });

    // Cache it
    this.bindGroupCache.set(key, {
      resource: bindGroup,
      refCount: 1,
      lastUsed: performance.now(),
    });

    return bindGroup;
  }

  /**
   * Create a bind group for uniform data (common case)
   */
  createUniformBindGroup(
    layout: GPUBindGroupLayout,
    uniformBuffer: GPUBuffer,
    label?: string,
  ): GPUBindGroup {
    return this.getOrCreateBindGroup(
      layout,
      [{ binding: 0, resource: { buffer: uniformBuffer } }],
      label,
    );
  }

  /**
   * Release a reference to a buffer
   */
  releaseBuffer(descriptor: PoolBufferDescriptor): void {
    const key = this.generateBufferKey(descriptor);
    const cached = this.bufferCache.get(key);
    if (cached) {
      cached.refCount--;
      if (cached.refCount <= 0) {
        cached.resource.destroy();
        this.bufferCache.delete(key);
        console.log(`🗑️ Released buffer: ${key}`);
      }
    }
  }

  /**
   * Release a reference to a bind group
   */
  releaseBindGroup(layout: GPUBindGroupLayout, entries: GPUBindGroupEntry[]): void {
    const key = this.generateBindGroupKey(layout, entries);
    const cached = this.bindGroupCache.get(key);
    if (cached) {
      cached.refCount--;
      if (cached.refCount <= 0) {
        this.bindGroupCache.delete(key);
        console.log(`🗑️ Released bind group: ${key}`);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { buffers: number; pipelines: number; bindGroups: number; totalMemory: number } {
    const totalMemory = Array.from(this.bufferCache.values()).reduce(
      (sum, entry) => sum + (entry.size || 0),
      0,
    );

    return {
      buffers: this.bufferCache.size,
      pipelines: this.pipelineCache.size,
      bindGroups: this.bindGroupCache.size,
      totalMemory,
    };
  }

  /**
   * Force cleanup of unused resources
   */
  cleanup(): void {
    const now = performance.now();
    let cleaned = 0;

    // Clean buffers
    for (const [key, entry] of this.bufferCache.entries()) {
      if (entry.refCount <= 0 && now - entry.lastUsed > this.maxIdleTime) {
        entry.resource.destroy();
        this.bufferCache.delete(key);
        cleaned++;
      }
    }

    // Clean pipelines (they don't need explicit cleanup in WebGPU)
    for (const [key, entry] of this.pipelineCache.entries()) {
      if (entry.refCount <= 0 && now - entry.lastUsed > this.maxIdleTime) {
        this.pipelineCache.delete(key);
        cleaned++;
      }
    }

    // Clean bind groups
    for (const [key, entry] of this.bindGroupCache.entries()) {
      if (entry.refCount <= 0 && now - entry.lastUsed > this.maxIdleTime) {
        this.bindGroupCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} unused GPU resources`);
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    // Destroy all buffers
    for (const entry of this.bufferCache.values()) {
      entry.resource.destroy();
    }

    // Clear caches
    this.bufferCache.clear();
    this.pipelineCache.clear();
    this.bindGroupCache.clear();

    // Stop cleanup timer
    if (this.cleanupTimer) {
      window.clearInterval(this.cleanupTimer as number);
      this.cleanupTimer = null;
    }

    console.log("🗑️ GPUResourcePool disposed");
  }

  // === Private Methods ===

  private createBuffer(descriptor: PoolBufferDescriptor): GPUBuffer {
    const buffer = this.device!.createBuffer({
      size: descriptor.size,
      usage: this.getGPUUsageFlags(descriptor.usage),
      label: `Pool_${descriptor.usage}_${descriptor.size}`,
    });

    // Upload data if provided
    if (descriptor.data) {
      const arrayBuffer =
        descriptor.data instanceof ArrayBuffer ? descriptor.data : descriptor.data.buffer;
      this.device!.queue.writeBuffer(buffer, 0, arrayBuffer);
    }

    return buffer;
  }

  private createPipeline(descriptor: PoolPipelineDescriptor): GPURenderPipeline {
    // This is simplified - in reality you'd use your existing pipeline creation logic
    const vertexModule = this.device!.createShaderModule({
      code: descriptor.vertexShader,
      label: "Vertex_" + descriptor.hash,
    });

    const fragmentModule = this.device!.createShaderModule({
      code: descriptor.fragmentShader,
      label: "Fragment_" + descriptor.hash,
    });

    // Create simple pipeline (you'd expand this with your existing logic)
    return this.device!.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: vertexModule,
        entryPoint: "vs_main",
      },
      fragment: {
        module: fragmentModule,
        entryPoint: "fs_main",
        targets: [{ format: "bgra8unorm" }],
      },
      primitive: {
        topology: "triangle-list",
      },
      label: "Pipeline_" + descriptor.hash,
    });
  }

  private generateBufferKey(descriptor: PoolBufferDescriptor): string {
    return (
      descriptor.hash ||
      `${descriptor.usage}_${descriptor.size}_${descriptor.dynamic ? "dynamic" : "static"}`
    );
  }

  private generateBindGroupKey(layout: GPUBindGroupLayout, entries: GPUBindGroupEntry[]): string {
    // Create a more robust key that includes layout identity and entry content
    const layoutId = (layout as any).__id || Math.random().toString(36); // Fallback for layout identity
    const entriesKey = entries
      .map((entry) => {
        let resourceKey = `binding_${entry.binding}`;

        if ("buffer" in entry.resource) {
          resourceKey += `_buffer_${entry.resource.buffer.size || "unknown"}`;
        } else if ("texture" in entry.resource) {
          resourceKey += `_texture`;
        } else if ("sampler" in entry.resource) {
          resourceKey += `_sampler`;
        } else {
          resourceKey += `_resource_${entry.resource}`;
        }

        return resourceKey;
      })
      .join("_");

    return `${layoutId}_${entriesKey}`;
  }

  private getGPUUsageFlags(usage: BufferUsage): GPUBufferUsageFlags {
    switch (usage) {
      case BufferUsage.VERTEX:
        return GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
      case BufferUsage.INDEX:
        return GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;
      case BufferUsage.UNIFORM:
        return GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
      case BufferUsage.STORAGE:
        return GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;
      default:
        throw new Error(`Unsupported buffer usage: ${usage}`);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, 10000); // Cleanup every 10 seconds
  }
}
