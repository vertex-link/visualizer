import { TransformComponent, type Vec3, WebGPUProcessor } from "@vertex-link/engine";
import { type Actor, Component, useUpdate } from "@vertex-link/space";

/**
 * Component that makes the camera always look at a specific target point in 3D space.
 * The camera's rotation is continuously updated to face the target.
 */
export class CameraLookAtComponent extends Component {
  private transform!: TransformComponent;
  private targetPoint: Vec3 = [0, 0, 0];
  private upVector: Vec3 = [0, 1, 0];

  constructor(actor: Actor, targetPoint: Vec3 = [0, 0, 0], upVector: Vec3 = [0, 1, 0]) {
    super(actor);
    this.targetPoint = targetPoint;
    this.upVector = upVector;

    // Register update callback
    useUpdate(WebGPUProcessor, this.tick, this, `${actor.id}:lookat`);
  }

  private getTransform(): TransformComponent {
    if (!this.transform) {
      this.transform = this.actor.getComponent(TransformComponent)!;
    }
    return this.transform;
  }

  /**
   * Set the target point that the camera should look at
   */
  public setTarget(point: Vec3): void {
    this.targetPoint = point;
  }

  /**
   * Set the up vector for the camera orientation
   */
  public setUpVector(up: Vec3): void {
    this.upVector = up;
  }

  /**
   * Update camera rotation every frame to look at the target
   */
  private tick(deltaTime: number): void {
    const transform = this.getTransform();
    if (!transform) return;

    // console.log(transform.position);

    // Use the built-in lookAt method from TransformComponent
    transform.lookAt(this.targetPoint, this.upVector);
  }
}
