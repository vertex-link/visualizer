// Fix for StandardShaderResource.ts

import { ShaderResource } from "@vertex-link/engine";
const basicShaderSource = `
struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    // Instance attributes
    @location(4) model_matrix_0: vec4f,
    @location(5) model_matrix_1: vec4f,
    @location(6) model_matrix_2: vec4f,
    @location(7) model_matrix_3: vec4f,
    @location(8) instance_color: vec4f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) world_pos: vec3f, // Consistent naming with previous examples
    @location(1) normal: vec3f,    // This will be world-space normal
    @location(2) uv: vec2f,
    @location(3) color: vec4f,     // Instance color passed to fragment shader
}

struct GlobalUniforms {
    viewProjection: mat4x4f, // Camera's VP matrix
}

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    // Reconstruct model matrix from instance attributes
    let model_matrix = mat4x4f(
        input.model_matrix_0,
        input.model_matrix_1,
        input.model_matrix_2,
        input.model_matrix_3
    );

    // Transform position to clip space: VP * Model * Position
    output.position = globals.viewProjection * model_matrix * vec4f(input.position, 1.0);

    // Calculate world position (optional, for fragment shader effects)
    let worldPos4 = model_matrix * vec4f(input.position, 1.0);
    output.world_pos = worldPos4.xyz;

    // Transform normal to world space for correct lighting
    output.normal = normalize((model_matrix * vec4f(input.normal, 0.0)).xyz);
    output.uv = input.uv;
    output.color = input.instance_color;

    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    // Simple diffuse lighting using the world-space normal
    let light_dir = normalize(vec3f(1.0, 1.0, 1.0)); // Example light direction
    let ambient = 0.3;
    // input.normal is world-space normal from vertex shader, already normalized by vs_main
    let diffuse_intensity = max(dot(input.normal, light_dir), 0.0);

    let lighting = ambient + diffuse_intensity * 0.7; // Combine ambient and diffuse

    // Combine with instance color and lighting
    return vec4f(input.color.rgb * lighting, input.color.a);
}

`
export class StandardShaderResource extends ShaderResource {
  constructor() {
    const shaderData = {
      vertexSource: basicShaderSource,
      fragmentSource: basicShaderSource,
      entryPoints: {
        vertex: 'vs_main',
        fragment: 'fs_main'
      }
    };

    super("StandardShader", shaderData);
  }
}
