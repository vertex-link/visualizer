/**
 * Shadow mapping shader - depth-only rendering from light perspective.
 * Used by ShadowPass to generate shadow maps.
 */

struct Uniforms {
  lightViewProj: mat4x4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec3<f32>,
}

struct InstanceInput {
  @location(1) modelRow0: vec4<f32>,
  @location(2) modelRow1: vec4<f32>,
  @location(3) modelRow2: vec4<f32>,
  @location(4) modelRow3: vec4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
}

@vertex
fn vs_main(
  vertex: VertexInput,
  instance: InstanceInput,
) -> VertexOutput {
  let modelMatrix = mat4x4<f32>(
    instance.modelRow0,
    instance.modelRow1,
    instance.modelRow2,
    instance.modelRow3
  );

  var output: VertexOutput;
  let worldPos = modelMatrix * vec4<f32>(vertex.position, 1.0);
  output.position = uniforms.lightViewProj * worldPos;
  return output;
}

@fragment
fn fs_main() -> @builtin(frag_depth) f32 {
  // Depth is automatically written to the depth attachment
  // This return value is ignored
  return 0.0;
}
