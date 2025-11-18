// Clustered Forward+ Rendering Shader

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
    @builtin(position) clip_position: vec4f,
    @location(0) world_pos: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
    @location(3) color: vec4f,
}

struct GlobalUniforms {
    view_projection: mat4x4f,
    view_matrix: mat4x4f,
    camera_pos: vec3f,
    _padding0: f32,
    screen_width: f32,
    screen_height: f32,
    z_near: f32,
    z_far: f32,
    grid_size_x: u32,
    grid_size_y: u32,
    grid_size_z: u32,
    _padding1: u32,
}

struct Light {
    position: vec3f,
    radius: f32,
    color: vec3f,
    intensity: f32,
    direction: vec3f,
    cone_angle: f32,
    light_type: u32,  // 0=point, 1=spot, 2=directional
    _padding: u32,
}

struct ClusterLightGrid {
    offset: u32,
    count: u32,
}

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(0) @binding(1) var<storage, read> lights: array<Light>;
@group(0) @binding(2) var<storage, read> light_indices: array<u32>;
@group(0) @binding(3) var<storage, read> cluster_grids: array<ClusterLightGrid>;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;

    // Reconstruct model matrix
    let model_matrix = mat4x4f(
        input.model_matrix_0,
        input.model_matrix_1,
        input.model_matrix_2,
        input.model_matrix_3
    );

    // Transform to clip space
    let world_pos = model_matrix * vec4f(input.position, 1.0);
    output.clip_position = globals.view_projection * world_pos;
    output.world_pos = world_pos.xyz;

    // Transform normal to world space
    output.normal = normalize((model_matrix * vec4f(input.normal, 0.0)).xyz);
    output.uv = input.uv;
    output.color = input.instance_color;

    return output;
}

// Calculate cluster index from screen position and depth
fn get_cluster_index(frag_coord: vec4f) -> u32 {
    // Screen space coordinates [0, 1]
    let screen_x = frag_coord.x / globals.screen_width;
    let screen_y = frag_coord.y / globals.screen_height;

    // Linear depth from clip space
    let depth = frag_coord.z;

    // Calculate depth slice (exponential distribution)
    let z_near = globals.z_near;
    let z_far = globals.z_far;
    let depth_linear = (2.0 * z_near) / (z_far + z_near - depth * (z_far - z_near));
    let depth_ratio = log(depth_linear * z_far / z_near) / log(z_far / z_near);

    // Convert to grid indices
    let x = u32(screen_x * f32(globals.grid_size_x));
    let y = u32(screen_y * f32(globals.grid_size_y));
    let z = u32(clamp(depth_ratio, 0.0, 0.999) * f32(globals.grid_size_z));

    // Calculate flat index
    return x + y * globals.grid_size_x + z * globals.grid_size_x * globals.grid_size_y;
}

// Calculate point light contribution
fn calculate_point_light(
    light: Light,
    world_pos: vec3f,
    normal: vec3f,
    view_dir: vec3f,
) -> vec3f {
    let light_dir = light.position - world_pos;
    let distance = length(light_dir);

    // Early out if outside radius
    if (distance > light.radius) {
        return vec3f(0.0);
    }

    let L = normalize(light_dir);
    let N = normalize(normal);
    let V = normalize(view_dir);
    let H = normalize(L + V);

    // Diffuse (Lambertian)
    let diffuse = max(dot(N, L), 0.0);

    // Specular (Blinn-Phong)
    let specular = pow(max(dot(N, H), 0.0), 32.0);

    // Attenuation (inverse square with smooth falloff)
    let attenuation = 1.0 - smoothstep(light.radius * 0.8, light.radius, distance);
    let dist_attenuation = 1.0 / (1.0 + distance * distance);

    let final_attenuation = attenuation * dist_attenuation;

    return light.color * light.intensity * (diffuse + specular * 0.3) * final_attenuation;
}

// Calculate spotlight contribution
fn calculate_spot_light(
    light: Light,
    world_pos: vec3f,
    normal: vec3f,
    view_dir: vec3f,
) -> vec3f {
    let light_dir = light.position - world_pos;
    let distance = length(light_dir);

    if (distance > light.radius) {
        return vec3f(0.0);
    }

    let L = normalize(light_dir);
    let spot_dir = normalize(light.direction);

    // Spotlight cone attenuation
    let theta = dot(L, -spot_dir);
    let inner_cutoff = cos(light.cone_angle * 0.8);
    let outer_cutoff = cos(light.cone_angle);

    if (theta < outer_cutoff) {
        return vec3f(0.0);
    }

    let epsilon = inner_cutoff - outer_cutoff;
    let cone_attenuation = clamp((theta - outer_cutoff) / epsilon, 0.0, 1.0);

    // Same lighting calculation as point light
    let N = normalize(normal);
    let V = normalize(view_dir);
    let H = normalize(L + V);

    let diffuse = max(dot(N, L), 0.0);
    let specular = pow(max(dot(N, H), 0.0), 32.0);

    let attenuation = 1.0 - smoothstep(light.radius * 0.8, light.radius, distance);
    let dist_attenuation = 1.0 / (1.0 + distance * distance);

    return light.color * light.intensity * (diffuse + specular * 0.3) *
           dist_attenuation * attenuation * cone_attenuation;
}

// Calculate directional light contribution
fn calculate_directional_light(
    light: Light,
    world_pos: vec3f,
    normal: vec3f,
    view_dir: vec3f,
) -> vec3f {
    let L = normalize(-light.direction);
    let N = normalize(normal);
    let V = normalize(view_dir);
    let H = normalize(L + V);

    let diffuse = max(dot(N, L), 0.0);
    let specular = pow(max(dot(N, H), 0.0), 32.0);

    return light.color * light.intensity * (diffuse + specular * 0.3);
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    // Get cluster index for this fragment
    let cluster_index = get_cluster_index(input.clip_position);

    // Bounds check
    let max_clusters = globals.grid_size_x * globals.grid_size_y * globals.grid_size_z;
    if (cluster_index >= max_clusters) {
        // Fallback color for debugging
        return vec4f(1.0, 0.0, 1.0, 1.0);
    }

    // Get light list for this cluster
    let cluster_grid = cluster_grids[cluster_index];

    // Accumulate lighting from all lights in this cluster
    var accumulated_light = vec3f(0.0);
    let view_dir = globals.camera_pos - input.world_pos;

    // Ambient lighting
    let ambient = vec3f(0.03);

    // Iterate through lights affecting this cluster
    for (var i = 0u; i < cluster_grid.count; i = i + 1u) {
        let light_idx = light_indices[cluster_grid.offset + i];
        let light = lights[light_idx];

        var light_contribution = vec3f(0.0);

        switch light.light_type {
            case 0u: { // Point light
                light_contribution = calculate_point_light(light, input.world_pos, input.normal, view_dir);
            }
            case 1u: { // Spotlight
                light_contribution = calculate_spot_light(light, input.world_pos, input.normal, view_dir);
            }
            case 2u: { // Directional light
                light_contribution = calculate_directional_light(light, input.world_pos, input.normal, view_dir);
            }
            default: {}
        }

        accumulated_light += light_contribution;
    }

    // Combine with material color
    let final_color = input.color.rgb * (ambient + accumulated_light);

    // Tone mapping (simple Reinhard)
    let mapped_color = final_color / (final_color + vec3f(1.0));

    // Gamma correction
    let gamma_corrected = pow(mapped_color, vec3f(1.0 / 2.2));

    return vec4f(gamma_corrected, input.color.a);
}

// Debug fragment shader to visualize cluster heat map
@fragment
fn fs_debug_clusters(input: VertexOutput) -> @location(0) vec4f {
    let cluster_index = get_cluster_index(input.clip_position);
    let max_clusters = globals.grid_size_x * globals.grid_size_y * globals.grid_size_z;

    if (cluster_index >= max_clusters) {
        return vec4f(1.0, 0.0, 1.0, 1.0);
    }

    let cluster_grid = cluster_grids[cluster_index];
    let light_count = f32(cluster_grid.count);

    // Heat map: blue (0 lights) → green → yellow → red (many lights)
    let normalized_count = clamp(light_count / 10.0, 0.0, 1.0);

    let cold = vec3f(0.0, 0.0, 1.0);
    let medium = vec3f(0.0, 1.0, 0.0);
    let hot = vec3f(1.0, 0.0, 0.0);

    var color: vec3f;
    if (normalized_count < 0.5) {
        color = mix(cold, medium, normalized_count * 2.0);
    } else {
        color = mix(medium, hot, (normalized_count - 0.5) * 2.0);
    }

    return vec4f(color, 1.0);
}
