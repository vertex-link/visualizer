import { type Actor, Component, ResourceComponent } from "@vertex-link/space";
import { MeshRendererComponent } from "./MeshRendererComponent";
import { TransformComponent } from "./TransformComponent";
import { MaterialResource } from "../../resources/MaterialResource";

/**
 * Grid configuration options for creating a grid actor
 */
export interface GridConfig {
  /** Total size of the grid plane in world units (default: 100) */
  size?: number;
  /** RGBA color for grid lines, values in range [0-1] (default: gray) */
  color?: [number, number, number, number];
  /** Initial visibility state (default: true) */
  visible?: boolean;
  /** Grid orientation plane (default: "xz" for horizontal) */
  plane?: "xy" | "xz" | "yz";
  /** Render layer for sorting (default: -1000 for background) */
  layer?: number;
}

/**
 * GridComponent - manages grid visibility and configuration
 * Follows SPACe architecture by using existing components
 */
export class GridComponent extends Component {
  private renderer?: MeshRendererComponent;
  private transform?: TransformComponent;
  private resources?: ResourceComponent;

  constructor(actor: Actor) {
    super(actor);
  }

  /**
   * Get the mesh renderer component (cached)
   */
  private getRenderer(): MeshRendererComponent | undefined {
    if (!this.renderer) {
      this.renderer = this.actor.getComponent(MeshRendererComponent);
    }
    return this.renderer;
  }

  /**
   * Get the transform component (cached)
   */
  private getTransform(): TransformComponent | undefined {
    if (!this.transform) {
      this.transform = this.actor.getComponent(TransformComponent);
    }
    return this.transform;
  }

  /**
   * Get the resource component (cached)
   */
  private getResources(): ResourceComponent | undefined {
    if (!this.resources) {
      this.resources = this.actor.getComponent(ResourceComponent);
    }
    return this.resources;
  }

  /**
   * Show the grid
   */
  show(): void {
    const renderer = this.getRenderer();
    if (renderer) {
      renderer.enabled = true;
    }
  }

  /**
   * Hide the grid
   */
  hide(): void {
    const renderer = this.getRenderer();
    if (renderer) {
      renderer.enabled = false;
    }
  }

  /**
   * Toggle grid visibility
   */
  toggle(): void {
    const renderer = this.getRenderer();
    if (renderer) {
      renderer.enabled = !renderer.enabled;
    }
  }

  /**
   * Check if grid is visible
   */
  isVisible(): boolean {
    const renderer = this.getRenderer();
    return renderer?.enabled ?? false;
  }

  /**
   * Set grid visibility
   * @param visible - Whether the grid should be visible
   */
  setVisible(visible: boolean): void {
    const renderer = this.getRenderer();
    if (renderer) {
      renderer.enabled = visible;
    }
  }

  /**
   * Set grid color
   * @param color - RGBA color array [0-1]
   */
  setColor(color: [number, number, number, number]): void {
    const resources = this.getResources();
    const material = resources?.get(MaterialResource);
    if (material) {
      // Update material color if it supports color uniforms
      material.setUniform("color", new Float32Array(color));
    }
  }

  /**
   * Set render layer for sorting
   * @param layer - Render layer (lower values render first)
   */
  setLayer(layer: number): void {
    const renderer = this.getRenderer();
    if (renderer) {
      renderer.layer = layer;
    }
  }

  /**
   * Dispose grid resources when component is removed
   */
  dispose(): void {
    // Clear cached references
    this.renderer = undefined;
    this.transform = undefined;
    this.resources = undefined;
    super.dispose();
  }
}
