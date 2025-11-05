export interface RenderBatch {
  material: any; // MaterialResource
  meshId: string;
  mesh: any; // MeshResource
  instances: Map<string, any>; // Map<string, InstanceData>
  instanceBuffer: GPUBuffer | null;
  instanceData: Float32Array | null;
  pipeline?: GPURenderPipeline;
  bindGroup?: GPUBindGroup;
  isDirty: boolean;
  maxInstances: number;
}

export interface RenderPassContext {
  renderer: any; // WebGPURenderer
  batches: RenderBatch[];
  camera: any; // CameraComponent
  deltaTime: number;
  globalBindGroup: GPUBindGroup | null;
  lightBindGroup?: GPUBindGroup | null;
}

/**
 * Base render pass with improved flexibility
 */
export abstract class RenderPass {
  public name: string;
  public enabled = true;
  public priority = 0; // Lower numbers execute first

  // Dependencies and outputs
  public inputTargets: string[] = [];
  public outputTargets: string[] = [];

  constructor(name: string, priority = 0) {
    this.name = name;
    this.priority = priority;
  }

  /**
   * Called once when pass is added to graph
   */
  initialize(device: GPUDevice): void {
    // Override in subclasses
  }

  /**
   * Execute the render pass
   */
  abstract execute(context: RenderPassContext): void;

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Override in subclasses
  }
}

/**
 * Main render graph that manages render passes
 */
export class RenderGraph {
  private passes: RenderPass[] = [];
  private device: GPUDevice | null = null;

  constructor() {
    // Add default passes in priority order
    // Lower priority numbers execute first
    // Note: ShadowPass is disabled (not added) until shadow mapping is fully implemented
    // this.addPass(new ShadowPass(5));      // Shadow mapping (placeholder)
    this.addPass(new ForwardPass(10));     // Main scene rendering
    this.addPass(new PostProcessPass(100)); // Post-processing
  }

  /**
   * Add a render pass to the graph
   */
  addPass(pass: RenderPass): void {
    this.passes.push(pass);

    // Sort by priority (lower numbers first)
    this.passes.sort((a, b) => a.priority - b.priority);

    // Initialize if device is available
    if (this.device) {
      pass.initialize(this.device);
    }

    console.log(`➕ Added render pass: ${pass.name} (priority: ${pass.priority})`);
  }

  /**
   * Remove a render pass
   */
  removePass(name: string): boolean {
    const index = this.passes.findIndex((pass) => pass.name === name);
    if (index >= 0) {
      const pass = this.passes[index];
      pass.dispose();
      this.passes.splice(index, 1);
      console.log(`➖ Removed render pass: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Initialize the render graph with GPU device
   */
  initialize(device: GPUDevice): void {
    this.device = device;

    // Initialize all passes
    for (const pass of this.passes) {
      pass.initialize(device);
    }

    console.log("📊 Configured render graph for forward rendering");
  }

  /**
   * Execute all enabled render passes
   */
  execute(
    renderer: any,
    batches: RenderBatch[],
    camera: any,
    deltaTime: number,
    globalBindGroup: GPUBindGroup | null = null,
    lightBindGroup: GPUBindGroup | null = null,
  ): void {
    if (!this.device) {
      console.warn("⚠️ RenderGraph: No device set, skipping execution");
      return;
    }

    const context: RenderPassContext = {
      renderer,
      batches,
      camera,
      deltaTime,
      globalBindGroup,
      lightBindGroup,
    };

    // Execute passes in priority order
    for (const pass of this.passes) {
      if (!pass.enabled) continue;

      try {
        pass.execute(context);
      } catch (error) {
        console.error(`❌ ${pass.name} error:`, error);
      }
    }
  }

  /**
   * Get all passes
   */
  getPasses(): RenderPass[] {
    return [...this.passes];
  }

  /**
   * Get pass by name
   */
  getPass(name: string): RenderPass | null {
    return this.passes.find((pass) => pass.name === name) || null;
  }

  /**
   * Enable/disable a pass
   */
  setPassEnabled(name: string, enabled: boolean): void {
    const pass = this.getPass(name);
    if (pass) {
      pass.enabled = enabled;
      console.log(`${enabled ? "✅" : "❌"} ${name} pass ${enabled ? "enabled" : "disabled"}`);
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    for (const pass of this.passes) {
      pass.dispose();
    }
    this.passes.length = 0;
    this.device = null;
  }
}

/**
 * Forward rendering pass with improved pipeline handling
 */
export class ForwardPass extends RenderPass {
  private lightBindGroupLoggedOnce = false;

  constructor(priority = 10) {
    super("Forward", priority);
  }

  /**
   * Execute the forward rendering pass
   */
  execute(context: RenderPassContext): void {
    const { renderer, batches, camera } = context;

    if (!renderer || !camera) {
      console.warn("⚠️ ForwardPass: Missing renderer or camera");
      return;
    }

    if (batches.length === 0) {
      console.log("📋 ForwardPass: No batches to render");
      return;
    }

    // Begin frame rendering
    if (!renderer.beginFrame()) {
      console.error("❌ ForwardPass: Failed to begin frame");
      return;
    }

    try {
      // Set global uniforms once for all batches (group 0)
      const globalUniformsSet = this.setGlobalUniforms(renderer, camera, context.globalBindGroup);

      if (!globalUniformsSet) {
        console.log("⚠️ ForwardPass: Skipping render - global uniforms not ready");
        return; // Skip rendering if global bind group isn't available
      }

      // Set light bind group if available (group 1)
      if (context.lightBindGroup) {
        if (!this.lightBindGroupLoggedOnce) {
          console.log("💡 Setting light bind group (group 1)");
          this.lightBindGroupLoggedOnce = true;
        }
        renderer.setBindGroup(1, context.lightBindGroup);
      } else {
        if (!this.lightBindGroupLoggedOnce) {
          console.log("⚠️ No light bind group available");
          this.lightBindGroupLoggedOnce = true;
        }
      }

      // Render each instanced batch
      for (const batch of batches) {
        this.renderInstancedBatch(renderer, batch);
      }
    } catch (error) {
      console.error("❌ ForwardPass: Rendering error:", error);
    } finally {
      // Always end the frame, even if there was an error
      renderer.endFrame();
    }
  }

  /**
   * Set global uniforms (view-projection matrix) once for all batches
   */
  private setGlobalUniforms(
    renderer: any,
    camera: any,
    globalBindGroup: GPUBindGroup | null,
  ): boolean {
    if (globalBindGroup) {
      renderer.setBindGroup(0, globalBindGroup);
      return true;
    } else {
      console.warn("⚠️ ForwardPass: No global bind group available - skipping render");
      return false;
    }
  }

  /**
   * Render an instanced batch with single draw call
   */
  private renderInstancedBatch(renderer: any, batch: RenderBatch): void {
    if (batch.instances.size === 0) {
      console.warn("⚠️ Batch has 0 instances");
      return;
    }

    // Get pipeline from material
    const pipeline = batch.material.getPipeline();
    if (!pipeline) {
      console.error(`❌ ForwardPass: No pipeline for material ${batch.material.name}`);
      return;
    }

    // Get mesh from batch
    const mesh = batch.mesh;
    if (!mesh) {
      console.error(`❌ ForwardPass: No mesh for batch with meshId ${batch.meshId}`);
      return;
    }

    // Set pipeline once for entire batch
    renderer.setPipeline(pipeline);

    // Set vertex buffers
    const vertexBuffer = mesh.getVertexBuffer();
    if (vertexBuffer) {
      renderer.setVertexBuffer(0, vertexBuffer);
    } else {
      console.warn(`⚠️ ForwardPass: No vertex buffer for batch`);
      return;
    }

    // Set instance buffer
    if (batch.instanceBuffer) {
      renderer.setVertexBuffer(1, batch.instanceBuffer);
    } else {
      console.warn(`⚠️ ForwardPass: No instance buffer for batch`);
      return;
    }

    // Set index buffer if available
    const indexBuffer = mesh.getIndexBuffer();
    if (indexBuffer) {
      renderer.setIndexBuffer(indexBuffer);
    }

    // Single draw call for all instances
    if (mesh.indexCount > 0) {
      renderer.drawIndexed(mesh.indexCount, batch.instances.size);
    } else if (mesh.vertexCount > 0) {
      renderer.draw(mesh.vertexCount, batch.instances.size);
    } else {
      console.warn("⚠️ Mesh has no vertices or indices!");
    }
  }
}

/**
 * Shadow mapping pass - renders scene from light perspective to generate shadow maps.
 *
 * This pass executes before the forward pass to prepare shadow maps for use in lighting.
 * It renders geometry depth-only from each shadow-casting light's perspective.
 *
 * Following SPACe/Engine patterns:
 * - Receives pre-prepared data via RenderPassContext
 * - WebGPUProcessor queries scene for lights with ShadowMapResource
 * - Only executes if shadow data is provided in context
 */
export class ShadowPass extends RenderPass {
  private shadowPipeline: GPURenderPipeline | null = null;
  private shadowBindGroupLayout: GPUBindGroupLayout | null = null;

  constructor(priority = 5) {
    super("Shadow", priority);
  }

  /**
   * Initialize shadow pass resources
   */
  initialize(device: GPUDevice): void {
    this.createShadowPipeline(device);
  }

  /**
   * Create the shadow mapping pipeline (depth-only rendering)
   */
  private createShadowPipeline(device: GPUDevice): void {
    // Bind group layout for shadow uniforms (light view-projection matrix)
    this.shadowBindGroupLayout = device.createBindGroupLayout({
      label: "ShadowBindGroupLayout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      label: "ShadowPipelineLayout",
      bindGroupLayouts: [this.shadowBindGroupLayout],
    });

    // Shader for depth-only rendering
    const shaderCode = `
      struct Uniforms {
        lightViewProj: mat4x4<f32>,
      }

      @group(0) @binding(0) var<uniform> uniforms: Uniforms;

      struct VertexInput {
        @location(0) position: vec3<f32>,
      }

      struct InstanceInput {
        @location(1) modelRow0: vec4<f32>,
        @location(2) modelRow1: vec4<f32>,
        @location(3) modelRow2: vec4<f32>,
        @location(4) modelRow3: vec4<f32>,
      }

      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
      }

      @vertex
      fn vs_main(
        vertex: VertexInput,
        instance: InstanceInput,
      ) -> VertexOutput {
        let modelMatrix = mat4x4<f32>(
          instance.modelRow0,
          instance.modelRow1,
          instance.modelRow2,
          instance.modelRow3
        );

        var output: VertexOutput;
        let worldPos = modelMatrix * vec4<f32>(vertex.position, 1.0);
        output.position = uniforms.lightViewProj * worldPos;
        return output;
      }

      @fragment
      fn fs_main() -> @builtin(frag_depth) f32 {
        return 0.0; // Depth is automatically written
      }
    `;

    const shaderModule = device.createShaderModule({
      label: "ShadowShader",
      code: shaderCode,
    });

    this.shadowPipeline = device.createRenderPipeline({
      label: "ShadowPipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            // Vertex buffer (position only for shadows)
            arrayStride: 32, // Matches mesh vertex format
            stepMode: "vertex",
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
            ],
          },
          {
            // Instance buffer (model matrix)
            arrayStride: 80, // Matches instancing format
            stepMode: "instance",
            attributes: [
              { shaderLocation: 1, offset: 0, format: "float32x4" },
              { shaderLocation: 2, offset: 16, format: "float32x4" },
              { shaderLocation: 3, offset: 32, format: "float32x4" },
              { shaderLocation: 4, offset: 48, format: "float32x4" },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [], // No color targets, depth-only
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });
  }

  /**
   * Execute shadow pass
   *
   * Note: Currently a placeholder. Full implementation requires:
   * - RenderPassContext extension with shadow map data
   * - WebGPUProcessor querying scene for lights with ShadowMapResource
   * - Shadow map render target management
   */
  execute(context: RenderPassContext): void {
    // TODO: Implement shadow map rendering when shadow data is added to context
    // For now, this pass is enabled but does nothing (like PostProcessPass)

    // Future implementation outline:
    // 1. Check if context has shadow maps (e.g., context.shadowMaps)
    // 2. For each shadow-casting light:
    //    - Begin render pass with shadow map as depth attachment
    //    - Set pipeline and light view-projection uniforms
    //    - Render batches from light perspective
    //    - End render pass
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.shadowPipeline = null;
    this.shadowBindGroupLayout = null;
  }
}

/**
 * Post-process pass (placeholder)
 */
export class PostProcessPass extends RenderPass {
  constructor(priority = 100) {
    super("PostProcess", priority);
  }

  execute(context: RenderPassContext): void {
    // Post-processing would go here
    // For now, this is just a placeholder
  }
}
