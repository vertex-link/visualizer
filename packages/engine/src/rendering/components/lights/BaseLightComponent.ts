import { type Actor, Component } from "@vertex-link/space";
import type { Vec3 } from "../TransformComponent";

/**
 * Base component for all light types.
 * Provides common properties: color, intensity, shadow casting.
 */
export abstract class BaseLightComponent extends Component {
  /** Light color in linear RGB [0-1] */
  public color: Vec3 = [1, 1, 1];

  /** Light intensity multiplier */
  public intensity = 1.0;

  /** Whether this light is currently active */
  public enabled = true;

  /** Whether this light casts shadows */
  public castsShadows = false;

  // Version tracking for change detection
  public version = 0;

  constructor(
    actor: Actor,
    config?: Partial<{
      color: Vec3;
      intensity: number;
      enabled: boolean;
      castsShadows: boolean;
    }>,
  ) {
    super(actor);

    if (config?.color) this.color = [...config.color] as Vec3;
    if (config?.intensity !== undefined) this.intensity = config.intensity;
    if (config?.enabled !== undefined) this.enabled = config.enabled;
    if (config?.castsShadows !== undefined) this.castsShadows = config.castsShadows;
  }

  /**
   * Mark light as changed (triggers re-upload to GPU)
   */
  markDirty(): void {
    this.version++;
  }

  /**
   * Set light color and mark dirty
   */
  setColor(r: number, g: number, b: number): void {
    this.color[0] = r;
    this.color[1] = g;
    this.color[2] = b;
    this.markDirty();
  }

  /**
   * Set light intensity and mark dirty
   */
  setIntensity(value: number): void {
    this.intensity = value;
    this.markDirty();
  }
}
