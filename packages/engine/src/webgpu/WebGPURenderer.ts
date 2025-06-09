import { WebGPUBuffer } from "./WebGPUBuffer";
import { generateUUID } from "@vertex-link/acs";
import { BufferDescriptor, BufferUsage } from "./../rendering/interfaces/IBuffer";

/**
 * Simplified WebGPU Renderer - Just handles device setup and basic operations
 * Main rendering coordination is now handled by WebGPUProcessor
 */
export class WebGPURenderer {
  private canvas: HTMLCanvasElement | null = null;
  private adapter: GPUAdapter | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';
  private depthTexture: GPUTexture | null = null;

  private currentEncoder: GPUCommandEncoder | null = null;
  private currentRenderPass: GPURenderPassEncoder | null = null;
  private _buffersToDestroy: GPUBuffer[] = []; // New: Collect buffers to destroy at frame end

  readonly device: GPUDevice | null = null;

  /**
   * Initialize WebGPU with the given canvas.
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;

    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser');
    }

    this.adapter = await navigator.gpu.requestAdapter();
    if (!this.adapter) {
      throw new Error('Failed to get WebGPU adapter');
    }

    //@ts-ignore
    this.device = await this.adapter.requestDevice();
    if (!this.device) {
      throw new Error('Failed to get WebGPU device');
    }

    this.context = canvas.getContext('webgpu');
    if (!this.context) {
      throw new Error('Failed to get WebGPU canvas context');
    }

    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.createDepthTexture();
    console.log('✅ WebGPU renderer initialized');
  }

  /**
   * Create or recreate depth texture based on canvas size
   */
  private createDepthTexture(): void {
    if (!this.device || !this.canvas) return;

    if (this.depthTexture) {
      this.depthTexture.destroy();
    }

    this.depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      label: 'Depth Texture',
    });
  }

  /**
   * Begin a new frame for rendering.
   */
  beginFrame(): boolean {
    if (!this.device || !this.context || !this.depthTexture) {
      console.error('❌ WebGPU renderer not initialized');
      return false;
    }

    // Recreate depth texture if canvas size changed
    if (this.canvas && (this.canvas.width !== this.depthTexture.width || this.canvas.height !== this.depthTexture.height)) {
      this.createDepthTexture();
    }

    this.currentEncoder = this.device.createCommandEncoder({
      label: `Frame ${generateUUID()}`
    });

    const textureView = this.context.getCurrentTexture().createView();
    const depthTextureView = this.depthTexture.createView();

    this.currentRenderPass = this.currentEncoder.beginRenderPass({
      label: 'Main Render Pass',
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.1, g: 0.15, b: 0.2, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
      depthStencilAttachment: {
        view: depthTextureView,
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store',
      },
    });

    return true;
  }

  /**
   * End the current frame and present to screen.
   */
  endFrame(): void {
    if (!this.device || !this.currentEncoder || !this.currentRenderPass) {
      console.error('❌ No active frame to end');
      return;
    }

    this.currentRenderPass.end();
    this.currentRenderPass = null;

    const commandBuffer = this.currentEncoder.finish();
    this.device.queue.submit([commandBuffer]);
    this.currentEncoder = null;

    // NEW: Destroy collected buffers after submission
    this._buffersToDestroy.forEach(buffer => buffer.destroy());
    this._buffersToDestroy = []; // Clear for next frame
  }

  // === Simplified Utility Methods ===

  /**
   * Set render pipeline (utility for render passes)
   */
  setPipeline(pipeline: GPURenderPipeline): void {
    if (this.currentRenderPass) {
      this.currentRenderPass.setPipeline(pipeline);
    }
  }

  /**
   * Set vertex buffer (utility for render passes)
   */
  setBuffer(binding: number, buffer: GPUBuffer): void {
    if (!this.currentRenderPass) return;

    if (binding === 0) {
      this.currentRenderPass.setVertexBuffer(0, buffer);
    } else if (binding === 1) {
      this.currentRenderPass.setIndexBuffer(buffer, 'uint16');
    }
  }

  /**
   * Set bind group (proper binding management)
   */
  setBindGroup(groupIndex: number, bindGroup: GPUBindGroup): void {
    if (this.currentRenderPass) {
      this.currentRenderPass.setBindGroup(groupIndex, bindGroup);
    }
  }

  /**
   * Create uniform buffer (utility)
   */
  createUniformBuffer(data: ArrayBuffer, label?: string): GPUBuffer {
    if (!this.device) {
      throw new Error("Device not initialized");
    }

    const buffer = this.device.createBuffer({
      size: Math.max(data.byteLength, 16), // Ensure minimum alignment
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: label || 'Uniform Buffer'
    });

    this.device.queue.writeBuffer(buffer, 0, data);
    this._buffersToDestroy.push(buffer); // NEW: Add to list for deferred destruction
    return buffer;
  }

  /**
   * Draw primitives
   */
  draw(vertexCount: number, instanceCount: number = 1): void {
    if (this.currentRenderPass) {
      this.currentRenderPass.draw(vertexCount, instanceCount);
    }
  }

  /**
   * Draw indexed primitives
   */
  drawIndexed(indexCount: number, instanceCount: number = 1): void {
    if (this.currentRenderPass) {
      this.currentRenderPass.drawIndexed(indexCount, instanceCount);
    }
  }

  // === Getters ===

  // public get currentRenderPass(): GPURenderPassEncoder | null {
  //     return this.currentRenderPass;
  // }

  // Also add a method to get the device
  public getDevice(): GPUDevice | null {
    return this.device;
  }

  getFormat(): GPUTextureFormat {
    return this.format;
  }

  getCanvasSize(): { width: number; height: number } {
    if (!this.canvas) return { width: 0, height: 0 };
    return { width: this.canvas.width, height: this.canvas.height };
  }

  // === Resource Creation Utilities ===

  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule {
    if (!this.device) {
      throw new Error("Cannot create shader module: WebGPU device not initialized");
    }
    return this.device.createShaderModule(descriptor);
  }

  async createBuffer(descriptor: BufferDescriptor): Promise<WebGPUBuffer> {
    if (!this.device) {
      throw new Error("Cannot create buffer: WebGPU device not initialized");
    }
    return new WebGPUBuffer(this.device, descriptor);
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    if (this.depthTexture) this.depthTexture.destroy();

    // Destroy any remaining buffers
    this._buffersToDestroy.forEach(buffer => buffer.destroy());
    this._buffersToDestroy = [];

    this.canvas = null;
    this.adapter = null;

    //@ts-ignore
    this.device = null;
    this.context = null;
    this.currentEncoder = null;
    this.currentRenderPass = null;
    this.depthTexture = null;

    console.log('🗑️ WebGPU renderer disposed');
  }

  // === Private Helper Methods ===

  private getGPUUsageFlags(usage: BufferUsage): GPUBufferUsageFlags {
    switch (usage) {
      case BufferUsage.VERTEX:
        return GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
      case BufferUsage.INDEX:
        return GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST;
      case BufferUsage.UNIFORM:
        return GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
      case BufferUsage.STORAGE:
        return GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
      default:
        throw new Error(`Unsupported buffer usage: ${usage}`);
    }
  }
}
