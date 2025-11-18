import { Actor, Component, emit, useOnEvent, useUpdate } from "@vertex-link/space";
import { TransformComponent, type Vec3 } from "../rendering/components/TransformComponent";
import { WebGPUProcessor } from "../processors/WebGPUProcessor";
import { GizmoDraggedEvent, GizmoDragEndedEvent, GizmoDragStartedEvent } from "./GizmoEvents";

/**
 * Gizmo modes
 */
export type GizmoMode = "translate" | "rotate" | "scale";
export type GizmoSpace = "local" | "world";

/**
 * GizmoComponent manages the state and behavior of a 3D gizmo
 * Used for manipulating transforms of target actors
 */
export class GizmoComponent extends Component {
  // Configuration
  public mode: GizmoMode = "translate";
  public space: GizmoSpace = "world";
  public snapEnabled = false;
  public snapValue = 0.5;

  // State
  public isDragging = false;
  public targetActor: Actor | null = null;
  public dragStartWorld: Vec3 = [0, 0, 0];
  public activeAxis: "X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ" | null = null;

  // Cached components
  private transform: TransformComponent | null = null;

  constructor(actor: Actor) {
    super(actor);

    // Cache transform component
    this.transform = this.actor.getComponent(TransformComponent);
    if (!this.transform) {
      throw new Error("GizmoComponent requires TransformComponent");
    }

    // Listen for drag events
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for gizmo interactions
   */
  private setupEventListeners(): void {
    // Listen for drag start
    useOnEvent(
      GizmoDragStartedEvent,
      (event) => {
        this.isDragging = true;
        this.dragStartWorld = event.payload.startWorld;
        this.activeAxis = event.payload.axis;
      },
      this,
    );

    // Listen for drag events and apply transform to target
    useOnEvent(
      GizmoDraggedEvent,
      (event) => {
        if (!this.isDragging || !this.targetActor) return;

        const targetTransform = this.targetActor.getComponent(TransformComponent);
        if (!targetTransform) return;

        // Apply transform based on mode
        this.applyTransform(targetTransform, event.payload.worldDelta, event.payload.axis);

        // Update gizmo position to follow target
        if (this.transform) {
          this.transform.position = [...targetTransform.position];
          this.transform.markDirty();
        }
      },
      this,
    );

    // Listen for drag end
    useOnEvent(
      GizmoDragEndedEvent,
      (event) => {
        this.isDragging = false;
        this.activeAxis = null;
      },
      this,
    );
  }

  /**
   * Apply transform delta to target based on current mode
   */
  private applyTransform(
    targetTransform: TransformComponent,
    worldDelta: Vec3,
    axis: "X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ",
  ): void {
    switch (this.mode) {
      case "translate":
        this.applyTranslation(targetTransform, worldDelta, axis);
        break;
      case "rotate":
        // TODO: Implement rotation
        break;
      case "scale":
        // TODO: Implement scaling
        break;
    }
  }

  /**
   * Apply translation to target
   */
  private applyTranslation(
    targetTransform: TransformComponent,
    worldDelta: Vec3,
    axis: "X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ",
  ): void {
    // Create axis mask based on which axis is being dragged
    let axisMask: Vec3 = [1, 1, 1];
    switch (axis) {
      case "X":
        axisMask = [1, 0, 0];
        break;
      case "Y":
        axisMask = [0, 1, 0];
        break;
      case "Z":
        axisMask = [0, 0, 1];
        break;
      case "XY":
        axisMask = [1, 1, 0];
        break;
      case "XZ":
        axisMask = [1, 0, 1];
        break;
      case "YZ":
        axisMask = [0, 1, 1];
        break;
      case "XYZ":
        axisMask = [1, 1, 1];
        break;
    }

    // Apply masked delta
    let newPosition: Vec3 = [
      targetTransform.position[0] + worldDelta[0] * axisMask[0],
      targetTransform.position[1] + worldDelta[1] * axisMask[1],
      targetTransform.position[2] + worldDelta[2] * axisMask[2],
    ];

    // Apply snapping if enabled
    if (this.snapEnabled) {
      newPosition = [
        Math.round(newPosition[0] / this.snapValue) * this.snapValue,
        Math.round(newPosition[1] / this.snapValue) * this.snapValue,
        Math.round(newPosition[2] / this.snapValue) * this.snapValue,
      ];
    }

    targetTransform.position = newPosition;
    targetTransform.markDirty();
  }

  /**
   * Set the target actor to manipulate
   */
  setTarget(actor: Actor | null): void {
    this.targetActor = actor;

    if (actor && this.transform) {
      // Position gizmo at target
      const targetTransform = actor.getComponent(TransformComponent);
      if (targetTransform) {
        this.transform.position = [...targetTransform.position];
        this.transform.markDirty();
      }
    }
  }

  /**
   * Get the target actor
   */
  getTarget(): Actor | null {
    return this.targetActor;
  }

  /**
   * Set gizmo mode
   */
  setMode(mode: GizmoMode): void {
    this.mode = mode;
    // TODO: Update visual representation based on mode
  }

  /**
   * Set coordinate space
   */
  setSpace(space: GizmoSpace): void {
    this.space = space;
    // TODO: Update handle orientation based on space
  }

  /**
   * Get transform component
   */
  getTransform(): TransformComponent | null {
    return this.transform;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.targetActor = null;
    this.transform = null;
    super.dispose();
  }
}
