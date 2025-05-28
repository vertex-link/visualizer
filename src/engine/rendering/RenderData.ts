// src/engine/rendering/RenderData.ts

import { Actor } from "../core/Actor.ts";
import { MeshRendererComponent } from "./components/MeshRendererComponent.ts";
import { TransformComponent } from "./components/TransformComponent.ts";
import type { Mat4 } from "./components/TransformComponent.ts";

/**
 * Render data for a single renderable object.
 * Contains all information needed to render an object.
 */
export interface RenderData {
    /** The actor being rendered */
    actor: Actor;

    /** Mesh renderer component */
    meshRenderer: MeshRendererComponent;

    /** Transform component */
    transform: TransformComponent;

    /** Cached world transformation matrix */
    worldMatrix: Mat4;

    /** Distance from camera (for sorting) */
    distanceToCamera: number;

    /** Render layer */
    layer: number;
}

/**
 * Render command for GPU submission.
 * Represents a single draw call with all necessary state.
 */
export interface RenderCommand {
    /** Render data */
    renderData: RenderData;

    /** Model-View-Projection matrix */
    mvpMatrix: Mat4;

    /** Sort key for batching */
    sortKey: number;

    /** Whether this is a transparent object */
    isTransparent: boolean;
}

/**
 * Render batch for optimized drawing.
 * Groups multiple objects with the same material.
 */
export interface RenderBatch {
    /** Material ID for this batch */
    materialId: string;

    /** Render commands in this batch */
    commands: RenderCommand[];

    /** Shared render state */
    renderState: {
        pipeline: unknown;
        vertexBuffer: unknown;
        indexBuffer: unknown;
        uniformBuffer: unknown;
    };
}

/**
 * Render statistics for performance monitoring.
 */
export interface RenderStats {
    /** Total number of objects submitted for rendering */
    totalObjects: number;

    /** Number of objects after culling */
    visibleObjects: number;

    /** Number of draw calls */
    drawCalls: number;

    /** Number of render batches */
    batches: number;

    /** Number of triangles rendered */
    triangles: number;

    /** Number of vertices rendered */
    vertices: number;

    /** Time spent on culling (ms) */
    cullingTime: number;

    /** Time spent on sorting (ms) */
    sortingTime: number;

    /** Time spent on rendering (ms) */
    renderingTime: number;
}

/**
 * Render context passed to render passes.
 */
export interface RenderContext {
    /** Current frame number */
    frameNumber: number;

    /** Delta time since last frame */
    deltaTime: number;

    /** Render statistics */
    stats: RenderStats;

    /** Additional context data */
    userData?: Record<string, unknown>;
}

/**
 * Sorting criteria for render queue.
 */
export enum SortCriteria {
    /** Sort by distance from camera (front to back) */
    DISTANCE_FRONT_TO_BACK = 'distance_front_to_back',

    /** Sort by distance from camera (back to front) */
    DISTANCE_BACK_TO_FRONT = 'distance_back_to_front',

    /** Sort by material to minimize state changes */
    MATERIAL = 'material',

    /** Sort by render layer */
    LAYER = 'layer',

    /** No sorting */
    NONE = 'none'
}

/**
 * Utilities for working with render data.
 */
export class RenderDataUtils {
    /**
     * Create a render command from render data.
     */
    static createRenderCommand(
        renderData: RenderData,
        mvpMatrix: Mat4,
        isTransparent: boolean = false
    ): RenderCommand {
        return {
            renderData,
            mvpMatrix,
            sortKey: RenderDataUtils.generateSortKey(renderData, isTransparent),
            isTransparent
        };
    }

    /**
     * Generate a sort key for batching and sorting.
     */
    static generateSortKey(renderData: RenderData, isTransparent: boolean): number {
        // Combine layer, material, and transparency into a single sort key
        const layer = renderData.layer & 0xFF;
        const materialId = renderData.meshRenderer.material?.id.hashCode() || 0;
        const transparent = isTransparent ? 1 : 0;

        // Pack into 32-bit integer: [layer(8)][transparent(1)][material(23)]
        return (layer << 24) | (transparent << 23) | (materialId & 0x7FFFFF);
    }

    /**
     * Calculate bounding box for render data.
     */
    static calculateBoundingBox(renderData: RenderData): {
        min: [number, number, number];
        max: [number, number, number];
    } {
        // Simple implementation - assumes unit cube for now
        // TODO: Get actual mesh bounds from MeshResource
        const worldMatrix = renderData.worldMatrix;
        const center = [worldMatrix[12], worldMatrix[13], worldMatrix[14]];
        const size = 1; // Placeholder

        return {
            min: [center[0] - size, center[1] - size, center[2] - size],
            max: [center[0] + size, center[1] + size, center[2] + size]
        };
    }

    /**
     * Check if render data is within camera frustum.
     */
    static isInFrustum(renderData: RenderData, frustumPlanes: number[][]): boolean {
        // Simple sphere-based frustum culling
        // TODO: Implement proper AABB frustum culling

        const bounds = RenderDataUtils.calculateBoundingBox(renderData);
        const center = [
            (bounds.min[0] + bounds.max[0]) * 0.5,
            (bounds.min[1] + bounds.max[1]) * 0.5,
            (bounds.min[2] + bounds.max[2]) * 0.5
        ];
        const radius = Math.sqrt(
            Math.pow(bounds.max[0] - bounds.min[0], 2) +
            Math.pow(bounds.max[1] - bounds.min[1], 2) +
            Math.pow(bounds.max[2] - bounds.min[2], 2)
        ) * 0.5;

        // Check sphere against all frustum planes
        for (const plane of frustumPlanes) {
            const distance = plane[0] * center[0] + plane[1] * center[1] + plane[2] * center[2] + plane[3];
            if (distance < -radius) {
                return false; // Outside frustum
            }
        }

        return true; // Inside or intersecting frustum
    }
}

// Extend String prototype for hash code generation
declare global {
    interface String {
        hashCode(): number;
    }
}

String.prototype.hashCode = function(): number {
    let hash = 0;
    if (this.length === 0) return hash;

    for (let i = 0; i < this.length; i++) {
        const char = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }

    return hash;
};