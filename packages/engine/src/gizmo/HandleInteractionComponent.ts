import { Actor, Component, emit } from "@vertex-link/space";
import { TransformComponent, type Vec3 } from "../rendering/components/TransformComponent";
import { CameraComponent } from "../rendering/camera/CameraComponent";
import { GizmoDragStartedEvent, GizmoDraggedEvent, GizmoDragEndedEvent } from "./GizmoEvents";
import { screenToRay, raySphereIntersection } from "./RaycastUtils";

/**
 * HandleInteractionComponent handles user input on gizmo handles
 * Emits events for drag start, drag, and drag end
 */
export class HandleInteractionComponent extends Component {
  private isDragging = false;
  private dragStartMouse: [number, number] = [0, 0];
  private lastMousePosition: [number, number] = [0, 0];
  private dragStartWorld: Vec3 = [0, 0, 0];

  constructor(
    actor: Actor,
    private canvas: HTMLCanvasElement,
    private camera: CameraComponent,
    public axis: "X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ" = "X",
  ) {
    super(actor);

    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    // Attach event listeners
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mouseup", this.onMouseUp);
    this.canvas.addEventListener("mouseleave", this.onMouseUp);
  }

  /**
   * Handle mouse down event
   */
  private onMouseDown(event: MouseEvent): void {
    // TODO: Implement raycasting to check if this handle was clicked
    // For now, we'll use a simple check based on screen position
    const hit = this.raycastToHandle(event.clientX, event.clientY);
    if (hit) {
      this.isDragging = true;
      this.dragStartMouse = [event.clientX, event.clientY];
      this.lastMousePosition = [event.clientX, event.clientY];
      this.dragStartWorld = hit.point;

      emit(
        new GizmoDragStartedEvent({
          handleId: this.actor.id,
          axis: this.axis,
          startWorld: this.dragStartWorld,
        }),
      );

      event.stopPropagation();
    }
  }

  /**
   * Handle mouse move event
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const currentMouse: [number, number] = [event.clientX, event.clientY];
    const deltaX = currentMouse[0] - this.lastMousePosition[0];
    const deltaY = currentMouse[1] - this.lastMousePosition[1];

    // Convert screen delta to world delta
    const worldDelta = this.screenDeltaToWorld(deltaX, deltaY);

    emit(
      new GizmoDraggedEvent({
        handleId: this.actor.id,
        axis: this.axis,
        delta: [deltaX, deltaY],
        worldDelta,
      }),
    );

    this.lastMousePosition = currentMouse;
    event.stopPropagation();
  }

  /**
   * Handle mouse up event
   */
  private onMouseUp(event: MouseEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      emit(
        new GizmoDragEndedEvent({
          handleId: this.actor.id,
          axis: this.axis,
        }),
      );
      event.stopPropagation();
    }
  }

  /**
   * Raycast to check if handle was clicked
   * Returns hit information or null
   */
  private raycastToHandle(screenX: number, screenY: number): { point: Vec3 } | null {
    // Get handle's world position
    const transform = this.actor.getComponent(TransformComponent);
    if (!transform) return null;

    const handlePosition = transform.position;

    // Create ray from screen coordinates
    const ray = screenToRay(screenX, screenY, this.canvas, this.camera);

    // Test against sphere around handle (approximation)
    const handleRadius = 0.3; // Adjust based on handle size
    const hit = raySphereIntersection(ray, handlePosition, handleRadius);

    return hit;
  }

  /**
   * Convert screen space delta to world space delta
   * Takes into account camera orientation and axis constraints
   */
  private screenDeltaToWorld(deltaX: number, deltaY: number): Vec3 {
    // Get handle transform for distance calculation
    const handleTransform = this.actor.getComponent(TransformComponent);
    if (!handleTransform) return [0, 0, 0];

    const handlePos = handleTransform.position;
    const cameraPos = this.camera.actor.getComponent(TransformComponent)?.position || [0, 0, 0];

    // Calculate distance from camera to handle
    const dx = handlePos[0] - cameraPos[0];
    const dy = handlePos[1] - cameraPos[1];
    const dz = handlePos[2] - cameraPos[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Scale factor based on distance (makes dragging consistent regardless of zoom)
    const sensitivity = distance * 0.002;

    let worldDelta: Vec3 = [0, 0, 0];

    switch (this.axis) {
      case "X":
        worldDelta = [deltaX * sensitivity, 0, 0];
        break;
      case "Y":
        worldDelta = [0, -deltaY * sensitivity, 0]; // Invert Y for standard screen coords
        break;
      case "Z":
        worldDelta = [0, 0, deltaY * sensitivity];
        break;
      case "XY":
        worldDelta = [deltaX * sensitivity, -deltaY * sensitivity, 0];
        break;
      case "XZ":
        worldDelta = [deltaX * sensitivity, 0, deltaY * sensitivity];
        break;
      case "YZ":
        worldDelta = [0, -deltaY * sensitivity, deltaX * sensitivity];
        break;
      case "XYZ":
        worldDelta = [deltaX * sensitivity, -deltaY * sensitivity, 0];
        break;
    }

    return worldDelta;
  }

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mouseup", this.onMouseUp);
    this.canvas.removeEventListener("mouseleave", this.onMouseUp);
    super.dispose();
  }
}
