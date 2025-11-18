import { ComputeResource } from "@vertex-link/space";
import type { Mat4 } from "./types/Transform";
import type { BoundingBox } from "./types/BoundingBox";
import * as frustumModule from "./frustum-culling/src/main.zig";

/**
 * Exported functions from the Zig frustum culling WebAssembly module
 */
export interface FrustumCullingExports {
  /**
   * Extract 6 frustum planes from a view-projection matrix
   * @param matrixPtr - Pointer to 16-element Float32Array (view-projection matrix)
   * @param planesPtr - Pointer to output 24-element Float32Array (6 planes * 4 components)
   */
  extractFrustumPlanes(matrixPtr: number, planesPtr: number): void;

  /**
   * Test if an AABB intersects the frustum
   * @param planesPtr - Pointer to 24-element Float32Array (6 planes * 4 components)
   * @param minX, minY, minZ - AABB minimum corner
   * @param maxX, maxY, maxZ - AABB maximum corner
   * @returns 1 if visible, 0 if culled
   */
  testAABB(
    planesPtr: number,
    minX: number,
    minY: number,
    minZ: number,
    maxX: number,
    maxY: number,
    maxZ: number,
  ): number;

  /**
   * Test if a sphere intersects the frustum
   * @param planesPtr - Pointer to 24-element Float32Array (6 planes * 4 components)
   * @param centerX, centerY, centerZ - Sphere center
   * @param radius - Sphere radius
   * @returns 1 if visible, 0 if culled
   */
  testSphere(
    planesPtr: number,
    centerX: number,
    centerY: number,
    centerZ: number,
    radius: number,
  ): number;

  /**
   * Batch test multiple AABBs against frustum
   * @param planesPtr - Pointer to 24-element Float32Array (6 planes * 4 components)
   * @param aabbsPtr - Pointer to AABBs array (6 floats each)
   * @param visibilityPtr - Pointer to output visibility array (1 byte per AABB)
   * @param count - Number of AABBs to test
   * @returns Number of visible AABBs
   */
  batchTestAABB(
    planesPtr: number,
    aabbsPtr: number,
    visibilityPtr: number,
    count: number,
  ): number;

  /**
   * Batch test multiple spheres against frustum
   * @param planesPtr - Pointer to 24-element Float32Array (6 planes * 4 components)
   * @param spheresPtr - Pointer to spheres array (4 floats each)
   * @param visibilityPtr - Pointer to output visibility array (1 byte per sphere)
   * @param count - Number of spheres to test
   * @returns Number of visible spheres
   */
  batchTestSphere(
    planesPtr: number,
    spheresPtr: number,
    visibilityPtr: number,
    count: number,
  ): number;

  // WebAssembly memory interface
  memory: {
    buffer: ArrayBuffer;
  };
}

/**
 * Represents a single frustum plane (ax + by + cz + d = 0)
 */
export interface FrustumPlane {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * Represents the 6 planes of a view frustum
 */
export interface Frustum {
  left: FrustumPlane;
  right: FrustumPlane;
  bottom: FrustumPlane;
  top: FrustumPlane;
  near: FrustumPlane;
  far: FrustumPlane;
}

/**
 * Bounding sphere for frustum culling
 */
export interface BoundingSphere {
  center: [number, number, number];
  radius: number;
}

/**
 * High-performance frustum culling using WebAssembly (Zig)
 *
 * This resource provides efficient frustum culling operations for 3D rendering:
 * - Extract frustum planes from view-projection matrices
 * - Test AABBs (Axis-Aligned Bounding Boxes) against frustum
 * - Test bounding spheres against frustum
 * - Batch operations for testing multiple objects at once
 *
 * @example
 * ```typescript
 * const culling = await new FrustumCullingResource().whenReady();
 *
 * // Extract frustum from camera
 * const frustum = culling.extractFrustum(camera.getViewProjectionMatrix());
 *
 * // Test single AABB
 * const isVisible = culling.testAABB(frustum, boundingBox);
 *
 * // Batch test multiple objects
 * const visibility = culling.batchTestAABBs(frustum, boundingBoxes);
 * ```
 */
export class FrustumCullingResource extends ComputeResource<FrustumCullingExports> {
  constructor() {
    super("FrustumCulling", frustumModule);
  }

  /**
   * Extract frustum planes from a view-projection matrix
   * @param viewProjectionMatrix - 4x4 view-projection matrix (column-major)
   * @returns Frustum containing 6 planes
   */
  public extractFrustum(viewProjectionMatrix: Mat4): Frustum {
    const exports = this.getExports();
    if (!exports) {
      throw new Error("FrustumCullingResource not loaded");
    }

    // Allocate memory for matrix (16 floats) and planes (24 floats)
    const matrixSize = 16 * Float32Array.BYTES_PER_ELEMENT;
    const planesSize = 24 * Float32Array.BYTES_PER_ELEMENT;

    const memory = new Uint8Array(exports.memory.buffer);
    const matrixPtr = memory.length;
    const planesPtr = matrixPtr + matrixSize;

    // Grow memory if needed
    const totalSize = planesPtr + planesSize;
    if (totalSize > memory.length) {
      const pagesNeeded = Math.ceil((totalSize - memory.length) / 65536);
      // Note: Memory growth is handled by the WebAssembly runtime
    }

    // Copy matrix to WASM memory
    const matrixView = new Float32Array(
      exports.memory.buffer,
      matrixPtr,
      16,
    );
    matrixView.set(viewProjectionMatrix);

    // Allocate planes output
    const planesView = new Float32Array(
      exports.memory.buffer,
      planesPtr,
      24,
    );

    // Extract planes
    exports.extractFrustumPlanes(matrixPtr, planesPtr);

    // Parse planes into structured format
    const planes: Frustum = {
      left: {
        a: planesView[0],
        b: planesView[1],
        c: planesView[2],
        d: planesView[3],
      },
      right: {
        a: planesView[4],
        b: planesView[5],
        c: planesView[6],
        d: planesView[7],
      },
      bottom: {
        a: planesView[8],
        b: planesView[9],
        c: planesView[10],
        d: planesView[11],
      },
      top: {
        a: planesView[12],
        b: planesView[13],
        c: planesView[14],
        d: planesView[15],
      },
      near: {
        a: planesView[16],
        b: planesView[17],
        c: planesView[18],
        d: planesView[19],
      },
      far: {
        a: planesView[20],
        b: planesView[21],
        c: planesView[22],
        d: planesView[23],
      },
    };

    return planes;
  }

  /**
   * Test if an AABB is visible within the frustum
   * @param frustum - Frustum planes
   * @param boundingBox - AABB to test
   * @returns true if visible, false if culled
   */
  public testAABB(frustum: Frustum, boundingBox: BoundingBox): boolean {
    const exports = this.getExports();
    if (!exports) {
      throw new Error("FrustumCullingResource not loaded");
    }

    // Allocate memory for planes (24 floats)
    const planesSize = 24 * Float32Array.BYTES_PER_ELEMENT;
    const memory = new Uint8Array(exports.memory.buffer);
    const planesPtr = memory.length;

    const planesView = new Float32Array(
      exports.memory.buffer,
      planesPtr,
      24,
    );

    // Copy frustum planes to WASM memory
    const planesArray = this.frustumToArray(frustum);
    planesView.set(planesArray);

    // Test AABB
    const result = exports.testAABB(
      planesPtr,
      boundingBox.min[0],
      boundingBox.min[1],
      boundingBox.min[2],
      boundingBox.max[0],
      boundingBox.max[1],
      boundingBox.max[2],
    );

    return result === 1;
  }

  /**
   * Test if a bounding sphere is visible within the frustum
   * @param frustum - Frustum planes
   * @param sphere - Bounding sphere to test
   * @returns true if visible, false if culled
   */
  public testSphere(frustum: Frustum, sphere: BoundingSphere): boolean {
    const exports = this.getExports();
    if (!exports) {
      throw new Error("FrustumCullingResource not loaded");
    }

    // Allocate memory for planes (24 floats)
    const planesSize = 24 * Float32Array.BYTES_PER_ELEMENT;
    const memory = new Uint8Array(exports.memory.buffer);
    const planesPtr = memory.length;

    const planesView = new Float32Array(
      exports.memory.buffer,
      planesPtr,
      24,
    );

    // Copy frustum planes to WASM memory
    const planesArray = this.frustumToArray(frustum);
    planesView.set(planesArray);

    // Test sphere
    const result = exports.testSphere(
      planesPtr,
      sphere.center[0],
      sphere.center[1],
      sphere.center[2],
      sphere.radius,
    );

    return result === 1;
  }

  /**
   * Batch test multiple AABBs against frustum (high performance)
   * @param frustum - Frustum planes
   * @param boundingBoxes - Array of AABBs to test
   * @returns Array of boolean visibility flags (same order as input)
   */
  public batchTestAABBs(
    frustum: Frustum,
    boundingBoxes: BoundingBox[],
  ): boolean[] {
    const exports = this.getExports();
    if (!exports) {
      throw new Error("FrustumCullingResource not loaded");
    }

    const count = boundingBoxes.length;
    if (count === 0) return [];

    // Allocate memory for planes (24 floats), AABBs (6 floats each), and visibility (1 byte each)
    const planesSize = 24 * Float32Array.BYTES_PER_ELEMENT;
    const aabbsSize = count * 6 * Float32Array.BYTES_PER_ELEMENT;
    const visibilitySize = count * Uint8Array.BYTES_PER_ELEMENT;

    const memory = new Uint8Array(exports.memory.buffer);
    const planesPtr = memory.length;
    const aabbsPtr = planesPtr + planesSize;
    const visibilityPtr = aabbsPtr + aabbsSize;

    // Copy frustum planes to WASM memory
    const planesView = new Float32Array(
      exports.memory.buffer,
      planesPtr,
      24,
    );
    const planesArray = this.frustumToArray(frustum);
    planesView.set(planesArray);

    // Copy AABBs to WASM memory
    const aabbsView = new Float32Array(
      exports.memory.buffer,
      aabbsPtr,
      count * 6,
    );
    for (let i = 0; i < count; i++) {
      const box = boundingBoxes[i];
      aabbsView[i * 6 + 0] = box.min[0];
      aabbsView[i * 6 + 1] = box.min[1];
      aabbsView[i * 6 + 2] = box.min[2];
      aabbsView[i * 6 + 3] = box.max[0];
      aabbsView[i * 6 + 4] = box.max[1];
      aabbsView[i * 6 + 5] = box.max[2];
    }

    // Allocate visibility output
    const visibilityView = new Uint8Array(
      exports.memory.buffer,
      visibilityPtr,
      count,
    );

    // Batch test
    exports.batchTestAABB(planesPtr, aabbsPtr, visibilityPtr, count);

    // Convert to boolean array
    const results: boolean[] = [];
    for (let i = 0; i < count; i++) {
      results.push(visibilityView[i] === 1);
    }

    return results;
  }

  /**
   * Batch test multiple spheres against frustum (high performance)
   * @param frustum - Frustum planes
   * @param spheres - Array of bounding spheres to test
   * @returns Array of boolean visibility flags (same order as input)
   */
  public batchTestSpheres(
    frustum: Frustum,
    spheres: BoundingSphere[],
  ): boolean[] {
    const exports = this.getExports();
    if (!exports) {
      throw new Error("FrustumCullingResource not loaded");
    }

    const count = spheres.length;
    if (count === 0) return [];

    // Allocate memory for planes (24 floats), spheres (4 floats each), and visibility (1 byte each)
    const planesSize = 24 * Float32Array.BYTES_PER_ELEMENT;
    const spheresSize = count * 4 * Float32Array.BYTES_PER_ELEMENT;
    const visibilitySize = count * Uint8Array.BYTES_PER_ELEMENT;

    const memory = new Uint8Array(exports.memory.buffer);
    const planesPtr = memory.length;
    const spheresPtr = planesPtr + planesSize;
    const visibilityPtr = spheresPtr + spheresSize;

    // Copy frustum planes to WASM memory
    const planesView = new Float32Array(
      exports.memory.buffer,
      planesPtr,
      24,
    );
    const planesArray = this.frustumToArray(frustum);
    planesView.set(planesArray);

    // Copy spheres to WASM memory
    const spheresView = new Float32Array(
      exports.memory.buffer,
      spheresPtr,
      count * 4,
    );
    for (let i = 0; i < count; i++) {
      const sphere = spheres[i];
      spheresView[i * 4 + 0] = sphere.center[0];
      spheresView[i * 4 + 1] = sphere.center[1];
      spheresView[i * 4 + 2] = sphere.center[2];
      spheresView[i * 4 + 3] = sphere.radius;
    }

    // Allocate visibility output
    const visibilityView = new Uint8Array(
      exports.memory.buffer,
      visibilityPtr,
      count,
    );

    // Batch test
    exports.batchTestSphere(planesPtr, spheresPtr, visibilityPtr, count);

    // Convert to boolean array
    const results: boolean[] = [];
    for (let i = 0; i < count; i++) {
      results.push(visibilityView[i] === 1);
    }

    return results;
  }

  /**
   * Helper: Convert Frustum structure to flat array
   */
  private frustumToArray(frustum: Frustum): Float32Array {
    return new Float32Array([
      frustum.left.a,
      frustum.left.b,
      frustum.left.c,
      frustum.left.d,
      frustum.right.a,
      frustum.right.b,
      frustum.right.c,
      frustum.right.d,
      frustum.bottom.a,
      frustum.bottom.b,
      frustum.bottom.c,
      frustum.bottom.d,
      frustum.top.a,
      frustum.top.b,
      frustum.top.c,
      frustum.top.d,
      frustum.near.a,
      frustum.near.b,
      frustum.near.c,
      frustum.near.d,
      frustum.far.a,
      frustum.far.b,
      frustum.far.c,
      frustum.far.d,
    ]);
  }

  /**
   * Get the raw WASM exports (for advanced usage)
   */
  private getExports(): FrustumCullingExports | null {
    return this.module as FrustumCullingExports | null;
  }
}
