import { MeshResource, GeometryUtils } from "@vertex-link/engine";

export class PlaneMeshResource extends MeshResource {
  constructor(width: number = 1.0, height: number = 1.0) {
    const planeDescriptor = GeometryUtils.createPlane(width, height);
    super("PlaneMesh", planeDescriptor);
  }
}
