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
import { RenderManagerComponent } from '../../src/engine/rendering/systems/RenderManagerComponent.ts'; // Ensure this path is correct
import { ShaderDescriptor } from '../../src/engine/resources/ShaderResource.ts';
import { RotatingComponent } from './RotatingComponent.ts';
import { WebGPURenderer } from '../../src/webgpu/WebGPURenderer.ts';
import {CameraComponent} from "../../src/engine/rendering/camera/CameraComponent.ts";

// --- Global Setup ---
const statusDiv = document.getElementById('status')!;
const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

function logStatus(message: string) {
    console.log(message);
    statusDiv.textContent = message;
}
// --- Shader Source (Embedded for simplicity) ---
const basicShaderSource = `
// Debug shader to test if geometry is rendering at all
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
    
    // Debug: Use position as color to see if vertices are transformed
    output.color = input.position * 0.5 + 0.5; // Normalize to 0-1 range
    
    return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4f {
    // Debug: Mix position-based color with uniform color
    let debugColor = mix(input.color, uniforms.color.rgb, 0.7);
    return vec4f(debugColor, 1.0);
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
        cameraActor.setPosition(0, 2, 10); // Position the camera
        cameraActor.lookAt([0, 0, 0]);
        console.log(cameraActor);
        const mainCameraComponent = cameraActor.getComponent(CameraComponent);
        if (mainCameraComponent) {
            const updateCameraAspect = () => {
                if (canvas.clientWidth > 0 && canvas.clientHeight > 0) { // Use clientWidth/Height
                    const newAspect = canvas.clientWidth / canvas.clientHeight;
                    if (mainCameraComponent.perspectiveConfig.aspect !== newAspect) {
                        mainCameraComponent.setAspectRatio(newAspect);
                        console.log(`[DemoApp] Camera aspect ratio updated to: ${newAspect.toFixed(2)} (Canvas: ${canvas.clientWidth}x${canvas.clientHeight})`);
                    }
                }
            };

            // Initial set
            updateCameraAspect();

            // Observe canvas resize
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) { // eslint-disable-line @typescript-eslint/no-unused-vars
                    updateCameraAspect();
                }
            });
            resizeObserver.observe(canvas);
        }
        
        this.scene.addActor(cameraActor);

        // 6. Create Scene Manager Actor
        logStatus("Creating render manager...");
        const sceneManager = new Actor("SceneManager");
        sceneManager.addComponent(RenderManagerComponent, this.scene, this.serviceRegistry);
        this.scene.addActor(sceneManager);
        
        console.log(this.scene);
        
        logStatus("Scene setup complete.");
    }
}

// --- Run the App ---
const app = new DemoApp();
app.run(); 