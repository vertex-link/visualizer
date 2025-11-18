import { type Actor, Component, Context, ResourceComponent } from "@vertex-link/space";
import { ClusteringResource, type ClusterGridConfig } from "./ClusteringResource";

/**
 * ClusteringComponent enables clustered forward+ rendering for a scene.
 *
 * Usage:
 * ```typescript
 * // Add to scene root or dedicated actor
 * const clusteringActor = scene.createActor("Clustering");
 * const clustering = clusteringActor.addComponent(ClusteringComponent);
 * clustering.config = { gridX: 16, gridY: 9, gridZ: 24 };
 * ```
 *
 * The WebGPUProcessor will automatically detect this component and use
 * clustered rendering for all lights in the scene.
 */
export class ClusteringComponent extends Component {
  /**
   * Cluster grid configuration
   */
  public config: ClusterGridConfig = {
    gridX: 16,
    gridY: 9,
    gridZ: 24,
  };

  /**
   * Enable/disable automatic clustering updates each frame
   */
  public autoUpdate = true;

  /**
   * Enable debug visualization of clusters
   */
  public debugVisualization = false;

  /**
   * Cached clustering resource reference
   */
  private _clusteringResource?: ClusteringResource;

  constructor(actor: Actor) {
    super(actor);
  }

  /**
   * Get clustering resource (lazy loaded from ResourceComponent)
   */
  get clusteringResource(): ClusteringResource | undefined {
    if (!this._clusteringResource) {
      const resourceComp = this.actor.getComponent(ResourceComponent);
      this._clusteringResource = resourceComp?.get(ClusteringResource);
    }
    return this._clusteringResource;
  }

  /**
   * Initialize: Create clustering resource if it doesn't exist
   */
  onInitialize(): void {
    // Check if clustering resource exists
    let resourceComp = this.actor.getComponent(ResourceComponent);

    // Create ResourceComponent if it doesn't exist
    if (!resourceComp) {
      resourceComp = this.actor.addComponent(ResourceComponent);
    }

    // Check if clustering resource already exists
    const existing = resourceComp.get(ClusteringResource);
    if (!existing) {
      // Create clustering resource with current context
      const resource = new ClusteringResource("clustering", Context.current());
      resource.config = { ...this.config };
      resourceComp.add(resource);
      this._clusteringResource = resource;
      console.log("✅ ClusteringComponent: Created ClusteringResource");
    } else {
      this._clusteringResource = existing;
      console.log("✅ ClusteringComponent: Using existing ClusteringResource");
    }
  }

  /**
   * Update cluster configuration (will apply on next frame)
   */
  setConfig(config: Partial<ClusterGridConfig>): void {
    this.config = { ...this.config, ...config };
    if (this._clusteringResource) {
      this._clusteringResource.config = { ...this.config };
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this._clusteringResource = undefined;
  }
}
