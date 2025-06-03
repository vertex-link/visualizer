// src/webgpu/WebGPUPipeline.ts (Updated)

import { IPipeline, PipelineDescriptor, VertexLayout } from "../engine/rendering/interfaces/IPipeline";
import { generateUUID } from "../utils/uuid";

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
                label: `${this.label}_vertex_module`
            });

            const fragmentShaderModule = this.device.createShaderModule({
                code: descriptor.fragmentShader,
                label: `${this.label}_fragment_module`
            });

            const vertexBufferLayout = this.createWebGPUVertexLayout(descriptor.vertexLayout);

            const depthStencilState: GPUDepthStencilState = {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus',
            };

            // --- ** Explicit Bind Group Layout Definition ** ---
            // This defines what group 0 expects: one uniform buffer at binding 0.
            const bindGroupLayout = this.device.createBindGroupLayout({
                label: `${this.label}_BindGroupLayout_Group0`,
                entries: [
                    {
                        binding: 0, // Corresponds to @binding(0) in your shader
                        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, // Accessible in both VS & FS
                        buffer: {
                            type: 'uniform',
                        },
                    },
                ],
            });

            // Create the overall pipeline layout using the explicit bind group layout(s).
            // For this pipeline, we only have one bind group (group 0).
            const explicitPipelineLayout = this.device.createPipelineLayout({
                label: `${this.label}_PipelineLayout`,
                bindGroupLayouts: [bindGroupLayout], // Array of BGLs, for group 0, 1, 2...
            });
            // --- ** End of Explicit Layout Definition ** ---

            this.pipeline = this.device.createRenderPipeline({
                label: this.label,
                layout: explicitPipelineLayout, // <--- USE THE EXPLICIT LAYOUT
                vertex: {
                    module: vertexShaderModule,
                    entryPoint: descriptor.entryPoints?.vertex || 'vs_main',
                    buffers: [vertexBufferLayout]
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: descriptor.entryPoints?.fragment || 'fs_main',
                    targets: [{
                        format: this.preferredFormat
                    }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'none', // Keep as 'none' for debugging, or set to 'back'
                    frontFace: 'ccw'
                },
                depthStencil: depthStencilState
            });

            this.isCompiled = true;
            console.log(`Pipeline '${this.label}' compiled successfully with explicit layout.`);

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