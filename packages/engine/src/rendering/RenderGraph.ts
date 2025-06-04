export interface RenderBatch {
  material: any; // MaterialResource
  instances: any[]; // MeshRendererComponent[]
  pipeline?: GPURenderPipeline;
  bindGroup?: GPUBindGroup;
}

export interface RenderPassContext {
  renderer: any; // WebGPURenderer
  batches: RenderBatch[];
  camera: any; // CameraComponent
  deltaTime: number;
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
  execute(renderer: any, batches: RenderBatch[], camera: any, deltaTime: number): void {
    if (!this.device) {
      console.warn("⚠️ RenderGraph: No device set, skipping execution");
      return;
    }

    const context: RenderPassContext = {
      renderer,
      batches,
      camera,
      deltaTime
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
      //  console.log(`🎨 ForwardPass: Rendering ${batches.length} batches`);

      // Render each batch
      for (const batch of batches) {
        this.renderBatch(renderer, batch, camera);
      }

      // console.log(`✅ ForwardPass: Completed rendering ${batches.length} batches`);

    } catch (error) {
      console.error("❌ ForwardPass: Rendering error:", error);
    } finally {
      // Always end the frame, even if there was an error
      renderer.endFrame();
    }
  }

  /**
   * Validate material and get pipeline with better error handling
   */
  private validateAndGetPipeline(batch: RenderBatch): GPURenderPipeline | null {
    const material = batch.material;

    // Check if material exists
    if (!material) {
      console.warn("❌ ForwardPass: Batch has no material");
      return null;
    }

    // Check if material has getPipeline method
    if (typeof material.getPipeline !== 'function') {
      console.error(`❌ ForwardPass: Material ${material.constructor.name} missing getPipeline method`);
      return null;
    }

    // Get pipeline
    const pipeline = material.getPipeline();

    // Validate pipeline
    if (!pipeline) {
      console.error(`❌ ForwardPass: Material ${material.constructor.name} getPipeline() returned null/undefined`);

      // Try to debug the material state
      if ('isCompiled' in material) {
        console.log(`Material compiled state: ${material.isCompiled}`);
      }
      if ('pipeline' in material) {
        console.log(`Material internal pipeline:`, material.pipeline);
      }

      return null;
    }

    // Validate that it's actually a GPURenderPipeline
    if (typeof pipeline !== 'object' || !pipeline.constructor || !pipeline.constructor.name.includes('GPURenderPipeline')) {
      console.error(`❌ ForwardPass: getPipeline() returned invalid type:`, typeof pipeline, pipeline);
      return null;
    }

    return pipeline;
  }

  /**
   * Render a single batch
   */
  private renderBatch(renderer: any, batch: RenderBatch, camera: any): void {
    // Set the render pipeline once per batch (if it exists)
    const pipeline = this.validateAndGetPipeline(batch);
    if (!pipeline) {
      console.error("❌ ForwardPass: Cannot render batch, pipeline is invalid.");
      return;
    }
    renderer.setPipeline(pipeline);
    // console.log(`🔧 Set pipeline for material: ${batch.material.constructor.name}`);

    const cameraViewProjectionMatrix = camera.getViewProjectionMatrix();
    const materialColor = batch.material.getUniform('color'); // Get color from material

    // console.log(`🎭 Rendering batch with ${batch.instances.length} instances`);

    // Iterate and render each instance
    for (let i = 0; i < batch.instances.length; i++) {
      const instance = batch.instances[i];
      if (!instance.isRenderable()) {
        console.log(`⚠️ Instance ${i} not renderable`);
        continue;
      }

      const mesh = instance.mesh;
      const transform = instance.getTransform(); // Get the transform component

      if (!mesh || !transform) {
        console.warn(`⚠️ ForwardPass: Instance ${i} has invalid mesh or transform`);
        continue;
      }

      // 1. Prepare instance-specific uniform buffer (viewProjection, model, color)
      const modelMatrix = transform.getWorldMatrix(); // Get the instance's world matrix
      const viewProjectionMatrix = cameraViewProjectionMatrix; // Camera's VP matrix

      const uniformBufferData = new Float32Array(144 / 4); // 144 bytes / 4 bytes per float = 36 floats
      // Layout: viewProjection (16 floats), model (16 floats), color (4 floats)
      uniformBufferData.set(viewProjectionMatrix, 0);       // Offset 0 (0 bytes)
      uniformBufferData.set(modelMatrix, 16);    // Offset 16*4 = 64 bytes
      uniformBufferData.set(materialColor, 32);  // Offset 32*4 = 128 bytes

      // Create and upload temporary uniform buffer for this instance
      // The buffer will now be managed by WebGPURenderer for deferred destruction
      const instanceUniformGPUBuffer = renderer.createUniformBuffer(
        uniformBufferData.buffer,
        `Instance_${instance.actor.id}_Uniforms`
      );

      // Create and set bind group for this instance
      const device = renderer.getDevice();
      if (!device) {
        console.error("❌ ForwardPass: No GPU device available for bind group creation.");
        // instanceUniformGPUBuffer.destroy(); // Removed: Handled by renderer
        continue;
      }

      const bindGroup = device.createBindGroup({
        label: `Instance_${instance.actor.id}_BindGroup`,
        layout: pipeline.getBindGroupLayout(0), // Use the pipeline's layout for group 0
        entries: [{
          binding: 0,
          resource: {
            buffer: instanceUniformGPUBuffer
          }
        }]
      });
      renderer.setBindGroup(0, bindGroup);


      // 2. Set vertex and index buffers
      const vertexBuffer = mesh.getVertexBuffer();
      if (vertexBuffer) {
        renderer.setBuffer(0, vertexBuffer);
      } else {
        console.warn(`⚠️ ForwardPass: Instance ${i} has no vertex buffer`);
        // instanceUniformGPUBuffer.destroy(); // Removed: Handled by renderer
        continue;
      }

      const indexBuffer = mesh.getIndexBuffer();
      if (indexBuffer) {
        renderer.setBuffer(1, indexBuffer); // Set index buffer
      }

      // 3. Draw
      if (mesh.indexCount > 0) {
        renderer.drawIndexed(mesh.indexCount);
      } else if (mesh.vertexCount > 0) {
        renderer.draw(mesh.vertexCount);
      } else {
        console.warn(`⚠️ ForwardPass: Instance ${i} mesh has no vertices/indices to draw`);
      }

      // 4. Clean up the temporary uniform buffer - REMOVED, now handled by WebGPURenderer.endFrame()
      // instanceUniformGPUBuffer.destroy();
    }
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
