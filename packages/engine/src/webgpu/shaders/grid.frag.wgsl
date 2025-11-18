struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) world_pos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) color: vec4f,
}

// Grid configuration constants
const GRID_SIZE: f32 = 1.0;        // Size of each grid cell
const GRID_LINE_WIDTH: f32 = 0.02; // Width of grid lines
const AXIS_LINE_WIDTH: f32 = 0.04; // Width of axis lines
const FADE_DISTANCE: f32 = 50.0;   // Distance at which grid starts to fade

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

    // Calculate grid lines using fract
    let grid = abs(fract(grid_coord / GRID_SIZE - 0.5) - 0.5) / fwidth(grid_coord / GRID_SIZE);
    let line = min(grid.x, grid.y);

    // Calculate axis lines
    let axis_x = abs(grid_coord.x) / fwidth(grid_coord.x);
    let axis_y = abs(grid_coord.y) / fwidth(grid_coord.y);

    // Grid line alpha (anti-aliased)
    let grid_alpha = 1.0 - min(line, 1.0);

    // Axis line alpha
    let axis_x_alpha = 1.0 - min(axis_x / (AXIS_LINE_WIDTH / GRID_LINE_WIDTH), 1.0);
    let axis_y_alpha = 1.0 - min(axis_y / (AXIS_LINE_WIDTH / GRID_LINE_WIDTH), 1.0);

    // Distance-based fade
    let dist = length(world_pos);
    let fade = 1.0 - smoothstep(FADE_DISTANCE * 0.5, FADE_DISTANCE, dist);

    // Combine grid and axis lines
    var final_color: vec3f;
    var final_alpha: f32;

    // X-axis (red) and Y/Z-axis (green/blue)
    if (abs_normal.y > abs_normal.x && abs_normal.y > abs_normal.z) {
        // XZ plane: X-axis is red, Z-axis is blue
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

    // Apply fade based on distance
    final_alpha *= fade;

    // Discard fully transparent fragments
    if (final_alpha < 0.01) {
        discard;
    }

    return vec4f(final_color, final_alpha);
}
