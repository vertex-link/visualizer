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

export class RenderManagerComponent extends Component {
    private scene: Scene;
    private renderService!: IRenderService;
    private assetService!: IAssetService;
    private serviceRegistry: ServiceRegistry;
    private frameCount: number = 0; // For logging once

    constructor(actor: Actor, scene: Scene, serviceRegistry: ServiceRegistry) {
        super(actor);
        this.scene = scene;
        this.serviceRegistry = serviceRegistry;
        this.renderService = this.serviceRegistry.resolve<IRenderService>(IRenderServiceKey)!;
        this.assetService = this.serviceRegistry.resolve<IAssetService>(IAssetServiceKey)!;
        if (!this.renderService) throw new Error("RenderService not found!");
        if (!this.assetService) throw new Error("AssetService not found!");
        console.log("RenderManagerComponent initialized.");
    }

    @RenderUpdate()
    public render(deltaTime: number): void {
        this.frameCount++;
        if (this.frameCount % 300 === 1) { // Log sparsely to avoid flooding
            console.log(`[RenderManager] Frame: ${this.frameCount}, DeltaTime: ${deltaTime.toFixed(4)}`);
        }

        if (!this.renderService || !this.renderService.isInitialized()) {
            if (this.frameCount % 300 === 1) console.warn("[RenderManager] RenderService not initialized or not active.");
            return;
        }
        if (this.renderService.isFrameActive() && this.frameCount % 300 === 1) {
            console.warn("[RenderManager] Frame already active. Skipping.");
            // return; // This might be too aggressive if isFrameActive is not reset properly.
        }


        const renderer = this.renderService.getRenderer();
        if (!renderer) {
            if (this.frameCount % 300 === 1) console.warn("[RenderManager] No renderer found.");
            return;
        }

        const activeCamera = this.findActiveCamera();
        if (!activeCamera) {
            if (this.frameCount % 300 === 1) console.warn("[RenderManager] No active camera found.");
            return;
        }

        const renderables = this.queryRenderables();
        if (renderables.length === 0) {
            // Sparsely log this too, it might be normal if scene is empty
            if (this.frameCount % 300 === 1) console.log("[RenderManager] No renderables found.");
            return;
        }
        if (this.frameCount % 300 === 1) console.log(`[RenderManager] Found ${renderables.length} renderables.`);


        if (!this.renderService.beginFrame()) {
            console.error("[RenderManager] Failed to begin frame");
            return;
        }

        const viewMatrix = activeCamera.getViewMatrix();
        const projectionMatrix = activeCamera.getProjectionMatrix();
        const viewProjectionMatrix = activeCamera.getViewProjectionMatrix();

        if (this.frameCount % 300 === 1) {
            console.log("[RenderManager] Active Camera VP Matrix:", viewProjectionMatrix);
        }

        for (const renderable of renderables) {
            const mesh = renderable.meshRenderer.mesh as MeshResource | null;
            const material = renderable.meshRenderer.material as MaterialResource | null;

            if (this.frameCount % 300 === 1 && renderable.meshRenderer.actor) {
                console.log(`[RenderManager] Processing renderable: ${renderable.meshRenderer.actor.label}`);
            }


            if (!mesh || !material) {
                if (this.frameCount % 300 === 1) console.warn("[RenderManager] Skipping renderable due to missing mesh or material.");
                continue;
            }
            if (!mesh.isLoaded() || !material.isLoaded()) {
                if (this.frameCount % 300 === 1) console.warn(`[RenderManager] Skipping ${renderable.meshRenderer.actor.label}: Mesh loaded: ${mesh.isLoaded()}, Material loaded: ${material.isLoaded()}`);
                continue;
            }
            if (!mesh.isCompiled || !material.isCompiled) {
                if (this.frameCount % 300 === 1) console.warn(`[RenderManager] Skipping ${renderable.meshRenderer.actor.label}: Mesh compiled: ${mesh.isCompiled}, Material compiled: ${material.isCompiled}`);
                continue;
            }


            const pipeline: IPipeline | null = material.getPipeline();
            const vertexBuffer: IBuffer | null = mesh.getVertexBuffer();
            const indexBuffer: IBuffer | null = mesh.getIndexBuffer();

            if (!pipeline || !vertexBuffer) {
                if (this.frameCount % 300 === 1) console.warn(`[RenderManager] Skipping ${renderable.meshRenderer.actor.label} due to missing pipeline or vertexBuffer.`);
                continue;
            }

            const worldMatrix = renderable.worldMatrix;
            const mvpMatrix = Transform.multiply(viewProjectionMatrix, worldMatrix);

            if (this.frameCount % 300 === 1) {
                console.log(`[RenderManager] ${renderable.meshRenderer.actor.label} - World Matrix:`, worldMatrix);
                console.log(`[RenderManager] ${renderable.meshRenderer.actor.label} - MVP Matrix:`, mvpMatrix);
                console.log(`[RenderManager] ${renderable.meshRenderer.actor.label} - Mesh Vertices: ${mesh.vertexCount}, Indices: ${mesh.indexCount}`);
            }

            material.setUniform("mvpMatrix", mvpMatrix as Float32Array);
            material.setUniform("modelMatrix", worldMatrix as Float32Array);
            const uniformBuffer = material.getUniformBuffer();

            if (uniformBuffer) {
                if (this.frameCount % 300 === 1) {
                    console.log(`[RenderManager] ${renderable.meshRenderer.actor.label} - UniformBuffer size: ${uniformBuffer.byteLength}`);
                    console.log(`[RenderManager] ${renderable.meshRenderer.actor.label} - Setting pipeline, uniforms, buffers, and drawing.`);
                }
                renderer.setPipeline(pipeline);
                renderer.setUniforms(0, uniformBuffer);
                renderer.setBuffer(0, vertexBuffer);

                if (indexBuffer && mesh.hasIndices) {
                    renderer.setBuffer(1, indexBuffer);
                    renderer.drawIndexed(mesh.indexCount);
                } else {
                    renderer.draw(mesh.vertexCount);
                }
                renderer.recordDrawCall(mesh.vertexCount, mesh.hasIndices ? mesh.indexCount : undefined);
            } else {
                if (this.frameCount % 300 === 1) console.warn(`[RenderManager] ${renderable.meshRenderer.actor.label} - UniformBuffer is null.`);
            }
        }

        this.renderService.endFrame();
    }

    // ... (keep findActiveCamera and queryRenderables) ...
    private findActiveCamera(): CameraComponent | null {
        const query = this.scene.query().withComponent(CameraComponent);
        const results = query.execute(this.scene);
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

        const results = query.execute(this.scene);
        const renderables: Renderable[] = [];

        for (const actor of results) {
            const transform = actor.getComponent(TransformComponent);
            const meshRenderer = actor.getComponent(MeshRendererComponent);

            // Ensure isRenderable is callable
            const mrComponent = meshRenderer as (MeshRendererComponent & { isRenderable?: () => boolean; });


            if (transform && mrComponent && typeof mrComponent.isRenderable === 'function' && mrComponent.isRenderable()) {
                renderables.push({
                    transform,
                    meshRenderer: mrComponent,
                    worldMatrix: transform.getWorldMatrix(),
                });
            } else if (this.frameCount % 300 === 1 && mrComponent && typeof mrComponent.isRenderable !== 'function'){
                console.warn(`[RenderManager] queryRenderables: ${actor.label}'s MeshRendererComponent is missing isRenderable or it's not a function.`);
            } else if (this.frameCount % 300 === 1 && mrComponent && !mrComponent.isRenderable()){
                console.warn(`[RenderManager] queryRenderables: ${actor.label} is not renderable. Mesh: ${mrComponent.mesh}, Material: ${mrComponent.material}, Enabled: ${mrComponent.enabled}`);
                if(mrComponent.mesh) console.log("Mesh loaded:", (mrComponent.mesh as MeshResource).isLoaded(), "Mesh compiled:", (mrComponent.mesh as MeshResource).isCompiled);
                if(mrComponent.material) console.log("Material loaded:", (mrComponent.material as MaterialResource).isLoaded(), "Material compiled:", (mrComponent.material as MaterialResource).isCompiled);
            }
        }
        return renderables;
    }
}