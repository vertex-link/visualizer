import { type Actor, Component } from "@vertex-link/space";
import type { TransformComponent, Vec3 } from "./TransformComponent";

/**
 * Light types supported by clustered forward+ rendering
 */
export enum LightType {
  Point = 0,
  Spot = 1,
  Directional = 2,
}

/**
 * Light component for dynamic lighting in clustered forward+ rendering.
 * Holds light parameters and integrates with TransformComponent for position.
 *
 * Usage:
 * ```typescript
 * const light = actor.addComponent(LightComponent);
 * light.setColor(1.0, 0.5, 0.2);
 * light.setIntensity(2.5);
 * light.radius = 10.0;
 * ```
 */
export class LightComponent extends Component {
  /** Light type (point, spot, directional) */
  public type: LightType = LightType.Point;

  /** Light color (RGB, 0-1 range) */
  public color: Vec3 = [1, 1, 1];

  /** Light intensity multiplier */
  public intensity: number = 1.0;

  /** Light radius for attenuation (point and spot lights) */
  public radius: number = 10.0;

  /** Spotlight direction (local space, normalized) */
  public direction: Vec3 = [0, -1, 0];

  /** Spotlight cone angle in radians (full angle, not half) */
  public coneAngle: number = Math.PI / 4; // 45 degrees

  /** Version tracking for change detection (like TransformComponent) */
  public version = 0;

  /** Cached transform component reference */
  private _transform?: TransformComponent;

  constructor(actor: Actor) {
    super(actor);
  }

  /**
   * Get the transform component (cached for performance)
   */
  get transform(): TransformComponent | undefined {
    if (!this._transform) {
      this._transform = this.actor.getComponent(TransformComponent);
    }
    return this._transform;
  }

  /**
   * Set light color and mark as dirty
   */
  setColor(r: number, g: number, b: number): this {
    this.color[0] = r;
    this.color[1] = g;
    this.color[2] = b;
    this.version++;
    return this;
  }

  /**
   * Set light intensity and mark as dirty
   */
  setIntensity(intensity: number): this {
    this.intensity = intensity;
    this.version++;
    return this;
  }

  /**
   * Set light radius and mark as dirty
   */
  setRadius(radius: number): this {
    this.radius = radius;
    this.version++;
    return this;
  }

  /**
   * Set spotlight direction and mark as dirty
   */
  setDirection(x: number, y: number, z: number): this {
    this.direction[0] = x;
    this.direction[1] = y;
    this.direction[2] = z;
    // Normalize direction
    const len = Math.sqrt(x * x + y * y + z * z);
    if (len > 0) {
      this.direction[0] /= len;
      this.direction[1] /= len;
      this.direction[2] /= len;
    }
    this.version++;
    return this;
  }

  /**
   * Set spotlight cone angle and mark as dirty
   */
  setConeAngle(angleRadians: number): this {
    this.coneAngle = angleRadians;
    this.version++;
    return this;
  }

  /**
   * Set light type and mark as dirty
   */
  setType(type: LightType): this {
    this.type = type;
    this.version++;
    return this;
  }

  /**
   * Get world position from transform
   */
  getWorldPosition(): Vec3 {
    return this.transform?.position || [0, 0, 0];
  }

  /**
   * Get world direction (for spotlights) by transforming local direction
   * For now, just returns the direction (can be enhanced with rotation support)
   */
  getWorldDirection(): Vec3 {
    // TODO: Transform direction by rotation quaternion if needed
    return this.direction;
  }

  /**
   * Check if light is enabled and has a valid transform
   */
  isValid(): boolean {
    return this.transform !== undefined && this.intensity > 0 && this.radius > 0;
  }
}
