// Texture and sampler bindings
@group(0) @binding(1) var diffuseTexture: texture_2d<f32>;
@group(0) @binding(2) var diffuseSampler: sampler;

@fragment
fn fs_main(
  @location(0) vUV : vec2<f32>,
  @location(1) vNormal : vec3<f32>,
  @location(2) vColor : vec4<f32>
) -> @location(0) vec4<f32> {
  // Sample the texture
  let texColor = textureSample(diffuseTexture, diffuseSampler, vUV);

  // Simple lighting based on normal
  let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
  let lighting = dot(normalize(vNormal), lightDir) * 0.5 + 0.5;

  // Combine texture, lighting, and instance color
  return vec4<f32>(texColor.rgb * lighting * vColor.rgb, texColor.a * vColor.a);
}
