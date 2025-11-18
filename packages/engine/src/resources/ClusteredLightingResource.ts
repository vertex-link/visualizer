import { ComputeResource } from "@vertex-link/space";

/**
 * Light types supported by the clustered lighting system
 */
export enum LightType {
  POINT = 0,
  SPOT = 1,
  DIRECTIONAL = 2,
}

/**
 * Light structure matching the Zig implementation
 * Must maintain 16-byte alignment for WASM
 */
export interface Light {
  position: [number, number, number];
  radius: number;
  color: [number, number, number];
  intensity: number;
  direction: [number, number, number];
  coneAngle: number;
  lightType: LightType;
}

/**
 * Cluster AABB in view space
 */
export interface ClusterAABB {
  min: [number, number, number];
  max: [number, number, number];
}

/**
 * Cluster light grid entry
 */
export interface ClusterLightGrid {
  offset: number;
  count: number;
}

/**
 * Configuration for the clustered lighting system
 */
export interface ClusterConfig {
  gridSizeX: number; // Number of clusters in X (e.g., 16)
  gridSizeY: number; // Number of clusters in Y (e.g., 9)
  gridSizeZ: number; // Number of clusters in Z (e.g., 24)
  zNear: number; // Near plane distance
  zFar: number; // Far plane distance
}

/**
 * Exported functions from the Zig WASM module
 */
export interface ClusteredLightingModule {
  build_cluster_grid: (
    projectionMatrix: number,
    screenWidth: number,
    screenHeight: number,
    gridSizeX: number,
    gridSizeY: number,
    gridSizeZ: number,
    zNear: number,
    zFar: number,
    outClusterAABBs: number,
  ) => void;

  assign_lights_to_clusters: (
    lights: number,
    lightCount: number,
    clusterAABBs: number,
    clusterCount: number,
    viewMatrix: number,
    outLightIndices: number,
    outClusterGrids: number,
    outTotalAssignments: number,
  ) => void;

  extract_frustum_planes: (
    viewProjMatrix: number,
    outPlanes: number,
  ) => void;

  cull_lights_frustum: (
    lights: number,
    lightCount: number,
    frustumPlanes: number,
    outVisibleIndices: number,
    outVisibleCount: number,
  ) => void;

  world_pos_to_cluster_index: (
    worldPos: number,
    viewProjMatrix: number,
    gridSizeX: number,
    gridSizeY: number,
    gridSizeZ: number,
    zNear: number,
    zFar: number,
  ) => number;

  memory: WebAssembly.Memory;
}

/**
 * Result of light assignment to clusters
 */
export interface ClusterAssignmentResult {
  lightIndices: Uint32Array; // Flat array of light indices
  clusterGrids: ClusterLightGrid[]; // Grid entry per cluster
  totalAssignments: number; // Total number of light assignments
}

/**
 * High-level TypeScript wrapper for the Zig clustered lighting module
 */
export class ClusteredLightingResource extends ComputeResource<ClusteredLightingModule> {
  private config: ClusterConfig;
  private clusterCount: number;

  // Persistent memory buffers
  private lightsBuffer: Float32Array | null = null;
  private clusterAABBsBuffer: Float32Array | null = null;
  private viewMatrixBuffer: Float32Array | null = null;
  private projMatrixBuffer: Float32Array | null = null;

  constructor(
    wasmModule: any,
    config: ClusterConfig = {
      gridSizeX: 16,
      gridSizeY: 9,
      gridSizeZ: 24,
      zNear: 0.1,
      zFar: 1000,
    },
  ) {
    super(wasmModule);
    this.config = config;
    this.clusterCount = config.gridSizeX * config.gridSizeY * config.gridSizeZ;
  }

  /**
   * Get cluster configuration
   */
  getConfig(): ClusterConfig {
    return { ...this.config };
  }

  /**
   * Get total number of clusters
   */
  getClusterCount(): number {
    return this.clusterCount;
  }

  /**
   * Build cluster grid from projection matrix
   */
  buildClusterGrid(
    projectionMatrix: Float32Array,
    screenWidth: number,
    screenHeight: number,
  ): Float32Array {
    if (!this.isReady()) {
      throw new Error("ClusteredLightingResource not ready");
    }

    const module = this.getModule();
    const memory = new Uint8Array(module.memory.buffer);

    // Allocate memory for projection matrix
    const projMatrixSize = 16 * 4; // 16 floats
    const projMatrixPtr = this.allocate(projMatrixSize);
    new Float32Array(memory.buffer, projMatrixPtr, 16).set(projectionMatrix);

    // Allocate memory for cluster AABBs (8 floats per cluster with padding)
    const clusterAABBSize = this.clusterCount * 8 * 4;
    const clusterAABBPtr = this.allocate(clusterAABBSize);

    // Call Zig function
    module.build_cluster_grid(
      projMatrixPtr,
      screenWidth,
      screenHeight,
      this.config.gridSizeX,
      this.config.gridSizeY,
      this.config.gridSizeZ,
      this.config.zNear,
      this.config.zFar,
      clusterAABBPtr,
    );

    // Read results
    const result = new Float32Array(
      memory.buffer,
      clusterAABBPtr,
      this.clusterCount * 8,
    );

    // Cache for future use
    this.clusterAABBsBuffer = new Float32Array(result);

    return result;
  }

  /**
   * Assign lights to clusters
   */
  assignLightsToClusters(
    lights: Light[],
    viewMatrix: Float32Array,
  ): ClusterAssignmentResult {
    if (!this.isReady()) {
      throw new Error("ClusteredLightingResource not ready");
    }

    if (!this.clusterAABBsBuffer) {
      throw new Error("Must call buildClusterGrid first");
    }

    const module = this.getModule();
    const memory = new Uint8Array(module.memory.buffer);

    // Allocate and write lights (16 floats per light with padding)
    const lightSize = 16 * 4;
    const lightsPtr = this.allocate(lights.length * lightSize);
    const lightsArray = new Float32Array(memory.buffer, lightsPtr, lights.length * 16);

    for (let i = 0; i < lights.length; i++) {
      const offset = i * 16;
      const light = lights[i];
      lightsArray.set(light.position, offset);
      lightsArray[offset + 3] = light.radius;
      lightsArray.set(light.color, offset + 4);
      lightsArray[offset + 7] = light.intensity;
      lightsArray.set(light.direction, offset + 8);
      lightsArray[offset + 11] = light.coneAngle;
      lightsArray[offset + 12] = light.lightType;
      // offset + 13 is padding
    }

    // Allocate cluster AABBs
    const clusterAABBPtr = this.allocate(this.clusterAABBsBuffer.length * 4);
    new Float32Array(memory.buffer, clusterAABBPtr, this.clusterAABBsBuffer.length).set(
      this.clusterAABBsBuffer,
    );

    // Allocate view matrix
    const viewMatrixPtr = this.allocate(16 * 4);
    new Float32Array(memory.buffer, viewMatrixPtr, 16).set(viewMatrix);

    // Allocate output buffers (worst case: all lights in all clusters)
    const maxAssignments = lights.length * this.clusterCount;
    const lightIndicesPtr = this.allocate(maxAssignments * 4);
    const clusterGridsPtr = this.allocate(this.clusterCount * 8); // 2 u32s per cluster
    const totalAssignmentsPtr = this.allocate(4);

    // Call Zig function
    module.assign_lights_to_clusters(
      lightsPtr,
      lights.length,
      clusterAABBPtr,
      this.clusterCount,
      viewMatrixPtr,
      lightIndicesPtr,
      clusterGridsPtr,
      totalAssignmentsPtr,
    );

    // Read results
    const totalAssignments = new Uint32Array(memory.buffer, totalAssignmentsPtr, 1)[0];
    const lightIndices = new Uint32Array(memory.buffer, lightIndicesPtr, totalAssignments);
    const clusterGridsRaw = new Uint32Array(memory.buffer, clusterGridsPtr, this.clusterCount * 2);

    // Parse cluster grids
    const clusterGrids: ClusterLightGrid[] = [];
    for (let i = 0; i < this.clusterCount; i++) {
      clusterGrids.push({
        offset: clusterGridsRaw[i * 2],
        count: clusterGridsRaw[i * 2 + 1],
      });
    }

    return {
      lightIndices: new Uint32Array(lightIndices),
      clusterGrids,
      totalAssignments,
    };
  }

  /**
   * Cull lights against view frustum
   */
  cullLightsFrustum(lights: Light[], viewProjMatrix: Float32Array): number[] {
    if (!this.isReady()) {
      throw new Error("ClusteredLightingResource not ready");
    }

    const module = this.getModule();
    const memory = new Uint8Array(module.memory.buffer);

    // Allocate and write lights
    const lightSize = 16 * 4;
    const lightsPtr = this.allocate(lights.length * lightSize);
    const lightsArray = new Float32Array(memory.buffer, lightsPtr, lights.length * 16);

    for (let i = 0; i < lights.length; i++) {
      const offset = i * 16;
      const light = lights[i];
      lightsArray.set(light.position, offset);
      lightsArray[offset + 3] = light.radius;
      lightsArray.set(light.color, offset + 4);
      lightsArray[offset + 7] = light.intensity;
      lightsArray.set(light.direction, offset + 8);
      lightsArray[offset + 11] = light.coneAngle;
      lightsArray[offset + 12] = light.lightType;
    }

    // Extract frustum planes
    const viewProjMatrixPtr = this.allocate(16 * 4);
    new Float32Array(memory.buffer, viewProjMatrixPtr, 16).set(viewProjMatrix);

    const frustumPlanesPtr = this.allocate(6 * 4 * 4); // 6 planes, 4 floats each
    module.extract_frustum_planes(viewProjMatrixPtr, frustumPlanesPtr);

    // Allocate output
    const visibleIndicesPtr = this.allocate(lights.length * 4);
    const visibleCountPtr = this.allocate(4);

    // Cull lights
    module.cull_lights_frustum(
      lightsPtr,
      lights.length,
      frustumPlanesPtr,
      visibleIndicesPtr,
      visibleCountPtr,
    );

    // Read results
    const visibleCount = new Uint32Array(memory.buffer, visibleCountPtr, 1)[0];
    const visibleIndices = new Uint32Array(memory.buffer, visibleIndicesPtr, visibleCount);

    return Array.from(visibleIndices);
  }

  /**
   * Simple memory allocator (stack-based)
   * In production, would use a proper allocator or linear allocator
   */
  private nextPtr = 1024; // Start after some reserved space

  private allocate(size: number): number {
    const ptr = this.nextPtr;
    this.nextPtr += size;

    // Ensure we have enough memory
    const module = this.getModule();
    const currentPages = module.memory.buffer.byteLength / 65536;
    const neededPages = Math.ceil(this.nextPtr / 65536);

    if (neededPages > currentPages) {
      module.memory.grow(neededPages - currentPages);
    }

    return ptr;
  }

  /**
   * Reset allocator (call between frames)
   */
  resetAllocator(): void {
    this.nextPtr = 1024;
  }

  /**
   * Get the underlying WASM module (type-safe accessor)
   */
  private getModule(): ClusteredLightingModule {
    return this.payload as ClusteredLightingModule;
  }
}
