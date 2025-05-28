// src/webgpu/WebGPURenderer.ts (Updated)

import { IRenderer } from "../engine/rendering/interfaces/IRenderer.ts";
import { generateUUID } from "../utils/uuid.ts";
import { WebGPUBuffer } from "./WebGPUBuffer.ts"; // Import WebGPUBuffer
import { IBuffer, BufferDescriptor, BufferUsage } from "../engine/rendering/interfaces/IBuffer.ts"; // Import IBuffer and BufferDescriptor
import { IPipeline, PipelineDescriptor } from "../engine/rendering/interfaces/IPipeline.ts"; // Import IPipeline and PipelineDescriptor
import { WebGPUPipeline } from "./WebGPUPipeline.ts"; // Import WebGPUPipeline


/**
 * WebGPU implementation of the IRenderer interface.
 * Handles device initialization, command encoding, and frame presentation.
 */
export class WebGPURenderer implements IRenderer {
    private canvas: HTMLCanvasElement | null = null;
    private adapter: GPUAdapter | null = null;
    private device: GPUDevice | null = null;
    private context: GPUCanvasContext | null = null;
    private format: GPUTextureFormat = 'bgra8unorm';
    private depthTexture: GPUTexture | null = null; // Added

    private currentEncoder: GPUCommandEncoder | null = null;
    private currentRenderPass: GPURenderPassEncoder | null = null;
    private currentPipeline: GPURenderPipeline | null = null;

    // Added for statistics
    private renderService: IRenderService | null = null;


    public setRenderService(service: IRenderService): void {
        this.renderService = service;
    }

    public recordDrawCall(vertexCount: number, indexCount?: number): void {
        // This is a placeholder. In a real scenario, you'd update stats here
        // or call a method on the RenderService if it holds the stats.
        // For now, we assume RenderService will handle stats.
        // If RenderService needs this data, it should call this method.
    }


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

        this.createDepthTexture(); // Create depth texture on init/resize

        console.log('WebGPU renderer initialized successfully');
    }

    /**
     * Create or recreate the depth texture based on canvas size.
     */
    private createDepthTexture(): void {
        if (!this.device || !this.canvas) return;

        if (this.depthTexture) {
            this.depthTexture.destroy();
        }

        this.depthTexture = this.device.createTexture({
            size: [this.canvas.width, this.canvas.height],
            format: 'depth24plus', // Common depth format
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            label: 'Depth Texture',
        });
    }

    /**
     * Begin a new frame for rendering.
     */
    beginFrame(): boolean {
        if (!this.device || !this.context || !this.depthTexture) {
            console.error('WebGPU renderer not initialized or depth texture missing');
            return false;
        }

        // Check for size mismatch and recreate depth texture if needed
        if (this.canvas && (this.canvas.width !== this.depthTexture.width || this.canvas.height !== this.depthTexture.height)) {
            console.warn("Canvas size changed, recreating depth texture.");
            this.createDepthTexture();
            if(!this.depthTexture) return false; // Exit if recreation failed
        }


        this.currentEncoder = this.device.createCommandEncoder({
            label: `Frame ${generateUUID()}`
        });

        const textureView = this.context.getCurrentTexture().createView();
        const depthTextureView = this.depthTexture.createView(); // View for depth

        this.currentRenderPass = this.currentEncoder.beginRenderPass({
            label: 'Main Render Pass',
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.1, g: 0.15, b: 0.2, a: 1.0 }, // Slightly bluish
                loadOp: 'clear',
                storeOp: 'store',
            }],
            depthStencilAttachment: { // Added
                view: depthTextureView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
            },
        });

        return true;
    }


    endFrame(): void {
        if (!this.device || !this.currentEncoder || !this.currentRenderPass) {
            console.error('No active frame to end');
            return;
        }

        this.currentRenderPass.end();
        this.currentRenderPass = null;

        const commandBuffer = this.currentEncoder.finish();
        this.device.queue.submit([commandBuffer]);

        this.currentEncoder = null;
        this.currentPipeline = null;
    }


    setPipeline(pipeline: unknown): void {
        if (!this.currentRenderPass) {
            console.error('No active render pass');
            return;
        }

        const webgpuPipeline = pipeline as GPURenderPipeline;
        this.currentPipeline = webgpuPipeline;
        this.currentRenderPass.setPipeline(webgpuPipeline);
    }

    setBuffer(binding: number, buffer: unknown): void {
        if (!this.currentRenderPass) {
            console.error('No active render pass');
            return;
        }

        const webgpuBuffer = buffer as GPUBuffer;

        if (binding === 0) {
            this.currentRenderPass.setVertexBuffer(0, webgpuBuffer);
        } else if (binding === 1) {
            // Assume uint16 for now, might need more info later
            this.currentRenderPass.setIndexBuffer(webgpuBuffer, 'uint16');
        }
    }

    /**
     * Set uniform data for the current pipeline.
     * This needs a more robust implementation for reusing bind groups and buffers.
     * For Phase 3, we'll create them per-draw, but acknowledge this is inefficient.
     */
    setUniforms(binding: number, data: ArrayBuffer): void {
        if (!this.device || !this.currentRenderPass || !this.currentPipeline) {
            console.error('Cannot set uniforms: missing device, render pass, or pipeline');
            return;
        }

        // **Inefficient Approach (for Phase 3): Create per-draw**
        // In Phase 5, you'll want to manage and reuse these.
        const uniformBuffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: `Uniform Buffer ${binding}_${Date.now()}` // Unique label
        });

        this.device.queue.writeBuffer(uniformBuffer, 0, data);

        try {
            const bindGroupLayout = this.currentPipeline.getBindGroupLayout(0);
            const bindGroup = this.device.createBindGroup({
                layout: bindGroupLayout,
                entries: [{
                    binding: 0, // Assuming binding 0 in the group
                    resource: { buffer: uniformBuffer }
                }],
                label: `Bind Group ${binding}_${Date.now()}`
            });

            this.currentRenderPass.setBindGroup(0, bindGroup); // Group 0 for now
        } catch (e) {
            console.error("Failed to create/set bind group:", e, "Pipeline:", this.currentPipeline);
            // Destroy the temporary buffer if bind group fails
            uniformBuffer.destroy();
        }

        // NOTE: We are NOT destroying the uniformBuffer here, leading to a memory leak.
        // A proper BufferManager or resource tracking system is needed.
        // For Phase 3, this allows rendering, but needs fixing.
    }


    draw(vertexCount: number, instanceCount: number = 1): void {
        if (!this.currentRenderPass) {
            console.error('No active render pass');
            return;
        }
        this.currentRenderPass.draw(vertexCount, instanceCount);
    }


    drawIndexed(indexCount: number, instanceCount: number = 1): void {
        if (!this.currentRenderPass) {
            console.error('No active render pass');
            return;
        }
        this.currentRenderPass.drawIndexed(indexCount, instanceCount);
    }


    getCanvasSize(): { width: number; height: number } {
        if (!this.canvas) {
            return { width: 0, height: 0 };
        }
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }


    getDevice(): GPUDevice | null {
        return this.device;
    }


    getFormat(): GPUTextureFormat {
        return this.format;
    }


    dispose(): void {
        if (this.depthTexture) this.depthTexture.destroy();
        if (this.device) this.device.destroy();
        // ... (rest of the cleanup)
        this.canvas = null;
        this.adapter = null;
        this.device = null;
        this.context = null;
        this.currentEncoder = null;
        this.currentRenderPass = null;
        this.currentPipeline = null;
        this.depthTexture = null;
    }

    // --- Added methods for Phase 3 ---

    public async createBuffer(descriptor: BufferDescriptor): Promise<IBuffer> {
        if (!this.device) {
            throw new Error("Cannot create buffer: WebGPU device not initialized.");
        }
        // Add mappableAtCreation if needed for initial data (optional but good)
        const gpuUsage = this.getGPUUsageFlags(descriptor.usage);
        const gpuBuffer = this.device.createBuffer({
            size: descriptor.size,
            usage: gpuUsage,
            label: descriptor.label || `Buffer_${descriptor.usage}`,
            mappedAtCreation: false, // Keep false unless you plan to map immediately
        });

        return {
            id: generateUUID(),
            size: descriptor.size,
            usage: descriptor.usage,
            setData: (data: ArrayBuffer | ArrayBufferView, offset: number = 0) => {
                if (!this.device) throw new Error("Device gone");
                const arrayBuffer = data instanceof ArrayBuffer ? data : data.buffer;
                this.device.queue.writeBuffer(gpuBuffer, offset, arrayBuffer);
            },
            getData: async (_offset?: number, _length?: number): Promise<ArrayBuffer> => {
                throw new Error("getData not implemented for this simple buffer wrapper");
            },
            destroy: () => {
                gpuBuffer.destroy();
            },
            // Expose internal buffer for WebGPURenderer
            getGPUBuffer: () => gpuBuffer
        } as IBuffer & { getGPUBuffer: () => GPUBuffer }; // Add getGPUBuffer for internal use
    }


    public async createPipeline(descriptor: PipelineDescriptor): Promise<IPipeline> {
        if (!this.device) {
            throw new Error("Cannot create pipeline: WebGPU device not initialized.");
        }
        // Use your WebGPUPipeline class
        return new WebGPUPipeline(this.device, descriptor, this.format);
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
                return GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
            default:
                throw new Error(`Unsupported buffer usage: ${usage}`);
        }
    }
}