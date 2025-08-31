import { Actor, Component } from "@vertex-link/acs";
import { TransformComponent } from "@vertex-link/engine";

export class RotatingComponent extends Component {
  public speed: number = 1.0;

  private transform?: TransformComponent;

  constructor(actor: Actor, config: { speed?: number } = {}) {
    super(actor);
    this.speed = config.speed || 1.0;
  }

  // Phase 0: no decorators; call tick() from a registered processor task.
  tick(deltaTime: number): void {
    if (!this.transform) {
      this.transform = this.actor.getComponent(TransformComponent);
    }

    if (this.transform) {
      const currentRotation = this.transform.getEulerAngles();
      this.transform.setRotationEuler(
        currentRotation[0],
        currentRotation[1] + this.speed * deltaTime,
        currentRotation[2]
      );
    }
  }
}
