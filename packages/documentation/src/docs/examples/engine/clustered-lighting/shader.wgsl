// Re-export the clustered forward+ shader
// In a real implementation, this would import from the engine package
// For now, this is a placeholder that references the actual shader

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
}

struct VertexOutput {
    @builtin(position) clip_position: vec4f,
    @location(0) world_pos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
}

struct GlobalUniforms {
    view_projection: mat4x4f,
}

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.clip_position = globals.view_projection * vec4f(input.position, 1.0);
    output.world_pos = input.position;
    output.normal = input.normal;
    output.uv = input.uv;
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    // Simple lighting for now
    let light_dir = normalize(vec3f(1.0, 1.0, 1.0));
    let diffuse = max(dot(normalize(input.normal), light_dir), 0.0);
    let ambient = 0.3;
    let lighting = ambient + diffuse * 0.7;

    return vec4f(vec3f(lighting), 1.0);
}
