// examples/phase3/main.ts - No AssetService, Direct Resource Creation

import { ServiceRegistry } from '../../src/core/Service.ts';
import { Scene } from '../../src/core/scene/Scene.ts';
import Actor from '../../src/core/Actor.ts';
import { ProcessorRegistry } from '../../src/core/processor/ProcessorRegistry.ts';
import { WebGPUProcessor } from '../../src/engine/processors/WebGPUProcessor.ts';
import { TransformComponent } from '../../src/engine/rendering/components/TransformComponent.ts';
import { MeshRendererComponent } from '../../src/engine/rendering/components/MeshRendererComponent.ts';
import { PerspectiveCamera } from '../../src/engine/rendering/camera/PerspectiveCamera.ts';
import { RotatingComponent } from './RotatingComponent.ts';

// Direct resource imports
import { ShaderResource, ShaderDescriptor } from '../../src/engine/resources/ShaderResource.ts';
import { MaterialResource, UniformDescriptor } from '../../src/engine/resources/MaterialResource.ts';
import { MeshResource } from '../../src/engine/resources/MeshResource.ts';
import { GeometryUtils } from '../../src/engine/resources/GeometryUtils.ts';
import { VertexLayout } from '../../src/engine/rendering/interfaces/IPipeline.ts';

// --- Shader Source (Embedded) ---
const basicShaderSource = `
struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) color: vec3f,
}

struct Uniforms {
    mvpMatrix: mat4x4f,
    modelMatrix: mat4x4f,
    color: vec4f,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    
    // Transform position
    output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    
    // Pass world position
    let worldPos4 = uniforms.modelMatrix * vec4f(input.position, 1.0);
    output.worldPos = worldPos4.xyz;
    
    // Mix position-based color with uniform color
    let posColor = input.position * 0.5 + 0.5; // Normalize to 0-1 range
    output.color = mix(posColor, uniforms.color.rgb, 0.7);
    
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.color, 1.0);
}
`;

// --- Global Setup ---
const statusDiv = document.getElementById('status')!;
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

function logStatus(message: string) {
    console.log(message);
    statusDiv.textContent = message;
}

// --- Simplified Demo App ---
class SimplifiedDemoApp {
    private serviceRegistry = new ServiceRegistry();
    private scene = new Scene("HybridDemo");
    private webgpuProcessor!: WebGPUProcessor;

    async run() {
        try {
            logStatus("🚀 Starting Hybrid WebGPU Demo...");

            // 1. Setup WebGPU Processor (no more services!)
            await this.setupWebGPUProcessor();

            // 2. Create demo scene with direct resource creation
            await this.setupScene();

            // 3. Start rendering
            this.startRendering();

            logStatus("✅ Demo Running! WebGPUProcessor active");

        } catch (error) {
            logStatus(`❌ Error: ${error.message}`);
            console.error(error);
        }
    }

    private async setupWebGPUProcessor() {
        logStatus("⚡ Initializing WebGPUProcessor...");

        this.webgpuProcessor = new WebGPUProcessor(canvas, "webgpu");
        await this.webgpuProcessor.initialize();

        // Connect processor to scene
        this.webgpuProcessor.setScene(this.scene);

        // Register with ProcessorRegistry
        ProcessorRegistry.register(this.webgpuProcessor);

        console.log("✅ WebGPUProcessor ready");
    }

    private async setupScene() {
        logStatus("🎭 Creating demo scene with direct resources...");

        // Get device from processor for resource compilation
        const device = this.webgpuProcessor.getDevice();
        if (!device) {
            throw new Error("WebGPU device not available from processor");
        }

        // Create shader directly
        const shader = this.createBasicShader();
        await shader.load();
        shader.setDevice(device); // Set device for compilation
        await shader.compile();

        // Create material directly  
        const material = this.createBasicMaterial(shader);
        await material.load();
        material.setDevice(device, 'bgra8unorm'); // Set device for compilation
        await material.compile();

        // Create mesh directly
        const boxMesh = this.createBoxMesh();
        await boxMesh.load();
        boxMesh.setDevice(device); // Set device for compilation
        await boxMesh.compile();

        console.log("✅ Resources created and compiled");

        // Create multiple boxes that will be automatically batched
        for (let i = 0; i < 25; i++) {
            const box = new Actor(`Box_${i}`);

            // Position in grid
            const x = (i % 5) * 3 - 6;  // 5x5 grid
            const z = Math.floor(i / 5) * 3 - 6;

            const transform = box.addComponent(TransformComponent);
            transform.setPosition(x, 0, z);

            // Add mesh renderer (processor will automatically batch these)
            box.addComponent(MeshRendererComponent, {
                mesh: boxMesh,
                material: material,
                enabled: true
            });

            // Add rotation animation
            const rotator = box.addComponent(RotatingComponent);
            rotator.speed = 0.5 + Math.random() * 1.0; // Vary rotation speed

            this.scene.addActor(box);
        }

        // Create camera
        const camera = new PerspectiveCamera("MainCamera");
        camera.setPosition(0, 5, 15);
        camera.lookAt([0, 0, 0]);
        this.scene.addActor(camera);

        // IMPORTANT: Ensure all actors have their components fully initialized
        await this.waitForComponentInitialization();

        console.log(`✅ Scene created with ${this.scene.getActorCount()} actors`);
    }

    /**
     * Wait for all actors in the scene to have their components fully initialized
     */
    private async waitForComponentInitialization(): Promise<void> {
        logStatus("⏳ Waiting for component initialization...");

        const maxAttempts = 50; // 5 seconds at 100ms intervals
        let attempts = 0;

        while (attempts < maxAttempts) {
            let allInitialized = true;

            // Check all actors
            for (const actor of this.scene.getAllActors()) {
                if (!actor.allComponentsInitialized) {
                    console.log(`⏳ Waiting for ${actor.label} components to initialize...`);
                    console.log('Dependencies:', actor.getDependencyStatus());
                    allInitialized = false;
                    break;
                }
            }

            if (allInitialized) {
                console.log("✅ All components initialized!");
                return;
            }

            // Wait 100ms and try again
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        console.warn("⚠️ Component initialization timeout - some components may not be ready");
    }

    private startRendering() {
        logStatus("🎬 Starting render loop...");

        // Start the WebGPU processor - this handles everything now!
        this.webgpuProcessor.start();

        // Optional: Log render stats periodically
        setInterval(() => {
            const stats = this.webgpuProcessor.getResourcePool().getStats();
            console.log(`📊 GPU Resources: ${stats.buffers} buffers, ${stats.pipelines} pipelines, ${Math.round(stats.totalMemory/1024)}KB`);
        }, 5000);
    }

    // === Direct Resource Creation Methods ===

    private createBasicShader(): ShaderResource {
        const shader = new ShaderResource("BasicShader", this.serviceRegistry);

        const shaderDescriptor: ShaderDescriptor = {
            vertexSource: basicShaderSource,
            fragmentSource: basicShaderSource,
            entryPoints: {
                vertex: 'vs_main',
                fragment: 'fs_main'
            }
        };

        shader.setShaderData(shaderDescriptor);
        return shader;
    }

    private createBasicMaterial(shader: ShaderResource): MaterialResource {
        const material = new MaterialResource("BasicMaterial", this.serviceRegistry);

        // Identity matrices for initialization
        const identity = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);

        const uniforms: Record<string, UniformDescriptor> = {
            mvpMatrix: {
                type: 'mat4',
                size: 64,
                value: new Float32Array(identity)
            },
            modelMatrix: {
                type: 'mat4',
                size: 64,
                value: new Float32Array(identity)
            },
            color: {
                type: 'vec4',
                size: 16,
                value: new Float32Array([0.2, 0.8, 1.0, 1.0]) // Nice blue color
            }
        };

        const vertexLayout: VertexLayout = {
            stride: 32, // position(12) + normal(12) + uv(8)
            attributes: [
                { location: 0, format: 'float32x3', offset: 0 },  // position
                { location: 1, format: 'float32x3', offset: 12 }, // normal  
                { location: 2, format: 'float32x2', offset: 24 }  // uv
            ]
        };

        material.setMaterialData({
            shader,
            uniforms,
            vertexLayout,
            renderState: {
                cullMode: 'back',
                depthWrite: true,
                depthTest: true,
                blendMode: 'none'
            }
        });

        return material;
    }

    private createBoxMesh(): MeshResource {
        const mesh = new MeshResource("DemoBox", this.serviceRegistry);

        // Create box geometry using GeometryUtils
        const boxDescriptor = GeometryUtils.createBox(1.0, 1.0, 1.0, true, true);
        mesh.setMeshData(boxDescriptor);

        return mesh;
    }
}

// --- Run the App ---
const app = new SimplifiedDemoApp();
app.run();