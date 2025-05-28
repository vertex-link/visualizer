// src/webgpu/WebGPURenderer.ts

import { IRenderer } from "../engine/rendering/interfaces/IRenderer.ts";
import { generateUUID } from "../utils/uuid.ts";

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

    private currentEncoder: GPUCommandEncoder | null = null;
    private currentRenderPass: GPURenderPassEncoder | null = null;
    private currentPipeline: GPURenderPipeline | null = null;

    /**
     * Initialize WebGPU with the given canvas.
     */
    async initialize(canvas: HTMLCanvasElement): Promise<void> {
        this.canvas = canvas;

        // Check WebGPU support
        if (!navigator.gpu) {
            throw new Error('WebGPU is not supported in this browser');
        }

        // Request adapter
        this.adapter = await navigator.gpu.requestAdapter();
        if (!this.adapter) {
            throw new Error('Failed to get WebGPU adapter');
        }

        // Request device
        this.device = await this.adapter.requestDevice();
        if (!this.device) {
            throw new Error('Failed to get WebGPU device');
        }

        // Setup canvas context
        this.context = canvas.getContext('webgpu');
        if (!this.context) {
            throw new Error('Failed to get WebGPU canvas context');
        }

        // Configure canvas
        this.format = navigator.gpu.getPreferredCanvasFormat();
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: 'premultiplied',
        });

        console.log('WebGPU renderer initialized successfully');
    }

    /**
     * Begin a new frame for rendering.
     */
    beginFrame(): boolean {
        if (!this.device || !this.context) {
            console.error('WebGPU renderer not initialized');
            return false;
        }

        // Create command encoder for this frame
        this.currentEncoder = this.device.createCommandEncoder({
            label: `Frame ${generateUUID()}`
        });

        // Begin render pass
        const textureView = this.context.getCurrentTexture().createView();

        this.currentRenderPass = this.currentEncoder.beginRenderPass({
            label: 'Main Render Pass',
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });

        return true;
    }

    /**
     * End the current frame and present to screen.
     */
    endFrame(): void {
        if (!this.device || !this.currentEncoder || !this.currentRenderPass) {
            console.error('No active frame to end');
            return;
        }

        // End render pass
        this.currentRenderPass.end();
        this.currentRenderPass = null;

        // Submit commands
        const commandBuffer = this.currentEncoder.finish();
        this.device.queue.submit([commandBuffer]);

        this.currentEncoder = null;
        this.currentPipeline = null;
    }

    /**
     * Set the current render pipeline.
     */
    setPipeline(pipeline: unknown): void {
        if (!this.currentRenderPass) {
            console.error('No active render pass');
            return;
        }

        const webgpuPipeline = pipeline as GPURenderPipeline;
        this.currentPipeline = webgpuPipeline;
        this.currentRenderPass.setPipeline(webgpuPipeline);
    }

    /**
     * Bind a buffer to the current pipeline.
     */
    setBuffer(binding: number, buffer: unknown): void {
        if (!this.currentRenderPass) {
            console.error('No active render pass');
            return;
        }

        const webgpuBuffer = buffer as GPUBuffer;

        if (binding === 0) {
            // Vertex buffer (binding 0)
            this.currentRenderPass.setVertexBuffer(0, webgpuBuffer);
        } else if (binding === 1) {
            // Index buffer (binding 1)
            this.currentRenderPass.setIndexBuffer(webgpuBuffer, 'uint16');
        }
        // Additional buffer types can be handled here
    }

    /**
     * Set uniform data for the current pipeline.
     */
    setUniforms(binding: number, data: ArrayBuffer): void {
        if (!this.device || !this.currentRenderPass || !this.currentPipeline) {
            console.error('Cannot set uniforms: missing device, render pass, or pipeline');
            return;
        }

        // Create a temporary buffer for uniforms
        const uniformBuffer = this.device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            label: `Uniform Buffer ${binding}`
        });

        // Upload data
        this.device.queue.writeBuffer(uniformBuffer, 0, data);

        // Create bind group (simple approach for Phase 1)
        const bindGroup = this.device.createBindGroup({
            layout: this.currentPipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: { buffer: uniformBuffer }
            }],
            label: `Bind Group ${binding}`
        });

        // Bind to render pass
        this.currentRenderPass.setBindGroup(0, bindGroup);
    }

    /**
     * Draw primitives using the current pipeline and buffers.
     */
    draw(vertexCount: number, instanceCount: number = 1): void {
        if (!this.currentRenderPass) {
            console.error('No active render pass');
            return;
        }

        this.currentRenderPass.draw(vertexCount, instanceCount);
    }

    /**
     * Draw indexed primitives.
     */
    drawIndexed(indexCount: number, instanceCount: number = 1): void {
        if (!this.currentRenderPass) {
            console.error('No active render pass');
            return;
        }

        this.currentRenderPass.drawIndexed(indexCount, instanceCount);
    }

    /**
     * Get the current canvas size.
     */
    getCanvasSize(): { width: number; height: number } {
        if (!this.canvas) {
            return { width: 0, height: 0 };
        }
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    /**
     * Get the WebGPU device (for creating resources).
     */
    getDevice(): GPUDevice | null {
        return this.device;
    }

    /**
     * Get the preferred texture format.
     */
    getFormat(): GPUTextureFormat {
        return this.format;
    }

    /**
     * Cleanup and dispose of renderer resources.
     */
    dispose(): void {
        if (this.device) {
            this.device.destroy();
        }

        this.canvas = null;
        this.adapter = null;
        this.device = null;
        this.context = null;
        this.currentEncoder = null;
        this.currentRenderPass = null;
        this.currentPipeline = null;
    }
}