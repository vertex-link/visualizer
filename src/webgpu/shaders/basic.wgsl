// Basic WGSL shader for rendering colored 3D geometry

// Vertex input structure
struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
}

// Vertex output / Fragment input
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
}

// Uniform buffer structure
struct Uniforms {
    viewProjection: mat4x4f, // Camera's VP matrix
    model: mat4x4f,          // Instance's Model matrix
    color: vec4f,           // Base color
}

// Uniform buffer binding
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Vertex shader
@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    
    // Transform position to clip space: VP * Model * Position
    output.position = uniforms.viewProjection * uniforms.model * vec4f(input.position, 1.0);
    
    // Calculate world position for fragment shader
    let worldPos4 = uniforms.model * vec4f(input.position, 1.0);
    output.worldPos = worldPos4.xyz;

    output.normal = input.normal;
    output.uv = input.uv;
    
    return output;
}

// Fragment shader
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    // Simple gradient based on world Y position
    let gradientFactor = (input.worldPos.y + 1.0) * 0.5; // Normalize -1 to 1 range to 0 to 1
    
    // Mix base color with gradient
    let gradientColor = mix(
        vec3f(0.2, 0.3, 0.8),  // Blue at bottom
        vec3f(0.8, 0.9, 1.0),  // Light blue at top
        gradientFactor
    );
    
    // Apply simple diffuse lighting using the normal
    let light_dir = normalize(vec3f(1.0, 1.0, 1.0)); // Example light direction
    let diffuse = max(dot(normalize(input.normal), light_dir), 0.2); // Use input.normal for lighting
    
    // Combine with uniform color and diffuse lighting
    let finalColor = mix(gradientColor, uniforms.color.rgb * diffuse, 0.7);
    
    return vec4f(finalColor, uniforms.color.a);
}