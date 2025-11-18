import { type Actor, Component } from "@vertex-link/space";
import { MeshRendererComponent } from "./MeshRendererComponent";

/**
 * GridComponent - manages grid visibility and configuration
 * Follows SPACe architecture by using existing components
 */
export class GridComponent extends Component {
  private renderer?: MeshRendererComponent;

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
   */
  setVisible(visible: boolean): void {
    const renderer = this.getRenderer();
    if (renderer) {
      renderer.enabled = visible;
    }
  }
}
