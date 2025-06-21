import { Actor, Component, ResourceComponent, ProcessorRegistry, Update } from "@vertex-link/acs";
import { TransformComponent } from "../../rendering/components/TransformComponent";
import { WebGPUProcessor, WebGPUUpdate } from "../../processors/WebGPUProcessor";
import { MeshResource } from "../../resources/MeshResource";
import { MaterialResource } from "../../resources/MaterialResource";
import { emit } from "@vertex-link/acs";
import { ResourceReadyEvent } from "@vertex-link/acs";

/**
 * Simplified MeshRendererComponent - gets resources from ResourceComponent
 * No direct resource injection, works with the new ResourceComponent pattern
 */
export class MeshRendererComponent extends Component {
  /** Whether this renderer is currently enabled */
  public enabled: boolean = true;

  /** Render layer/priority (for sorting) */
  public layer: number = 0;

  // Cached components
  private transform?: TransformComponent;
  private resources?: ResourceComponent;

  // Internal state
  private lastUpdateFrame = -1;
  private isVisible = true;

  constructor(actor: Actor, config?: { enabled?: boolean; layer?: number }) {
    super(actor);

    if (config?.enabled !== undefined) this.enabled = config.enabled;
    if (config?.layer !== undefined) this.layer = config.layer;
  }

  /**
   * Get mesh resource from ResourceComponent
   */
  get mesh(): MeshResource | undefined {
    if (!this.resources) {
      this.resources = this.actor.getComponent(ResourceComponent);
    }
    return this.resources?.get(MeshResource);
  }

  /**
   * Get material resource from ResourceComponent
   */
  get material(): MaterialResource | undefined {
    if (!this.resources) {
      this.resources = this.actor.getComponent(ResourceComponent);
    }
    return this.resources?.get(MaterialResource);
  }

  /**
   * WebGPU processor integration - called every frame by WebGPUProcessor
   * This method is called during the render batching phase
   */
  @WebGPUUpdate()
  updateForRender(deltaTime: number): void {
    // Always ensure resources are compiled first
    this.ensureResourcesCompiled();

    if (!this.enabled || !this.isRenderable()) {
      return;
    }

    // Mark transform as used this frame (for batching optimization)
    this.lastUpdateFrame = performance.now();

    // Processor will automatically batch this component based on material
    // No direct GPU calls here - that's handled by the render graph
  }

  /**
   * Check if this renderer is ready to be rendered.
   * Requires both mesh and material to be loaded and compiled.
   */
  isRenderable(): boolean {
    const mesh = this.mesh;
    const material = this.material;

    const result = this.enabled &&
      this.isVisible &&
      mesh !== undefined &&
      material !== undefined &&
      mesh.isLoaded() &&
      material.isLoaded() &&
      mesh.isCompiled &&
      material.isCompiled;

    // Debug logging
    if (!result) {
      console.log(`🔍 ${this.actor.label} not renderable:`, {
        enabled: this.enabled,
        visible: this.isVisible,
        hasMesh: mesh !== undefined,
        hasMaterial: material !== undefined,
        meshLoaded: mesh?.isLoaded(),
        materialLoaded: material?.isLoaded(),
        meshCompiled: mesh?.isCompiled,
        materialCompiled: material?.isCompiled,
        materialId: material?.id,
        materialName: material?.name
      });
    }

    return result;
  }

  /**
   * Ensure GPU resources are ready (loaded and compiled)
   */
  private async ensureResourcesCompiled(): Promise<void> {
    const wasRenderable = this.isRenderable();
    try {
      const mesh = this.mesh;
      const material = this.material;

      if (mesh) {
        await mesh.whenReady();
      }

      if (material) {
        await material.whenReady();
      }

      const nowRenderable = this.isRenderable();

      // Emit event if we just became renderable
      if (!wasRenderable && nowRenderable) {
        emit(new ResourceReadyEvent({ meshRenderer: this }));
      }
    } catch (error) {
      console.error(`❌ Failed to ensure resources ready for ${this.actor.label}:`, error);
    }
  }

  /**
   * Get the transform component (required dependency).
   */
  getTransform(): TransformComponent {
    if (!this.transform) {
      this.transform = this.actor.getComponent(TransformComponent);
      if (!this.transform) {
        throw new Error(`MeshRendererComponent on actor "${this.actor.label}" requires TransformComponent`);
      }
    }
    return this.transform;
  }

  /**
   * Get batch key for efficient batching by the processor
   */
  getBatchKey(): string {
    const material = this.material;
    const mesh = this.mesh;

    if (!material || !mesh) return 'invalid';

    return `${material.name}_${this.layer}_${this.getVertexLayoutHash()}`;
  }

  /**
   * Set visibility (for frustum culling, etc.)
   */
  setVisible(visible: boolean): void {
    if (this.isVisible !== visible) {
      this.isVisible = visible;
      this.markDirty();
    }
  }

  /**
   * Check if visible
   */
  getVisible(): boolean {
    return this.isVisible;
  }

  /**
   * Get render priority for sorting
   */
  getRenderPriority(): number {
    const material = this.material;
    // Higher layer = render later (for transparency)
    return this.layer * 1000 + (material?.name.hashCode() || 0);
  }

  /**
   * Cleanup when component is removed
   */
  public dispose(): void {
    // Let the processor know this component is gone
    this.markDirty();
    super.dispose();
  }

  /**
   * Mark render data as dirty (forces processor to re-batch)
   */
  private markDirty(): void {
    // Find WebGPUProcessor and mark it dirty
    const processor = ProcessorRegistry.get("webgpu") as WebGPUProcessor;
    if (processor) {
      processor.markDirty();
    }
  }

  /**
   * Get vertex layout hash for batching
   */
  private getVertexLayoutHash(): string {
    const mesh = this.mesh;
    // This would be based on the mesh's vertex layout
    // For now, return a simple hash
    return mesh?.name.slice(-8) || 'default';
  }
}

// Extend String prototype for hash codes (used in getBatchKey)
declare global {
  interface String {
    hashCode(): number;
  }
}

if (!String.prototype.hashCode) {
  String.prototype.hashCode = function(): number {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      const char = this.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  };
}
