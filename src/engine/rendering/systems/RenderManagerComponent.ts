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
import { WebGPURenderer } from "../../../webgpu/WebGPURenderer.ts";
import { MeshResource } from "../../resources/MeshResource.ts";
import { MaterialResource } from "../../resources/MaterialResource.ts";
import { IRenderer } from "../interfaces/IRenderer.ts";
import { IBuffer } from "../interfaces/IBuffer.ts"; // Added for vertex/index buffer types
import { IPipeline } from "../interfaces/IPipeline.ts"; // Added for pipeline type

interface Renderable {
    transform: TransformComponent;
    meshRenderer: MeshRendererComponent;
    worldMatrix: Mat4;
}
// src/engine/rendering/systems/RenderManagerComponent.ts - Simplified version

export class RenderManagerComponent extends Component {
    private scene: Scene;
    private renderService!: IRenderService;
    private assetService!: IAssetService;
    private serviceRegistry: ServiceRegistry;

    constructor(actor: Actor, scene: Scene, serviceRegistry: ServiceRegistry) {
        super(actor);
        this.scene = scene;
        this.serviceRegistry = serviceRegistry;
        this.renderService = this.serviceRegistry.resolve<IRenderService>(IRenderServiceKey)!;
        this.assetService = this.serviceRegistry.resolve<IAssetService>(IAssetServiceKey)!;

        if (!this.renderService || !this.assetService) {
            throw new Error("Required services not found!");
        }

        console.log("✅ RenderManagerComponent initialized");
    }

    @RenderUpdate()
    public render(deltaTime: number): void {
        // Early exit checks
        if (!this.renderService?.isInitialized()) {
            console.warn("⚠️ RenderService not ready");
            return;
        }

        const renderer = this.renderService.getRenderer();
        if (!renderer) {
            console.warn("⚠️ No renderer available");
            return;
        }

        // Find active camera
        const activeCamera = this.findActiveCamera();
        if (!activeCamera) {
            console.warn("⚠️ No active camera found");
            return;
        }

        // Query renderables
        const renderables = this.queryRenderables();
        if (renderables.length === 0) {
            console.log("ℹ️ No renderables in scene");
            return;
        }

        // Begin frame
        if (!this.renderService.beginFrame()) {
            console.error("❌ Failed to begin frame");
            return;
        }

        try {
            // Get camera matrices
            const viewProjectionMatrix = activeCamera.getViewProjectionMatrix();

            console.log(`🎬 Rendering ${renderables.length} objects`);

            // Render each object
            for (const renderable of renderables) {
                this.renderObject(renderer, renderable, viewProjectionMatrix);
            }

        } catch (error) {
            console.error("❌ Render error:", error);
        } finally {
            this.renderService.endFrame();
        }
    }

    private renderObject(renderer: IRenderer, renderable: Renderable, viewProjectionMatrix: Mat4): void {
        const mesh = renderable.meshRenderer.mesh as MeshResource;
        const material = renderable.meshRenderer.material as MaterialResource;

        // Validate resources
        if (!mesh?.isLoaded() || !material?.isLoaded()) {
            console.warn(`⚠️ Resources not loaded for ${renderable.meshRenderer.actor.label}`);
            return;
        }

        if (!mesh.isCompiled || !material.isCompiled) {
            console.warn(`⚠️ Resources not compiled for ${renderable.meshRenderer.actor.label}`);
            return;
        }

        const pipeline = material.getPipeline();
        const vertexBuffer = mesh.getVertexBuffer();
        const indexBuffer = mesh.getIndexBuffer();

        if (!pipeline || !vertexBuffer) {
            console.warn(`⚠️ Missing pipeline/buffers for ${renderable.meshRenderer.actor.label}`);
            return;
        }

        try {
            // Calculate matrices
            const worldMatrix = renderable.worldMatrix;
            const mvpMatrix = Transform.multiply(viewProjectionMatrix, worldMatrix);

            // Update material uniforms
            material.setUniform("mvpMatrix", mvpMatrix);
            material.setUniform("modelMatrix", worldMatrix);

            const uniformBuffer = material.getUniformBuffer();
            if (!uniformBuffer) {
                console.warn(`⚠️ No uniform buffer for ${renderable.meshRenderer.actor.label}`);
                return;
            }

            console.log(`🎯 Rendering ${renderable.meshRenderer.actor.label}: vertices=${mesh.vertexCount}, indices=${mesh.indexCount}`);

            // Set render state
            renderer.setPipeline(pipeline);
            renderer.setUniforms(0, uniformBuffer);
            renderer.setBuffer(0, vertexBuffer); // Vertex buffer

            // Draw
            if (indexBuffer && mesh.hasIndices) {
                renderer.setBuffer(1, indexBuffer); // Index buffer  
                renderer.drawIndexed(mesh.indexCount);
            } else {
                renderer.draw(mesh.vertexCount);
            }

        } catch (error) {
            console.error(`❌ Failed to render ${renderable.meshRenderer.actor.label}:`, error);
        }
    }

    private findActiveCamera(): CameraComponent | null {
        const query = this.scene.query().withComponent(CameraComponent);
        const results = query.execute();

        for (const actor of results) {
            const camera = actor.getComponent(CameraComponent);
            if (camera?.isActive) {
                console.log(`📷 Using camera: ${actor.label}`);
                return camera;
            }
        }
        return null;
    }

    private queryRenderables(): Renderable[] {
        const query = this.scene.query()
            .withComponent(TransformComponent)
            .withComponent(MeshRendererComponent);

        const results = query.execute();
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

                console.log(`✅ Found renderable: ${actor.label}`);
            } else {
                console.log(`❌ Skipping non-renderable: ${actor.label}`);
            }
        }

        return renderables;
    }
}