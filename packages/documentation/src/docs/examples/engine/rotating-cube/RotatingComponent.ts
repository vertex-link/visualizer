import { Transform, TransformComponent, type Vec3, WebGPUProcessor } from "@vertex-link/engine";
import { type Actor, Component, useUpdate } from "@vertex-link/space";

export class RotatingComponent extends Component {
  private transform!: TransformComponent;
  public speed = 0.5; // Radians per second

  getTransform(): TransformComponent {
    if (!this.transform) {
      this.transform = this.actor.getComponent(TransformComponent)!;
    }
    return this.transform;
  }

  constructor(actor: Actor) {
    super(actor);

    useUpdate(WebGPUProcessor, this.tick, this, `${actor.id}:rotation`);
  }

  tick(deltaTime: number): void {
    if (!this.getTransform()) {
      console.log("transform not found returning");
      return;
    }

    const deltaAngle = this.speed * deltaTime;

    // Define the axis of rotation (e.g., world Y-axis)
    const rotationAxis: Vec3 = [0, 1, 0];

    // Create a quaternion for the incremental rotation
    const deltaRotation = Transform.fromAxisAngle(rotationAxis, deltaAngle);

    // Apply the rotation: newRotation = deltaRotation * currentRotation
    this.transform.rotation = Transform.multiplyQuat(deltaRotation, this.transform.rotation);

    // Re-normalize
    this.transform.rotation = Transform.normalizeQuat(this.transform.rotation);

    this.transform.markDirty();
  }
}
