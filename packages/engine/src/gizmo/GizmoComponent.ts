import { Actor, Component, useOnEvent } from "@vertex-link/space";
import { TransformComponent, type Vec3 } from "../rendering/components/TransformComponent";
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

  // Handle actors for this gizmo instance
  private handleActors: Set<string> = new Set();
  private handles: Actor[] = [];
  private handleLocalOffsets: Map<string, Vec3> = new Map();

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
   * Register a handle actor as belonging to this gizmo
   */
  public registerHandle(handleActor: Actor, localOffset: Vec3 = [0, 0, 0]): void {
    this.handleActors.add(handleActor.id);
    this.handles.push(handleActor);
    this.handleLocalOffsets.set(handleActor.id, localOffset);
  }

  /**
   * Update handle positions to follow gizmo
   */
  private updateHandlePositions(): void {
    if (!this.transform) return;

    const gizmoPos = this.transform.position;

    for (const handle of this.handles) {
      const handleTransform = handle.getComponent(TransformComponent);
      const localOffset = this.handleLocalOffsets.get(handle.id);
      if (handleTransform && localOffset) {
        handleTransform.position = [
          gizmoPos[0] + localOffset[0],
          gizmoPos[1] + localOffset[1],
          gizmoPos[2] + localOffset[2],
        ];
        handleTransform.markDirty();
      }
    }
  }

  /**
   * Check if a handle belongs to this gizmo
   */
  private isOwnHandle(handleId: string): boolean {
    return this.handleActors.has(handleId);
  }

  /**
   * Setup event listeners for gizmo interactions
   */
  private setupEventListeners(): void {
    // Listen for drag start
    useOnEvent(
      GizmoDragStartedEvent,
      (event) => {
        // Only respond to events from our own handles
        if (!this.isOwnHandle(event.payload.handleId)) return;

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
        // Only respond to events from our own handles
        if (!this.isOwnHandle(event.payload.handleId)) return;
        if (!this.isDragging || !this.targetActor) return;

        const targetTransform = this.targetActor.getComponent(TransformComponent);
        if (!targetTransform) return;

        // Apply transform based on mode
        this.applyTransform(targetTransform, event.payload.worldDelta, event.payload.axis);

        // Update gizmo position to follow target
        if (this.transform) {
          this.transform.position = [...targetTransform.position];
          this.transform.markDirty();
          this.updateHandlePositions();
        }
      },
      this,
    );

    // Listen for drag end
    useOnEvent(
      GizmoDragEndedEvent,
      (event) => {
        // Only respond to events from our own handles
        if (!this.isOwnHandle(event.payload.handleId)) return;

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
        this.updateHandlePositions();
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
