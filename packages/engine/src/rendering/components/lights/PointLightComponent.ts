import type { Actor } from "@vertex-link/space";
import type { Vec3 } from "../TransformComponent";
import { BaseLightComponent } from "./BaseLightComponent";

/**
 * Point light component - omnidirectional light with radius-based attenuation.
 * Position is derived from the actor's TransformComponent.
 */
export class PointLightComponent extends BaseLightComponent {
  /** Light attenuation radius (world units) */
  public radius = 10.0;

  constructor(
    actor: Actor,
    config?: Partial<{
      color: Vec3;
      intensity: number;
      enabled: boolean;
      castsShadows: boolean;
      radius: number;
    }>,
  ) {
    super(actor, config);

    if (config?.radius !== undefined) this.radius = config.radius;
  }

  /**
   * Set radius and mark dirty
   */
  setRadius(value: number): void {
    this.radius = value;
    this.markDirty();
  }
}
