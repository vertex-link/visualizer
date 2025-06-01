// src/engine/rendering/RenderGraph.ts

import { CameraComponent } from "./camera/CameraComponent.ts";
import { MeshRendererComponent } from "./components/MeshRendererComponent.ts";
import { TransformComponent } from "./components/TransformComponent.ts"; // Added missing import
import { WebGPURenderer } from "../../webgpu/WebGPURenderer.ts";
import { Transform } from "./math/Transform.ts";

/**
 * Base render pass
 */
export abstract class RenderPass {
    public name: string;
    public enabled: boolean = true;

    constructor(name: string) {
        this.name = name;
    }

    abstract execute(
        renderer: WebGPURenderer,
        batches: RenderBatch[],
        camera: CameraComponent | null,
        deltaTime: number
    ): void;
}

/**
 * Render batch interface
 */
export interface RenderBatch {
    material: any; // MaterialResource
    instances: MeshRendererComponent[];
    pipeline?: GPURenderPipeline;
    bindGroup?: GPUBindGroup;
}

/**
 * Forward rendering pass - renders opaque geometry
 */
export class ForwardPass extends RenderPass {
    constructor() {
        super("Forward");
    }

    execute(renderer: WebGPURenderer, batches: RenderBatch[], camera: CameraComponent | null, deltaTime: number): void {
        if (!camera) {
            console.warn("⚠️ No active camera for ForwardPass");
            return;
        }

        const device = renderer.getDevice()!;

        // Begin frame
        if (!renderer.beginFrame()) {
            console.error("❌ Failed to begin frame");
            return;
        }

        try {
            const viewProjectionMatrix = camera.getViewProjectionMatrix();

            // Render each batch
            for (const batch of batches) {
                this.renderBatch(renderer, batch, viewProjectionMatrix);
            }

            console.log(`✅ ForwardPass rendered ${batches.length} batches`);

        } catch (error) {
            console.error("❌ ForwardPass error:", error);
        } finally {
            renderer.endFrame();
        }
    }

    private renderBatch(renderer: WebGPURenderer, batch: RenderBatch, viewProjectionMatrix: Float32Array): void {
        // Ensure GPU resources are compiled
        if (!this.ensureBatchCompiled(renderer, batch)) {
            return;
        }

        // Set shared pipeline and resources
        renderer.setPipeline(batch.pipeline!);

        // Render each instance in the batch
        for (const instance of batch.instances) {
            this.renderInstance(renderer, instance, batch, viewProjectionMatrix);
        }
    }

    private renderInstance(
        renderer: WebGPURenderer,
        instance: MeshRendererComponent,
        batch: RenderBatch,
        viewProjectionMatrix: Float32Array
    ): void {
        const mesh = instance.mesh;
        const transform = instance.actor.getComponent(TransformComponent);

        if (!mesh || !transform) return;

        // Calculate matrices
        const worldMatrix = transform.getWorldMatrix();
        const mvpMatrix = Transform.multiply(viewProjectionMatrix, worldMatrix);

        // Create properly aligned uniform data
        const uniformData = new ArrayBuffer(144); // 64 + 64 + 16 bytes aligned
        const view = new DataView(uniformData);

        // MVP Matrix (64 bytes)
        for (let i = 0; i < 16; i++) {
            view.setFloat32(i * 4, mvpMatrix[i], true);
        }

        // World Matrix (64 bytes, offset 64)  
        for (let i = 0; i < 16; i++) {
            view.setFloat32(64 + i * 4, worldMatrix[i], true);
        }

        // Color (16 bytes, offset 128)
        view.setFloat32(128, 1.0, true);  // R
        view.setFloat32(132, 0.5, true);  // G  
        view.setFloat32(136, 0.2, true);  // B
        view.setFloat32(140, 1.0, true);  // A

        // Create uniform buffer and bind group using the pipeline's layout
        const uniformBuffer = renderer.createUniformBuffer(uniformData, `Uniform_${instance.actor.label}`);

        // Get bind group layout from the compiled pipeline
        const pipeline = batch.pipeline!;
        const bindGroupLayout = pipeline.getBindGroupLayout(0);

        // Create bind group with proper layout
        const bindGroup = renderer.getDevice()!.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: uniformBuffer }
            }],
            label: `BindGroup_${instance.actor.label}`
        });

        // Set bind group and buffers
        renderer.setBindGroup(0, bindGroup);
        renderer.setBuffer(0, mesh.getVertexBuffer()!);

        // Draw
        if (mesh.hasIndices) {
            renderer.setBuffer(1, mesh.getIndexBuffer()!);
            renderer.drawIndexed(mesh.indexCount);
        } else {
            renderer.draw(mesh.vertexCount);
        }

        // Clean up temporary buffer (in production, you'd pool these)
        uniformBuffer.destroy();
    }

    private ensureBatchCompiled(renderer: WebGPURenderer, batch: RenderBatch): boolean {
        // Lazy compilation of GPU resources
        if (!batch.pipeline) {
            try {
                const material = batch.material;
                const mesh = batch.instances[0]?.mesh;

                if (!material || !mesh) return false;

                // Ensure resources are compiled
                if (!material.isCompiled) {
                    material.compile();
                }
                if (!mesh.isCompiled) {
                    mesh.compile();
                }

                // Get the compiled pipeline (should be WebGPUPipeline)
                const pipeline = material.getPipeline();
                if (!pipeline) {
                    console.error(`❌ Material ${material.name} has no compiled pipeline`);
                    return false;
                }

                // Store as GPURenderPipeline for direct use
                if (pipeline.isReady && pipeline.isReady()) {
                    batch.pipeline = (pipeline as any).getGPURenderPipeline();
                } else {
                    console.error(`❌ Pipeline not ready for material ${material.name}`);
                    return false;
                }

                console.log(`🔧 Compiled batch for material: ${material.name}`);
                return true;

            } catch (error) {
                console.error(`❌ Failed to compile batch:`, error);
                return false;
            }
        }

        return true;
    }
}

/**
 * Render graph manages execution of render passes
 */
export class RenderGraph {
    private passes: RenderPass[] = [];

    constructor() {
        // Default forward rendering setup
        this.addPass(new ForwardPass());
    }

    /**
     * Add a render pass
     */
    addPass(pass: RenderPass): void {
        this.passes.push(pass);
        console.log(`➕ Added render pass: ${pass.name}`);
    }

    /**
     * Remove a render pass
     */
    removePass(name: string): void {
        const index = this.passes.findIndex(p => p.name === name);
        if (index >= 0) {
            this.passes.splice(index, 1);
            console.log(`➖ Removed render pass: ${name}`);
        }
    }

    /**
     * Execute all enabled render passes
     */
    execute(renderer: WebGPURenderer, batches: RenderBatch[], camera: CameraComponent | null, deltaTime: number): void {
        // Execute each enabled pass with the provided camera
        for (const pass of this.passes) {
            if (pass.enabled) {
                try {
                    pass.execute(renderer, batches, camera, deltaTime);
                } catch (error) {
                    console.error(`❌ Error in render pass ${pass.name}:`, error);
                }
            }
        }
    }

    /**
     * Enable/disable a render pass
     */
    setPassEnabled(name: string, enabled: boolean): void {
        const pass = this.passes.find(p => p.name === name);
        if (pass) {
            pass.enabled = enabled;
            console.log(`${enabled ? '✅' : '❌'} ${name} pass ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get all render passes
     */
    getPasses(): RenderPass[] {
        return [...this.passes];
    }
}