// src/webgpu/WebGPUPipeline.ts

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

    constructor(device: GPUDevice, descriptor: PipelineDescriptor) {
        this.id = generateUUID();
        this.vertexLayout = descriptor.vertexLayout;
        this.device = device;
        this.label = descriptor.label || `Pipeline_${this.id}`;

        // Compile the pipeline
        this.compile(descriptor);
    }

    /**
     * Check if the pipeline is ready for use.
     */
    isReady(): boolean {
        return this.isCompiled && this.pipeline !== null;
    }

    /**
     * Get the underlying GPU render pipeline.
     */
    getGPURenderPipeline(): GPURenderPipeline {
        if (!this.pipeline) {
            throw new Error('Pipeline not compiled or compilation failed');
        }
        return this.pipeline;
    }

    /**
     * Destroy the pipeline and free its resources.
     */
    destroy(): void {
        // WebGPU pipelines don't have explicit destruction
        // Just clear references
        this.pipeline = null;
        this.isCompiled = false;
    }

    /**
     * Compile the render pipeline from the descriptor.
     */
    private compile(descriptor: PipelineDescriptor): void {
        try {
            // Create shader modules
            const vertexShaderModule = this.device.createShaderModule({
                code: descriptor.vertexShader,
                label: `${this.label}_vertex`
            });

            const fragmentShaderModule = this.device.createShaderModule({
                code: descriptor.fragmentShader,
                label: `${this.label}_fragment`
            });

            // Convert our vertex layout to WebGPU format
            const vertexBufferLayout = this.createWebGPUVertexLayout(descriptor.vertexLayout);

            // Create render pipeline
            this.pipeline = this.device.createRenderPipeline({
                label: this.label,
                layout: 'auto', // Let WebGPU infer the layout
                vertex: {
                    module: vertexShaderModule,
                    entryPoint: 'vs_main',
                    buffers: [vertexBufferLayout]
                },
                fragment: {
                    module: fragmentShaderModule,
                    entryPoint: 'fs_main',
                    targets: [{
                        format: navigator.gpu.getPreferredCanvasFormat()
                    }]
                },
                primitive: {
                    topology: 'triangle-list',
                    cullMode: 'back',
                    frontFace: 'ccw'
                },
                depthStencil: undefined // No depth buffer for Phase 1
            });

            this.isCompiled = true;
            console.log(`Pipeline '${this.label}' compiled successfully`);

        } catch (error) {
            console.error(`Failed to compile pipeline '${this.label}':`, error);
            this.isCompiled = false;
            throw error;
        }
    }

    /**
     * Convert our vertex layout to WebGPU vertex buffer layout.
     */
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

    /**
     * Convert our vertex format strings to WebGPU vertex formats.
     */
    private convertVertexFormat(format: string): GPUVertexFormat {
        switch (format) {
            case 'float32': return 'float32';
            case 'float32x2': return 'float32x2';
            case 'float32x3': return 'float32x3';
            case 'float32x4': return 'float32x4';
            case 'uint32': return 'uint32';
            case 'uint32x2': return 'uint32x2';
            case 'uint32x3': return 'uint32x3';
            case 'uint32x4': return 'uint32x4';
            case 'sint32': return 'sint32';
            case 'sint32x2': return 'sint32x2';
            case 'sint32x3': return 'sint32x3';
            case 'sint32x4': return 'sint32x4';
            default:
                throw new Error(`Unsupported vertex format: ${format}`);
        }
    }

    /**
     * Static factory method to create a pipeline.
     */
    static create(device: GPUDevice, descriptor: PipelineDescriptor): WebGPUPipeline {
        return new WebGPUPipeline(device, descriptor);
    }

    /**
     * Static helper to create a simple colored pipeline.
     */
    static createBasicColored(device: GPUDevice, label?: string): WebGPUPipeline {
        const vertexShader = `
struct VertexInput {
    @location(0) position: vec3f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
}

struct Uniforms {
    mvpMatrix: mat4x4f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    return output;
}
`;

        const fragmentShader = `
@fragment
fn fs_main() -> @location(0) vec4f {
    return vec4f(1.0, 0.5, 0.2, 1.0); // Orange color
}
`;

        const descriptor: PipelineDescriptor = {
            vertexShader,
            fragmentShader,
            vertexLayout: {
                stride: 12, // 3 floats * 4 bytes
                attributes: [{
                    location: 0,
                    format: 'float32x3',
                    offset: 0
                }]
            },
            label: label || 'Basic Colored Pipeline'
        };

        return new WebGPUPipeline(device, descriptor);
    }
}