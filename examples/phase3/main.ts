import { ServiceRegistry } from '../../src/core/Service.ts';
import { Scene } from '../../src/core/scene/Scene.ts';
import Actor from '../../src/core/Actor.ts';
import { ProcessorRegistry } from '../../src/core/processor/ProcessorRegistry.ts';
import { RenderProcessor } from '../../src/engine/processors/RenderProcessor.ts';
import { RenderService, IRenderServiceKey } from '../../src/engine/services/RenderService.ts';
import { AssetService, IAssetServiceKey } from '../../src/engine/services/AssetService.ts';
import { TransformComponent } from '../../src/engine/rendering/components/TransformComponent.ts';
import { MeshRendererComponent } from '../../src/engine/rendering/components/MeshRendererComponent.ts';
import { PerspectiveCamera } from '../../src/engine/rendering/camera/PerspectiveCamera.ts';
import { CameraComponent } from '../../src/engine/rendering/camera/CameraComponent.ts'; // Ensure this path is correct
import { RenderManagerComponent } from '../../src/engine/rendering/systems/RenderManagerComponent.ts'; // Ensure this path is correct
import { ShaderDescriptor } from '../../src/engine/resources/ShaderResource.ts';
import { RotatingComponent } from './RotatingComponent.ts';
import { WebGPURenderer } from '../../src/webgpu/WebGPURenderer.ts';

// --- Global Setup ---
const statusDiv = document.getElementById('status')!;
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

function logStatus(message: string) {
    console.log(message);
    statusDiv.textContent = message;
}

// --- Shader Source (Embedded for simplicity) ---
const basicShaderSource = `
struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f, // Added, even if not used, matches GeometryUtils
    @location(2) uv: vec2f,     // Added
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) worldPos: vec3f,
    @location(1) normal: vec3f,
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
    output.position = uniforms.mvpMatrix * vec4f(input.position, 1.0);
    let worldPos4 = uniforms.modelMatrix * vec4f(input.position, 1.0);
    output.worldPos = worldPos4.xyz;
    output.normal = (uniforms.modelMatrix * vec4f(input.normal, 0.0)).xyz; // Added
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    let lightDir = normalize(vec3f(0.5, 1.0, 0.5));
    let normal = normalize(input.normal);
    let diffuse = max(dot(normal, lightDir), 0.2) * 0.7;
    let gradientFactor = (input.worldPos.y + 1.0) * 0.5;
    let gradientColor = mix(
        vec3f(0.2, 0.3, 0.8),
        vec3f(0.8, 0.9, 1.0),
        gradientFactor
    );
    let finalColor = mix(gradientColor, uniforms.color.rgb, 0.5) * diffuse + uniforms.color.rgb * 0.1;
    return vec4f(finalColor, uniforms.color.a);
}
`;


// --- Main Application Logic ---
class DemoApp {
    private serviceRegistry = new ServiceRegistry();
    private scene = new Scene("Phase3_Demo");
    private renderProcessor = new RenderProcessor("render");

    async run() {
        try {
            logStatus("Setting up core systems...");
            ProcessorRegistry.register(this.renderProcessor);

            logStatus("Registering services...");
            this.serviceRegistry.register(IRenderServiceKey, new RenderService(this.serviceRegistry));
            this.serviceRegistry.register(IAssetServiceKey, new AssetService(this.serviceRegistry));

            const renderService = this.serviceRegistry.resolve<RenderService>(IRenderServiceKey)!;
            const assetService = this.serviceRegistry.resolve<AssetService>(IAssetServiceKey)!;

            logStatus("Initializing Render Service...");
            await renderService.initialize({ canvas });

            // Make sure the renderer knows about the render service
            const renderer = renderService.getRenderer() as WebGPURenderer;
            if (renderer && typeof renderer.setRenderService === 'function') {
                renderer.setRenderService(renderService);
            }


            logStatus("Setting up scene...");
            await this.setupScene(assetService);

            logStatus("Starting Render Processor...");
            this.renderProcessor.start();

            logStatus("✅ Demo Running!");

        } catch (error) {
            logStatus(`❌ Error: ${error.message}`);
            console.error(error);
        }
    }

    private async setupScene(assetService: IAssetService) {
        // 1. Create Shader
        logStatus("Creating shader...");
        const shaderDescriptor: ShaderDescriptor = {
            vertexSource: basicShaderSource,
            fragmentSource: basicShaderSource,
            entryPoints: { vertex: 'vs_main', fragment: 'fs_main' }
        };
        const shader = await assetService.createShader("BasicShader", shaderDescriptor);
        await shader.compile(); // Manually compile

        // 2. Create Material
        logStatus("Creating material...");
        const material = await assetService.createBasicMaterial("BoxMaterial", shader, [1.0, 0.5, 0.0, 1.0]);
        await material.compile(); // Manually compile

        // 3. Create Mesh
        logStatus("Creating mesh...");
        const boxMesh = await assetService.createBoxMesh("DemoBox", 1.5, 1.5, 1.5);
        await boxMesh.compile(); // Manually compile

        // 4. Create Box Actor
        logStatus("Creating actor...");
        const boxActor = new Actor("RotatingBox");
        boxActor.addComponent(TransformComponent);
        boxActor.addComponent(MeshRendererComponent, { mesh: boxMesh, material: material });
        boxActor.addComponent(RotatingComponent); // Add our rotating component
        this.scene.addActor(boxActor);

        // 5. Create Camera Actor
        logStatus("Creating camera...");
        const cameraActor = new PerspectiveCamera("MainCamera", 45 * (Math.PI / 180), canvas.width / canvas.height, 0.1, 100);
        cameraActor.setPosition(0, 2, 5); // Position the camera
        cameraActor.lookAt([0, 0, 0]);
        this.scene.addActor(cameraActor);

        // 6. Create Scene Manager Actor
        logStatus("Creating render manager...");
        const sceneManager = new Actor("SceneManager");
        sceneManager.addComponent(RenderManagerComponent, this.scene, this.serviceRegistry);
        this.scene.addActor(sceneManager);

        // 7. Ensure dependencies are resolved (important after adding all actors/components)
        this.scene.getAllActors().forEach(actor => actor.resolveDependencies());

        logStatus("Scene setup complete.");
    }
}

// --- Run the App ---
const app = new DemoApp();
app.run(); 