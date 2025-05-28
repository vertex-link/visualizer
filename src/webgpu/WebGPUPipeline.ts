// src/webgpu/WebGPUPipeline.ts (Updated)

import { IPipeline, PipelineDescriptor, VertexLayout } from "../engine/rendering/interfaces/IPipeline.ts";
import { generateUUID } from "../utils/uuid.ts";

/**
 * WebGPU implementation of the IPipeline interface.
 * Manages shader compilation and render pipeline creation.
 */
export class WebGPUPipeline implements IPipeline {
    public readonly id: string;
    public readonly vertexLayout: VertexLayout;

    private device: GPUDevice;
    private pipeline: GPURenderPipeline | null = null;
    private label: string;
    private isCompiled: boolean = false;
    private preferredFormat: GPUTextureFormat; // Added

    constructor(device: GPUDevice, descriptor: PipelineDescriptor, preferredFormat: GPUTextureFormat) { // Added format
        this.id = generateUUID();
        this.vertexLayout = descriptor.vertexLayout;
        this.device = device;
        this.label = descriptor.label || `Pipeline_${this.id}`;
        this.preferredFormat = preferredFormat; // Store format

        // Compile the pipeline
        this.compile(descriptor);
    }

    isReady(): boolean {
        return this.isCompiled && this.pipeline !== null;
    }

    getGPURenderPipeline(): GPURenderPipeline {
        if (!this.pipeline) {
            throw new Error('Pipeline not compiled or compilation failed');
        }
        return this.pipeline;
    }

    destroy(): void {
        this.pipeline = null;
        this.isCompiled = false;
    }

    private compile(descriptor: PipelineDescriptor): void {
        try {
            const vertexShaderModule = this.device.createShaderModule({
                code: descriptor.vertexShader,
                label: `${this.label}_vertex`
            });

            const fragmentShaderModule = this.device.createShaderModule({
                code: descriptor.fragmentShader,
                label: `${this.label}_fragment`
            });

            const vertexBufferLayout = this.createWebGPUVertexLayout(descriptor.vertexLayout);

            // --- Depth Stencil State Added ---
            const depthStencilState: GPUDepthStencilState = {
                depthWriteEnabled: true,
                depthCompare: 'less', // Standard depth test: Draw if closer
                format: 'depth24plus', // Must match the depth texture format in Renderer
            };
            // --- End Depth Stencil State ---


            this.pipeline = this.device.createRenderPipeline({
                label: this.label,
                layout: 'auto',
                vertex: {
                    module: vertexShaderModule,
                    entryPoint: descriptor.entryPoints?.vertex || 'vs_main', // Use entry points
                    buffers: [vertexBufferLayout]
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: descriptor.entryPoints?.fragment || 'fs_main', // Use entry points
                    targets: [{
                        format: this.preferredFormat // Use stored format
                    }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none',
                    frontFace: 'ccw'
                },
                depthStencil: depthStencilState // Use the defined depth state
            });

            this.isCompiled = true;
            console.log(`Pipeline '${this.label}' compiled successfully`);

        } catch (error) {
            console.error(`Failed to compile pipeline '${this.label}':`, error);
            this.isCompiled = false;
            throw error;
        }
    }


    private createWebGPUVertexLayout(layout: VertexLayout): GPUVertexBufferLayout {
        const attributes: GPUVertexAttribute[] = layout.attributes.map(attr => ({
            shaderLocation: attr.location,
            format: this.convertVertexFormat(attr.format),
            offset: attr.offset
        }));

        return {
            arrayStride: layout.stride,
            stepMode: 'vertex',
            attributes: attributes
        };
    }


    private convertVertexFormat(format: string): GPUVertexFormat {
        // Ensure all possible formats are covered or throw an error
        const validFormats: Record<string, GPUVertexFormat> = {
            'float32': 'float32', 'float32x2': 'float32x2', 'float32x3': 'float32x3', 'float32x4': 'float32x4',
            'uint32': 'uint32', 'uint32x2': 'uint32x2', 'uint32x3': 'uint32x3', 'uint32x4': 'uint32x4',
            'sint32': 'sint32', 'sint32x2': 'sint32x2', 'sint32x3': 'sint32x3', 'sint32x4': 'sint32x4',
            'uint8x2': 'uint8x2', 'uint8x4': 'uint8x4', 'sint8x2': 'sint8x2', 'sint8x4': 'sint8x4',
            'unorm8x2': 'unorm8x2', 'unorm8x4': 'unorm8x4', 'snorm8x2': 'snorm8x2', 'snorm8x4': 'snorm8x4',
            'uint16x2': 'uint16x2', 'uint16x4': 'uint16x4', 'sint16x2': 'sint16x2', 'sint16x4': 'sint16x4',
            'unorm16x2': 'unorm16x2', 'unorm16x4': 'unorm16x4', 'snorm16x2': 'snorm16x2', 'snorm16x4': 'snorm16x4',
            'float16x2': 'float16x2', 'float16x4': 'float16x4',
        };
        const gpuFormat = validFormats[format];
        if (gpuFormat) {
            return gpuFormat;
        }
        throw new Error(`Unsupported vertex format: ${format}`);
    }


    static create(device: GPUDevice, descriptor: PipelineDescriptor, format: GPUTextureFormat): WebGPUPipeline {
        return new WebGPUPipeline(device, descriptor, format);
    }
}