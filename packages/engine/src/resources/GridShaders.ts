/**
 * Grid shader sources for shader-based grid rendering.
 * These shaders create an infinite grid with anti-aliased lines,
 * colored axes, and distance-based fading.
 */

/**
 * Grid vertex shader
 * Transforms vertices and passes world position to fragment shader
 */
export const GRID_VERTEX_SHADER = /* wgsl */ `
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
`;

/**
 * Grid fragment shader with configurable parameters
 * Creates anti-aliased grid lines with axis highlighting and distance fade
 */
export const GRID_FRAGMENT_SHADER = /* wgsl */ `
struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) world_pos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) color: vec4f,
}

// Grid configuration constants (world space units)
const GRID_SIZE: f32 = 1.0;        // Size of each grid cell in world units
const GRID_LINE_WIDTH: f32 = 0.02; // Width factor for grid lines (screen space)
const AXIS_LINE_WIDTH: f32 = 0.04; // Width factor for axis lines (screen space)
const FADE_DISTANCE: f32 = 50.0;   // Distance (in world units) at which grid starts to fade

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    let world_pos = input.world_pos;

    // Determine which plane we're rendering on based on the normal
    let abs_normal = abs(input.normal);
    var grid_coord: vec2f;

    // Select the two coordinates perpendicular to the dominant normal
    if (abs_normal.y > abs_normal.x && abs_normal.y > abs_normal.z) {
        // XZ plane (horizontal grid)
        grid_coord = vec2f(world_pos.x, world_pos.z);
    } else if (abs_normal.x > abs_normal.z) {
        // YZ plane
        grid_coord = vec2f(world_pos.y, world_pos.z);
    } else {
        // XY plane
        grid_coord = vec2f(world_pos.x, world_pos.y);
    }

    // Calculate grid lines using fract and derivative-based anti-aliasing
    let grid = abs(fract(grid_coord / GRID_SIZE - 0.5) - 0.5) / fwidth(grid_coord / GRID_SIZE);
    let line = min(grid.x, grid.y);

    // Calculate axis lines (0,0 crossing)
    let axis_x = abs(grid_coord.x) / fwidth(grid_coord.x);
    let axis_y = abs(grid_coord.y) / fwidth(grid_coord.y);

    // Grid line alpha (anti-aliased)
    let grid_alpha = 1.0 - min(line, 1.0);

    // Axis line alpha
    let axis_x_alpha = 1.0 - min(axis_x / (AXIS_LINE_WIDTH / GRID_LINE_WIDTH), 1.0);
    let axis_y_alpha = 1.0 - min(axis_y / (AXIS_LINE_WIDTH / GRID_LINE_WIDTH), 1.0);

    // Distance-based fade for infinite grid appearance
    let dist = length(world_pos);
    let fade = 1.0 - smoothstep(FADE_DISTANCE * 0.5, FADE_DISTANCE, dist);

    // Combine grid and axis lines
    var final_color: vec3f;
    var final_alpha: f32;

    // Color-code axes based on plane orientation
    if (abs_normal.y > abs_normal.x && abs_normal.y > abs_normal.z) {
        // XZ plane (horizontal): X-axis is red, Z-axis is blue
        if (axis_x_alpha > 0.01) {
            final_color = vec3f(1.0, 0.3, 0.3); // Red for X-axis
            final_alpha = axis_x_alpha;
        } else if (axis_y_alpha > 0.01) {
            final_color = vec3f(0.3, 0.3, 1.0); // Blue for Z-axis
            final_alpha = axis_y_alpha;
        } else {
            final_color = input.color.rgb;
            final_alpha = grid_alpha * 0.5;
        }
    } else {
        // Other planes use default grid color
        final_color = input.color.rgb;
        final_alpha = max(grid_alpha * 0.5, max(axis_x_alpha, axis_y_alpha) * 0.3);
    }

    // Apply distance-based fade
    final_alpha *= fade;

    // Discard fully transparent fragments for performance
    if (final_alpha < 0.01) {
        discard;
    }

    return vec4f(final_color, final_alpha);
}
`;
