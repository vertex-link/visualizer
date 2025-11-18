const std = @import("std");

// Light structure matching TypeScript
pub const Light = extern struct {
    position: [3]f32,
    radius: f32,
    color: [3]f32,
    intensity: f32,
    direction: [3]f32, // For spotlights
    cone_angle: f32, // In radians, for spotlights
    light_type: u32, // 0=point, 1=spot, 2=directional
    _padding: u32,
};

// Cluster AABB in view space
pub const ClusterAABB = extern struct {
    min: [3]f32,
    _padding0: f32,
    max: [3]f32,
    _padding1: f32,
};

// Cluster light grid entry
pub const ClusterLightGrid = extern struct {
    offset: u32, // Start index in global light list
    count: u32, // Number of lights affecting this cluster
};

// Build 3D cluster grid from projection matrix
export fn build_cluster_grid(
    projection_matrix: [*]const f32,
    screen_width: u32,
    screen_height: u32,
    grid_size_x: u32,
    grid_size_y: u32,
    grid_size_z: u32,
    z_near: f32,
    z_far: f32,
    out_cluster_aabbs: [*]ClusterAABB,
) void {
    const cluster_count = grid_size_x * grid_size_y * grid_size_z;

    for (0..cluster_count) |i| {
        const z = @as(u32, @intCast(i / (grid_size_x * grid_size_y)));
        const y = @as(u32, @intCast((i / grid_size_x) % grid_size_y));
        const x = @as(u32, @intCast(i % grid_size_x));

        // Calculate normalized screen space coordinates [0, 1]
        const x_min = @as(f32, @floatFromInt(x)) / @as(f32, @floatFromInt(grid_size_x));
        const x_max = @as(f32, @floatFromInt(x + 1)) / @as(f32, @floatFromInt(grid_size_x));
        const y_min = @as(f32, @floatFromInt(y)) / @as(f32, @floatFromInt(grid_size_y));
        const y_max = @as(f32, @floatFromInt(y + 1)) / @as(f32, @floatFromInt(grid_size_y));

        // Convert to NDC [-1, 1]
        const ndc_min_x = x_min * 2.0 - 1.0;
        const ndc_max_x = x_max * 2.0 - 1.0;
        const ndc_min_y = 1.0 - y_max * 2.0; // Flip Y
        const ndc_max_y = 1.0 - y_min * 2.0;

        // Calculate depth slices (exponential distribution for better near-field detail)
        const z_ratio = @as(f32, @floatFromInt(z)) / @as(f32, @floatFromInt(grid_size_z));
        const z_next_ratio = @as(f32, @floatFromInt(z + 1)) / @as(f32, @floatFromInt(grid_size_z));

        // Exponential depth slicing
        const depth_min = z_near * std.math.pow(f32, z_far / z_near, z_ratio);
        const depth_max = z_near * std.math.pow(f32, z_far / z_near, z_next_ratio);

        // Store view-space AABB (simplified - in real impl would unproject from NDC)
        // For this POC, we'll use a simplified representation
        out_cluster_aabbs[i] = ClusterAABB{
            .min = [3]f32{ ndc_min_x, ndc_min_y, -depth_max },
            ._padding0 = 0.0,
            .max = [3]f32{ ndc_max_x, ndc_max_y, -depth_min },
            ._padding1 = 0.0,
        };
    }
}

// Sphere-AABB intersection test
fn sphere_aabb_intersect(
    sphere_center: [3]f32,
    sphere_radius: f32,
    aabb_min: [3]f32,
    aabb_max: [3]f32,
) bool {
    var dist_sq: f32 = 0.0;

    // For each axis, find squared distance from sphere center to AABB
    inline for (0..3) |i| {
        if (sphere_center[i] < aabb_min[i]) {
            const d = aabb_min[i] - sphere_center[i];
            dist_sq += d * d;
        } else if (sphere_center[i] > aabb_max[i]) {
            const d = sphere_center[i] - aabb_max[i];
            dist_sq += d * d;
        }
    }

    return dist_sq <= (sphere_radius * sphere_radius);
}

// Cone-AABB intersection test (for spotlights)
fn cone_aabb_intersect(
    cone_apex: [3]f32,
    cone_direction: [3]f32,
    cone_height: f32,
    cone_angle: f32,
    aabb_min: [3]f32,
    aabb_max: [3]f32,
) bool {
    // Simplified cone-AABB test using sphere bounds
    // For a full implementation, use proper cone-AABB intersection
    const cone_radius = cone_height * @tan(cone_angle);
    const cone_center = [3]f32{
        cone_apex[0] + cone_direction[0] * cone_height * 0.5,
        cone_apex[1] + cone_direction[1] * cone_height * 0.5,
        cone_apex[2] + cone_direction[2] * cone_height * 0.5,
    };
    const bounding_radius = @sqrt(cone_height * cone_height * 0.25 + cone_radius * cone_radius);

    return sphere_aabb_intersect(cone_center, bounding_radius, aabb_min, aabb_max);
}

// Matrix-vector multiplication (4x4 * vec3, treating vec3 as vec4 with w=1)
fn transform_point(matrix: [*]const f32, point: [3]f32) [3]f32 {
    const x = matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12];
    const y = matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13];
    const z = matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14];
    const w = matrix[3] * point[0] + matrix[7] * point[1] + matrix[11] * point[2] + matrix[15];

    return [3]f32{ x / w, y / w, z / w };
}

// Assign lights to clusters
export fn assign_lights_to_clusters(
    lights: [*]const Light,
    light_count: u32,
    cluster_aabbs: [*]const ClusterAABB,
    cluster_count: u32,
    view_matrix: [*]const f32,
    out_light_indices: [*]u32,
    out_cluster_grids: [*]ClusterLightGrid,
    out_total_assignments: *u32,
) void {
    var write_offset: u32 = 0;

    // For each cluster
    for (0..cluster_count) |cluster_idx| {
        const cluster = cluster_aabbs[cluster_idx];
        var light_count_for_cluster: u32 = 0;
        const start_offset = write_offset;

        // Test each light against this cluster
        for (0..light_count) |light_idx| {
            const light = lights[light_idx];

            // Transform light position to view space
            const light_pos_view = transform_point(view_matrix, light.position);

            var intersects = false;

            switch (light.light_type) {
                0 => { // Point light
                    intersects = sphere_aabb_intersect(
                        light_pos_view,
                        light.radius,
                        cluster.min,
                        cluster.max,
                    );
                },
                1 => { // Spotlight
                    intersects = cone_aabb_intersect(
                        light_pos_view,
                        light.direction,
                        light.radius,
                        light.cone_angle,
                        cluster.min,
                        cluster.max,
                    );
                },
                2 => { // Directional light (affects all clusters)
                    intersects = true;
                },
                else => {},
            }

            if (intersects) {
                out_light_indices[write_offset] = @intCast(light_idx);
                write_offset += 1;
                light_count_for_cluster += 1;
            }
        }

        // Record grid entry for this cluster
        out_cluster_grids[cluster_idx] = ClusterLightGrid{
            .offset = start_offset,
            .count = light_count_for_cluster,
        };
    }

    out_total_assignments.* = write_offset;
}

// Frustum plane extraction from view-projection matrix
pub const FrustumPlanes = extern struct {
    planes: [6][4]f32, // 6 planes, each as [A, B, C, D] in Ax + By + Cz + D = 0
};

export fn extract_frustum_planes(
    view_proj_matrix: [*]const f32,
    out_planes: *FrustumPlanes,
) void {
    const m = view_proj_matrix;

    // Left plane
    out_planes.planes[0] = [4]f32{
        m[3] + m[0],
        m[7] + m[4],
        m[11] + m[8],
        m[15] + m[12],
    };

    // Right plane
    out_planes.planes[1] = [4]f32{
        m[3] - m[0],
        m[7] - m[4],
        m[11] - m[8],
        m[15] - m[12],
    };

    // Bottom plane
    out_planes.planes[2] = [4]f32{
        m[3] + m[1],
        m[7] + m[5],
        m[11] + m[9],
        m[15] + m[13],
    };

    // Top plane
    out_planes.planes[3] = [4]f32{
        m[3] - m[1],
        m[7] - m[5],
        m[11] - m[9],
        m[15] - m[13],
    };

    // Near plane
    out_planes.planes[4] = [4]f32{
        m[3] + m[2],
        m[7] + m[6],
        m[11] + m[10],
        m[15] + m[14],
    };

    // Far plane
    out_planes.planes[5] = [4]f32{
        m[3] - m[2],
        m[7] - m[6],
        m[11] - m[10],
        m[15] - m[14],
    };

    // Normalize planes
    for (0..6) |i| {
        const len = @sqrt(
            out_planes.planes[i][0] * out_planes.planes[i][0] +
            out_planes.planes[i][1] * out_planes.planes[i][1] +
            out_planes.planes[i][2] * out_planes.planes[i][2]
        );

        if (len > 0.0001) {
            out_planes.planes[i][0] /= len;
            out_planes.planes[i][1] /= len;
            out_planes.planes[i][2] /= len;
            out_planes.planes[i][3] /= len;
        }
    }
}

// Test sphere against frustum planes
fn sphere_frustum_test(center: [3]f32, radius: f32, planes: *const FrustumPlanes) bool {
    for (0..6) |i| {
        const plane = planes.planes[i];
        const dist = plane[0] * center[0] + plane[1] * center[1] + plane[2] * center[2] + plane[3];

        if (dist < -radius) {
            return false; // Outside this plane
        }
    }

    return true; // Inside all planes
}

// Cull lights against view frustum
export fn cull_lights_frustum(
    lights: [*]const Light,
    light_count: u32,
    frustum_planes: *const FrustumPlanes,
    out_visible_indices: [*]u32,
    out_visible_count: *u32,
) void {
    var visible_count: u32 = 0;

    for (0..light_count) |i| {
        const light = lights[i];

        // Directional lights are always visible
        if (light.light_type == 2) {
            out_visible_indices[visible_count] = @intCast(i);
            visible_count += 1;
            continue;
        }

        // Test sphere/cone against frustum
        if (sphere_frustum_test(light.position, light.radius, frustum_planes)) {
            out_visible_indices[visible_count] = @intCast(i);
            visible_count += 1;
        }
    }

    out_visible_count.* = visible_count;
}

// Calculate cluster index from world position
export fn world_pos_to_cluster_index(
    world_pos: [*]const f32,
    view_proj_matrix: [*]const f32,
    grid_size_x: u32,
    grid_size_y: u32,
    grid_size_z: u32,
    z_near: f32,
    z_far: f32,
) u32 {
    // Transform to clip space
    const clip_pos = transform_point(view_proj_matrix, [3]f32{ world_pos[0], world_pos[1], world_pos[2] });

    // Convert to screen space [0, 1]
    const screen_x = (clip_pos[0] + 1.0) * 0.5;
    const screen_y = (1.0 - clip_pos[1]) * 0.5;

    // Calculate depth slice (exponential)
    const depth = -clip_pos[2];
    const depth_ratio = @log(depth / z_near) / @log(z_far / z_near);

    // Clamp and convert to indices
    const x = @as(u32, @intFromFloat(@min(@max(screen_x, 0.0), 0.999) * @as(f32, @floatFromInt(grid_size_x))));
    const y = @as(u32, @intFromFloat(@min(@max(screen_y, 0.0), 0.999) * @as(f32, @floatFromInt(grid_size_y))));
    const z = @as(u32, @intFromFloat(@min(@max(depth_ratio, 0.0), 0.999) * @as(f32, @floatFromInt(grid_size_z))));

    return x + y * grid_size_x + z * grid_size_x * grid_size_y;
}
