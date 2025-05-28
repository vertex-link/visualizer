// src/engine/services/RenderService.ts - Corrected Implementation

import { IService, ServiceKey, ServiceRegistry } from "../core/Service.ts";
import { IRenderer } from "../rendering/interfaces/IRenderer.ts";
import { IBuffer, BufferDescriptor } from "../rendering/interfaces/IBuffer.ts";
import { IPipeline, PipelineDescriptor } from "../rendering/interfaces/IPipeline.ts";

// Service key for dependency injection
export const IRenderServiceKey: ServiceKey = Symbol.for('IRenderService');

/**
 * Render statistics for performance monitoring.
 */
export interface RenderStats {
    frameCount: number;
    drawCalls: number;
    triangles: number;
    vertices: number;
    buffers: number;
    pipelines: number;
    frameTime: number; // in milliseconds
    fps: number;
}

/**
 * Renderer configuration options.
 */
export interface RendererConfig {
    /** Canvas element to render to */
    canvas: HTMLCanvasElement;
    /** Enable debug mode with validation */
    debug?: boolean;
    /** Preferred graphics API (future: 'webgpu' | 'webgl2') */
    preferredAPI?: string;
    /** Power preference for GPU selection */
    powerPreference?: 'low-power' | 'high-performance';
}

/**
 * Interface for the Render Service.
 * Manages renderer lifecycle and provides high-level rendering coordination.
 */
export interface IRenderService extends IService {
    // Lifecycle management
    initialize(config: RendererConfig): Promise<void>;
    isInitialized(): boolean;
    getRenderer(): IRenderer | null;

    // Resource creation (proxies to renderer)
    createBuffer(descriptor: BufferDescriptor): Promise<IBuffer>;
    createPipeline(descriptor: PipelineDescriptor): Promise<IPipeline>;

    // Frame management
    beginFrame(): boolean;
    endFrame(): void;
    isFrameActive(): boolean;

    // Statistics and debugging
    getStats(): RenderStats;
    resetStats(): void;

    // Canvas management
    getCanvas(): HTMLCanvasElement | null;
    getCanvasSize(): { width: number; height: number };
    resizeCanvas(width: number, height: number): void;
}

/**
 * Implementation of the Render Service.
 * Manages WebGPU renderer lifecycle and provides rendering coordination.
 */
export class RenderService implements IRenderService {
    private serviceRegistry: ServiceRegistry;
    private renderer: IRenderer | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private config: RendererConfig | null = null;

    // Frame state
    private frameActive: boolean = false;
    private frameStartTime: number = 0;

    // Statistics
    private stats: RenderStats = {
        frameCount: 0,
        drawCalls: 0,
        triangles: 0,
        vertices: 0,
        buffers: 0,
        pipelines: 0,
        frameTime: 0,
        fps: 0
    };

    // FPS calculation
    private fpsFrames: number[] = [];
    private lastStatsUpdate: number = 0;

    constructor(serviceRegistry: ServiceRegistry) {
        this.serviceRegistry = serviceRegistry;
    }

    /**
     * Initialize the render service with renderer configuration.
     */
    async initialize(config: RendererConfig): Promise<void> {
        if (this.renderer) {
            console.warn('RenderService already initialized');
            return;
        }

        this.config = config;
        this.canvas = config.canvas;

        try {
            // Create renderer (WebGPU for now, expandable to other APIs)
            this.renderer = await this.createRenderer(config);

            // Initialize renderer
            await this.renderer.initialize(config.canvas);

            // Setup canvas resize observer
            this.setupCanvasObserver();

            console.log('RenderService initialized successfully');

        } catch (error) {
            console.error('Failed to initialize RenderService:', error);
            throw error;
        }
    }

    /**
     * Check if the render service is initialized.
     */
    isInitialized(): boolean {
        return this.renderer !== null;
    }

    /**
     * Get the active renderer instance.
     */
    getRenderer(): IRenderer | null {
        return this.renderer;
    }

    /**
     * Create a buffer resource through the renderer.
     */
    async createBuffer(descriptor: BufferDescriptor): Promise<IBuffer> {
        if (!this.renderer) {
            throw new Error('RenderService not initialized');
        }

        // Create buffer through renderer (WebGPU implementation)
        const buffer = await (this.renderer as any).createBuffer(descriptor);

        // Update statistics
        this.stats.buffers++;

        return buffer;
    }

    /**
     * Create a pipeline resource through the renderer.
     */
    async createPipeline(descriptor: PipelineDescriptor): Promise<IPipeline> {
        if (!this.renderer) {
            throw new Error('RenderService not initialized');
        }

        // Create pipeline through renderer (WebGPU implementation)
        const pipeline = await (this.renderer as any).createPipeline(descriptor);

        // Update statistics
        this.stats.pipelines++;

        return pipeline;
    }

    /**
     * Begin a new frame for rendering.
     */
    beginFrame(): boolean {
        if (!this.renderer) {
            console.error('RenderService not initialized');
            return false;
        }

        if (this.frameActive) {
            console.error('Frame already active - call endFrame() first');
            return false;
        }

        // Record frame start time
        this.frameStartTime = performance.now();

        // Begin frame through renderer
        const success = this.renderer.beginFrame();

        if (success) {
            this.frameActive = true;
            this.stats.frameCount++;
        }

        return success;
    }

    /**
     * End the current frame and present to screen.
     */
    endFrame(): void {
        if (!this.renderer) {
            console.error('RenderService not initialized');
            return;
        }

        if (!this.frameActive) {
            console.error('No active frame to end');
            return;
        }

        // End frame through renderer
        this.renderer.endFrame();
        this.frameActive = false;

        // Calculate frame time
        const frameTime = performance.now() - this.frameStartTime;
        this.stats.frameTime = frameTime;

        // Update FPS calculation
        this.updateFPS(frameTime);
    }

    /**
     * Check if a frame is currently active.
     */
    isFrameActive(): boolean {
        return this.frameActive;
    }

    /**
     * Get current render statistics.
     */
    getStats(): RenderStats {
        return { ...this.stats }; // Return copy
    }

    /**
     * Reset render statistics.
     */
    resetStats(): void {
        this.stats = {
            frameCount: 0,
            drawCalls: 0,
            triangles: 0,
            vertices: 0,
            buffers: 0,
            pipelines: 0,
            frameTime: this.stats.frameTime,
            fps: this.stats.fps
        };

        this.fpsFrames = [];
    }

    /**
     * Get the canvas element.
     */
    getCanvas(): HTMLCanvasElement | null {
        return this.canvas;
    }

    /**
     * Get current canvas size.
     */
    getCanvasSize(): { width: number; height: number } {
        if (!this.canvas) {
            return { width: 0, height: 0 };
        }
        return {
            width: this.canvas.width,
            height: this.canvas.height
        };
    }

    /**
     * Resize the canvas to specified dimensions.
     */
    resizeCanvas(width: number, height: number): void {
        if (!this.canvas) {
            console.error('No canvas to resize');
            return;
        }

        this.canvas.width = width;
        this.canvas.height = height;

        console.log(`Canvas resized to ${width}x${height}`);
    }

    /**
     * Dispose of the render service and cleanup resources.
     */
    async dispose(): Promise<void> {
        if (this.frameActive) {
            this.endFrame();
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer = null;
        }

        this.canvas = null;
        this.config = null;
        this.resetStats();

        console.log('RenderService disposed');
    }

    /**
     * Update service (called by framework if needed).
     */
    update(deltaTime: number): void {
        // Update any render service logic per frame
        // Currently just used for statistics updates

        const now = performance.now();
        if (now - this.lastStatsUpdate > 1000) { // Update every second
            this.lastStatsUpdate = now;
        }
    }

    /**
     * Create the appropriate renderer based on configuration.
     */
    private async createRenderer(config: RendererConfig): Promise<IRenderer> {
        // For Phase 2, we only support WebGPU
        // Future: Factory pattern for multiple renderer types

        const preferredAPI = config.preferredAPI || 'webgpu';

        switch (preferredAPI) {
            case 'webgpu':
                // Dynamic import to avoid hard dependency
                const { WebGPURenderer } = await import('../../webgpu/WebGPURenderer.ts');
                return new WebGPURenderer();

            default:
                throw new Error(`Unsupported graphics API: ${preferredAPI}`);
        }
    }

    /**
     * Setup canvas resize observer.
     */
    private setupCanvasObserver(): void {
        if (!this.canvas) return;

        // Use ResizeObserver if available, fallback to window resize
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const { width, height } = entry.contentRect;
                    this.resizeCanvas(width, height);
                }
            });

            resizeObserver.observe(this.canvas);
        } else {
            // Fallback to window resize
            window.addEventListener('resize', () => {
                if (this.canvas) {
                    const rect = this.canvas.getBoundingClientRect();
                    this.resizeCanvas(rect.width, rect.height);
                }
            });
        }
    }

    /**
     * Update FPS calculation.
     */
    private updateFPS(frameTime: number): void {
        this.fpsFrames.push(frameTime);

        // Keep only last 60 frames for FPS calculation
        if (this.fpsFrames.length > 60) {
            this.fpsFrames.shift();
        }

        // Calculate average FPS
        if (this.fpsFrames.length >= 10) {
            const avgFrameTime = this.fpsFrames.reduce((sum, time) => sum + time, 0) / this.fpsFrames.length;
            this.stats.fps = 1000 / avgFrameTime;
        }
    }

    /**
     * Record a draw call for statistics.
     */
    recordDrawCall(vertexCount: number, indexCount?: number): void {
        this.stats.drawCalls++;
        this.stats.vertices += vertexCount;

        if (indexCount) {
            this.stats.triangles += indexCount / 3;
        } else {
            this.stats.triangles += vertexCount / 3;
        }
    }

    /**
     * Get debug information about the renderer.
     */
    getDebugInfo(): Record<string, unknown> {
        return {
            rendererType: this.renderer?.constructor.name || 'None',
            canvasSize: this.getCanvasSize(),
            frameActive: this.frameActive,
            stats: this.getStats(),
            config: this.config
        };
    }
}