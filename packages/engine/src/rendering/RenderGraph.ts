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
}

/**
 * Base render pass with improved flexibility
 */
export abstract class RenderPass {
  public name: string;
  public enabled: boolean = true;
  public priority: number = 0; // Lower numbers execute first

  // Dependencies and outputs
  public inputTargets: string[] = [];
  public outputTargets: string[] = [];

  constructor(name: string, priority: number = 0) {
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
    // Add default passes
    this.addPass(new ForwardPass(10));
    this.addPass(new PostProcessPass(100));
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
    const index = this.passes.findIndex(pass => pass.name === name);
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
  execute(renderer: any, batches: RenderBatch[], camera: any, deltaTime: number, globalBindGroup: GPUBindGroup | null = null): void {
    if (!this.device) {
      console.warn("⚠️ RenderGraph: No device set, skipping execution");
      return;
    }

    const context: RenderPassContext = {
      renderer,
      batches,
      camera,
      deltaTime,
      globalBindGroup
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
    return this.passes.find(pass => pass.name === name) || null;
  }

  /**
   * Enable/disable a pass
   */
  setPassEnabled(name: string, enabled: boolean): void {
    const pass = this.getPass(name);
    if (pass) {
      pass.enabled = enabled;
      console.log(`${enabled ? '✅' : '❌'} ${name} pass ${enabled ? 'enabled' : 'disabled'}`);
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
  constructor(priority: number = 10) {
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
      // Set global uniforms once for all batches
      const globalUniformsSet = this.setGlobalUniforms(renderer, camera, context.globalBindGroup);
      
      if (!globalUniformsSet) {
        console.log("⚠️ ForwardPass: Skipping render - global uniforms not ready");
        return; // Skip rendering if global bind group isn't available
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
  private setGlobalUniforms(renderer: any, camera: any, globalBindGroup: GPUBindGroup | null): boolean {
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
    if (batch.instances.size === 0) return;

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
    }

    // console.log(`🚀 Rendered ${batch.instances.size} instances in single draw call`);
  }
}

/**
 * Post-process pass (placeholder)
 */
export class PostProcessPass extends RenderPass {
  constructor(priority: number = 100) {
    super("PostProcess", priority);
  }

  execute(context: RenderPassContext): void {
    // Post-processing would go here
    // For now, this is just a placeholder
  }
}
