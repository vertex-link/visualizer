import { ComputeResource, Context, Resource } from "@vertex-link/space";
import type { CameraComponent } from "../camera/CameraComponent";
import type { LightComponent } from "../components/LightComponent";
import type { WebGPUProcessor } from "../../processors/WebGPUProcessor";
// @ts-expect-error - Zig module import
import wasmModule from "./zclustering/src/main.zig";

/**
 * Configuration for cluster grid subdivision
 */
export interface ClusterGridConfig {
  gridX: number; // Clusters along X axis (screen width)
  gridY: number; // Clusters along Y axis (screen height)
  gridZ: number; // Clusters along Z axis (depth)
}

/**
 * Clustering data returned after update
 */
export interface ClusterData {
  clusterCount: number;
  lightCount: number;
  totalAssignments: number;
  averageLightsPerCluster: number;
}

/**
 * TypeScript interface for Zig clustering exports
 */
interface ClusteringExports {
  build_cluster_grid(
    projection_ptr: number,
    screen_width: number,
    screen_height: number,
    grid_x: number,
    grid_y: number,
    grid_z: number,
    z_near: number,
    z_far: number,
    out_aabbs: number,
  ): void;

  cull_lights_frustum(
    lights: number,
    light_count: number,
    frustum_planes: number,
    out_visible_indices: number,
    out_visible_count: number,
  ): void;

  assign_lights_to_clusters(
    lights: number,
    light_count: number,
    cluster_aabbs: number,
    cluster_count: number,
    view_matrix: number,
    out_light_indices: number,
    out_cluster_offsets: number,
    out_total_assignments: number,
  ): void;
}

/**
 * ClusteringResource manages clustered forward+ rendering data.
 * Wraps Zig compute module and manages GPU buffers for cluster data.
 *
 * Architecture:
 * - Extends Resource for lifecycle management
 * - Uses ComputeResource to wrap Zig WASM module
 * - Creates GPU buffers in compile() phase
 * - Provides updateClustering() to run per-frame clustering
 */
export class ClusteringResource extends Resource<ComputeResource<ClusteringExports>> {
  // Configuration
  public config: ClusterGridConfig = {
    gridX: 16,
    gridY: 9,
    gridZ: 24,
  };

  // GPU Buffers (created in compile phase)
  private clusterAABBBuffer?: GPUBuffer;
  private lightBuffer?: GPUBuffer;
  private lightIndexBuffer?: GPUBuffer;
  private clusterGridBuffer?: GPUBuffer; // [offset, count] pairs

  // GPU device reference
  private device?: GPUDevice;

  // WASM Memory management (we'll allocate buffers in WASM linear memory)
  private compute?: ComputeResource<ClusteringExports> & ClusteringExports;

  // Cached data
  private lastClusterData?: ClusterData;

  constructor(name: string = "clustering", context?: Context) {
    super(name, null as any, context);
  }

  /**
   * Load the Zig WASM module
   */
  protected async loadInternal(): Promise<ComputeResource<ClusteringExports>> {
    const computeResource = new ComputeResource<ClusteringExports>(wasmModule);
    await computeResource.whenReady();
    this.compute = computeResource as any;
    console.log("✅ Clustering Zig module loaded");
    return computeResource;
  }

  /**
   * Compile phase: Create GPU buffers
   */
  async compile(context: Context): Promise<void> {
    // Get WebGPU device from processor
    const processor = context.processors.find((p) => p.name === "webgpu") as WebGPUProcessor;
    if (!processor) {
      throw new Error("ClusteringResource: WebGPUProcessor not found in context");
    }

    this.device = processor.getDevice()!;
    if (!this.device) {
      throw new Error("ClusteringResource: WebGPU device not available");
    }

    // Calculate sizes
    const clusterCount = this.config.gridX * this.config.gridY * this.config.gridZ;
    const maxLights = 1024; // Maximum lights supported
    const maxAssignments = clusterCount * 64; // Average ~64 lights per cluster worst case

    // Create GPU buffers
    this.clusterAABBBuffer = this.device.createBuffer({
      size: clusterCount * 24, // 6 floats × 4 bytes per cluster
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: "ClusterAABBs",
    });

    this.lightBuffer = this.device.createBuffer({
      size: maxLights * 48, // Light struct is 48 bytes
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: "LightBuffer",
    });

    this.lightIndexBuffer = this.device.createBuffer({
      size: maxAssignments * 4, // u32 indices
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: "LightIndexBuffer",
    });

    this.clusterGridBuffer = this.device.createBuffer({
      size: clusterCount * 8, // 2 × u32 per cluster (offset, count)
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: "ClusterGridBuffer",
    });

    console.log(`✅ Clustering GPU buffers created (${clusterCount} clusters)`);
  }

  /**
   * Main per-frame update: Run clustering algorithm and upload to GPU
   */
  updateClustering(
    camera: CameraComponent,
    lights: LightComponent[],
    screenWidth: number,
    screenHeight: number,
  ): ClusterData {
    if (!this.device || !this.compute) {
      throw new Error("ClusteringResource not compiled");
    }

    const clusterCount = this.config.gridX * this.config.gridY * this.config.gridZ;

    // Step 1: Build cluster grid AABBs
    const clusterAABBs = this.buildClusterGrid(camera, screenWidth, screenHeight);

    // Step 2: Cull lights against frustum (optional optimization)
    const visibleLights = lights.filter((l) => l.isValid());

    // Step 3: Prepare light data for Zig
    const lightData = this.prepareLightData(visibleLights);

    // Step 4: Assign lights to clusters
    const { lightIndices, clusterOffsets, totalAssignments } = this.assignLightsToClusters(
      lightData,
      clusterAABBs,
      camera,
    );

    // Step 5: Upload to GPU
    this.uploadToGPU(clusterAABBs, lightData, lightIndices, clusterOffsets);

    // Return statistics
    const clusterData: ClusterData = {
      clusterCount,
      lightCount: visibleLights.length,
      totalAssignments,
      averageLightsPerCluster: totalAssignments / clusterCount,
    };

    this.lastClusterData = clusterData;
    return clusterData;
  }

  /**
   * Build cluster grid AABBs in view space
   */
  private buildClusterGrid(
    camera: CameraComponent,
    screenWidth: number,
    screenHeight: number,
  ): Float32Array {
    if (!this.compute) throw new Error("Compute module not ready");

    const clusterCount = this.config.gridX * this.config.gridY * this.config.gridZ;
    const clusterAABBs = new Float32Array(clusterCount * 6); // 6 floats per AABB

    const projection = camera.getProjectionMatrix();
    const config =
      camera.projectionType === 0 ? camera.perspectiveConfig : camera.orthographicConfig;

    // Call Zig function
    this.compute.build_cluster_grid(
      this.getWasmPointer(projection),
      screenWidth,
      screenHeight,
      this.config.gridX,
      this.config.gridY,
      this.config.gridZ,
      config.near,
      config.far,
      this.getWasmPointer(clusterAABBs),
    );

    return clusterAABBs;
  }

  /**
   * Prepare light data in format matching Zig Light struct
   */
  private prepareLightData(lights: LightComponent[]): Float32Array {
    const lightData = new Float32Array(lights.length * 12); // 12 floats per light (48 bytes / 4)

    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      const pos = light.getWorldPosition();
      const dir = light.getWorldDirection();
      const offset = i * 12;

      // Position (3 floats)
      lightData[offset + 0] = pos[0];
      lightData[offset + 1] = pos[1];
      lightData[offset + 2] = pos[2];
      // Radius (1 float)
      lightData[offset + 3] = light.radius;

      // Color (3 floats)
      lightData[offset + 4] = light.color[0];
      lightData[offset + 5] = light.color[1];
      lightData[offset + 6] = light.color[2];
      // Intensity (1 float)
      lightData[offset + 7] = light.intensity;

      // Direction (3 floats)
      lightData[offset + 8] = dir[0];
      lightData[offset + 9] = dir[1];
      lightData[offset + 10] = dir[2];
      // Cone angle (1 float)
      lightData[offset + 11] = light.coneAngle;

      // Type (would be next, but we'll handle in view as u32)
    }

    return lightData;
  }

  /**
   * Assign lights to clusters using Zig
   */
  private assignLightsToClusters(
    lightData: Float32Array,
    clusterAABBs: Float32Array,
    camera: CameraComponent,
  ): {
    lightIndices: Uint32Array;
    clusterOffsets: Uint32Array;
    totalAssignments: number;
  } {
    if (!this.compute) throw new Error("Compute module not ready");

    const clusterCount = this.config.gridX * this.config.gridY * this.config.gridZ;
    const lightCount = lightData.length / 12;

    // Allocate output buffers
    const maxAssignments = clusterCount * 64; // Conservative estimate
    const lightIndices = new Uint32Array(maxAssignments);
    const clusterOffsets = new Uint32Array(clusterCount * 2); // [offset, count] pairs
    const totalAssignmentsBuffer = new Uint32Array(1);

    const viewMatrix = camera.getViewMatrix();

    // Call Zig function
    this.compute.assign_lights_to_clusters(
      this.getWasmPointer(lightData),
      lightCount,
      this.getWasmPointer(clusterAABBs),
      clusterCount,
      this.getWasmPointer(viewMatrix),
      this.getWasmPointer(lightIndices),
      this.getWasmPointer(clusterOffsets),
      this.getWasmPointer(totalAssignmentsBuffer),
    );

    return {
      lightIndices,
      clusterOffsets,
      totalAssignments: totalAssignmentsBuffer[0],
    };
  }

  /**
   * Upload clustering data to GPU buffers
   */
  private uploadToGPU(
    clusterAABBs: Float32Array,
    lightData: Float32Array,
    lightIndices: Uint32Array,
    clusterOffsets: Uint32Array,
  ): void {
    if (!this.device) return;

    // Upload cluster AABBs
    this.device.queue.writeBuffer(this.clusterAABBBuffer!, 0, clusterAABBs);

    // Upload light data
    this.device.queue.writeBuffer(this.lightBuffer!, 0, lightData);

    // Upload light indices
    this.device.queue.writeBuffer(this.lightIndexBuffer!, 0, lightIndices);

    // Upload cluster grid (offset, count pairs)
    this.device.queue.writeBuffer(this.clusterGridBuffer!, 0, clusterOffsets);
  }

  /**
   * Helper: Get WASM memory pointer for TypedArray
   * This is a simplified version - actual implementation depends on WASM memory model
   */
  private getWasmPointer(data: Float32Array | Uint32Array): number {
    // For now, return the data directly - vite-plugin-zig handles the conversion
    // In a real implementation, we might need to allocate in WASM linear memory
    return data as any;
  }

  /**
   * Get GPU buffers for binding in render passes
   */
  getClusterAABBBuffer(): GPUBuffer | undefined {
    return this.clusterAABBBuffer;
  }

  getLightBuffer(): GPUBuffer | undefined {
    return this.lightBuffer;
  }

  getLightIndexBuffer(): GPUBuffer | undefined {
    return this.lightIndexBuffer;
  }

  getClusterGridBuffer(): GPUBuffer | undefined {
    return this.clusterGridBuffer;
  }

  getLastClusterData(): ClusterData | undefined {
    return this.lastClusterData;
  }

  /**
   * Cleanup GPU resources
   */
  dispose(): void {
    this.clusterAABBBuffer?.destroy();
    this.lightBuffer?.destroy();
    this.lightIndexBuffer?.destroy();
    this.clusterGridBuffer?.destroy();
  }
}
