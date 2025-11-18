// ============================================================================
// Clustered Forward+ Rendering Shader
// ============================================================================

// Vertex Input
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
    @location(4) view_pos: vec3f, // NEW: Position in view space for clustering
}

// ============================================================================
// Uniforms and Storage Buffers
// ============================================================================

struct GlobalUniforms {
    viewProjection: mat4x4f,
    view: mat4x4f,
    projection: mat4x4f,
    cameraPosition: vec3f,
    _padding1: f32,
    screenWidth: f32,
    screenHeight: f32,
    gridSizeX: f32,
    gridSizeY: f32,
    gridSizeZ: f32,
    zNear: f32,
    zFar: f32,
    _padding2: f32,
}

struct Light {
    position: vec3f,
    radius: f32,
    color: vec3f,
    intensity: f32,
    direction: vec3f,
    coneAngle: f32,
    lightType: u32, // 0 = Point, 1 = Spot, 2 = Directional
    _padding: u32,
}

struct ClusterAABB {
    minX: f32,
    minY: f32,
    minZ: f32,
    maxX: f32,
    maxY: f32,
    maxZ: f32,
}

// Global uniforms (view-projection matrix, clustering params)
@group(0) @binding(0) var<uniform> globals: GlobalUniforms;

// Clustering data (optional - will be bound when clustering is enabled)
@group(0) @binding(1) var<storage, read> clusterAABBs: array<ClusterAABB>;
@group(0) @binding(2) var<storage, read> lights: array<Light>;
@group(0) @binding(3) var<storage, read> lightIndices: array<u32>;
@group(0) @binding(4) var<storage, read> clusterGrid: array<vec2u>; // [offset, count] per cluster

// ============================================================================
// Vertex Shader
// ============================================================================

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

    // Calculate world position
    let worldPos4 = model_matrix * vec4f(input.position, 1.0);
    output.world_pos = worldPos4.xyz;

    // Calculate view space position for clustering
    let viewPos4 = globals.view * worldPos4;
    output.view_pos = viewPos4.xyz;

    // Transform normal to world space
    output.normal = normalize((model_matrix * vec4f(input.normal, 0.0)).xyz);
    output.uv = input.uv;
    output.color = input.instance_color;

    return output;
}

// ============================================================================
// Fragment Shader - Clustered Lighting
// ============================================================================

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    // Determine if clustering is enabled by checking array sizes
    // (in practice, we'll have a separate shader variant or check buffer size)
    let clusteringEnabled = arrayLength(&lights) > 0u;

    var totalLight = vec3f(0.0);

    if (clusteringEnabled) {
        // CLUSTERED FORWARD+ PATH
        totalLight = clusteredLighting(input);
    } else {
        // FALLBACK: Simple directional light
        totalLight = simpleLighting(input);
    }

    // Add ambient
    totalLight += vec3f(0.1);

    // Combine with albedo color
    return vec4f(input.color.rgb * totalLight, input.color.a);
}

// ============================================================================
// Clustered Lighting Function
// ============================================================================

fn clusteredLighting(input: VertexOutput) -> vec3f {
    // 1. Calculate cluster index from screen position and depth
    let clusterIndex = getClusterIndex(input.position.xy, input.view_pos.z);

    // 2. Get light list for this cluster
    let gridEntry = clusterGrid[clusterIndex];
    let lightOffset = gridEntry.x;
    let lightCount = gridEntry.y;

    // 3. Accumulate lighting from all lights affecting this cluster
    var totalLight = vec3f(0.0);

    for (var i = 0u; i < lightCount; i++) {
        let lightIdx = lightIndices[lightOffset + i];
        let light = lights[lightIdx];

        totalLight += calculateLight(light, input.world_pos, input.normal);
    }

    return totalLight;
}

// ============================================================================
// Cluster Index Calculation
// ============================================================================

fn getClusterIndex(screenPos: vec2f, viewZ: f32) -> u32 {
    // Calculate cluster X and Y from screen position
    let clusterX = u32(screenPos.x / globals.screenWidth * globals.gridSizeX);
    let clusterY = u32(screenPos.y / globals.screenHeight * globals.gridSizeY);

    // Calculate cluster Z from depth (exponential distribution)
    let clusterZ = computeClusterZ(viewZ);

    // Clamp to grid bounds
    let clampedX = clamp(clusterX, 0u, u32(globals.gridSizeX) - 1u);
    let clampedY = clamp(clusterY, 0u, u32(globals.gridSizeY) - 1u);
    let clampedZ = clamp(clusterZ, 0u, u32(globals.gridSizeZ) - 1u);

    // Calculate linear index: x + y*width + z*width*height
    return clampedX +
           clampedY * u32(globals.gridSizeX) +
           clampedZ * u32(globals.gridSizeX) * u32(globals.gridSizeY);
}

fn computeClusterZ(viewZ: f32) -> u32 {
    // View Z is negative in right-handed view space
    let absViewZ = abs(viewZ);

    // Linearize depth for cluster slicing (exponential distribution)
    let depthRange = globals.zFar - globals.zNear;
    let normalizedDepth = (absViewZ - globals.zNear) / depthRange;

    // Clamp to valid range [0, 1]
    let clampedDepth = clamp(normalizedDepth, 0.0, 1.0);

    // Map to cluster slice (exponential for better near-field precision)
    let sliceFloat = pow(clampedDepth, 0.5) * globals.gridSizeZ;

    return u32(sliceFloat);
}

// ============================================================================
// Light Calculation
// ============================================================================

fn calculateLight(light: Light, worldPos: vec3f, normal: vec3f) -> vec3f {
    let lightType = light.lightType;

    if (lightType == 0u) {
        // Point light
        return calculatePointLight(light, worldPos, normal);
    } else if (lightType == 1u) {
        // Spotlight
        return calculateSpotlight(light, worldPos, normal);
    } else {
        // Directional light
        return calculateDirectionalLight(light, worldPos, normal);
    }
}

fn calculatePointLight(light: Light, worldPos: vec3f, normal: vec3f) -> vec3f {
    let lightDir = light.position - worldPos;
    let distance = length(lightDir);

    // Early out if beyond radius
    if (distance > light.radius) {
        return vec3f(0.0);
    }

    let L = normalize(lightDir);

    // Diffuse lighting
    let NdotL = max(dot(normal, L), 0.0);

    // Attenuation (inverse square with radius fadeout)
    let attenuation = 1.0 - smoothstep(light.radius * 0.75, light.radius, distance);
    let falloff = attenuation / (1.0 + distance * distance * 0.01);

    return light.color * light.intensity * NdotL * falloff;
}

fn calculateSpotlight(light: Light, worldPos: vec3f, normal: vec3f) -> vec3f {
    let lightDir = light.position - worldPos;
    let distance = length(lightDir);

    // Early out if beyond radius
    if (distance > light.radius) {
        return vec3f(0.0);
    }

    let L = normalize(lightDir);
    let spotDir = normalize(light.direction);

    // Spotlight cone attenuation
    let cosAngle = dot(-L, spotDir);
    let coneAngle = cos(light.coneAngle * 0.5);
    let coneFalloff = smoothstep(coneAngle - 0.1, coneAngle, cosAngle);

    if (coneFalloff <= 0.0) {
        return vec3f(0.0);
    }

    // Diffuse lighting
    let NdotL = max(dot(normal, L), 0.0);

    // Attenuation
    let attenuation = 1.0 - smoothstep(light.radius * 0.75, light.radius, distance);
    let falloff = attenuation / (1.0 + distance * distance * 0.01);

    return light.color * light.intensity * NdotL * falloff * coneFalloff;
}

fn calculateDirectionalLight(light: Light, worldPos: vec3f, normal: vec3f) -> vec3f {
    let L = normalize(-light.direction);
    let NdotL = max(dot(normal, L), 0.0);

    return light.color * light.intensity * NdotL;
}

// ============================================================================
// Fallback Simple Lighting (when clustering disabled)
// ============================================================================

fn simpleLighting(input: VertexOutput) -> vec3f {
    // Simple directional light
    let light_dir = normalize(vec3f(1.0, 1.0, 1.0));
    let diffuse = max(dot(input.normal, light_dir), 0.0);

    return vec3f(diffuse * 0.7);
}
