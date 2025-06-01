// Type definitions for render graph system
export interface RenderBatch {
    material: any; // MaterialResource
    instances: any[]; // MeshRendererComponent[]
    pipeline?: GPURenderPipeline;
    bindGroup?: GPUBindGroup;
}

export interface RenderPassContext {
    renderer: any; // WebGPURenderer
    batches: RenderBatch[];
    camera: any; // CameraComponent
    deltaTime: number;
}

/**
 * Base render pass with improved flexibility
 */
export abstract class RenderPass {
    public name: string;
    public enabled: boolean = true;
    public priority: number = 0; // Lower numbers execute first

    // Dependencies and outputs
    public inputTargets: string[] = [];
    public outputTargets: string[] = [];

    constructor(name: string, priority: number = 0) {
        this.name = name;
        this.priority = priority;
    }

    /**
     * Called once when pass is added to graph
     */
    initialize(device: GPUDevice): void {
        // Override in subclasses
    }

    /**
     * Execute the render pass
     */
    abstract execute(context: RenderPassContext): void;

    /**
     * Cleanup resources
     */
    dispose(): void {
        // Override in subclasses
    }
}

/**
 * Main render graph that manages render passes
 */
export class RenderGraph {
    private passes: RenderPass[] = [];
    private device: GPUDevice | null = null;

    constructor() {
        // Add default passes
        this.addPass(new ForwardPass(10));
        this.addPass(new PostProcessPass(100));
    }

    /**
     * Add a render pass to the graph
     */
    addPass(pass: RenderPass): void {
        this.passes.push(pass);
        
        // Sort by priority (lower numbers first)
        this.passes.sort((a, b) => a.priority - b.priority);
        
        // Initialize if device is available
        if (this.device) {
            pass.initialize(this.device);
        }

        console.log(`➕ Added render pass: ${pass.name} (priority: ${pass.priority})`);
    }

    /**
     * Remove a render pass
     */
    removePass(name: string): boolean {
        const index = this.passes.findIndex(pass => pass.name === name);
        if (index >= 0) {
            const pass = this.passes[index];
            pass.dispose();
            this.passes.splice(index, 1);
            console.log(`➖ Removed render pass: ${name}`);
            return true;
        }
        return false;
    }

    /**
     * Initialize the render graph with GPU device
     */
    initialize(device: GPUDevice): void {
        this.device = device;
        
        // Initialize all passes
        for (const pass of this.passes) {
            pass.initialize(device);
        }

        console.log("📊 Configured render graph for forward rendering");
    }

    /**
     * Execute all enabled render passes
     */
    execute(renderer: any, batches: RenderBatch[], camera: any, deltaTime: number): void {
        if (!this.device) {
            console.warn("⚠️ RenderGraph: No device set, skipping execution");
            return;
        }

        const context: RenderPassContext = {
            renderer,
            batches,
            camera,
            deltaTime
        };

        // Execute passes in priority order
        for (const pass of this.passes) {
            if (!pass.enabled) continue;

            try {
                pass.execute(context);
            } catch (error) {
                console.error(`❌ ${pass.name} error:`, error);
            }
        }
    }

    /**
     * Get all passes
     */
    getPasses(): RenderPass[] {
        return [...this.passes];
    }

    /**
     * Get pass by name
     */
    getPass(name: string): RenderPass | null {
        return this.passes.find(pass => pass.name === name) || null;
    }

    /**
     * Enable/disable a pass
     */
    setPassEnabled(name: string, enabled: boolean): void {
        const pass = this.getPass(name);
        if (pass) {
            pass.enabled = enabled;
            console.log(`${enabled ? '✅' : '❌'} ${name} pass ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Dispose all resources
     */
    dispose(): void {
        for (const pass of this.passes) {
            pass.dispose();
        }
        this.passes.length = 0;
        this.device = null;
    }
}

/**
 * Forward rendering pass with improved pipeline handling
 */
export class ForwardPass extends RenderPass {
    constructor(priority: number = 10) {
        super("Forward", priority);
    }

    /**
     * Execute the forward rendering pass
     */
    execute(context: RenderPassContext): void {
        const { renderer, batches, camera } = context;
        
        if (!renderer || !camera) {
            console.warn("⚠️ ForwardPass: Missing renderer or camera");
            return;
        }

        if (batches.length === 0) {
            console.log("📋 ForwardPass: No batches to render");
            return;
        }

        // Begin frame rendering
        if (!renderer.beginFrame()) {
            console.error("❌ ForwardPass: Failed to begin frame");
            return;
        }

        try {
            console.log(`🎨 ForwardPass: Rendering ${batches.length} batches`);

            // Render each batch
            for (const batch of batches) {
                this.renderBatch(renderer, batch, camera);
            }

            console.log(`✅ ForwardPass: Completed rendering ${batches.length} batches`);

        } catch (error) {
            console.error("❌ ForwardPass: Rendering error:", error);
        } finally {
            // Always end the frame, even if there was an error
            renderer.endFrame();
        }
    }

    /**
     * Validate material and get pipeline with better error handling
     */
    private validateAndGetPipeline(batch: RenderBatch): GPURenderPipeline | null {
        const material = batch.material;

        // Check if material exists
        if (!material) {
            console.warn("❌ ForwardPass: Batch has no material");
            return null;
        }

        // Check if material has getPipeline method
        if (typeof material.getPipeline !== 'function') {
            console.error(`❌ ForwardPass: Material ${material.constructor.name} missing getPipeline method`);
            return null;
        }

        // Get pipeline
        const pipeline = material.getPipeline();
        
        // Validate pipeline
        if (!pipeline) {
            console.error(`❌ ForwardPass: Material ${material.constructor.name} getPipeline() returned null/undefined`);
            
            // Try to debug the material state
            if ('isCompiled' in material) {
                console.log(`Material compiled state: ${material.isCompiled}`);
            }
            if ('pipeline' in material) {
                console.log(`Material internal pipeline:`, material.pipeline);
            }
            
            return null;
        }

        // Validate that it's actually a GPURenderPipeline
        if (typeof pipeline !== 'object' || !pipeline.constructor || !pipeline.constructor.name.includes('GPURenderPipeline')) {
            console.error(`❌ ForwardPass: getPipeline() returned invalid type:`, typeof pipeline, pipeline);
            return null;
        }

        return pipeline;
    }


    /**
     * Setup uniform buffers for the batch
     */
    private setupUniforms(renderer: any, batch: RenderBatch, camera: any): void {
        const material = batch.material;

        // Get uniform data from material
        const materialUniformBuffer = material.getUniformBuffer?.();
        if (!materialUniformBuffer) {
            console.warn(`⚠️ ForwardPass: Material ${material.constructor.name} has no uniform buffer`);
            return;
        }

        try {
            // Get pipeline to determine required buffer size
            const pipeline = material.getPipeline();
            if (!pipeline) {
                console.error("❌ ForwardPass: No pipeline for bind group creation");
                return;
            }

            // Create a complete uniform buffer with camera data
            const cameraUniforms = this.createCameraUniforms(camera);
            const materialUniforms = new Uint8Array(materialUniformBuffer);

            // Calculate total required size (camera + material data)
            const cameraSize = cameraUniforms.byteLength;
            const materialSize = materialUniforms.byteLength;
            const totalSize = Math.max(cameraSize + materialSize, 144); // Ensure minimum 144 bytes
            const alignedSize = Math.ceil(totalSize / 16) * 16; // Align to 16-byte boundary

            // Create final buffer with camera and material data
            const finalBuffer = new ArrayBuffer(alignedSize);
            const finalView = new Uint8Array(finalBuffer);

            // Copy camera uniforms first (most shaders expect view/projection matrices first)
            finalView.set(new Uint8Array(cameraUniforms), 0);

            // Copy material uniforms after camera data
            finalView.set(materialUniforms, cameraSize);

            console.log(`🎥 Created unified uniform buffer: camera=${cameraSize}B, material=${materialSize}B, total=${alignedSize}B`);

            // Create GPU buffer for uniforms
            const gpuBuffer = renderer.createUniformBuffer(finalBuffer, `${material.constructor.name}_unified_uniforms`);

            // Create bind group for uniforms (assuming group 0)
            const device = renderer.getDevice();
            if (!device) {
                console.error("❌ ForwardPass: No GPU device available");
                return;
            }

            // Create bind group using the pipeline's layout
            const bindGroup = device.createBindGroup({
                label: `${material.constructor.name}_bindGroup`,
                layout: pipeline.getBindGroupLayout(0),
                entries: [{
                    binding: 0,
                    resource: {
                        buffer: gpuBuffer
                    }
                }]
            });

            // Set the bind group
            renderer.setBindGroup(0, bindGroup);

        } catch (error) {
            console.error("❌ ForwardPass: Error setting up uniforms:", error);
        }
    }


    /**
     * Create camera uniform data (view and projection matrices)
     */
    private createCameraUniforms(camera: any): ArrayBuffer {
        if (!camera) {
            console.warn("⚠️ ForwardPass: No camera provided, using identity matrices");
            // Return identity matrices as fallback
            const identityMatrix = new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);

            const buffer = new ArrayBuffer(128); // 2 x 4x4 matrices (64 bytes each)
            const view = new Float32Array(buffer);
            view.set(identityMatrix, 0);  // View matrix
            view.set(identityMatrix, 16); // Projection matrix
            return buffer;
        }

        try {

            if (camera.transform) {
                console.log(`📷 Camera transform:`, {
                    position: camera.transform.position,
                    rotation: camera.transform.rotation,
                    scale: camera.transform.scale
                });
            }

            // Get matrices from camera
            const viewMatrix = camera.getViewMatrix?.() || camera.viewMatrix;
            const projectionMatrix = camera.getProjectionMatrix?.() || camera.projectionMatrix;

            if (!viewMatrix || !projectionMatrix) {
                console.error("❌ Camera missing view or projection matrix:", {
                    hasView: !!viewMatrix,
                    hasProjection: !!projectionMatrix,
                    cameraType: camera.constructor.name
                });
            }

            // Create buffer for camera uniforms (view + projection matrices)
            const buffer = new ArrayBuffer(128); // 2 x 4x4 matrices
            const view = new Float32Array(buffer);

            // Copy view matrix (first 16 floats)
            if (viewMatrix) {
                view.set(viewMatrix, 0);
            }

            // Copy projection matrix (next 16 floats) 
            if (projectionMatrix) {
                view.set(projectionMatrix, 16);
            }

            console.log(`📊 Camera uniforms created:`, {
                viewMatrix: viewMatrix ? Array.from(viewMatrix.slice(0, 4)) + '...' : 'missing',
                projectionMatrix: projectionMatrix ? Array.from(projectionMatrix.slice(0, 4)) + '...' : 'missing',
                cameraPosition: camera.transform?.position || 'unknown'
            });


            return buffer;

        } catch (error) {
            console.error("❌ Error creating camera uniforms:", error);
            // Fallback to identity matrices
            return this.createCameraUniforms(null);
        }
    }



    /**
     * Render a single batch
     */
    private renderBatch(renderer: any, batch: RenderBatch, camera: any): void {
        // Set up pipeline and uniforms first
        this.setupPipeline(renderer, batch);
        this.setupUniforms(renderer, batch, camera);

        console.log(`🎭 Rendering batch with ${batch.instances.length} instances`);

        // Render each instance in the batch
        for (let i = 0; i < batch.instances.length; i++) {
            const instance = batch.instances[i];
            if (!instance.isRenderable()) {
                console.log(`⚠️ Instance ${i} not renderable`);
                continue;
            }

            const mesh = instance.mesh;
            if (!mesh || typeof mesh.getVertexBuffer !== 'function') {
                console.warn("⚠️ ForwardPass: Instance has invalid mesh");
                continue;
            }

            // Debug instance transform
            if (instance.transform) {
                const transform = instance.transform;
                console.log(`🎯 Instance ${i} transform:`, {
                    position: transform.position || 'no position',
                    rotation: transform.rotation || 'no rotation',
                    scale: transform.scale || 'no scale',
                    worldMatrix: transform.getWorldMatrix ? 'has worldMatrix()' : 'no worldMatrix()'
                });
            } else {
                console.log(`❌ Instance ${i} has no transform component`);
            }

            try {
                // Set vertex buffer
                const vertexBuffer = mesh.getVertexBuffer();
                if (vertexBuffer) {
                    renderer.setBuffer(0, vertexBuffer);
                    console.log(`📦 Set vertex buffer for instance ${i}`);
                }

                // Set index buffer if available
                const indexBuffer = mesh.getIndexBuffer?.();
                if (indexBuffer) {
                    renderer.setBuffer(1, indexBuffer);
                    console.log(`📑 Set index buffer for instance ${i}`);
                }

                // Debug mesh data
                const indexCount = mesh.indexCount || 0;
                const vertexCount = mesh.vertexCount || 0;
                console.log(`🔢 Instance ${i} mesh: ${vertexCount} vertices, ${indexCount} indices`);

                if (indexCount > 0) {
                    // Indexed draw
                    console.log(`🔺 Drawing indexed: ${indexCount} indices for instance ${i}`);
                    renderer.drawIndexed(indexCount);
                } else if (vertexCount > 0) {
                    // Non-indexed draw
                    console.log(`🔺 Drawing: ${vertexCount} vertices for instance ${i}`);
                    renderer.draw(vertexCount);
                } else {
                    console.warn(`⚠️ ForwardPass: Instance ${i} mesh has no vertices to draw`);
                }

            } catch (error) {
                console.error(`❌ ForwardPass: Error rendering instance ${i}:`, error);
            }
        }
    }

    /**
     * Setup render pipeline for the batch
     */
    private setupPipeline(renderer: any, batch: RenderBatch): void {
        const material = batch.material;
        const pipeline = material.getPipeline();
        
        if (!pipeline) {
            console.error("❌ ForwardPass: No pipeline available for material");
            return;
        }

        // Set the render pipeline
        renderer.setPipeline(pipeline);
        console.log(`🔧 Set pipeline for material: ${material.constructor.name}`);
    }
}

/**
 * Post-process pass (placeholder)
 */
export class PostProcessPass extends RenderPass {
    constructor(priority: number = 100) {
        super("PostProcess", priority);
    }

    execute(context: RenderPassContext): void {
        // Post-processing would go here
        // For now, this is just a placeholder
    }
}