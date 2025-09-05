struct Globals {
  viewProjection : mat4x4<f32>,
};
@group(0) @binding(0) var<uniform> globals : Globals;

struct VSOut {
  @builtin(position) Position : vec4<f32>,
  @location(0) vUV : vec2<f32>,
  @location(1) vNormal : vec3<f32>,
  @location(2) vColor : vec4<f32>,
};

@vertex
fn vs_main(
  @location(0) position : vec3<f32>,
  @location(1) normal : vec3<f32>,
  @location(2) uv : vec2<f32>,
  // Instance data (model matrix rows)
  @location(4) iRow0 : vec4<f32>,
  @location(5) iRow1 : vec4<f32>,
  @location(6) iRow2 : vec4<f32>,
  @location(7) iRow3 : vec4<f32>,
  @location(8) iColor : vec4<f32>
) -> VSOut {
  let model = mat4x4<f32>(iRow0, iRow1, iRow2, iRow3);
  var out : VSOut;
  out.Position = globals.viewProjection * model * vec4<f32>(position, 1.0);
  out.vUV = uv;
  out.vNormal = normal;
  out.vColor = iColor;
  return out;
}