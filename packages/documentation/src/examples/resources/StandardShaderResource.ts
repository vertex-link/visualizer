// Fix for StandardShaderResource.ts

import { ShaderResource } from "@vertex-link/engine";
import basicShaderSource from "../../../../engine/src/webgpu/shaders/basic.wgsl?raw";

export class StandardShaderResource extends ShaderResource {
  constructor() {
    const shaderData = {
      vertexSource: basicShaderSource,
      fragmentSource: basicShaderSource,
      entryPoints: {
        vertex: "vs_main",
        fragment: "fs_main",
      },
    };

    super("StandardShader", shaderData);
  }
}
