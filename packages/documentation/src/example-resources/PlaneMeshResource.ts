import { GeometryUtils, MeshResource } from "@vertex-link/engine";
import type { Context } from "@vertex-link/space/composables/context";

export class PlaneMeshResource extends MeshResource {
  constructor(width = 1.0, height = 1.0, context?: Context) {
    const planeDescriptor = GeometryUtils.createPlane(width, height);
    super("PlaneMesh", planeDescriptor, context);
  }
}
