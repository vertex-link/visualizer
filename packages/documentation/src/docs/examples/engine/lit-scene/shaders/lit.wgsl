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
  @location(4) light_space_pos: vec4f,
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

// Shadow mapping (group 2)
// Currently supports single directional light shadow (can be expanded to arrays later)
struct ShadowData {
  lightViewProj: mat4x4f,
}

@group(2) @binding(0) var shadowMap: texture_depth_2d;
@group(2) @binding(1) var shadowSampler: sampler_comparison;
@group(2) @binding(2) var<uniform> shadowData: ShadowData;

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

  // Light-space position (calculated per-light in fragment shader for multi-shadow support)
  output.light_space_pos = vec4f(0.0);

  return output;
}

// Calculate point light attenuation
fn calculateAttenuation(distance: f32, radius: f32) -> f32 {
  let d = distance / radius;
  let d2 = d * d;
  let d4 = d2 * d2;
  return clamp(1.0 - d4, 0.0, 1.0) / (d2 + 1.0);
}

// Calculate shadow factor using PCF (Percentage Closer Filtering)
fn calculateShadow(worldPos: vec3f) -> f32 {
  // Transform world position to light space
  let lightSpacePos = shadowData.lightViewProj * vec4f(worldPos, 1.0);

  // Perspective divide
  var projCoords = lightSpacePos.xyz / lightSpacePos.w;

  // Transform to [0, 1] range for texture sampling
  projCoords = projCoords * 0.5 + 0.5;

  // Flip Y coordinate (texture coords start at top-left)
  projCoords.y = 1.0 - projCoords.y;

  // Check if position is outside shadow map bounds (but don't early return - uniform control flow)
  let inBounds = projCoords.x >= 0.0 && projCoords.x <= 1.0 &&
                 projCoords.y >= 0.0 && projCoords.y <= 1.0 &&
                 projCoords.z >= 0.0 && projCoords.z <= 1.0;

  // Bias to prevent shadow acne
  let bias = 0.005;
  let currentDepth = projCoords.z - bias;

  // Clamp coordinates to valid range for uniform control flow
  let sampleCoords = clamp(projCoords.xy, vec2f(0.0), vec2f(1.0));

  // PCF: Sample shadow map in a 3x3 grid
  let texelSize = 1.0 / 2048.0; // Shadow map resolution
  var shadow_factor = 0.0;

  for (var x = -1; x <= 1; x++) {
    for (var y = -1; y <= 1; y++) {
      let offset = vec2f(f32(x), f32(y)) * texelSize;
      let samplePos = sampleCoords + offset;

      // Use comparison sampler (returns 1.0 if currentDepth < shadowMap, 0.0 otherwise)
      shadow_factor += textureSampleCompare(
        shadowMap,
        shadowSampler,
        samplePos,
        currentDepth
      );
    }
  }

  // Average the 9 samples
  shadow_factor /= 9.0;

  // If out of bounds, return fully lit (1.0), otherwise return shadow factor
  return select(1.0, shadow_factor, inBounds);
}

// Fragment shader with dynamic lighting
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
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
    var diffuse = light.color * light.intensity * n_dot_l;

    // Apply shadow for the first directional light (index 0)
    // Currently only single shadow map is supported
    if (i == 0u) {
      let shadowFactor = calculateShadow(input.world_pos);
      diffuse *= shadowFactor;
    }

    totalLighting += diffuse;
  }

  // Combine lighting with material color
  let finalColor = input.color.rgb * totalLighting;

  return vec4f(finalColor, input.color.a);
}
