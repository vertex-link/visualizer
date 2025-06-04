import { createProcessorUpdateDecorator, Processor, Scene } from "@vertex-link/acs";
import { MeshRendererComponent } from "../rendering/components/MeshRendererComponent";
import { WebGPURenderer } from "../webgpu/WebGPURenderer";
import { GPUResourcePool } from "../rendering/GPUResourcePool";
import { RenderGraph } from "../rendering/RenderGraph";
import { CameraComponent } from "../rendering/camera/CameraComponent";
import { TransformComponent } from "../rendering/components/TransformComponent";
import { MaterialResource } from "../resources/MaterialResource";

/**
 * Decorator to hook into WebGPU rendering loop
 */
export function WebGPUUpdate() {
  return createProcessorUpdateDecorator("webgpu", "WebGPUUpdate");
}



/**
 * Render batch for efficient drawing
 */
interface RenderBatch {
  material: MaterialResource;
  instances: MeshRendererComponent[];
  pipeline?: GPURenderPipeline;
  bindGroup?: GPUBindGroup;
}

/**
 * WebGPU Processor - Coordinates rendering through existing component system
 */
export class WebGPUProcessor extends Processor {
  private canvas: HTMLCanvasElement;
  private renderer: WebGPURenderer;
  private resourcePool: GPUResourcePool;
  private renderGraph: RenderGraph;

  // Scene reference for queries
  private scene: Scene | null = null;

  // Cached render data (updated when dirty)
  private cachedBatches: RenderBatch[] = [];
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
   * Initialize WebGPU device and resources
   */
  async initialize(): Promise<void> {
    await this.renderer.initialize(this.canvas);
    this.resourcePool.initialize(this.renderer.getDevice()!);

    // Initialize render graph with device - THIS WAS MISSING!
    this.renderGraph.initialize(this.renderer.getDevice()!);

    // Update camera aspect ratio based on canvas
    this.updateCameraAspectRatios();

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

    // 2. Execute render graph with camera
    this.renderGraph.execute(this.renderer, this.cachedBatches, this.activeCamera, deltaTime);

    // 3. Call @WebGPUUpdate decorated methods (for custom render logic)
    super.executeTasks(deltaTime);
  }

  /**
   * Query scene and create efficient render batches
   */
  private updateRenderBatches(): void {
    if (!this.scene) return;

    // Query all renderable objects
    const renderables = this.scene.query()
      .withComponent(TransformComponent)
      .withComponent(MeshRendererComponent)
      .execute();

    // Group by material for batching
    const materialGroups = new Map<string, MeshRendererComponent[]>();

    for (const actor of renderables) {
      const meshRenderer = actor.getComponent(MeshRendererComponent);
      if (!meshRenderer?.isRenderable()) continue;

      const materialId = meshRenderer.material?.id || 'default';
      if (!materialGroups.has(materialId)) {
        materialGroups.set(materialId, []);
      }
      materialGroups.get(materialId)!.push(meshRenderer);
    }

    // Create render batches
    this.cachedBatches = Array.from(materialGroups.entries()).map(([materialId, instances]) => ({
      material: instances[0].material!,
      instances,
      pipeline: undefined, // Created lazily
      bindGroup: undefined
    }));

    console.log(`📦 Created ${this.cachedBatches.length} render batches for ${renderables.length} objects`);
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

    // Cleanup resources
    this.resourcePool.dispose();
    this.renderer.dispose();

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
