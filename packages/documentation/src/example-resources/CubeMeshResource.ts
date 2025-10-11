import { Context } from "@vertex-link/space/composables/context";
import { GeometryUtils, MeshResource } from "@vertex-link/engine";

export class CubeMeshResource extends MeshResource {
  constructor(size = 1.0, context: Context) {
    const cubeDescriptor = GeometryUtils.createBox(size, size, size);
    super("CubeMesh", cubeDescriptor, context);
  }
}
