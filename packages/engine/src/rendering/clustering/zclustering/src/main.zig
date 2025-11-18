const std = @import("std");

// ============================================================================
// Data Structures
// ============================================================================

/// Light structure matching LightComponent (48 bytes, aligned)
pub const Light = extern struct {
    position: [3]f32,
    radius: f32,
    color: [3]f32,
    intensity: f32,
    direction: [3]f32,
    cone_angle: f32,
    light_type: u32,
    _padding: u32,
};

/// Cluster AABB in view space (24 bytes)
pub const ClusterAABB = extern struct {
    min_x: f32,
    min_y: f32,
    min_z: f32,
    max_x: f32,
    max_y: f32,
    max_z: f32,
};

/// Frustum plane (4 floats: A, B, C, D for plane equation Ax + By + Cz + D = 0)
pub const FrustumPlane = extern struct {
    x: f32,
    y: f32,
    z: f32,
    d: f32,
};

/// Cluster light grid entry (offset and count in global light index list)
pub const ClusterLightGrid = extern struct {
    offset: u32,
    count: u32,
};

// ============================================================================
// Core Clustering Functions
// ============================================================================

/// Build 3D cluster grid from projection matrix
/// Subdivides the view frustum into a 3D grid of clusters
/// Output: AABBs in view space for each cluster
export fn build_cluster_grid(
    projection_ptr: [*]const f32,
    screen_width: u32,
    screen_height: u32,
    grid_x: u32,
    grid_y: u32,
    grid_z: u32,
    z_near: f32,
    z_far: f32,
    out_aabbs: [*]ClusterAABB,
) void {
    // Screen-space tile size
    const tile_width = @as(f32, @floatFromInt(screen_width)) / @as(f32, @floatFromInt(grid_x));
    const tile_height = @as(f32, @floatFromInt(screen_height)) / @as(f32, @floatFromInt(grid_y));

    // Extract projection matrix values for inverse projection
    const projection = projection_ptr[0..16];
    const fov_y_scale = projection[5]; // m[1][1] in column-major
    const aspect = projection[5] / projection[0]; // m[1][1] / m[0][0]

    var cluster_idx: u32 = 0;

    // Iterate through all clusters
    var z: u32 = 0;
    while (z < grid_z) : (z += 1) {
        // Calculate depth slice (exponential distribution for better precision)
        const z_ratio_near = @as(f32, @floatFromInt(z)) / @as(f32, @floatFromInt(grid_z));
        const z_ratio_far = @as(f32, @floatFromInt(z + 1)) / @as(f32, @floatFromInt(grid_z));

        // Exponential depth slicing for better distribution
        const slice_near = z_near * std.math.pow(f32, z_far / z_near, z_ratio_near);
        const slice_far = z_near * std.math.pow(f32, z_far / z_near, z_ratio_far);

        var y: u32 = 0;
        while (y < grid_y) : (y += 1) {
            // Screen-space Y bounds
            const screen_y_min = @as(f32, @floatFromInt(y)) * tile_height;
            const screen_y_max = screen_y_min + tile_height;

            // Convert to NDC Y (0 to height -> -1 to 1, flipped)
            const ndc_y_max = 1.0 - 2.0 * (screen_y_min / @as(f32, @floatFromInt(screen_height)));
            const ndc_y_min = 1.0 - 2.0 * (screen_y_max / @as(f32, @floatFromInt(screen_height)));

            var x: u32 = 0;
            while (x < grid_x) : (x += 1) {
                // Screen-space X bounds
                const screen_x_min = @as(f32, @floatFromInt(x)) * tile_width;
                const screen_x_max = screen_x_min + tile_width;

                // Convert to NDC X (0 to width -> -1 to 1)
                const ndc_x_min = 2.0 * (screen_x_min / @as(f32, @floatFromInt(screen_width))) - 1.0;
                const ndc_x_max = 2.0 * (screen_x_max / @as(f32, @floatFromInt(screen_width))) - 1.0;

                // Unproject NDC corners to view space
                // For a perspective projection: view_x = ndc_x * view_z / projection[0][0]
                const view_x_min_near = ndc_x_min * slice_near / projection[0];
                const view_x_max_near = ndc_x_max * slice_near / projection[0];
                const view_x_min_far = ndc_x_min * slice_far / projection[0];
                const view_x_max_far = ndc_x_max * slice_far / projection[0];

                const view_y_min_near = ndc_y_min * slice_near / projection[5];
                const view_y_max_near = ndc_y_max * slice_near / projection[5];
                const view_y_min_far = ndc_y_min * slice_far / projection[5];
                const view_y_max_far = ndc_y_max * slice_far / projection[5];

                // Compute AABB bounds (min/max of near and far corners)
                out_aabbs[cluster_idx] = ClusterAABB{
                    .min_x = @min(@min(view_x_min_near, view_x_max_near), @min(view_x_min_far, view_x_max_far)),
                    .max_x = @max(@max(view_x_min_near, view_x_max_near), @max(view_x_min_far, view_x_max_far)),
                    .min_y = @min(@min(view_y_min_near, view_y_max_near), @min(view_y_min_far, view_y_max_far)),
                    .max_y = @max(@max(view_y_min_near, view_y_max_near), @max(view_y_min_far, view_y_max_far)),
                    .min_z = -slice_far, // Negative Z in view space (right-handed)
                    .max_z = -slice_near,
                };

                cluster_idx += 1;
            }
        }
    }
}

/// Frustum cull lights against 6 frustum planes
/// Reduces total lights to only visible ones (e.g., 1000 -> 200)
export fn cull_lights_frustum(
    lights: [*]const Light,
    light_count: u32,
    frustum_planes: [*]const f32, // 6 planes × 4 floats (A, B, C, D)
    out_visible_indices: [*]u32,
    out_visible_count: *u32,
) void {
    var visible_count: u32 = 0;

    var i: u32 = 0;
    while (i < light_count) : (i += 1) {
        const light = lights[i];

        // Skip directional lights (always visible)
        if (light.light_type == 2) {
            out_visible_indices[visible_count] = i;
            visible_count += 1;
            continue;
        }

        // Test sphere against all 6 frustum planes
        var inside = true;
        var plane_idx: u32 = 0;
        while (plane_idx < 6) : (plane_idx += 1) {
            const plane_offset = plane_idx * 4;
            const a = frustum_planes[plane_offset + 0];
            const b = frustum_planes[plane_offset + 1];
            const c = frustum_planes[plane_offset + 2];
            const d = frustum_planes[plane_offset + 3];

            // Distance from point to plane
            const distance = a * light.position[0] +
                           b * light.position[1] +
                           c * light.position[2] + d;

            // If sphere is completely outside any plane, it's culled
            if (distance < -light.radius) {
                inside = false;
                break;
            }
        }

        if (inside) {
            out_visible_indices[visible_count] = i;
            visible_count += 1;
        }
    }

    out_visible_count.* = visible_count;
}

/// Assign lights to clusters based on sphere/cone-AABB intersection
/// This is the most performance-critical function
export fn assign_lights_to_clusters(
    lights: [*]const Light,
    light_count: u32,
    cluster_aabbs: [*]const ClusterAABB,
    cluster_count: u32,
    view_matrix: [*]const f32, // 16 floats (column-major)
    out_light_indices: [*]u32, // Flat array of light indices
    out_cluster_offsets: [*]u32, // [offset, count] pairs per cluster
    out_total_assignments: *u32,
) void {
    var total_assignments: u32 = 0;

    // For each cluster
    var cluster_idx: u32 = 0;
    while (cluster_idx < cluster_count) : (cluster_idx += 1) {
        const cluster = cluster_aabbs[cluster_idx];
        const offset = total_assignments;
        var count: u32 = 0;

        // Test each light against this cluster
        var light_idx: u32 = 0;
        while (light_idx < light_count) : (light_idx += 1) {
            const light = lights[light_idx];

            // Transform light position to view space
            const view_pos = transform_point(light.position, view_matrix);

            var intersects = false;

            if (light.light_type == 0) { // Point light
                intersects = sphere_aabb_intersect(view_pos, light.radius, cluster);
            } else if (light.light_type == 1) { // Spotlight
                const view_dir = transform_direction(light.direction, view_matrix);
                intersects = cone_aabb_intersect(
                    view_pos,
                    view_dir,
                    light.radius,
                    light.cone_angle,
                    cluster,
                );
            } else if (light.light_type == 2) { // Directional light (affects all clusters)
                intersects = true;
            }

            if (intersects) {
                out_light_indices[total_assignments] = light_idx;
                total_assignments += 1;
                count += 1;
            }
        }

        // Store offset and count for this cluster
        out_cluster_offsets[cluster_idx * 2 + 0] = offset;
        out_cluster_offsets[cluster_idx * 2 + 1] = count;
    }

    out_total_assignments.* = total_assignments;
}

// ============================================================================
// Helper Functions - Intersection Tests
// ============================================================================

/// Test sphere-AABB intersection (for point lights)
fn sphere_aabb_intersect(center: [3]f32, radius: f32, aabb: ClusterAABB) bool {
    // Find closest point on AABB to sphere center
    const closest_x = std.math.clamp(center[0], aabb.min_x, aabb.max_x);
    const closest_y = std.math.clamp(center[1], aabb.min_y, aabb.max_y);
    const closest_z = std.math.clamp(center[2], aabb.min_z, aabb.max_z);

    // Calculate distance squared
    const dx = center[0] - closest_x;
    const dy = center[1] - closest_y;
    const dz = center[2] - closest_z;
    const dist_sq = dx * dx + dy * dy + dz * dz;

    return dist_sq <= (radius * radius);
}

/// Test cone-AABB intersection (for spotlights)
/// Conservative test: sphere + direction check
fn cone_aabb_intersect(
    apex: [3]f32,
    direction: [3]f32,
    height: f32,
    angle: f32,
    aabb: ClusterAABB,
) bool {
    // First, test sphere (conservative bounds)
    const cone_radius = height * @tan(angle * 0.5);
    const sphere_center = [3]f32{
        apex[0] + direction[0] * height * 0.5,
        apex[1] + direction[1] * height * 0.5,
        apex[2] + direction[2] * height * 0.5,
    };
    const sphere_radius = @sqrt(height * height * 0.25 + cone_radius * cone_radius);

    if (!sphere_aabb_intersect(sphere_center, sphere_radius, aabb)) {
        return false; // Early out if bounding sphere doesn't intersect
    }

    // For more precise test, check if AABB corners are within cone
    // Find AABB center
    const aabb_center = [3]f32{
        (aabb.min_x + aabb.max_x) * 0.5,
        (aabb.min_y + aabb.max_y) * 0.5,
        (aabb.min_z + aabb.max_z) * 0.5,
    };

    // Vector from apex to AABB center
    const to_center = [3]f32{
        aabb_center[0] - apex[0],
        aabb_center[1] - apex[1],
        aabb_center[2] - apex[2],
    };

    // Project onto cone direction
    const dot = to_center[0] * direction[0] +
                to_center[1] * direction[1] +
                to_center[2] * direction[2];

    // If behind apex or beyond height, might not intersect
    if (dot < 0 or dot > height) {
        // Use conservative sphere test result
        return true;
    }

    // Conservative acceptance for now (can be refined with more checks)
    return true;
}

// ============================================================================
// Helper Functions - Math Utilities
// ============================================================================

/// Transform a point by a 4x4 matrix (view matrix)
fn transform_point(point: [3]f32, matrix: [*]const f32) [3]f32 {
    // Column-major matrix multiplication: result = matrix * vec4(point, 1.0)
    return [3]f32{
        matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
        matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
        matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14],
    };
}

/// Transform a direction by a 4x4 matrix (ignore translation)
fn transform_direction(dir: [3]f32, matrix: [*]const f32) [3]f32 {
    // Column-major matrix multiplication: result = matrix * vec4(dir, 0.0)
    const result = [3]f32{
        matrix[0] * dir[0] + matrix[4] * dir[1] + matrix[8] * dir[2],
        matrix[1] * dir[0] + matrix[5] * dir[1] + matrix[9] * dir[2],
        matrix[2] * dir[0] + matrix[6] * dir[1] + matrix[10] * dir[2],
    };

    // Normalize
    const len = @sqrt(result[0] * result[0] + result[1] * result[1] + result[2] * result[2]);
    if (len > 0.0) {
        return [3]f32{
            result[0] / len,
            result[1] / len,
            result[2] / len,
        };
    }
    return result;
}

// ============================================================================
// Batch Optimized Functions (Optional - for future SIMD optimization)
// ============================================================================

/// Batch test multiple sphere-AABB intersections
/// Can be optimized with SIMD in the future
export fn sphere_aabb_intersect_batch(
    sphere_center: [*]const f32, // [x, y, z]
    sphere_radius: f32,
    aabb_mins: [*]const f32, // Flat array of min points
    aabb_maxs: [*]const f32, // Flat array of max points
    count: u32,
    out_results: [*]u8, // Boolean results (0 or 1)
) void {
    const center = [3]f32{ sphere_center[0], sphere_center[1], sphere_center[2] };

    var i: u32 = 0;
    while (i < count) : (i += 1) {
        const offset = i * 3;
        const aabb = ClusterAABB{
            .min_x = aabb_mins[offset + 0],
            .min_y = aabb_mins[offset + 1],
            .min_z = aabb_mins[offset + 2],
            .max_x = aabb_maxs[offset + 0],
            .max_y = aabb_maxs[offset + 1],
            .max_z = aabb_maxs[offset + 2],
        };

        out_results[i] = if (sphere_aabb_intersect(center, sphere_radius, aabb)) 1 else 0;
    }
}
