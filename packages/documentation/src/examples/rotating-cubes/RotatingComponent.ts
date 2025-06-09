import { Component, Update } from "@vertex-link/acs";
import { Transform, TransformComponent, Vec3 } from "@vertex-link/engine";


export class RotatingComponent extends Component {

  private transform!: TransformComponent;
  public speed: number = 0.5; // Radians per second

  getTransform(): TransformComponent {
    if (!this.transform) {
      this.transform = this.actor.getComponent(TransformComponent)!;
    }
    return this.transform;
  }
  
  @Update('webgpu') // Use 'webgpu' processor name, not 'render'
  update(deltaTime: number): void {
    if (!this.getTransform()) {
      console.log("transform not found returning");
      return
    };

    const deltaAngle = this.speed * deltaTime;

    // Define the axis of rotation (e.g., world Y-axis)
    const rotationAxis: Vec3 = [0, 1, 0]; // Or [1,0,0] for X, [0,0,1] for Z

    // Create a quaternion for the incremental rotation
    const deltaRotation = Transform.fromAxisAngle(rotationAxis, deltaAngle);

    // Apply the rotation: newRotation = deltaRotation * currentRotation
    this.transform.rotation = Transform.multiplyQuat(deltaRotation, this.transform.rotation);

    // It's good practice to re-normalize the quaternion after repeated multiplications
    // to prevent floating-point drift.
    this.transform.rotation = Transform.normalizeQuat(this.transform.rotation);

    this.transform.markDirty(); // Important: signal that the world matrix needs recalculation
  }
}
