import { MaterialResource } from "@vertex-link/engine";
import { StandardShaderResource } from "./StandardShaderResource";

export class WireframeMaterialResource extends MaterialResource {
  constructor(color: number[] = [1, 1, 1, 1]) {
    const shader = new StandardShaderResource();

    const identity = new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);

    const materialData = {
      shader,
      uniforms: {
        viewProjection: { type: 'mat4' as const, size: 64, value: new Float32Array(identity) },
        model: { type: 'mat4' as const, size: 64, value: new Float32Array(identity) },
        color: { type: 'vec4' as const, size: 16, value: new Float32Array(color) }
      },
      vertexLayout: {
        stride: 32,
        attributes: [
          { location: 0, format: 'float32x3', offset: 0 },
          { location: 1, format: 'float32x3', offset: 12 },
          { location: 2, format: 'float32x2', offset: 24 }
        ]
      },
      renderState: {
        cullMode: 'none' as const,
        depthWrite: true,
        depthTest: true,
        blendMode: 'none' as const,
        wireframe: true  // Enable wireframe mode
      }
    };

    super("WireframeMaterial", materialData);
  }
}
