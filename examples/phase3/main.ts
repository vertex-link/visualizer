// examples/phase3/main.ts - Streamlined WebGPU Demo

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
    createMaterialHandle,
    createMeshHandle
} from '../../src/engine/resources/ResourceManager.ts';
import { GeometryUtils } from '../../src/engine/resources/GeometryUtils.ts';

// Shader source
const basicShaderSource = `
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) normal: vec3<f32>,
    @location(2) uv: vec2<f32>,
}

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) world_position: vec3<f32>,
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
    out.clip_position = uniforms.mvp * vec4<f32>(vertex.position, 1.0);
    out.world_position = (uniforms.model * vec4<f32>(vertex.position, 1.0)).xyz;
    out.normal = vertex.normal;
    out.uv = vertex.uv;
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let light_dir = normalize(vec3<f32>(1.0, 1.0, 1.0));
    let diffuse = max(dot(normalize(in.normal), light_dir), 0.2);
    return vec4<f32>(uniforms.color.rgb * diffuse, uniforms.color.a);
}
`;

// Global setup
const statusDiv = document.getElementById('status')!;
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

function logStatus(message: string) {
    console.log(message);
    statusDiv.textContent = message;
}

class ImprovedDemoApp {
    private serviceRegistry = new ServiceRegistry();
    private scene = new Scene("Demo");
    private webgpuProcessor!: WebGPUProcessor;
    private resourceManager!: ResourceManager;

    async run() {
        try {
            logStatus("🚀 Starting WebGPU Demo...");
            await this.setupServices();
            await this.setupWebGPUProcessor();
            await this.setupScene();
            this.startRendering();
            this.setupInteraction();
            logStatus("✅ Demo Running!");
        } catch (error) {
            logStatus(`❌ Error: ${error.message}`);
            console.error(error);
        }
    }

    private async setupServices() {
        logStatus("📦 Setting up services...");
        this.resourceManager = new ResourceManager();
        await this.resourceManager.initialize();
        this.serviceRegistry.register(IResourceManagerKey, this.resourceManager);
    }

    private async setupWebGPUProcessor() {
        logStatus("⚡ Initializing WebGPU...");
        this.webgpuProcessor = new WebGPUProcessor(canvas, "webgpu");
        await this.webgpuProcessor.initialize();

        const device = this.webgpuProcessor.getDevice();
        if (device) this.resourceManager.setDevice(device);

        this.webgpuProcessor.setScene(this.scene);
        ProcessorRegistry.register(this.webgpuProcessor);

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            this.webgpuProcessor.handleResize();
        });
    }

    private async setupScene() {
        logStatus("🎭 Creating demo scene...");

        // Create and load resources
        const shaderHandle = createShaderHandle(this.resourceManager, "BasicShader", basicShaderSource, basicShaderSource);
        await shaderHandle.preload();

        const vertexLayout = {
            stride: 32, // 8 floats * 4 bytes
            attributes: [
                { location: 0, format: 'float32x3' as const, offset: 0 },
                { location: 1, format: 'float32x3' as const, offset: 12 },
                { location: 2, format: 'float32x2' as const, offset: 24 }
            ]
        };

        const materialHandle = await createMaterialHandle(
            this.resourceManager,
            "BlueMaterial",
            shaderHandle,
            { color: { type: 'vec4', size: 16, value: [0.2, 0.6, 1.0, 1.0] } },
            vertexLayout
        );

        const boxGeometry = GeometryUtils.createBox(1.0, 1.0, 1.0, true, true);
        const boxMeshHandle = createMeshHandle(this.resourceManager, "BoxMesh", boxGeometry);

        await Promise.all([materialHandle.preload(), boxMeshHandle.preload()]);

        // Setup GPU resources
        const device = this.webgpuProcessor.getDevice()!;
        const materialResource = await materialHandle.get() as any;
        const meshResource = await boxMeshHandle.get() as any;

        if (materialResource?.setDevice) {
            materialResource.setDevice(device, 'bgra8unorm');
            await materialResource.compile();
        }
        if (meshResource?.setDevice) {
            meshResource.setDevice(device);
            await meshResource.compile();
        }

        const material = await materialHandle.get();
        const boxMesh = await boxMeshHandle.get();

        // Create grid of boxes
        const gridSize = 5;
        const spacing = 2.5;
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                const box = new Actor(`Box_${x}_${z}`);

                const transform = box.addComponent(TransformComponent);
                transform.setPosition((x - gridSize / 2) * spacing, 0, (z - gridSize / 2) * spacing);

                box.addComponent(MeshRendererComponent, { mesh: boxMesh, material: material, enabled: true });

                const rotator = box.addComponent(RotatingComponent);
                rotator.speed = 0.5 + Math.random() * 1.0;

                this.scene.addActor(box);
            }
        }

        // Create camera
        const camera = new Actor("MainCamera");
        const cameraTransform = camera.addComponent(TransformComponent);

        // Position camera to see the grid properly
        cameraTransform.setPosition(0, 8, 12);
        cameraTransform.setRotationEuler(-0.3, 0, 0); // Look down slightly

        camera.addComponent(CameraComponent, {
            projectionType: ProjectionType.PERSPECTIVE,
            perspectiveConfig: {
                fov: Math.PI / 4,
                aspect: canvas.width / canvas.height,
                near: 0.1,
                far: 100.0
            },
            isActive: true
        });

        this.scene.addActor(camera);

        // Wait for initialization
        await this.waitForInitialization();
        console.log(`✅ Scene created with ${this.scene.getActorCount()} actors`);
    }

    private async waitForInitialization(): Promise<void> {
        const maxWait = 5000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            const actors = this.scene.getAllActors();
            let allReady = true;
            let totalActors = 0;
            let readyActors = 0;

            if (Array.isArray(actors)) {
                totalActors = actors.length;
                for (const actor of actors) {
                    if (this.isActorReady(actor)) readyActors++;
                    else allReady = false;
                }
            } else if (actors instanceof Map) {
                totalActors = actors.size;
                for (const actor of actors.values()) {
                    if (this.isActorReady(actor)) readyActors++;
                    else allReady = false;
                }
            }

            if (allReady && totalActors > 0) return;
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }

    private isActorReady(actor: any): boolean {
        if (typeof actor.allComponentsInitialized === 'boolean') {
            return actor.allComponentsInitialized;
        }
        return true; // Assume ready if we can't check
    }

    private startRendering() {
        logStatus("🎬 Starting render loop...");
        const renderGraph = this.webgpuProcessor['renderGraph'];
        if (renderGraph?.configureForMode) {
            renderGraph.configureForMode('forward');
        }
        this.webgpuProcessor.start();
    }

    private setupInteraction() {
        let mouseDown = false;
        let lastMouseX = 0;
        let lastMouseY = 0;

        canvas.addEventListener('mousedown', (e) => {
            mouseDown = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => mouseDown = false);

        canvas.addEventListener('mousemove', (e) => {
            if (!mouseDown) return;

            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;

            // Simple camera orbit
            const camera = this.webgpuProcessor.getActiveCamera();
            if (camera) {
                const transform = camera.actor.getComponent(TransformComponent);
                if (transform) {
                    const speed = 0.01;
                    const euler = transform.getEulerAngles();
                    transform.setRotationEuler(
                        euler[0] - deltaY * speed,
                        euler[1] - deltaX * speed,
                        euler[2]
                    );
                }
            }

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });
    }
}

// Run the app
const app = new ImprovedDemoApp();
app.run();