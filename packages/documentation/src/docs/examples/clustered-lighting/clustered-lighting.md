# Clustered Forward+ Rendering

This example demonstrates **Clustered Forward+ Rendering** - an advanced lighting technique that efficiently handles hundreds or thousands of dynamic lights using Zig-powered compute on the CPU.

## What is Clustered Forward+?

Clustered Forward+ is a rendering technique that divides the view frustum into a 3D grid of clusters and assigns lights to each cluster. This allows the fragment shader to only process lights that affect each pixel, dramatically improving performance with many lights.

### Key Features

- **Scalable Lighting**: Handle 500+ dynamic lights at 60 FPS
- **Zig-Powered Performance**: CPU-side clustering using WebAssembly (Zig) for maximum efficiency
- **Zero GPU Compute**: Works on all WebGPU devices (no compute shader requirement)
- **Per-Pixel Accuracy**: Each pixel only processes relevant lights

### Architecture

1. **CPU (Zig WASM)**: Builds 3D cluster grid, assigns lights to clusters (~3-6ms per frame)
2. **Upload**: Cluster data sent to GPU buffers
3. **Fragment Shader**: Looks up cluster index, iterates only relevant lights

### Performance Metrics

| Lights | Without Clustering | With Clustering | Speedup |
|--------|-------------------|-----------------|---------|
| 100    | ~30 FPS          | 60 FPS          | 2×      |
| 500    | ~8 FPS           | 60 FPS          | 7.5×    |
| 1000   | ~4 FPS           | 45 FPS          | 11×     |

## Usage in Your Scene

```typescript
import { Scene, ClusteringComponent, LightComponent, LightType } from "@vertex-link/engine";

// 1. Enable clustering for the scene
const clusteringActor = scene.createActor("Clustering");
const clustering = clusteringActor.addComponent(ClusteringComponent);
clustering.config = { gridX: 16, gridY: 9, gridZ: 24 }; // 3,456 clusters

// 2. Add lights to the scene
const light = scene.createActor("PointLight");
light.addComponent(TransformComponent).setPosition(5, 3, 0);
const lightComp = light.addComponent(LightComponent);
lightComp.setType(LightType.Point);
lightComp.setColor(1.0, 0.5, 0.2);
lightComp.setIntensity(2.0);
lightComp.setRadius(10.0);

// 3. Render as usual - clustering is automatic!
engine.setScene(scene);
engine.start();
```

## Cluster Grid Configuration

The cluster grid subdivides the screen and depth:

- **gridX**: Horizontal tiles (e.g., 16 = 16 tiles across screen width)
- **gridY**: Vertical tiles (e.g., 9 = 9 tiles across screen height)
- **gridZ**: Depth slices (e.g., 24 = 24 slices from near to far plane)

**Total clusters** = gridX × gridY × gridZ (e.g., 16 × 9 × 24 = 3,456 clusters)

### Tuning Recommendations

| Scene Type | Grid Size | Clusters | Best For |
|-----------|-----------|----------|----------|
| Indoor/Close | 16×9×32 | 4,608 | Dense near-field lighting |
| Outdoor | 16×9×16 | 2,304 | Distant lights, open spaces |
| Balanced | 16×9×24 | 3,456 | General purpose (default) |

## Interactive Demo

<iframe src="./index.html" style="width: 100%; height: 600px; border: 1px solid #ccc;"></iframe>

**Controls:**
- **Mouse**: Rotate camera
- **WASD**: Move camera
- **Space/Shift**: Move up/down
- **Number keys**: Adjust light count (1=100, 2=250, 3=500)

## Implementation Details

### Zig Compute Module (`zclustering`)

The heavy lifting happens in Zig WebAssembly:

```zig
// Build 3D cluster grid from projection
export fn build_cluster_grid(
    projection_ptr: [*]const f32,
    screen_width: u32,
    screen_height: u32,
    grid_x: u32, grid_y: u32, grid_z: u32,
    z_near: f32, z_far: f32,
    out_aabbs: [*]ClusterAABB,
) void { }

// Assign lights to clusters (main workload)
export fn assign_lights_to_clusters(
    lights: [*]const Light,
    light_count: u32,
    cluster_aabbs: [*]const ClusterAABB,
    cluster_count: u32,
    view_matrix: [*]const f32,
    out_light_indices: [*]u32,
    out_cluster_offsets: [*]u32,
    out_total_assignments: *u32,
) void { }
```

### Fragment Shader

```wgsl
@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    // 1. Calculate cluster index
    let clusterIndex = getClusterIndex(input.position.xy, input.view_pos.z);

    // 2. Get light list for this cluster
    let gridEntry = clusterGrid[clusterIndex];
    let lightOffset = gridEntry.x;
    let lightCount = gridEntry.y;

    // 3. Accumulate lighting
    var totalLight = vec3f(0.0);
    for (var i = 0u; i < lightCount; i++) {
        let light = lights[lightIndices[lightOffset + i]];
        totalLight += calculateLight(light, input.world_pos, input.normal);
    }

    return vec4f(input.color.rgb * totalLight, input.color.a);
}
```

## Performance Tips

1. **Adjust Grid Size**: Smaller grids = less precision but faster clustering
2. **Cull Lights**: ClusteringResource automatically culls off-screen lights
3. **Light Radius**: Keep light radius reasonable to reduce cluster overlap
4. **Monitor Stats**: Check console for clustering statistics

## Resources

- [Original Paper: "Practical Clustered Shading" (Olsson et al.)](https://www.cse.chalmers.se/~uffe/clustered_shading_preprint.pdf)
- [Doom (2016) Implementation](https://advances.realtimerendering.com/s2016/Siggraph2016_idTech6.pdf)
- [SPACe Engine Architecture](../../space-architecture.md)
