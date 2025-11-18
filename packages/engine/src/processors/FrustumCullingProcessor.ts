import { Processor, type Actor } from "@vertex-link/space";
import { CameraComponent } from "../rendering/camera/CameraComponent";
import { MeshRendererComponent } from "../rendering/components/MeshRendererComponent";
import { TransformComponent } from "../rendering/components/TransformComponent";
import {
  FrustumCullingResource,
  type Frustum,
  type BoundingSphere,
} from "../resources/FrustumCullingResource";
import { BoundingBoxUtils } from "../resources/types/BoundingBox";

/**
 * FrustumCullingProcessor - Performs view frustum culling on mesh renderers
 *
 * This processor optimizes rendering by testing each mesh's bounding volume
 * against the camera's view frustum and marking invisible objects as culled.
 *
 * Architecture:
 * - Uses WebAssembly (Zig) for high-performance frustum tests
 * - Tests transformed bounding spheres against frustum planes
 * - Calls MeshRendererComponent.setVisible() to control rendering
 * - Runs before WebGPUProcessor to prevent culled objects from being batched
 *
 * Performance:
 * - Batch tests all objects at once using WASM for minimal overhead
 * - Only updates visibility when camera or transforms change
 * - Uses bounding spheres for fastest possible tests
 *
 * @example
 * ```typescript
 * const context = new Context();
 * const frustumCulling = new FrustumCullingProcessor();
 * context.addProcessor(frustumCulling);
 * context.addProcessor(webGPUProcessor); // Must come after culling
 * ```
 */
export class FrustumCullingProcessor extends Processor {
  private frustumCullingResource: FrustumCullingResource | null = null;
  private currentFrustum: Frustum | null = null;
  private lastCameraVersion = -1;
  private enabled = true;

  // Performance tracking
  private stats = {
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    lastUpdateTime: 0,
  };

  constructor() {
    super();
  }

  /**
   * Initialize the frustum culling resource
   */
  async initialize(): Promise<void> {
    console.log("🔍 FrustumCullingProcessor: Initializing...");

    try {
      this.frustumCullingResource = await new FrustumCullingResource().whenReady();
      console.log("✅ FrustumCullingProcessor: WebAssembly module loaded");
    } catch (error) {
      console.error("❌ FrustumCullingProcessor: Failed to load WASM module:", error);
      // Disable culling if WASM fails to load
      this.enabled = false;
    }
  }

  /**
   * Enable or disable frustum culling
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    // If disabling, make all objects visible
    if (!enabled && this.scene) {
      const renderables = this.scene
        .query()
        .withComponent(MeshRendererComponent)
        .execute();

      for (const actor of renderables) {
        const meshRenderer = actor.getComponent(MeshRendererComponent);
        if (meshRenderer) {
          meshRenderer.setVisible(true);
        }
      }

      console.log("🔍 FrustumCullingProcessor: Disabled, all objects visible");
    }
  }

  /**
   * Check if frustum culling is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get culling statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Update frustum culling for all mesh renderers
   */
  update(deltaTime: number): void {
    if (!this.enabled || !this.frustumCullingResource || !this.scene) {
      return;
    }

    const startTime = performance.now();

    // Find active camera
    const camera = this.findActiveCamera();
    if (!camera) {
      // No camera, make everything visible
      return;
    }

    // Extract frustum from camera (only if camera changed)
    const cameraTransform = camera.getTransform();
    const cameraVersion = cameraTransform ? cameraTransform.version : 0;

    if (!this.currentFrustum || this.lastCameraVersion !== cameraVersion) {
      const viewProjectionMatrix = camera.getViewProjectionMatrix();
      this.currentFrustum = this.frustumCullingResource.extractFrustum(viewProjectionMatrix);
      this.lastCameraVersion = cameraVersion;
    }

    // Query all renderable actors
    const renderables = this.scene
      .query()
      .withComponent(TransformComponent)
      .withComponent(MeshRendererComponent)
      .execute();

    // Prepare batch test data
    const spheres: BoundingSphere[] = [];
    const actors: Actor[] = [];

    for (const actor of renderables) {
      const meshRenderer = actor.getComponent(MeshRendererComponent);
      const transform = actor.getComponent(TransformComponent);

      if (!meshRenderer || !transform) {
        continue;
      }

      // Get mesh bounding sphere
      const mesh = meshRenderer.mesh;
      if (!mesh || !mesh.boundingSphere) {
        // No bounding sphere, assume visible
        meshRenderer.setVisible(true);
        continue;
      }

      // Transform bounding sphere by world transform
      const worldMatrix = transform.getWorldMatrix();
      const position: [number, number, number] = [
        worldMatrix[12],
        worldMatrix[13],
        worldMatrix[14],
      ];

      const scale: [number, number, number] = [
        transform.scale[0],
        transform.scale[1],
        transform.scale[2],
      ];

      const transformedSphere = BoundingBoxUtils.transformSphere(
        mesh.boundingSphere,
        position,
        scale,
      );

      spheres.push(transformedSphere);
      actors.push(actor);
    }

    // Batch test all spheres at once
    if (spheres.length > 0) {
      const visibility = this.frustumCullingResource.batchTestSpheres(
        this.currentFrustum,
        spheres,
      );

      // Update visibility on mesh renderers
      let visibleCount = 0;
      for (let i = 0; i < actors.length; i++) {
        const meshRenderer = actors[i].getComponent(MeshRendererComponent);
        if (meshRenderer) {
          const isVisible = visibility[i];
          meshRenderer.setVisible(isVisible);
          if (isVisible) {
            visibleCount++;
          }
        }
      }

      // Update stats
      this.stats.totalObjects = actors.length;
      this.stats.visibleObjects = visibleCount;
      this.stats.culledObjects = actors.length - visibleCount;
      this.stats.lastUpdateTime = performance.now() - startTime;
    } else {
      this.stats.totalObjects = 0;
      this.stats.visibleObjects = 0;
      this.stats.culledObjects = 0;
      this.stats.lastUpdateTime = performance.now() - startTime;
    }
  }

  /**
   * Find the active camera in the scene
   */
  private findActiveCamera(): CameraComponent | null {
    if (!this.scene) {
      return null;
    }

    const cameras = this.scene.query().withComponent(CameraComponent).execute();

    for (const actor of cameras) {
      const camera = actor.getComponent(CameraComponent);
      if (camera && camera.isActive) {
        return camera;
      }
    }

    return null;
  }
}
