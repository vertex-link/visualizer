import { Actor, Component, Scene, emit } from "@vertex-link/space";
import { CameraComponent } from "../rendering/camera/CameraComponent";
import { TransformComponent } from "../rendering/components/TransformComponent";
import { ObjectSelectedEvent, SelectionClearedEvent } from "./GizmoEvents";

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
          actorId: hit.actor.id,
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

    // TODO: Implement proper raycasting
    // For now, return a placeholder
    // This should:
    // 1. Convert screen coordinates to world space ray
    // 2. Test intersection with each selectable actor's geometry
    // 3. Return the closest hit

    // Placeholder: select first actor if click is in center of screen
    const canvasRect = this.canvas.getBoundingClientRect();
    const centerX = canvasRect.width / 2;
    const centerY = canvasRect.height / 2;
    const threshold = 100; // pixels

    const distanceFromCenter = Math.sqrt(
      Math.pow(screenX - centerX, 2) + Math.pow(screenY - centerY, 2),
    );

    if (distanceFromCenter < threshold && selectables.length > 0) {
      return {
        actor: selectables[0],
        distance: distanceFromCenter,
      };
    }

    return null;
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
