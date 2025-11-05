import type { Actor } from "@vertex-link/space";
import type { Vec3 } from "../TransformComponent";
import { BaseLightComponent } from "./BaseLightComponent";

/**
 * Directional light component - parallel rays in a single direction (like sunlight).
 * Direction is derived from the actor's TransformComponent forward vector.
 * Affects all geometry regardless of distance.
 */
export class DirectionalLightComponent extends BaseLightComponent {
  constructor(
    actor: Actor,
    config?: Partial<{
      color: Vec3;
      intensity: number;
      enabled: boolean;
      castsShadows: boolean;
    }>,
  ) {
    super(actor, config);
  }

  /**
   * Get normalized light direction from transform's forward vector.
   * Default forward is -Z axis [0, 0, -1].
   */
  getDirection(): Vec3 {
    // For now, use the transform's forward vector
    // In the future, this could be derived from rotation quaternion
    // Default direction: down and slightly angled
    return [0.5, -1, 0.5];
  }
}
