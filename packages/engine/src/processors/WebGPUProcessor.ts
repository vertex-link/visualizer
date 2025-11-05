import { Context, type IEventBus, Processor, type Scene, Tickers, SceneChangedEvent, ResourceComponent } from "@vertex-link/space";
import { CameraComponent } from "../rendering/camera/CameraComponent";
import { MeshRendererComponent } from "../rendering/components/MeshRendererComponent";
import { TransformComponent } from "../rendering/components/TransformComponent";
import { DirectionalLightComponent } from "../rendering/components/lights/DirectionalLightComponent";
import { PointLightComponent } from "../rendering/components/lights/PointLightComponent";
import { GPUResourcePool } from "../rendering/GPUResourcePool";
import { RenderGraph } from "../rendering/RenderGraph";
import { ShadowMapResource } from "../rendering/shadows/ShadowMapResource";
import type { MaterialResource } from "../resources/MaterialResource";
import type { MeshResource } from "../resources/MeshResource";
import { WebGPURenderer } from "../webgpu/WebGPURenderer";
import type { LightProcessor } from "./LightProcessor";
import { createGlobalBindGroupLayout, createLightBindGroupLayout } from "../webgpu/StandardBindGroupLayouts";

// Phase 0: Decorator-based update hooks disabled. Keeping placeholder commented out for reference.

/**
 * Instance data for a single object
 */
interface InstanceData {
  modelMatrix: Float32Array; // 16 floats
  color: Float32Array; // 4 floats
  transformVersion: number; // Track transform changes
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
 * Now uses the ticker function approach for flexible rendering control.
 */
export class WebGPUProcessor extends Processor {
  private canvas: HTMLCanvasElement;
  readonly renderer: WebGPURenderer;
  private resourcePool: GPUResourcePool;
  private renderGraph: RenderGraph;
  private lightProcessor: LightProcessor | null = null;

  // Scene reference for queries
  private scene: Scene | null = null;

  // Cached render data (updated when dirty)
  private cachedBatches: InstancedRenderBatch[] = [];
  private globalUniformBuffer: GPUBuffer | null = null;
  private globalBindGroup: GPUBindGroup | null = null;
  private lightBindGroup: GPUBindGroup | null = null;
  private activeCamera: CameraComponent | null = null;
  private isDirty = true;
  private lastLightBuffersState = false;
  private lightBindGroupCreatedLogged = false;

  // Frame timing
  private lastFrameTime = 0;
  private animationFrameId?: number;
  private eventBus: IEventBus;
  private contextProvider?: () => Context;

  constructor(
    canvas: HTMLCanvasElement,
    name = "webgpu",
    eventBus: IEventBus,
    contextProvider?: () => Context,
    lightProcessor?: LightProcessor,
  ) {
    super(name, Tickers.animationFrame()); // Use animation frame by default
    this.canvas = canvas;
    this.renderer = new WebGPURenderer();
    this.resourcePool = new GPUResourcePool();
    this.renderGraph = new RenderGraph();
    this.eventBus = eventBus;
    this.contextProvider = contextProvider;
    this.lightProcessor = lightProcessor || null;
  }

  /**
   * Initialize WebGPU processor with canvas
   */
  async initialize(): Promise<void> {
    await this.renderer.initialize(this.canvas);
    this.resourcePool.initialize(this.renderer.getDevice()!);

    // Initialize render graph with device
    this.renderGraph.initialize(this.renderer.getDevice()!);

    // Initialize light processor if available
    if (this.lightProcessor) {
      this.lightProcessor.initialize(this.renderer.getDevice()!);
    }

    // Update camera aspect ratio based on canvas
    this.updateCameraAspectRatios();

    // Subscribe to scene change events
    this.eventBus.on(SceneChangedEvent, (event) => {
      this.setScene(event.payload.scene);
    }, this);

    console.log(this.renderer.device?.adapterInfo);

    console.log("✅ WebGPUProcessor initialized");
  }

  /**
   * Set the scene to render (called from application)
   */
  setScene(scene: Scene): void {
    this.scene = scene;
    this.isDirty = true;

    // Also set scene for light processor
    if (this.lightProcessor) {
      this.lightProcessor.setScene(scene);
    }
  }

  /**
   * Set or update the light processor
   */
  setLightProcessor(lightProcessor: LightProcessor): void {
    this.lightProcessor = lightProcessor;
    if (this.scene) {
      lightProcessor.setScene(this.scene);
    }
    if (this.renderer.getDevice()) {
      lightProcessor.initialize(this.renderer.getDevice()!);
    }
  }

  /**
   * Main render loop - called by processor system
   */
  protected executeTasks(deltaTime: number): void {
    if (!this.scene || !this.renderer.getDevice()) {
      return;
    }

    const tasks = () => {
      // Run any explicitly registered per-frame tasks (e.g., RotatingComponent tickers)
      super.executeTasks(deltaTime);

      // Update render batches and camera after logic updates
      this.updateRenderBatches();
      this.updateActiveCamera();

      // Check for transform updates and mark batches dirty
      this.checkTransformUpdates();

      // Update light bind group if light processor is available
      if (this.lightProcessor) {
        const hasBuffers = this.lightProcessor.hasLightBuffers();

        // Only log when state changes
        if (hasBuffers !== this.lastLightBuffersState) {
          console.log(`🔍 Light processor hasBuffers: ${hasBuffers}, pointLights: ${this.lightProcessor.getPointLightCount()}, directionalLights: ${this.lightProcessor.getDirectionalLightCount()}`);
          this.lastLightBuffersState = hasBuffers;
        }

        if (hasBuffers) {
          this.updateLightBindGroup();
        }
      }

      // Upload instance data and create global uniforms
      this.uploadInstanceData();
      this.updateGlobalUniforms();

      // Collect shadow maps from scene
      const shadowMaps = this.collectShadowMaps();

      // Execute render graph with camera
      this.renderGraph.execute(
        this.renderer,
        this.cachedBatches,
        this.activeCamera,
        deltaTime,
        this.globalBindGroup,
        this.lightBindGroup,
        shadowMaps,
      );
    };

    if (this.contextProvider) {
      Context.runWith(this.contextProvider(), tasks);
    } else {
      tasks();
    }
  }

  /**
   * Query scene and create efficient instanced render batches
   */
  private updateRenderBatches(): void {
    if (!this.scene) return;

    // Query all renderable objects
    const renderables = this.scene
      .query()
      .withComponent(TransformComponent)
      .withComponent(MeshRendererComponent)
      .execute();

    // Group by material+mesh for instancing
    const batchGroups = new Map<string, MeshRendererComponent[]>();

    for (const actor of renderables) {
      const meshRenderer = actor.getComponent(MeshRendererComponent);
      // Trigger resource readiness (non-blocking)
      meshRenderer?.updateForRender(0);
      if (!meshRenderer?.isRenderable()) continue;

      const materialId = meshRenderer.material?.id || "default";
      const meshId = meshRenderer.mesh?.id || "default";
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
          batch.instances.set(meshRenderer.actor!.id, {
            modelMatrix,
            color,
            transformVersion: transform.version,
          });
        }
      }

      batch.isDirty = true;
      return batch;
    });
  }

  /**
   * Convert material color uniform to Float32Array
   */
  private getInstanceColor(material: MaterialResource): Float32Array {
    const colorUniform = material.getUniform("color");

    if (colorUniform instanceof Float32Array) {
      return colorUniform;
    } else if (Array.isArray(colorUniform)) {
      return new Float32Array(colorUniform);
    } else if (typeof colorUniform === "number") {
      return new Float32Array([colorUniform, colorUniform, colorUniform, 1.0]);
    } else {
      return new Float32Array([1.0, 1.0, 1.0, 1.0]); // Default white
    }
  }

  /**
   * Create an instanced render batch
   */
  private createInstancedBatch(
    material: MaterialResource,
    mesh: MeshResource,
  ): InstancedRenderBatch {
    const maxInstances = 1000;
    const device = this.renderer.getDevice()!;

    // Create instance buffer
    const bufferSize = maxInstances * 80; // 80 bytes per instance (16 + 4 floats)
    const instanceBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      label: `InstanceBuffer_${material.name}_${mesh.id}`,
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
      maxInstances,
    };
  }

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
        device.queue.writeBuffer(batch.instanceBuffer, 0, batch.instanceData.buffer, 0, usedBytes);
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
        label: "GlobalUniforms",
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
   * Create global bind group for view-projection matrix using standard layout
   */
  private createGlobalBindGroup(): void {
    if (!this.globalUniformBuffer) {
      console.warn("⚠️ Cannot create bind group: no global uniform buffer");
      return;
    }

    const device = this.renderer.getDevice()!;

    try {
      // Use standard shared bind group layout (same as pipelines use)
      const bindGroupLayout = createGlobalBindGroupLayout(device);

      this.globalBindGroup = device.createBindGroup({
        label: "GlobalBindGroup",
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.globalUniformBuffer },
          },
        ],
      });
      console.log("✅ Global bind group created with standard layout");
    } catch (error) {
      console.error("❌ Failed to create global bind group:", error);
    }
  }

  /**
   * Update light bind group with current light data from LightProcessor
   */
  private updateLightBindGroup(): void {
    if (!this.lightProcessor || !this.lightProcessor.hasLightBuffers()) {
      return;
    }

    const device = this.renderer.getDevice()!;

    // Use standard shared bind group layout (same as lit pipelines use)
    const bindGroupLayout = createLightBindGroupLayout(device);

    // Ask light processor to create bind group with the standard layout
    this.lightBindGroup = this.lightProcessor.createBindGroup(bindGroupLayout);

    if (!this.lightBindGroupCreatedLogged) {
      if (this.lightBindGroup) {
        console.log("✅ Light bind group created successfully");
        this.lightBindGroupCreatedLogged = true;
      } else {
        console.log("❌ Failed to create light bind group");
      }
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
   * Collect shadow maps from lights in the scene
   */
  private collectShadowMaps(): any[] {
    if (!this.scene) return [];

    const shadowMaps: any[] = [];
    let lightIndex = 0;

    // Query for directional lights with shadow maps
    const dirLights = this.scene
      .query()
      .withComponent(DirectionalLightComponent)
      .withComponent(ResourceComponent)
      .execute();

    for (const actor of dirLights) {
      const light = actor.getComponent(DirectionalLightComponent);
      const resources = actor.getComponent(ResourceComponent);

      if (!light || !light.enabled || !resources) continue;

      // Check for shadow map resource using typed get() method
      const shadowMapResource = resources.get(ShadowMapResource);

      if (shadowMapResource && shadowMapResource.isCompiled) {
        // Calculate directional light view-projection matrix
        const lightViewProj = this.calculateDirectionalLightMatrix(light);

        shadowMaps.push({
          lightIndex,
          lightType: 'directional',
          shadowMap: shadowMapResource,
          lightViewProj,
        });
      }

      lightIndex++;
    }

    return shadowMaps;
  }

  /**
   * Calculate view-projection matrix for directional light
   */
  private calculateDirectionalLightMatrix(light: any): Float32Array {
    // Directional light looks down negative Y axis by default
    // Create orthographic projection covering the scene
    const size = 20; // Cover 20x20 area
    const near = 0.1;
    const far = 50;

    // Simple orthographic projection
    const matrix = new Float32Array(16);
    matrix[0] = 2 / size;
    matrix[5] = 2 / size;
    matrix[10] = -2 / (far - near);
    matrix[14] = -(far + near) / (far - near);
    matrix[15] = 1;

    // View matrix: looking down from above (position [0, 20, 0], looking at [0, 0, 0])
    const view = new Float32Array(16);
    view[0] = 1;
    view[5] = 0;
    view[6] = 1;
    view[9] = -1;
    view[10] = 0;
    view[13] = -20;
    view[15] = 1;

    // Multiply view * projection
    const result = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        result[i * 4 + j] = 0;
        for (let k = 0; k < 4; k++) {
          result[i * 4 + j] += matrix[i * 4 + k] * view[k * 4 + j];
        }
      }
    }

    return result;
  }

  public stop(): void {
    super.stop();

    // Cleanup instanced resources
    this.cachedBatches.forEach((batch) => {
      if (batch.instanceBuffer) {
        batch.instanceBuffer.destroy();
      }
    });
    if (this.globalUniformBuffer) {
      this.globalUniformBuffer.destroy();
    }

    // Note: LightProcessor cleanup is handled by its own stop() method
    // since it's a separate processor in the system

    // Cleanup resources
    this.resourcePool.dispose();
    this.renderer.dispose();

    console.log("🛑 WebGPUProcessor stopped");
  }
}
