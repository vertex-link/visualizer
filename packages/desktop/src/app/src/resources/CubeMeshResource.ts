import { MeshResource, GeometryUtils } from "@vertex-link/engine";

export class CubeMeshResource extends MeshResource {
    constructor(size: number = 1.0) {
        const cubeDescriptor = GeometryUtils.createBox(size, size, size);
        super("CubeMesh", cubeDescriptor);
    }
}
