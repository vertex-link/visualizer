// src/engine/processors/WebGPUProcessor.ts

import { Processor } from "../../core/processor/Processor.ts";
import { createProcessorUpdateDecorator } from "../../core/processor/Decorators.ts";
import { Scene } from "../../core/scene/Scene.ts";
import { TransformComponent } from "../rendering/components/TransformComponent.ts";
import { MeshRendererComponent } from "../rendering/components/MeshRendererComponent.ts";
import { CameraComponent } from "../rendering/camera/CameraComponent.ts";
import { WebGPURenderer } from "../../webgpu/WebGPURenderer.ts";
import { RenderGraph } from "../rendering/RenderGraph.ts";
import { GPUResourcePool } from "../rendering/GPUResourcePool.ts";

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
 * Hybrid approach: Uses processor pattern but keeps proven resource logic
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
    private isDirty = true;

    // Frame timing
    private lastFrameTime = 0;

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
            this.isDirty = false;
        }

        // 2. Execute render graph
        this.renderGraph.execute(this.renderer, this.cachedBatches, deltaTime);

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
     * Get active camera from scene
     */
    getActiveCamera(): CameraComponent | null {
        if (!this.scene) return null;

        const cameras = this.scene.query().withComponent(CameraComponent).execute();
        for (const actor of cameras) {
            const camera = actor.getComponent(CameraComponent);
            if (camera?.isActive) return camera;
        }
        return null;
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
        this.lastFrameTime = performance.now(); // Initialize frame timing
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
        const deltaTime = this.lastFrameTime === 0 ? 0.016 : (now - this.lastFrameTime) / 1000; // Convert to seconds, default to 60fps on first frame
        this.lastFrameTime = now;

        // Execute tasks (this calls our overridden executeTasks method)
        this.executeTasks(deltaTime);

        // Schedule next frame
        requestAnimationFrame(() => this.renderLoop());
    }
}