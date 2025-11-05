import { Processor, type Scene, Tickers } from "@vertex-link/space";
import { PointLightComponent } from "../rendering/components/lights/PointLightComponent";
import { DirectionalLightComponent } from "../rendering/components/lights/DirectionalLightComponent";
import { TransformComponent } from "../rendering/components/TransformComponent";

/**
 * GPU-aligned point light data structure.
 * Total size: 32 bytes (16-byte aligned)
 */
interface PointLightData {
  position: [number, number, number]; // 12 bytes
  radius: number; // 4 bytes
  color: [number, number, number]; // 12 bytes
  intensity: number; // 4 bytes
}

/**
 * GPU-aligned directional light data structure.
 * Total size: 32 bytes (16-byte aligned)
 */
interface DirectionalLightData {
  direction: [number, number, number]; // 12 bytes
  _padding0: number; // 4 bytes (alignment)
  color: [number, number, number]; // 12 bytes
  intensity: number; // 4 bytes
}

/**
 * Processor that collects lights from the scene and uploads to GPU.
 * Follows the same pattern as WebGPUProcessor for consistency.
 */
export class LightProcessor extends Processor {
  private static VERSION = "v2.0-debug"; // Change this to verify code is loaded
  private device: GPUDevice | null = null;
  private scene: Scene | null = null;

  // GPU buffers
  private pointLightBuffer: GPUBuffer | null = null;
  private directionalLightBuffer: GPUBuffer | null = null;
  private lightCountBuffer: GPUBuffer | null = null;

  // Bind group (exposed to WebGPUProcessor)
  private lightBindGroup: GPUBindGroup | null = null;

  // Cached light data
  private pointLights: PointLightData[] = [];
  private directionalLights: DirectionalLightData[] = [];

  // Debug flags
  private uploadLoggedOnce = false;
  private executeTasksLoggedOnce = false;

  constructor(name = "light") {
    super(name, Tickers.animationFrame());
    console.log(`🔥 LightProcessor ${LightProcessor.VERSION} instantiated`);
  }

  /**
   * Initialize with GPU device
   */
  initialize(device: GPUDevice): void {
    this.device = device;
    console.log("✅ LightProcessor initialized");
  }

  /**
   * Set the scene to query for lights
   */
  setScene(scene: Scene): void {
    this.scene = scene;
  }

  /**
   * Main update loop - query scene and upload light data
   */
  protected executeTasks(_deltaTime: number): void {
    console.log("=== LIGHTPROCESSOR EXECUTETASKS CALLED ===");

    if (!this.scene) {
      console.log("⚠️ LightProcessor: No scene");
      return;
    }
    if (!this.device) {
      console.log("⚠️ LightProcessor: No device");
      return;
    }

    this.collectLights();
    this.uploadLightData();
  }

  /**
   * Query scene for light components
   */
  private collectLights(): void {
    if (!this.scene) return;

    // Collect point lights
    const oldPointLightCount = this.pointLights.length;
    this.pointLights = [];
    const pointLightActors = this.scene
      .query()
      .withComponent(PointLightComponent)
      .withComponent(TransformComponent)
      .execute();

    for (const actor of pointLightActors) {
      const light = actor.getComponent(PointLightComponent);
      const transform = actor.getComponent(TransformComponent);

      if (!light || !transform || !light.enabled) continue;

      const position = transform.position;
      this.pointLights.push({
        position: [position[0], position[1], position[2]],
        radius: light.radius,
        color: [light.color[0], light.color[1], light.color[2]],
        intensity: light.intensity,
      });
    }

    if (this.pointLights.length !== oldPointLightCount && this.pointLights.length > 0) {
      console.log(`💡 Collected ${this.pointLights.length} point lights`);
    }

    // Collect directional lights
    const oldDirectionalLightCount = this.directionalLights.length;
    this.directionalLights = [];
    const directionalLightActors = this.scene
      .query()
      .withComponent(DirectionalLightComponent)
      .execute();

    for (const actor of directionalLightActors) {
      const light = actor.getComponent(DirectionalLightComponent);

      if (!light || !light.enabled) continue;

      const direction = light.getDirection();
      // Normalize direction
      const len = Math.sqrt(
        direction[0] * direction[0] +
        direction[1] * direction[1] +
        direction[2] * direction[2]
      );
      const normalized: [number, number, number] = [
        direction[0] / len,
        direction[1] / len,
        direction[2] / len,
      ];

      this.directionalLights.push({
        direction: normalized,
        _padding0: 0,
        color: [light.color[0], light.color[1], light.color[2]],
        intensity: light.intensity,
      });
    }

    if (this.directionalLights.length !== oldDirectionalLightCount && this.directionalLights.length > 0) {
      console.log(`💡 Collected ${this.directionalLights.length} directional lights`);
    }
  }

  /**
   * Upload light data to GPU buffers
   */
  private uploadLightData(): void {
    console.log(`📤 uploadLightData called (${this.pointLights.length} point, ${this.directionalLights.length} directional)`);

    if (!this.device) {
      console.log("⚠️ uploadLightData: No device!");
      return;
    }

    // Point lights - always create buffer (even if empty) for bind group compatibility
    const pointLightCount = Math.max(this.pointLights.length, 1); // At least 1 for empty array
    const pointData = new Float32Array(pointLightCount * 8); // 8 floats per light

    for (let i = 0; i < this.pointLights.length; i++) {
      const light = this.pointLights[i];
      const offset = i * 8;

      pointData[offset + 0] = light.position[0];
      pointData[offset + 1] = light.position[1];
      pointData[offset + 2] = light.position[2];
      pointData[offset + 3] = light.radius;
      pointData[offset + 4] = light.color[0];
      pointData[offset + 5] = light.color[1];
      pointData[offset + 6] = light.color[2];
      pointData[offset + 7] = light.intensity;
    }

    // Create or resize buffer
    const requiredSize = pointData.byteLength;
    if (!this.pointLightBuffer || this.pointLightBuffer.size < requiredSize) {
      this.pointLightBuffer?.destroy();
      this.pointLightBuffer = this.device.createBuffer({
        label: "PointLightBuffer",
        size: Math.max(requiredSize, 256), // Min 256 bytes
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      console.log(`📦 Created point light buffer (size: ${this.pointLightBuffer.size} bytes)`);
    }

    this.device.queue.writeBuffer(this.pointLightBuffer, 0, pointData);

    // Directional lights - always create buffer (even if empty) for bind group compatibility
    const directionalLightCount = Math.max(this.directionalLights.length, 1); // At least 1 for empty array
    const directionalData = new Float32Array(directionalLightCount * 8); // 8 floats per light

    for (let i = 0; i < this.directionalLights.length; i++) {
      const light = this.directionalLights[i];
      const offset = i * 8;

      directionalData[offset + 0] = light.direction[0];
      directionalData[offset + 1] = light.direction[1];
      directionalData[offset + 2] = light.direction[2];
      directionalData[offset + 3] = 0; // padding
      directionalData[offset + 4] = light.color[0];
      directionalData[offset + 5] = light.color[1];
      directionalData[offset + 6] = light.color[2];
      directionalData[offset + 7] = light.intensity;
    }

    const directionalRequiredSize = directionalData.byteLength;
    if (!this.directionalLightBuffer || this.directionalLightBuffer.size < directionalRequiredSize) {
      this.directionalLightBuffer?.destroy();
      this.directionalLightBuffer = this.device.createBuffer({
        label: "DirectionalLightBuffer",
        size: Math.max(directionalRequiredSize, 256),
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      console.log(`📦 Created directional light buffer (size: ${this.directionalLightBuffer.size} bytes)`);
    }

    this.device.queue.writeBuffer(this.directionalLightBuffer, 0, directionalData);

    // Light count buffer (uniform)
    const countData = new Uint32Array([
      this.pointLights.length,
      this.directionalLights.length,
      0, // reserved
      0, // reserved
    ]);

    if (!this.lightCountBuffer) {
      this.lightCountBuffer = this.device.createBuffer({
        label: "LightCountBuffer",
        size: 16, // 4 x u32
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      console.log(`📦 Created light count buffer`);
    }

    this.device.queue.writeBuffer(this.lightCountBuffer, 0, countData);
  }

  /**
   * Create light bind group with given layout (called by WebGPUProcessor)
   */
  createBindGroup(layout: GPUBindGroupLayout): GPUBindGroup | null {
    if (!this.device || !this.pointLightBuffer || !this.directionalLightBuffer || !this.lightCountBuffer) {
      return null;
    }

    try {
      this.lightBindGroup = this.device.createBindGroup({
        label: "LightBindGroup",
        layout,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.pointLightBuffer },
          },
          {
            binding: 1,
            resource: { buffer: this.directionalLightBuffer },
          },
          {
            binding: 2,
            resource: { buffer: this.lightCountBuffer },
          },
        ],
      });
      return this.lightBindGroup;
    } catch (error) {
      console.warn("⚠️ Failed to create light bind group:", error);
      return null;
    }
  }

  /**
   * Get current light bind group
   */
  getLightBindGroup(): GPUBindGroup | null {
    return this.lightBindGroup;
  }

  /**
   * Get number of point lights
   */
  getPointLightCount(): number {
    return this.pointLights.length;
  }

  /**
   * Get number of directional lights
   */
  getDirectionalLightCount(): number {
    return this.directionalLights.length;
  }

  /**
   * Check if buffers are available
   */
  hasLightBuffers(): boolean {
    return !!(this.pointLightBuffer && this.directionalLightBuffer && this.lightCountBuffer);
  }

  /**
   * Cleanup GPU resources
   */
  public stop(): void {
    super.stop();

    this.pointLightBuffer?.destroy();
    this.directionalLightBuffer?.destroy();
    this.lightCountBuffer?.destroy();

    this.pointLightBuffer = null;
    this.directionalLightBuffer = null;
    this.lightCountBuffer = null;
    this.lightBindGroup = null;

    console.log("🛑 LightProcessor stopped");
  }
}
