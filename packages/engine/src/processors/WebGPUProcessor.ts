import { createProcessorUpdateDecorator, Processor, Scene } from "@vertex-link/acs";
import { MeshRendererComponent } from "../rendering/components/MeshRendererComponent";
import { WebGPURenderer } from "../webgpu/WebGPURenderer";
import { GPUResourcePool } from "../rendering/GPUResourcePool";
import { RenderGraph } from "../rendering/RenderGraph";
import { CameraComponent } from "../rendering/camera/CameraComponent";
import { TransformComponent } from "../rendering/components/TransformComponent";
import { MaterialResource } from "../resources/MaterialResource";
import { MeshResource } from "../resources/MeshResource";
import { on, off, ResourceReadyEvent } from "@vertex-link/acs";

/**
 * Decorator to hook into WebGPU rendering loop
 */
export function WebGPUUpdate() {
  return createProcessorUpdateDecorator("webgpu", "WebGPUUpdate");
}



/**
 * Instance data for a single object
 */
interface InstanceData {
  modelMatrix: Float32Array; // 16 floats
  color: Float32Array;       // 4 floats
  transformVersion: number;  // Track transform changes
}

/**
 * Instanced render batch for efficient drawing
 */
interface InstancedRenderBatch {
  material: MaterialResource;
  meshId: string;
  mesh: MeshResource;
  instances: Map<string, InstanceData>;
  instanceBuffer: GPUBuffer | null;
  instanceData: Float32Array | null;
  pipeline?: GPURenderPipeline;
  bindGroup?: GPUBindGroup;
  isDirty: boolean;
  maxInstances: number;
}

/**
 * WebGPU Processor - Coordinates rendering through existing component system
 */
export class WebGPUProcessor extends Processor {
  private canvas: HTMLCanvasElement;
  readonly renderer: WebGPURenderer;
  private resourcePool: GPUResourcePool;
  private renderGraph: RenderGraph;

  // Scene reference for queries
  private scene: Scene | null = null;

  // Cached render data (updated when dirty)
  private cachedBatches: InstancedRenderBatch[] = [];
  private globalUniformBuffer: GPUBuffer | null = null;
  private globalBindGroup: GPUBindGroup | null = null;
  private activeCamera: CameraComponent | null = null;
  private isDirty = true;

  // Frame timing
  private lastFrameTime = 0;
  private animationFrameId?: number;

  constructor(canvas: HTMLCanvasElement, name: string = "webgpu") {
    super(name);
    this.canvas = canvas;
    this.renderer = new WebGPURenderer();
    this.resourcePool = new GPUResourcePool();
    this.renderGraph = new RenderGraph();
  }

  /**
   * Initialize WebGPU processor with canvas
   */
  async initialize(): Promise<void> {
    await this.renderer.initialize(this.canvas);
    this.resourcePool.initialize(this.renderer.getDevice()!);

    // Initialize render graph with device - THIS WAS MISSING!
    this.renderGraph.initialize(this.renderer.getDevice()!);

    // Update camera aspect ratio based on canvas
    this.updateCameraAspectRatios();

    // Listen for resources becoming ready
    on(ResourceReadyEvent, this.handleResourceReady, this);

    console.log(this.renderer.device?.adapterInfo.vendor);

    console.log("✅ WebGPUProcessor initialized");
  }

  /**
   * Set the scene to render (called from application)
   */
  setScene(scene: Scene): void {
    this.scene = scene;
    this.markDirty();
  }

  /**
   * Mark render data as dirty (forces re-batching)
   */
  markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Main render loop - called by processor system
   */
  protected executeTasks(deltaTime: number): void {
    if (!this.scene || !this.renderer.getDevice()) {
      return;
    }

    // 1. Update render batches if dirty
    if (this.isDirty) {
      this.updateRenderBatches();
      this.updateActiveCamera();
      this.isDirty = false;
    }

    // 2. Check for transform updates and mark batches dirty
    this.checkTransformUpdates();

    // 3. Upload instance data and create global uniforms
    this.uploadInstanceData();
    this.updateGlobalUniforms();

    // 4. Execute render graph with camera
    this.renderGraph.execute(this.renderer, this.cachedBatches, this.activeCamera, deltaTime, this.globalBindGroup);

    // 3. Call @WebGPUUpdate decorated methods (for custom render logic)
    super.executeTasks(deltaTime);
  }

  /**
   * Query scene and create efficient instanced render batches
   */
  private updateRenderBatches(): void {
    if (!this.scene) return;

    // Query all renderable objects
    const renderables = this.scene.query()
      .withComponent(TransformComponent)
      .withComponent(MeshRendererComponent)
      .execute();

    // Group by material+mesh for instancing
    const batchGroups = new Map<string, MeshRendererComponent[]>();

    for (const actor of renderables) {
      const meshRenderer = actor.getComponent(MeshRendererComponent);
      if (!meshRenderer?.isRenderable()) continue;

      const materialId = meshRenderer.material?.id || 'default';
      const meshId = meshRenderer.mesh?.id || 'default';
      const batchKey = `${materialId}_${meshId}`;

      if (!batchGroups.has(batchKey)) {
        batchGroups.set(batchKey, []);
      }
      batchGroups.get(batchKey)!.push(meshRenderer);
    }

    // Create instanced render batches
    this.cachedBatches = Array.from(batchGroups.entries()).map(([batchKey, meshRenderers]) => {
      const batch = this.createInstancedBatch(meshRenderers[0].material!, meshRenderers[0].mesh!);
      
      // Add all instances to the batch
      for (const meshRenderer of meshRenderers) {
        const transform = meshRenderer.actor?.getComponent(TransformComponent);
        if (transform) {
          const modelMatrix = transform.getWorldMatrix();
          const color = this.getInstanceColor(meshRenderer.material!);
          batch.instances.set(meshRenderer.actor!.id, { modelMatrix, color, transformVersion: transform.version });
        }
      }
      
      batch.isDirty = true;
      return batch;
    });

    console.log(`📦 Created ${this.cachedBatches.length} instanced render batches for ${renderables.length} objects`);
  }

  /**
   * Convert material color uniform to Float32Array
   */
  private getInstanceColor(material: MaterialResource): Float32Array {
    const colorUniform = material.getUniform('color');
    
    if (colorUniform instanceof Float32Array) {
      return colorUniform;
    } else if (Array.isArray(colorUniform)) {
      return new Float32Array(colorUniform);
    } else if (typeof colorUniform === 'number') {
      return new Float32Array([colorUniform, colorUniform, colorUniform, 1.0]);
    } else {
      return new Float32Array([1.0, 1.0, 1.0, 1.0]); // Default white
    }
  }

  /**
   * Create an instanced render batch
   */
  private createInstancedBatch(material: MaterialResource, mesh: MeshResource): InstancedRenderBatch {
    const maxInstances = 1000;
    const device = this.renderer.getDevice()!;
    
    // Create instance buffer
    const bufferSize = maxInstances * 80; // 80 bytes per instance (16 + 4 floats)
    const instanceBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      label: `InstanceBuffer_${material.name}_${mesh.id}`
    });

    return {
      material,
      meshId: mesh.id,
      mesh,
      instances: new Map(),
      instanceBuffer,
      instanceData: new Float32Array(maxInstances * 20), // 20 floats per instance
      pipeline: undefined,
      bindGroup: undefined,
      isDirty: true,
      maxInstances
    };
  }

  /**
   * Handle ResourceReadyEvent - add single object to render batches
   */
  private handleResourceReady = (event: ResourceReadyEvent): void => {
    const meshRenderer = event.payload.meshRenderer as MeshRendererComponent;
    
    console.log(`📨 ResourceReadyEvent received for ${meshRenderer?.actor?.label}`);
    
    if (!meshRenderer?.isRenderable()) {
      console.log(`📨 Skipping - not renderable`);
      return;
    }

    const material = meshRenderer.material!;
    const meshId = meshRenderer.mesh?.id || 'default';
    const batchKey = `${material.id}_${meshId}`;

    console.log(`📨 Adding to batches with material: ${material.name}, mesh: ${meshId}`);

    // Find existing batch for this material+mesh combination
    let batch = this.cachedBatches.find(b => b.material.id === material.id && b.meshId === meshId);
    
    if (batch) {
      // Add to existing batch
      const transform = meshRenderer.actor?.getComponent(TransformComponent);
      if (transform) {
        const modelMatrix = transform.getWorldMatrix();
        const color = this.getInstanceColor(meshRenderer.material!);
        batch.instances.set(meshRenderer.actor!.id, { modelMatrix, color, transformVersion: transform.version });
        batch.isDirty = true;
        // console.log(`📨 Added to existing batch. New batch size: ${batch.instances.size}`);
      }
    } else {
      // Create new batch for this material+mesh combination
      batch = this.createInstancedBatch(material, meshRenderer.mesh!);
      const transform = meshRenderer.actor?.getComponent(TransformComponent);
      if (transform) {
        const modelMatrix = transform.getWorldMatrix();
        const color = this.getInstanceColor(meshRenderer.material!);
        batch.instances.set(meshRenderer.actor!.id, { modelMatrix, color, transformVersion: transform.version });
      }
      this.cachedBatches.push(batch);
      // console.log(`📨 Created new instanced batch. Total batches: ${this.cachedBatches.length}`);
    }
  };

  /**
   * Update the active camera from scene
   */
  private updateActiveCamera(): void {
    if (!this.scene) {
      this.activeCamera = null;
      return;
    }

    const cameras = this.scene.query().withComponent(CameraComponent).execute();

    // Find active camera
    for (const actor of cameras) {
      const camera = actor.getComponent(CameraComponent);
      if (camera?.isActive) {
        this.activeCamera = camera;
        return;
      }
    }

    // No active camera found
    if (cameras.length > 0) {
      // Make first camera active if none are
      const firstCamera = cameras[0].getComponent(CameraComponent);
      if (firstCamera) {
        firstCamera.isActive = true;
        this.activeCamera = firstCamera;
        console.warn("⚠️ No active camera found, activating first camera");
      }
    } else {
      this.activeCamera = null;
      console.warn("⚠️ No cameras found in scene");
    }
  }

  /**
   * Update camera aspect ratios based on canvas size
   */
  private updateCameraAspectRatios(): void {
    if (!this.scene || !this.canvas) return;

    const aspect = this.canvas.width / this.canvas.height;
    const cameras = this.scene.query().withComponent(CameraComponent).execute();

    for (const actor of cameras) {
      const camera = actor.getComponent(CameraComponent);
      if (camera) {
        camera.setAspectRatio(aspect);
      }
    }
  }

  /**
   * Check if any transforms have been updated and mark batches dirty
   */
  private checkTransformUpdates(): void {
    if (!this.scene) return;

    for (const batch of this.cachedBatches) {
      for (const [actorId, instanceData] of batch.instances) {
        const actor = this.scene.getActor(actorId);
        if (actor) {
          const transform = actor.getComponent(TransformComponent);
          if (transform && transform.version !== instanceData.transformVersion) {
            // Update instance data with new transform
            instanceData.modelMatrix = transform.getWorldMatrix();
            instanceData.transformVersion = transform.version;
            batch.isDirty = true;
          }
        }
      }
    }
  }

  /**
   * Upload instance data and create global uniforms
   */
  private uploadInstanceData(): void {
    const device = this.renderer.getDevice()!;
    
    for (const batch of this.cachedBatches) {
      if (!batch.isDirty || !batch.instanceData || !batch.instanceBuffer) continue;

      let offset = 0;
      for (const instance of batch.instances.values()) {
        // Pack model matrix (16 floats)
        batch.instanceData.set(instance.modelMatrix, offset);
        offset += 16;
        
        // Pack color (4 floats)
        batch.instanceData.set(instance.color, offset);
        offset += 4;
      }

      // Upload only the used portion
      const usedBytes = batch.instances.size * 80;
      if (usedBytes > 0) {
        device.queue.writeBuffer(
          batch.instanceBuffer, 
          0, 
          batch.instanceData.buffer, 
          0, 
          usedBytes
        );
        // console.log(`📤 Uploaded ${batch.instances.size} instances for ${batch.material.name}`);
      }
      
      batch.isDirty = false;
    }
  }

  /**
   * Update global uniform buffer with view-projection matrix
   */
  private updateGlobalUniforms(): void {
    if (!this.activeCamera) {
      console.warn("⚠️ No active camera for global uniforms");
      return;
    }
    
    const device = this.renderer.getDevice()!;
    const globalData = new Float32Array(16);
    globalData.set(this.activeCamera.getViewProjectionMatrix());
    
    // Create or update global uniform buffer
    if (this.globalUniformBuffer) {
      device.queue.writeBuffer(this.globalUniformBuffer, 0, globalData.buffer);
      
      // Recreate bind group if we don't have one (materials might have loaded)
      if (!this.globalBindGroup) {
        // console.log("🔄 Attempting to create missing global bind group...");
        this.createGlobalBindGroup();
      }
    } else {
      // console.log("🌐 Creating global uniform buffer...");
      this.globalUniformBuffer = device.createBuffer({
        size: 64, // 16 floats * 4 bytes
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        label: 'GlobalUniforms'
      });
      device.queue.writeBuffer(this.globalUniformBuffer, 0, globalData.buffer);
      
      // Create global bind group (will only work if we have pipelines)
      this.createGlobalBindGroup();
    }
    
    // if (this.globalBindGroup) {
    //   console.log("✅ Global bind group ready");
    // } else {
    //   console.warn("⚠️ Global bind group still not available");
    // }
  }

  /**
   * Create global bind group for view-projection matrix
   */
  private createGlobalBindGroup(): void {
    if (!this.globalUniformBuffer) {
      console.warn("⚠️ Cannot create bind group: no global uniform buffer");
      return;
    }
    
    const device = this.renderer.getDevice()!;
    
    // console.log(`🔍 Looking for pipeline in ${this.cachedBatches.length} batches...`);
    
    // Get bind group layout from first available pipeline
    let bindGroupLayout: GPUBindGroupLayout | null = null;
    let foundPipeline = false;
    
    for (const batch of this.cachedBatches) {
      const pipeline = batch.material.getPipeline();
      if (pipeline) {
        // console.log(`✅ Found pipeline in material: ${batch.material.name}`);
        bindGroupLayout = pipeline.getBindGroupLayout(0);
        foundPipeline = true;
        break;
      } else {
        // console.log(`❌ No pipeline in material: ${batch.material.name}`);
      }
    }
    
    if (!bindGroupLayout) {
      console.warn(`⚠️ No pipeline available to get bind group layout (checked ${this.cachedBatches.length} batches, found pipeline: ${foundPipeline})`);
      return;
    }
    
    try {
      // Create bind group using pipeline's layout
      this.globalBindGroup = device.createBindGroup({
        label: 'GlobalBindGroup',
        layout: bindGroupLayout,
        entries: [{
          binding: 0,
          resource: { buffer: this.globalUniformBuffer }
        }]
      });
      // console.log("✅ Global bind group created successfully");
    } catch (error) {
      console.error("❌ Failed to create global bind group:", error);
    }
  }

  /**
   * Get active camera
   */
  getActiveCamera(): CameraComponent | null {
    return this.activeCamera;
  }

  /**
   * Get resource pool for components to use
   */
  getResourcePool(): GPUResourcePool {
    return this.resourcePool;
  }

  /**
   * Get WebGPU device
   */
  getDevice(): GPUDevice | null {
    return this.renderer.getDevice();
  }

  /**
   * Start the WebGPU render loop using requestAnimationFrame
   */
  public start(): void {
    if (!this.renderer.getDevice()) {
      console.error("❌ Cannot start WebGPUProcessor: not initialized");
      return;
    }

    if (this._isRunning) {
      console.warn("⚠️ WebGPUProcessor already running");
      return;
    }

    this._isRunning = true;
    this.lastFrameTime = performance.now();
    console.log("🚀 WebGPUProcessor started");

    // Start the render loop
    this.renderLoop();
  }

  /**
   * Stop the render loop
   */
  public stop(): void {
    if (!this._isRunning) {
      return;
    }

    this._isRunning = false;

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }

    // Cleanup instanced resources
    this.cachedBatches.forEach(batch => {
      if (batch.instanceBuffer) {
        batch.instanceBuffer.destroy();
      }
    });
    if (this.globalUniformBuffer) {
      this.globalUniformBuffer.destroy();
    }

    // Cleanup resources
    this.resourcePool.dispose();
    this.renderer.dispose();

    // Cleanup event listeners
    off(ResourceReadyEvent, this.handleResourceReady);

    console.log("🛑 WebGPUProcessor stopped");
  }

  /**
   * Main render loop using requestAnimationFrame
   */
  private renderLoop(): void {
    if (!this._isRunning) {
      return; // Stop the loop
    }

    // Calculate delta time
    const now = performance.now();
    const deltaTime = this.lastFrameTime === 0 ? 0.016 : (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    // Execute tasks (this calls our overridden executeTasks method)
    this.executeTasks(deltaTime);

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.renderLoop());
  }

  /**
   * Handle canvas resize
   */
  public handleResize(): void {
    if (!this.canvas) return;

    // Update camera aspect ratios
    this.updateCameraAspectRatios();

    // Mark dirty to update render state
    this.markDirty();
  }
}
