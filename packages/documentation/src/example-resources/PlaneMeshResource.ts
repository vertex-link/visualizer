import { GeometryUtils, MeshResource } from "@vertex-link/engine";

export class PlaneMeshResource extends MeshResource {
  constructor(width = 1.0, height = 1.0) {
    const planeDescriptor = GeometryUtils.createPlane(width, height);
    super("PlaneMesh", planeDescriptor);
  }
}
