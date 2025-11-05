import type { Scene } from "@vertex-link/space";
import { PointLightComponent } from "../components/lights/PointLightComponent";
import { DirectionalLightComponent } from "../components/lights/DirectionalLightComponent";
import { TransformComponent } from "../components/TransformComponent";

/**
 * GPU-aligned point light data structure.
 * Total size: 32 bytes (16-byte aligned)
 */
export interface PointLightData {
  position: [number, number, number]; // 12 bytes
  radius: number; // 4 bytes
  color: [number, number, number]; // 12 bytes
  intensity: number; // 4 bytes
}

/**
 * GPU-aligned directional light data structure.
 * Total size: 32 bytes (16-byte aligned)
 */
export interface DirectionalLightData {
  direction: [number, number, number]; // 12 bytes
  _padding0: number; // 4 bytes (alignment)
  color: [number, number, number]; // 12 bytes
  intensity: number; // 4 bytes
}

/**
 * Manages light collection from the scene and GPU buffer uploads.
 * Queries scene for light components and packs data for shader consumption.
 */
export class LightManager {
  private device: GPUDevice;

  // GPU buffers
  private pointLightBuffer: GPUBuffer | null = null;
  private directionalLightBuffer: GPUBuffer | null = null;
  private lightCountBuffer: GPUBuffer | null = null;

  // Cached light data
  private pointLights: PointLightData[] = [];
  private directionalLights: DirectionalLightData[] = [];

  // Version tracking
  private lastUpdateVersion = -1;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  /**
   * Query scene for lights and update GPU buffers if needed.
   */
  update(scene: Scene): void {
    // Collect point lights
    this.pointLights = [];
    const pointLightActors = scene.query([PointLightComponent, TransformComponent]);

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

    // Collect directional lights
    this.directionalLights = [];
    const directionalLightActors = scene.query([DirectionalLightComponent]);

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

    // Upload to GPU
    this.uploadLightData();
  }

  /**
   * Upload light data to GPU buffers.
   */
  private uploadLightData(): void {
    // Point lights
    if (this.pointLights.length > 0) {
      const data = new Float32Array(this.pointLights.length * 8); // 8 floats per light

      for (let i = 0; i < this.pointLights.length; i++) {
        const light = this.pointLights[i];
        const offset = i * 8;

        data[offset + 0] = light.position[0];
        data[offset + 1] = light.position[1];
        data[offset + 2] = light.position[2];
        data[offset + 3] = light.radius;
        data[offset + 4] = light.color[0];
        data[offset + 5] = light.color[1];
        data[offset + 6] = light.color[2];
        data[offset + 7] = light.intensity;
      }

      // Create or resize buffer
      const requiredSize = data.byteLength;
      if (!this.pointLightBuffer || this.pointLightBuffer.size < requiredSize) {
        this.pointLightBuffer?.destroy();
        this.pointLightBuffer = this.device.createBuffer({
          label: "PointLightBuffer",
          size: Math.max(requiredSize, 256), // Min 256 bytes
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
      }

      this.device.queue.writeBuffer(this.pointLightBuffer, 0, data);
    }

    // Directional lights
    if (this.directionalLights.length > 0) {
      const data = new Float32Array(this.directionalLights.length * 8); // 8 floats per light

      for (let i = 0; i < this.directionalLights.length; i++) {
        const light = this.directionalLights[i];
        const offset = i * 8;

        data[offset + 0] = light.direction[0];
        data[offset + 1] = light.direction[1];
        data[offset + 2] = light.direction[2];
        data[offset + 3] = 0; // padding
        data[offset + 4] = light.color[0];
        data[offset + 5] = light.color[1];
        data[offset + 6] = light.color[2];
        data[offset + 7] = light.intensity;
      }

      const requiredSize = data.byteLength;
      if (!this.directionalLightBuffer || this.directionalLightBuffer.size < requiredSize) {
        this.directionalLightBuffer?.destroy();
        this.directionalLightBuffer = this.device.createBuffer({
          label: "DirectionalLightBuffer",
          size: Math.max(requiredSize, 256),
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
      }

      this.device.queue.writeBuffer(this.directionalLightBuffer, 0, data);
    }

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
    }

    this.device.queue.writeBuffer(this.lightCountBuffer, 0, countData);
  }

  /**
   * Get point light buffer for bind group.
   */
  getPointLightBuffer(): GPUBuffer | null {
    return this.pointLightBuffer;
  }

  /**
   * Get directional light buffer for bind group.
   */
  getDirectionalLightBuffer(): GPUBuffer | null {
    return this.directionalLightBuffer;
  }

  /**
   * Get light count buffer.
   */
  getLightCountBuffer(): GPUBuffer | null {
    return this.lightCountBuffer;
  }

  /**
   * Get number of point lights.
   */
  getPointLightCount(): number {
    return this.pointLights.length;
  }

  /**
   * Get number of directional lights.
   */
  getDirectionalLightCount(): number {
    return this.directionalLights.length;
  }

  /**
   * Cleanup GPU resources.
   */
  dispose(): void {
    this.pointLightBuffer?.destroy();
    this.directionalLightBuffer?.destroy();
    this.lightCountBuffer?.destroy();

    this.pointLightBuffer = null;
    this.directionalLightBuffer = null;
    this.lightCountBuffer = null;
  }
}
