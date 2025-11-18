import { Event } from "@vertex-link/space";
import type { Vec3 } from "../rendering/components/TransformComponent";

/**
 * Emitted when a gizmo handle drag starts
 */
export class GizmoDragStartedEvent extends Event<{
  handleId: string;
  axis: "X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ";
  startWorld: Vec3;
}> {
  static readonly eventType = "gizmo.drag.started";
}

/**
 * Emitted during gizmo handle dragging
 */
export class GizmoDraggedEvent extends Event<{
  handleId: string;
  axis: "X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ";
  delta: [number, number]; // Screen space delta
  worldDelta: Vec3; // World space delta
}> {
  static readonly eventType = "gizmo.dragged";
}

/**
 * Emitted when a gizmo handle drag ends
 */
export class GizmoDragEndedEvent extends Event<{
  handleId: string;
  axis: "X" | "Y" | "Z" | "XY" | "XZ" | "YZ" | "XYZ";
}> {
  static readonly eventType = "gizmo.drag.ended";
}

/**
 * Emitted when an object is selected
 */
export class ObjectSelectedEvent extends Event<{
  actorId: string;
  screenPosition: [number, number];
}> {
  static readonly eventType = "object.selected";
}

/**
 * Emitted when selection is cleared
 */
export class SelectionClearedEvent extends Event<Record<string, never>> {
  static readonly eventType = "selection.cleared";
}

/**
 * Emitted when gizmo mode changes
 */
export class GizmoModeChangedEvent extends Event<{
  mode: "translate" | "rotate" | "scale";
  space: "local" | "world";
}> {
  static readonly eventType = "gizmo.mode.changed";
}
