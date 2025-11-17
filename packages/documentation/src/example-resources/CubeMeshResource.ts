import { GeometryUtils, MeshResource } from "@vertex-link/engine";
import type { Context } from "@vertex-link/orbits/composables/context";

export class CubeMeshResource extends MeshResource {
  constructor(size = 1.0, context?: Context) {
    const cubeDescriptor = GeometryUtils.createBox(size, size, size);
    super("CubeMesh", cubeDescriptor, context);
  }
}
