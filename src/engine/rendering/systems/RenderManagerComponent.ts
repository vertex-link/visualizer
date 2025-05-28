// src/engine/rendering/systems/RenderManagerComponent.ts

import Component from "../../../core/component/Component.ts";
import Actor from "../../../core/Actor.ts";
import { Scene } from "../../../core/scene/Scene.ts";
import { RenderUpdate } from "../../processors/RenderProcessor.ts";
import { ServiceRegistry } from "../../../core/Service.ts";
import { IRenderService, IRenderServiceKey } from "../../services/RenderService.ts";
import { IAssetService, IAssetServiceKey } from "../../services/AssetService.ts";
import { MeshRendererComponent } from "../components/MeshRendererComponent.ts";
import { TransformComponent, Mat4 } from "../components/TransformComponent.ts";
import { CameraComponent } from "../camera/CameraComponent.ts";
import { Transform } from "../math/Transform.ts";
import { WebGPUBuffer } from "../../../webgpu/WebGPUBuffer.ts";
import { WebGPUPipeline } from "../../../webgpu/WebGPUPipeline.ts";
import { WebGPURenderer } from "../../../webgpu/WebGPURenderer.ts";


interface Renderable {
    transform: TransformComponent;
    meshRenderer: MeshRendererComponent;
    worldMatrix: Mat4;
}

export class RenderManagerComponent extends Component {
    private scene: Scene;
    private renderService!: IRenderService; // Assuming it will be available
    private assetService!: IAssetService;   // Assuming it will be available

    // We need access to the service registry to resolve services
    private serviceRegistry: ServiceRegistry;

    constructor(actor: Actor, scene: Scene, serviceRegistry: ServiceRegistry) {
        super(actor);
        this.scene = scene;
        this.serviceRegistry = serviceRegistry; // Store the registry

        // Resolve services on construction or initialization
        this.renderService = this.serviceRegistry.resolve<IRenderService>(IRenderServiceKey)!;
        this.assetService = this.serviceRegistry.resolve<IAssetService>(IAssetServiceKey)!;

        if (!this.renderService) {
            throw new Error("RenderManagerComponent: RenderService not found in registry!");
        }
        if (!this.assetService) {
            throw new Error("RenderManagerComponent: AssetService not found in registry!");
        }

        console.log("RenderManagerComponent initialized and services resolved.");
    }

    @RenderUpdate()
    public render(deltaTime: number): void {
        if (!this.renderService || !this.renderService.isInitialized() || this.renderService.isFrameActive()) {
            return;
        }

        const renderer = this.renderService.getRenderer() as WebGPURenderer | null;
        if (!renderer) return;

        // 1. Find Active Camera
        const activeCamera = this.findActiveCamera();
        if (!activeCamera) {
            console.warn("RenderManagerComponent: No active camera found in the scene.");
            return;
        }

        // 2. Query Renderables
        const renderables = this.queryRenderables();
        if (renderables.length === 0) {
            // console.log("No renderables found");
            return; // Nothing to render
        }


        // 3. Begin Frame
        if (!this.renderService.beginFrame()) {
            console.error("Failed to begin frame");
            return; // Failed to begin frame
        }

        const viewProjectionMatrix = activeCamera.getViewProjectionMatrix();

        // 4. TODO: Sorting & Batching (For now, just iterate)


        // 5. Render Loop
        for (const renderable of renderables) {
            const mesh = renderable.meshRenderer.mesh;
            const material = renderable.meshRenderer.material;

            if (!mesh || !material || !mesh.isCompiled || !material.isCompiled) {
                continue; // Skip if not ready
            }

            const pipeline = material.getPipeline() as WebGPUPipeline | null;
            const vertexBuffer = mesh.getVertexBuffer() as WebGPUBuffer | null;
            const indexBuffer = mesh.getIndexBuffer() as WebGPUBuffer | null;

            if (!pipeline || !vertexBuffer) {
                continue;
            }

            const mvpMatrix = Transform.multiply(viewProjectionMatrix, renderable.worldMatrix);

            // TODO: Update material's uniform buffer instead of creating new ones
            material.setUniform("mvpMatrix", mvpMatrix as Float32Array);
            material.setUniform("modelMatrix", renderable.worldMatrix as Float32Array);
            const uniformBuffer = material.getUniformBuffer();


            if (uniformBuffer) {
                // Set Pipeline
                renderer.setPipeline(pipeline.getGPURenderPipeline());

                // Set Uniforms (needs WebGPURenderer adjustment)
                renderer.setUniforms(0, uniformBuffer); // Binding 0 for now

                // Set Vertex Buffer
                renderer.setBuffer(0, vertexBuffer.getGPUBuffer());

                // Set Index Buffer & Draw
                if (indexBuffer && mesh.hasIndices) {
                    renderer.setBuffer(1, indexBuffer.getGPUBuffer());
                    renderer.drawIndexed(mesh.indexCount);
                } else {
                    renderer.draw(mesh.vertexCount);
                }
                this.renderService.getRenderer()?.recordDrawCall(mesh.vertexCount, mesh.hasIndices ? mesh.indexCount : undefined);
            }
        }

        // 6. End Frame
        this.renderService.endFrame();
    }

    private findActiveCamera(): CameraComponent | null {
        const query = this.scene.query().withComponent(CameraComponent);
        const results = query.execute(this.scene); // Execute against the scene
        for (const actor of results) {
            const cam = actor.getComponent(CameraComponent);
            if (cam && cam.isActive) {
                return cam;
            }
        }
        return null;
    }

    private queryRenderables(): Renderable[] {
        const query = this.scene.query()
            .withComponent(TransformComponent)
            .withComponent(MeshRendererComponent);

        const results = query.execute(this.scene); // Execute against the scene
        const renderables: Renderable[] = [];

        for (const actor of results) {
            const transform = actor.getComponent(TransformComponent);
            const meshRenderer = actor.getComponent(MeshRendererComponent);

            if (transform && meshRenderer && meshRenderer.isRenderable()) {
                renderables.push({
                    transform,
                    meshRenderer,
                    worldMatrix: transform.getWorldMatrix(),
                });
            }
        }
        return renderables;
    }
}