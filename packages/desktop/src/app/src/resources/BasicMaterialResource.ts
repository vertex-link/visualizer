import { MaterialResource } from "@vertex-link/engine";
import { StandardShaderResource } from "./StandardShaderResource";

export class BasicMaterialResource extends MaterialResource {
  constructor(color: number[] = [1, 0, 0, 1]) {
    const shader = new StandardShaderResource();

    // Identity matrices for initialization
    const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

    const materialData = {
      shader,
      uniforms: {
        viewProjection: { type: "mat4" as const, size: 64, value: new Float32Array(identity) },
        model: { type: "mat4" as const, size: 64, value: new Float32Array(identity) },
        color: { type: "vec4" as const, size: 16, value: new Float32Array(color) },
      },
      vertexLayout: {
        stride: 32, // position(12) + normal(12) + uv(8)
        attributes: [
          { location: 0, format: "float32x3", offset: 0 }, // position
          { location: 1, format: "float32x3", offset: 12 }, // normal
          { location: 2, format: "float32x2", offset: 24 }, // uv
        ],
      },
      renderState: {
        cullMode: "back" as const,
        depthWrite: true,
        depthTest: true,
        blendMode: "none" as const,
      },
    };

    super("BasicMaterial", materialData);
  }
}
