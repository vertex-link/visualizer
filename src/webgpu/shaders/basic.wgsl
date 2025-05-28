// src/webgpu/shaders/basic.wgsl
// Basic WGSL shader for rendering colored 3D geometry

// Vertex input structure
struct VertexInput {
    @location(0) position: vec3f,
}

// Vertex output / Fragment input
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
}

// Uniform buffer structure
struct Uniforms {
    mvpMatrix: mat4x4f,     // Model-View-Projection matrix
    modelMatrix: mat4x4f,   // Model matrix for world position
    color: vec4f,           // Base color
}

// Uniform buffer binding
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

// Vertex shader
@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    
    // Transform position to clip space
    output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    
    // Calculate world position for fragment shader
    let worldPos4 = uniforms.modelMatrix * vec4f(input.position, 1.0);
    output.worldPos = worldPos4.xyz;
    
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
    
    // Combine with uniform color
    let finalColor = mix(gradientColor, uniforms.color.rgb, 0.7);
    
    return vec4f(finalColor, uniforms.color.a);
}