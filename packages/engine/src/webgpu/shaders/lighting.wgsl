/**
 * Common lighting structures and functions for shaders.
 * Matches the CPU-side data structures in LightManager.ts
 */

// Point light structure (32 bytes, 16-byte aligned)
struct PointLight {
  position: vec3f,      // 12 bytes
  radius: f32,          // 4 bytes
  color: vec3f,         // 12 bytes
  intensity: f32,       // 4 bytes
}

// Directional light structure (32 bytes, 16-byte aligned)
struct DirectionalLight {
  direction: vec3f,     // 12 bytes
  _padding0: f32,       // 4 bytes (alignment)
  color: vec3f,         // 12 bytes
  intensity: f32,       // 4 bytes
}

// Light count uniform
struct LightCounts {
  point_light_count: u32,
  directional_light_count: u32,
  _reserved0: u32,
  _reserved1: u32,
}

/**
 * Calculate point light attenuation.
 * Uses inverse square falloff with smooth cutoff at radius.
 */
fn calculatePointLightAttenuation(distance: f32, radius: f32) -> f32 {
  let d = distance / radius;
  let d2 = d * d;
  let d4 = d2 * d2;

  // Smooth cutoff: 1 - d^4, clamped [0,1]
  // Division by (d^2 + 1) gives physically-based inverse square falloff
  return clamp(1.0 - d4, 0.0, 1.0) / (d2 + 1.0);
}

/**
 * Calculate diffuse lighting contribution (Lambertian).
 */
fn calculateDiffuse(normal: vec3f, lightDir: vec3f, lightColor: vec3f, intensity: f32) -> vec3f {
  let n_dot_l = max(dot(normal, lightDir), 0.0);
  return lightColor * intensity * n_dot_l;
}

/**
 * Calculate specular lighting contribution (Blinn-Phong).
 */
fn calculateSpecular(
  normal: vec3f,
  lightDir: vec3f,
  viewDir: vec3f,
  lightColor: vec3f,
  intensity: f32,
  shininess: f32
) -> vec3f {
  let halfDir = normalize(lightDir + viewDir);
  let n_dot_h = max(dot(normal, halfDir), 0.0);
  let spec = pow(n_dot_h, shininess);
  return lightColor * intensity * spec;
}
