/**
 * Forward rendering shader with dynamic lighting support.
 * Supports point lights and directional lights.
 */

// Vertex input (same as basic.wgsl)
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
  @location(0) world_pos: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
  @location(3) color: vec4f,
}

// Global uniforms (group 0)
struct GlobalUniforms {
  viewProjection: mat4x4f,
}
@group(0) @binding(0) var<uniform> globals: GlobalUniforms;

// Light structures (matching LightProcessor.ts)
struct PointLight {
  position: vec3f,
  radius: f32,
  color: vec3f,
  intensity: f32,
}

struct DirectionalLight {
  direction: vec3f,
  _padding0: f32,
  color: vec3f,
  intensity: f32,
}

struct LightCounts {
  point_light_count: u32,
  directional_light_count: u32,
  _reserved0: u32,
  _reserved1: u32,
}

// Light data (group 1)
@group(1) @binding(0) var<storage, read> pointLights: array<PointLight>;
@group(1) @binding(1) var<storage, read> directionalLights: array<DirectionalLight>;
@group(1) @binding(2) var<uniform> lightCounts: LightCounts;

// Vertex shader (unchanged from basic.wgsl)
@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  // Reconstruct model matrix
  let model_matrix = mat4x4f(
    input.model_matrix_0,
    input.model_matrix_1,
    input.model_matrix_2,
    input.model_matrix_3
  );

  // Transform to clip space
  output.position = globals.viewProjection * model_matrix * vec4f(input.position, 1.0);

  // World position
  let worldPos4 = model_matrix * vec4f(input.position, 1.0);
  output.world_pos = worldPos4.xyz;

  // World-space normal
  output.normal = normalize((model_matrix * vec4f(input.normal, 0.0)).xyz);
  output.uv = input.uv;
  output.color = input.instance_color;

  return output;
}

// Calculate point light attenuation
fn calculateAttenuation(distance: f32, radius: f32) -> f32 {
  let d = distance / radius;
  let d2 = d * d;
  let d4 = d2 * d2;
  return clamp(1.0 - d4, 0.0, 1.0) / (d2 + 1.0);
}

// Fragment shader with dynamic lighting
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
  // DEBUG: Return solid color to verify shader execution
  return vec4f(1.0, 0.0, 0.0, 1.0); // Bright red

  let normal = normalize(input.normal);
  var totalLighting = vec3f(0.0);

  // Ambient light (base illumination)
  let ambient = vec3f(0.03);
  totalLighting += ambient;

  // Process all point lights
  for (var i = 0u; i < lightCounts.point_light_count; i++) {
    let light = pointLights[i];

    // Calculate light direction and distance
    let lightVec = light.position - input.world_pos;
    let distance = length(lightVec);
    let lightDir = lightVec / distance;

    // Attenuation
    let attenuation = calculateAttenuation(distance, light.radius);

    // Diffuse lighting (Lambertian)
    let n_dot_l = max(dot(normal, lightDir), 0.0);
    let diffuse = light.color * light.intensity * n_dot_l * attenuation;

    totalLighting += diffuse;
  }

  // Process all directional lights
  for (var i = 0u; i < lightCounts.directional_light_count; i++) {
    let light = directionalLights[i];

    // Directional lights have normalized direction
    let lightDir = -light.direction;

    // Diffuse lighting
    let n_dot_l = max(dot(normal, lightDir), 0.0);
    let diffuse = light.color * light.intensity * n_dot_l;

    totalLighting += diffuse;
  }

  // Combine lighting with material color
  let finalColor = input.color.rgb * totalLighting;

  return vec4f(finalColor, input.color.a);
}
