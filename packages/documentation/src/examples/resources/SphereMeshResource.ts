import { MeshResource, GeometryUtils } from "@vertex-link/engine";

export class SphereMeshResource extends MeshResource {
  constructor(radius: number = 0.5, segments: number = 16) {
    const sphereDescriptor = GeometryUtils.createSphere(radius, segments);
    super("SphereMesh", sphereDescriptor);
  }
}
