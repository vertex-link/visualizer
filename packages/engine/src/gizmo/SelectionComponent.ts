import { Actor, Component, Scene, emit } from "@vertex-link/space";
import { CameraComponent } from "../rendering/camera/CameraComponent";
import { TransformComponent } from "../rendering/components/TransformComponent";
import { ObjectSelectedEvent, SelectionClearedEvent } from "./GizmoEvents";
import { screenToRay, raySphereIntersection } from "./RaycastUtils";

/**
 * SelectableComponent marks an actor as selectable
 * This is a tag component with no additional functionality
 */
export class SelectableComponent extends Component {
  constructor(actor: Actor) {
    super(actor);
  }
}

/**
 * SelectionManagerComponent manages object selection via raycasting
 * Should be attached to a scene-level actor
 */
export class SelectionManagerComponent extends Component {
  private selectedActor: Actor | null = null;

  constructor(
    actor: Actor,
    private scene: Scene,
    private canvas: HTMLCanvasElement,
    private camera: CameraComponent,
  ) {
    super(actor);

    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);

    // Attach event listeners
    this.canvas.addEventListener("mousedown", this.onMouseDown);
  }

  /**
   * Handle mouse down for object selection
   */
  private onMouseDown(event: MouseEvent): void {
    const hit = this.raycastToSelectables(event.clientX, event.clientY);

    if (hit) {
      this.selectedActor = hit.actor;
      emit(
        new ObjectSelectedEvent({
          actor: hit.actor,
          screenPosition: [event.clientX, event.clientY],
        }),
      );
    } else {
      // Clear selection
      this.selectedActor = null;
      emit(new SelectionClearedEvent({}));
    }
  }

  /**
   * Raycast against all selectable objects
   * Returns the closest hit or null
   */
  private raycastToSelectables(
    screenX: number,
    screenY: number,
  ): { actor: Actor; distance: number } | null {
    // Query all selectable actors
    const selectables = this.scene.query().withComponent(SelectableComponent).execute();

    if (selectables.length === 0) {
      return null;
    }

    // Create ray from screen coordinates
    const ray = screenToRay(screenX, screenY, this.canvas, this.camera);

    // Test against all selectable objects
    let closestHit: { actor: Actor; distance: number } | null = null;

    for (const actor of selectables) {
      const transform = actor.getComponent(TransformComponent);
      if (!transform) continue;

      // Use sphere approximation for objects (radius based on scale)
      const objectRadius = 0.7; // Approximate radius for 1-unit cube
      const hit = raySphereIntersection(ray, transform.position, objectRadius);

      if (hit && (!closestHit || hit.distance < closestHit.distance)) {
        closestHit = {
          actor,
          distance: hit.distance,
        };
      }
    }

    return closestHit;
  }

  /**
   * Get currently selected actor
   */
  getSelectedActor(): Actor | null {
    return this.selectedActor;
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedActor = null;
    emit(new SelectionClearedEvent({}));
  }

  /**
   * Cleanup event listeners
   */
  public dispose(): void {
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    this.selectedActor = null;
    super.dispose();
  }
}
