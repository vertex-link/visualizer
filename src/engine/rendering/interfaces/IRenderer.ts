// src/engine/rendering/interfaces/IRenderer.ts

/**
 * Basic renderer interface for graphics API abstraction.
 * Keeps the API minimal while allowing for future expansion.
 */
export interface IRenderer {
    /**
     * Initialize the renderer with a canvas element.
     * @param canvas The HTML canvas element to render to
     */
    initialize(canvas: HTMLCanvasElement): Promise<void>;

    /**
     * Begin a new frame for rendering.
     * @returns True if frame began successfully
     */
    beginFrame(): boolean;

    /**
     * End the current frame and present to screen.
     */
    endFrame(): void;

    /**
     * Set the current render pipeline.
     * @param pipeline The pipeline to use for subsequent draw calls
     */
    setPipeline(pipeline: unknown): void;

    /**
     * Bind a buffer to the current pipeline.
     * @param binding The binding point/slot
     * @param buffer The buffer to bind
     */
    setBuffer(binding: number, buffer: unknown): void;

    /**
     * Set uniform data for the current pipeline.
     * @param binding The binding point/slot
     * @param data The uniform data to set
     */
    setUniforms(binding: number, data: ArrayBuffer): void;

    /**
     * Draw primitives using the current pipeline and buffers.
     * @param vertexCount Number of vertices to draw
     * @param instanceCount Number of instances to draw (default: 1)
     */
    draw(vertexCount: number, instanceCount?: number): void;

    /**
     * Draw indexed primitives.
     * @param indexCount Number of indices to draw
     * @param instanceCount Number of instances to draw (default: 1)
     */
    drawIndexed(indexCount: number, instanceCount?: number): void;

    /**
     * Get the current canvas size.
     */
    getCanvasSize(): { width: number; height: number };

    /**
     * Cleanup and dispose of renderer resources.
     */
    dispose(): void;
}