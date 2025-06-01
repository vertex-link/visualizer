// examples/phase3/final-fix-main.ts - Ultimate fix for visible rotating cubes

import { ServiceRegistry } from '../../src/core/Service.ts';
import { Scene } from '../../src/core/scene/Scene.ts';
import Actor from '../../src/core/Actor.ts';
import { ProcessorRegistry } from '../../src/core/processor/ProcessorRegistry.ts';
import { WebGPUProcessor } from '../../src/engine/processors/WebGPUProcessor.ts';
import { TransformComponent } from '../../src/engine/rendering/components/TransformComponent.ts';
import { MeshRendererComponent } from '../../src/engine/rendering/components/MeshRendererComponent.ts';
import { CameraComponent, ProjectionType } from '../../src/engine/rendering/camera/CameraComponent.ts';
import { RotatingComponent } from './RotatingComponent.ts';
import {
    ResourceManager,
    IResourceManagerKey,
    createShaderHandle,
    createMaterialHandle
} from '../../src/engine/resources/ResourceManager.ts';

// CORRECTED SHADER - The key issue was likely in matrix multiplication order
const fixedCubeShader = `
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
}

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_pos: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
}

struct Uniforms {
    mvp: mat4x4<f32>,
    model: mat4x4<f32>,
    color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(vertex: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    
    // Transform vertex to world space
    let world_pos = uniforms.model * vec4<f32>(vertex.position, 1.0);
    
    // Transform to clip space using MVP matrix
    out.clip_position = uniforms.mvp * uniforms.model * vec4<f32>(vertex.position, 1.0);
    
    // Pass through other attributes
    out.world_pos = world_pos.xyz;
    out.normal = normalize((uniforms.model * vec4<f32>(vertex.normal, 0.0)).xyz);
    out.uv = vertex.uv;
    
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    // Simple but effective lighting
    let light_dir = normalize(vec3<f32>(1.0, 1.0, 1.0));
    let ambient = 0.4;
    let diffuse = max(dot(normalize(in.normal), light_dir), 0.0);
    let lighting = ambient + diffuse * 0.6;
    
    // Return the final color with lighting
    return vec4<f32>(uniforms.color.rgb * lighting, uniforms.color.a);
}
`;

function createMeshHandleFixed(
    manager: ResourceManager,
    name: string,
    geometry: { vertices: Float32Array; indices: Uint16Array }
) {
    const meshData = {
        vertices: geometry.vertices,
        indices: geometry.indices,
        vertexAttributes: [
            { name: 'position', size: 3, type: 'float32' as const, offset: 0 },
            { name: 'normal', size: 3, type: 'float32' as const, offset: 12 },
            { name: 'uv', size: 2, type: 'float32' as const, offset: 24 }
        ],
        vertexStride: 32,
        primitiveTopology: 'triangle-list' as const
    };

    console.log(`🔧 Creating FIXED mesh "${name}" with ${geometry.vertices.length / 8} vertices`);

    return manager.createResource('mesh', name, meshData);
}

function createBiggerCube(size: number = 2.0) { // Make it bigger!
    const half = size * 0.5;

    // 24 vertices for a cube with correct winding order
    const vertices = new Float32Array([
        // Front face (Z+) - Counter-clockwise from front view
        -half, -half,  half,  0,  0,  1,  0, 0,  // 0: bottom-left
        half, -half,  half,  0,  0,  1,  1, 0,  // 1: bottom-right
        half,  half,  half,  0,  0,  1,  1, 1,  // 2: top-right
        -half,  half,  half,  0,  0,  1,  0, 1,  // 3: top-left

        // Back face (Z-) - Counter-clockwise from back view
        half, -half, -half,  0,  0, -1,  0, 0,  // 4: bottom-left (from back)
        -half, -half, -half,  0,  0, -1,  1, 0,  // 5: bottom-right (from back)
        -half,  half, -half,  0,  0, -1,  1, 1,  // 6: top-right (from back)
        half,  half, -half,  0,  0, -1,  0, 1,  // 7: top-left (from back)

        // Right face (X+)
        half, -half,  half,  1,  0,  0,  0, 0,  // 8
        half, -half, -half,  1,  0,  0,  1, 0,  // 9
        half,  half, -half,  1,  0,  0,  1, 1,  // 10
        half,  half,  half,  1,  0,  0,  0, 1,  // 11

        // Left face (X-)
        -half, -half, -half, -1,  0,  0,  0, 0,  // 12
        -half, -half,  half, -1,  0,  0,  1, 0,  // 13
        -half,  half,  half, -1,  0,  0,  1, 1,  // 14
        -half,  half, -half, -1,  0,  0,  0, 1,  // 15

        // Top face (Y+)
        -half,  half,  half,  0,  1,  0,  0, 0,  // 16
        half,  half,  half,  0,  1,  0,  1, 0,  // 17
        half,  half, -half,  0,  1,  0,  1, 1,  // 18
        -half,  half, -half,  0,  1,  0,  0, 1,  // 19

        // Bottom face (Y-)
        -half, -half, -half,  0, -1,  0,  0, 0,  // 20
        half, -half, -half,  0, -1,  0,  1, 0,  // 21
        half, -half,  half,  0, -1,  0,  1, 1,  // 22
        -half, -half,  half,  0, -1,  0,  0, 1,  // 23
    ]);

    // Indices with correct winding order (counter-clockwise)
    const indices = new Uint16Array([
        // Front face
        0, 1, 2,    0, 2, 3,
        // Back face  
        4, 5, 6,    4, 6, 7,
        // Right face
        8, 9, 10,   8, 10, 11,
        // Left face
        12, 13, 14, 12, 14, 15,
        // Top face
        16, 17, 18, 16, 18, 19,
        // Bottom face
        20, 21, 22, 20, 22, 23
    ]);

    return { vertices, indices };
}

async function finalFixDemo() {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    const statusDiv = document.getElementById('status')!;

    function log(msg: string) {
        console.log(msg);
        statusDiv.textContent = msg;
    }

    try {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        log(`Canvas: ${canvas.width}x${canvas.height}`);

        // Setup services
        const resourceManager = new ResourceManager();
        await resourceManager.initialize();
        const serviceRegistry = new ServiceRegistry();
        serviceRegistry.register(IResourceManagerKey, resourceManager);

        // Setup WebGPU
        const processor = new WebGPUProcessor(canvas, "webgpu");
        await processor.initialize();
        const device = processor.getDevice()!;
        resourceManager.setDevice(device);

        // Setup scene
        const scene = new Scene("FinalFixCubes");
        processor.setScene(scene);
        ProcessorRegistry.register(processor);

        log("🚀 FINAL FIX: Creating bigger, brighter cubes...");

        // Create BIGGER cube geometry
        const cubeGeometry = createBiggerCube(3.0); // Much bigger!
        console.log(`🎯 BIG Cube Statistics:`);
        console.log(`   Vertex buffer: ${cubeGeometry.vertices.byteLength} bytes`);
        console.log(`   Index buffer: ${cubeGeometry.indices.byteLength} bytes`);
        console.log(`   Vertices: ${cubeGeometry.vertices.length / 8}`);
        console.log(`   Indices: ${cubeGeometry.indices.length}`);

        // Create shader with FIXED matrices
        const shaderHandle = createShaderHandle(resourceManager, "FinalFixShader", fixedCubeShader, fixedCubeShader);
        if (!shaderHandle) {
            throw new Error("Failed to create shader handle");
        }
        await shaderHandle.preload();

        const vertexLayout = {
            stride: 32,
            attributes: [
                { location: 0, format: 'float32x3' as const, offset: 0 },
                { location: 1, format: 'float32x3' as const, offset: 12 },
                { location: 2, format: 'float32x2' as const, offset: 24 }
            ]
        };

        // Create BRIGHT materials
        const materialPromises = [
            createMaterialHandle(resourceManager, "BrightRedMaterial", shaderHandle,
                { color: { type: 'vec4', size: 16, value: [1.0, 0.0, 0.0, 1.0] } }, vertexLayout),
            createMaterialHandle(resourceManager, "BrightGreenMaterial", shaderHandle,
                { color: { type: 'vec4', size: 16, value: [0.0, 1.0, 0.0, 1.0] } }, vertexLayout),
            createMaterialHandle(resourceManager, "BrightBlueMaterial", shaderHandle,
                { color: { type: 'vec4', size: 16, value: [0.0, 0.0, 1.0, 1.0] } }, vertexLayout)
        ];

        const materials = await Promise.all(materialPromises);
        if (materials.some(m => !m)) {
            throw new Error("Failed to create material handles");
        }

        // Create mesh
        const meshHandle = createMeshHandleFixed(resourceManager, "BigAlignedCube", cubeGeometry);
        if (!meshHandle) {
            throw new Error("Failed to create mesh handle");
        }

        // Preload and compile everything
        await Promise.all([
            ...materials.map(m => m!.preload()),
            meshHandle.preload()
        ]);

        const mesh = await meshHandle.get() as any;
        if (mesh?.setDevice) {
            mesh.setDevice(device);
            await mesh.compile();
        }

        const compiledMaterials = [];
        for (const materialHandle of materials) {
            const material = await materialHandle!.get() as any;
            if (material?.setDevice) {
                material.setDevice(device, 'bgra8unorm');
                await material.compile();
            }
            compiledMaterials.push(material);
        }

        log(`✅ Everything compiled! Mesh: ${mesh.isCompiled}, Materials: ${compiledMaterials.every(m => m.isCompiled)}`);

        // Final stats
        console.log(`📊 FINAL mesh verification:`);
        console.log(`   Vertex count: ${mesh.vertexCount}`);
        console.log(`   Index count: ${mesh.indexCount}`);
        console.log(`   Vertex stride: ${mesh.vertexStride} bytes`);

        // Create cubes with MUCH better spacing and positioning
        const cubeData = [
            { pos: [-6, 0, 0], name: "BigRed", matIdx: 0 },     // Far left
            { pos: [0, 0, 0], name: "BigGreen", matIdx: 1 },    // Center
            { pos: [6, 0, 0], name: "BigBlue", matIdx: 2 }      // Far right
        ];

        const cubes: Actor[] = [];

        for (let i = 0; i < cubeData.length; i++) {
            const { pos, name, matIdx } = cubeData[i];
            const cube = new Actor(name);

            // Transform with clear positioning
            const transform = cube.addComponent(TransformComponent);
            transform.setPosition(...pos);

            // Renderer
            cube.addComponent(MeshRendererComponent, {
                mesh: mesh,
                material: compiledMaterials[matIdx],
                enabled: true
            });

            // Slower rotation for easier tracking
            const rotator = cube.addComponent(RotatingComponent);
            rotator.speed = 0.5; // Same speed for all

            scene.addActor(cube);
            cubes.push(cube);

            console.log(`🎯 Created BIG ${name} at [${pos.join(', ')}]`);
        }

        // Camera positioned to DEFINITELY see the cubes
        const camera = new Actor("FinalCamera");
        const cameraTransform = camera.addComponent(TransformComponent);
        cameraTransform.setPosition(0, 2, 15); // Much further back!

        camera.addComponent(CameraComponent, {
            projectionType: ProjectionType.PERSPECTIVE,
            perspectiveConfig: {
                fov: Math.PI / 3, // 60 degrees
                aspect: canvas.width / canvas.height,
                near: 0.1,
                far: 1000.0 // Much larger far plane
            },
            isActive: true
        });

        scene.addActor(camera);
        console.log("📷 Camera positioned at [0, 2, 15] with wide FOV");

        // Wait a bit then start
        await new Promise(resolve => setTimeout(resolve, 500));
        processor.start();

        log("🎮 FINAL FIX demo running! HUGE bright cubes should be VERY visible!");

        // Enhanced debugging every few seconds
        setInterval(() => {
            const actorCount = Array.from(scene.getAllActors()).length;
            console.log(`🔍 FINAL DEBUG: ${actorCount} actors in scene`);

            // Check camera matrix
            const cam = camera.getComponent(CameraComponent);
            if (cam) {
                const viewMatrix = cam.getViewMatrix();
                const projMatrix = cam.getProjectionMatrix();
                console.log(`   Camera view matrix[12-15]: [${viewMatrix[12].toFixed(2)}, ${viewMatrix[13].toFixed(2)}, ${viewMatrix[14].toFixed(2)}, ${viewMatrix[15].toFixed(2)}]`);
                console.log(`   Camera proj matrix[0,5,10,15]: [${projMatrix[0].toFixed(2)}, ${projMatrix[5].toFixed(2)}, ${projMatrix[10].toFixed(2)}, ${projMatrix[15].toFixed(2)}]`);
            }

            cubes.forEach((cube, i) => {
                const transform = cube.getComponent(TransformComponent);
                const renderer = cube.getComponent(MeshRendererComponent);

                if (transform && renderer) {
                    const pos = transform.position;
                    const worldMatrix = transform.getWorldMatrix();
                    console.log(`   ${cube.label}: pos=[${pos[0].toFixed(1)}, ${pos[1].toFixed(1)}, ${pos[2].toFixed(1)}], world[12-14]=[${worldMatrix[12].toFixed(1)}, ${worldMatrix[13].toFixed(1)}, ${worldMatrix[14].toFixed(1)}], renderable=${renderer.isRenderable()}`);
                } else {
                    console.log(`   ${cube.label}: MISSING COMPONENTS!`);
                }
            });
        }, 3000);

    } catch (error) {
        log(`❌ FINAL FIX Error: ${error.message}`);
        console.error("Complete error:", error);
        console.error("Stack:", error.stack);
    }
}

finalFixDemo();