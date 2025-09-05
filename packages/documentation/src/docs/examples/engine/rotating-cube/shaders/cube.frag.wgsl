@fragment
fn fs_main(
  @location(0) vUV : vec2<f32>,
  @location(1) vNormal : vec3<f32>,
  @location(2) vColor : vec4<f32>
) -> @location(0) vec4<f32> {
  // Simple color output with basic lighting based on normal
  let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
  let lighting = dot(normalize(vNormal), lightDir) * 0.5 + 0.5;
  return vec4<f32>(vColor.rgb * lighting, vColor.a);
}