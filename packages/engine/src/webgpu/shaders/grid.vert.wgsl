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

struct GlobalUniforms {
    viewProjection: mat4x4f,
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

    // Transform position to clip space
    output.position = globals.viewProjection * model_matrix * vec4f(input.position, 1.0);

    // Calculate world position for fragment shader grid rendering
    let worldPos4 = model_matrix * vec4f(input.position, 1.0);
    output.world_pos = worldPos4.xyz;

    // Transform normal to world space
    output.normal = normalize((model_matrix * vec4f(input.normal, 0.0)).xyz);
    output.uv = input.uv;
    output.color = input.instance_color;

    return output;
}
