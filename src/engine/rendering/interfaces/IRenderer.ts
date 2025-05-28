// src/engine/rendering/interfaces/IRenderer.ts

import { IBuffer, BufferDescriptor } from "./IBuffer.ts";
import { IPipeline, PipelineDescriptor } from "./IPipeline.ts";

/**
 * Basic renderer interface for graphics API abstraction.
 * (Updated for better type safety and resource creation)
 */
export interface IRenderer {
    /** Initialize the renderer */
    initialize(canvas: HTMLCanvasElement): Promise<void>;

    /** Begin a new frame */
    beginFrame(): boolean;

    /** End the current frame */
    endFrame(): void;

    /** Set the current render pipeline */
    setPipeline(pipeline: IPipeline): void; // Use IPipeline

    /** Bind a buffer */
    setBuffer(binding: number, buffer: IBuffer): void; // Use IBuffer

    /** Set uniform data */
    setUniforms(binding: number, data: ArrayBuffer): void;

    /** Draw primitives */
    draw(vertexCount: number, instanceCount?: number): void;

    /** Draw indexed primitives */
    drawIndexed(indexCount: number, instanceCount?: number): void;

    /** Get canvas size */
    getCanvasSize(): { width: number; height: number };

    /** Dispose of resources */
    dispose(): void;

    /** Create a buffer resource */
    createBuffer(descriptor: BufferDescriptor): Promise<IBuffer>;

    /** Create a pipeline resource */
    createPipeline(descriptor: PipelineDescriptor): Promise<IPipeline>;

    /** Record draw calls for stats (optional but good to have in interface) */
    recordDrawCall(vertexCount: number, indexCount?: number): void;

    /** Set the render service (optional) */
    setRenderService?(service: any): void; // Using 'any' as IRenderService might not be fully defined here
}