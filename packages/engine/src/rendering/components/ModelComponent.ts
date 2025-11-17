import { Component } from "@vertex-link/space";
import { ResourceComponent } from "@vertex-link/space";
import { GltfResource } from "../../resources/GltfResource";
import type { MeshResource } from "../../resources/MeshResource";
import type { MaterialResource } from "../../resources/MaterialResource";

/**
 * Primitive represents a single mesh+material pair from a GLTF model
 */
export interface ModelPrimitive {
  mesh: MeshResource;
  material: MaterialResource;
  meshIndex: number;
  materialIndex: number;
}

/**
 * ModelComponent - Renders GLTF models with multiple meshes/materials
 *
 * Follows the same pattern as MeshRendererComponent:
 * - Uses cached getter to access GltfResource via ResourceComponent
 * - No dependency injection or service locator
 * - Processor queries scene for actors with this component
 */
export class ModelComponent extends Component {
  /** Whether this component is enabled for rendering */
  public enabled = true;

  /** Render layer (for sorting/filtering) */
  public layer = 0;

  // Cached reference to ResourceComponent
  private resources?: ResourceComponent;

  /**
   * Get the GltfResource attached to this actor (lazy loaded)
   */
  get model(): GltfResource | undefined {
    if (!this.resources) {
      this.resources = this.actor.getComponent(ResourceComponent);
    }
    return this.resources?.get(GltfResource);
  }

  /**
   * Get a specific primitive (mesh+material pair) by index
   */
  getPrimitive(index: number): ModelPrimitive | undefined {
    const model = this.model;
    if (!model || !model.isLoaded() || !model.isCompiled) {
      return undefined;
    }

    const gltfData = model.payload;
    if (index >= gltfData.meshes.length) {
      return undefined;
    }

    const meshData = gltfData.meshes[index];
    const mesh = model.getMesh(index);
    const material = model.getMaterial(meshData.materialIndex);

    if (!mesh || !material) {
      return undefined;
    }

    return {
      mesh,
      material,
      meshIndex: index,
      materialIndex: meshData.materialIndex,
    };
  }

  /**
   * Get all renderable primitives
   */
  getAllPrimitives(): ModelPrimitive[] {
    const model = this.model;
    if (!model || !model.isLoaded() || !model.isCompiled) {
      return [];
    }

    const primitives: ModelPrimitive[] = [];
    for (let i = 0; i < model.meshCount; i++) {
      const primitive = this.getPrimitive(i);
      if (primitive) {
        primitives.push(primitive);
      }
    }

    return primitives;
  }

  /**
   * Check if this model is ready to render
   */
  isRenderable(): boolean {
    const model = this.model;
    return (
      this.enabled &&
      model !== undefined &&
      model.isLoaded() &&
      model.isCompiled &&
      model.meshCount > 0
    );
  }

  /**
   * Ensure resources are compiled (called by processor)
   */
  async updateForRender(_deltaTime: number): Promise<void> {
    const model = this.model;
    if (model && !model.isCompiled) {
      await model.whenReady();
    }
  }

  /**
   * Cleanup
   */
  override dispose(): void {
    this.resources = undefined;
    super.dispose();
  }
}
