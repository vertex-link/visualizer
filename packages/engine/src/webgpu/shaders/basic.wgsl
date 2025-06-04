struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) world_pos: vec3f, // Consistent naming with previous examples
    @location(1) normal: vec3f,    // This will be world-space normal
    @location(2) uv: vec2f,
}

struct Uniforms {
    viewProjection: mat4x4f, // Camera's VP matrix
    model: mat4x4f,          // Instance's Model matrix
    color: vec4f,            // Base color
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    // Transform position to clip space: VP * Model * Position
    output.position = uniforms.viewProjection * uniforms.model * vec4f(input.position, 1.0);

    // Calculate world position (optional, for fragment shader effects)
    let worldPos4 = uniforms.model * vec4f(input.position, 1.0);
    output.world_pos = worldPos4.xyz;

    // Transform normal to world space for correct lighting
    output.normal = normalize((uniforms.model * vec4f(input.normal, 0.0)).xyz);
    output.uv = input.uv;

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

    // Combine with uniform color and lighting
    return vec4f(uniforms.color.rgb * lighting, uniforms.color.a);
}
