import { generateUUID } from "@vertex-link/space";
import type {
  IPipeline,
  PipelineDescriptor,
  VertexLayout,
} from "../rendering/interfaces/IPipeline";
import {
  createGlobalBindGroupLayout,
  createLightBindGroupLayout,
  createShadowBindGroupLayout,
} from "./StandardBindGroupLayouts";

/**
 * WebGPU implementation of the IPipeline interface.
 * Manages shader compilation and render pipeline creation.
 */
export class WebGPUPipeline implements IPipeline {
  public readonly id: string;
  public readonly vertexLayout: VertexLayout;

  private device: GPUDevice;
  private pipeline: GPURenderPipeline | null = null;
  readonly label: string;
  private isCompiled = false;
  readonly preferredFormat: GPUTextureFormat; // Added

  constructor(
    device: GPUDevice,
    descriptor: PipelineDescriptor,
    preferredFormat: GPUTextureFormat,
  ) {
    // Added format
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
      throw new Error("Pipeline not compiled or compilation failed");
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
        label: `${this.label}_vertex_module`,
      });

      const fragmentShaderModule = this.device.createShaderModule({
        code: descriptor.fragmentShader,
        label: `${this.label}_fragment_module`,
      });

      const vertexBufferLayout = this.createWebGPUVertexLayout(descriptor.vertexLayout);
      const instanceBufferLayout = this.createInstanceBufferLayout();

      // Get render state from descriptor or use defaults
      const renderState = descriptor.renderState || {};
      const cullMode = renderState.cullMode || "back";
      const depthWrite = renderState.depthWrite !== false; // Default true
      const depthTest = renderState.depthTest !== false; // Default true

      const depthStencilState: GPUDepthStencilState = {
        depthWriteEnabled: depthWrite,
        depthCompare: depthTest ? "less" : "always",
        format: "depth24plus",
      };

      // Create explicit bind group layouts based on which groups shader uses
      const bindGroups = descriptor.bindGroups || [0]; // Default: only group 0 (globals)
      const bindGroupLayouts: GPUBindGroupLayout[] = [];

      if (bindGroups.includes(0)) {
        bindGroupLayouts[0] = createGlobalBindGroupLayout(this.device);
      }
      if (bindGroups.includes(1)) {
        bindGroupLayouts[1] = createLightBindGroupLayout(this.device);
      }
      if (bindGroups.includes(2)) {
        bindGroupLayouts[2] = createShadowBindGroupLayout(this.device);
      }

      // Create pipeline layout with explicit bind group layouts
      const pipelineLayout = this.device.createPipelineLayout({
        label: `${this.label}_PipelineLayout`,
        bindGroupLayouts: bindGroupLayouts.filter(layout => layout !== undefined),
      });

      this.pipeline = this.device.createRenderPipeline({
        label: this.label,
        layout: pipelineLayout, // <--- EXPLICIT SHARED LAYOUT
        vertex: {
          module: vertexShaderModule,
          entryPoint: descriptor.entryPoints?.vertex || "vs_main",
          buffers: [vertexBufferLayout, instanceBufferLayout],
        },
        fragment: {
          module: fragmentShaderModule,
          entryPoint: descriptor.entryPoints?.fragment || "fs_main",
          targets: [
            {
              format: this.preferredFormat,
            },
          ],
        },
        primitive: {
          topology: "triangle-list",
          cullMode: cullMode as GPUCullMode,
          frontFace: "ccw",
        },
        depthStencil: depthStencilState,
      });

      this.isCompiled = true;
      console.log(`Pipeline '${this.label}' compiled successfully with bind groups: [${bindGroups.join(", ")}]`);
    } catch (error) {
      console.error(`Failed to compile pipeline '${this.label}':`, error);
      this.isCompiled = false;
      throw error;
    }
  }

  private createWebGPUVertexLayout(layout: VertexLayout): GPUVertexBufferLayout {
    const attributes: GPUVertexAttribute[] = layout.attributes.map((attr) => ({
      shaderLocation: attr.location,
      format: this.convertVertexFormat(attr.format),
      offset: attr.offset,
    }));

    return {
      arrayStride: layout.stride,
      stepMode: "vertex",
      attributes: attributes,
    };
  }

  /**
   * Create instance buffer layout for model matrix and color
   */
  private createInstanceBufferLayout(): GPUVertexBufferLayout {
    return {
      arrayStride: 80, // 16 floats (model matrix) + 4 floats (color) = 20 floats * 4 bytes = 80 bytes
      stepMode: "instance",
      attributes: [
        // Model matrix (4x4) split into 4 vec4 attributes
        { shaderLocation: 4, format: "float32x4", offset: 0 }, // Row 0
        { shaderLocation: 5, format: "float32x4", offset: 16 }, // Row 1
        { shaderLocation: 6, format: "float32x4", offset: 32 }, // Row 2
        { shaderLocation: 7, format: "float32x4", offset: 48 }, // Row 3
        // Instance color
        { shaderLocation: 8, format: "float32x4", offset: 64 }, // Color
      ],
    };
  }

  private convertVertexFormat(format: string): GPUVertexFormat {
    // Ensure all possible formats are covered or throw an error
    const validFormats: Record<string, GPUVertexFormat> = {
      float32: "float32",
      float32x2: "float32x2",
      float32x3: "float32x3",
      float32x4: "float32x4",
      uint32: "uint32",
      uint32x2: "uint32x2",
      uint32x3: "uint32x3",
      uint32x4: "uint32x4",
      sint32: "sint32",
      sint32x2: "sint32x2",
      sint32x3: "sint32x3",
      sint32x4: "sint32x4",
      uint8x2: "uint8x2",
      uint8x4: "uint8x4",
      sint8x2: "sint8x2",
      sint8x4: "sint8x4",
      unorm8x2: "unorm8x2",
      unorm8x4: "unorm8x4",
      snorm8x2: "snorm8x2",
      snorm8x4: "snorm8x4",
      uint16x2: "uint16x2",
      uint16x4: "uint16x4",
      sint16x2: "sint16x2",
      sint16x4: "sint16x4",
      unorm16x2: "unorm16x2",
      unorm16x4: "unorm16x4",
      snorm16x2: "snorm16x2",
      snorm16x4: "snorm16x4",
      float16x2: "float16x2",
      float16x4: "float16x4",
    };
    const gpuFormat = validFormats[format];
    if (gpuFormat) {
      return gpuFormat;
    }
    throw new Error(`Unsupported vertex format: ${format}`);
  }

  static create(
    device: GPUDevice,
    descriptor: PipelineDescriptor,
    format: GPUTextureFormat,
  ): WebGPUPipeline {
    return new WebGPUPipeline(device, descriptor, format);
  }
}
