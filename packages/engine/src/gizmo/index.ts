// Components
export { GizmoComponent } from "./GizmoComponent";
export type { GizmoMode, GizmoSpace } from "./GizmoComponent";
export { HandleInteractionComponent } from "./HandleInteractionComponent";
export { SelectableComponent, SelectionManagerComponent } from "./SelectionComponent";

// Events
export {
  GizmoDragStartedEvent,
  GizmoDraggedEvent,
  GizmoDragEndedEvent,
  ObjectSelectedEvent,
  SelectionClearedEvent,
  GizmoModeChangedEvent,
} from "./GizmoEvents";

// Utilities
export { screenToRay, raySphereIntersection, rayCylinderIntersection } from "./RaycastUtils";
export type { Ray, RayHit } from "./RaycastUtils";
export {
  createArrowGeometry,
  createLineGeometry,
  createCubeGeometry,
  createSphereGeometry,
} from "./GizmoGeometry";

// Factory
export { createGizmo } from "./createGizmo";
