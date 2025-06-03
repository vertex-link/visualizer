import {Actor, Component, ProcessorRegistry, RequireComponent} from "@vertex-link/acs";
import {TransformComponent} from "../../rendering/components/TransformComponent";
import {WebGPUProcessor, WebGPUUpdate} from "../../processors/WebGPUProcessor";

export interface MeshResource {
    readonly id: string;
    readonly vertexCount: number;
    readonly indexCount?: number;
    readonly hasIndices: boolean;
    isLoaded(): boolean;
    isCompiled: boolean;
    compile(): Promise<void>;
    getVertexBuffer(): GPUBuffer | null;
    getIndexBuffer(): GPUBuffer | null;
}

export interface MaterialResource {
    readonly id: string;
    readonly name: string;
    isLoaded(): boolean;
    isCompiled: boolean;
    compile(): Promise<void>;
    getPipeline(): GPURenderPipeline | null;
    getUniformBuffer?(): ArrayBuffer | null;
}

/**
 * Component that makes an Actor renderable by associating it with mesh and material resources.
 * Integrates directly with WebGPUProcessor for efficient batched rendering.
 */
export class MeshRendererComponent extends Component {
    /** The mesh resource containing geometry data */
    public mesh: MeshResource | null = null;

    /** The material resource containing shader and uniforms */
    public material: MaterialResource | null = null;

    /** Whether this renderer is currently enabled */
    public enabled: boolean = true;

    /** Render layer/priority (for sorting) */
    public layer: number = 0;

    // Processor integration
    private lastUpdateFrame = -1;
    private isVisible = true;

    @RequireComponent(TransformComponent)
    private transform!: TransformComponent;

    constructor(
        actor: Actor,
        config?: {
            mesh?: MeshResource;
            material?: MaterialResource;
            enabled?: boolean;
            layer?: number;
        }
    ) {
        super(actor);

        if (config?.mesh) this.mesh = config.mesh;
        if (config?.material) this.material = config.material;
        if (config?.enabled !== undefined) this.enabled = config.enabled;
        if (config?.layer !== undefined) this.layer = config.layer;
    }

    /**
     * WebGPU processor integration - called every frame by WebGPUProcessor
     * This method is called during the render batching phase
     */
    @WebGPUUpdate()
    updateForRender(deltaTime: number): void {
        if (!this.enabled || !this.isRenderable()) {
            return;
        }

        // Mark transform as used this frame (for batching optimization)
        this.lastUpdateFrame = performance.now();

        // Ensure resources are compiled
        this.ensureResourcesCompiled();

        // Processor will automatically batch this component based on material
        // No direct GPU calls here - that's handled by the render graph
    }

    /**
     * Set the mesh resource for this renderer.
     */
    setMesh(mesh: MeshResource): void {
        this.mesh = mesh;
        this.markDirty();
    }

    /**
     * Set the material resource for this renderer.
     */
    setMaterial(material: MaterialResource): void {
        this.material = material;
        this.markDirty();
    }

    /**
     * Check if this renderer is ready to be rendered.
     * Requires both mesh and material to be loaded and compiled.
     */
    isRenderable(): boolean {
        return this.enabled &&
            this.isVisible &&
            this.mesh !== null &&
            this.material !== null &&
            this.mesh.isLoaded() &&
            this.material.isLoaded() &&
            this.mesh.isCompiled &&
            this.material.isCompiled;
    }

    /**
     * Get the transform component (guaranteed to exist due to @RequireComponent).
     */
    getTransform(): TransformComponent {
        return this.transform;
    }

    /**
     * Get batch key for efficient batching by the processor
     */
    getBatchKey(): string {
        if (!this.material || !this.mesh) return 'invalid';

        return `${this.material.id}_${this.layer}_${this.getVertexLayoutHash()}`;
    }

    /**
     * Set visibility (for frustum culling, etc.)
     */
    setVisible(visible: boolean): void {
        if (this.isVisible !== visible) {
            this.isVisible = visible;
            this.markDirty();
        }
    }

    /**
     * Check if visible
     */
    getVisible(): boolean {
        return this.isVisible;
    }

    /**
     * Get render priority for sorting
     */
    getRenderPriority(): number {
        // Higher layer = render later (for transparency)
        return this.layer * 1000 + (this.material?.id.hashCode() || 0);
    }

    protected onDependenciesResolved(): void {
        // Transform component is now available
        // Any initialization that requires transform can go here
        this.transform = this.actor.getComponent(TransformComponent)!;
        console.log(`✅ MeshRenderer initialized for ${this.actor.label}`);
    }

    /**
     * Cleanup when component is removed
     */
    public dispose(): void {
        // Let the processor know this component is gone
        this.markDirty();
        super.dispose();
    }

    // === Private Methods ===

    /**
     * Ensure GPU resources are compiled
     */
    private async ensureResourcesCompiled(): Promise<void> {
        try {
            if (this.mesh && !this.mesh.isCompiled) {
                await this.mesh.compile();
            }
            if (this.material && !this.material.isCompiled) {
                await this.material.compile();
            }
        } catch (error) {
            console.error(`❌ Failed to compile resources for ${this.actor.label}:`, error);
        }
    }

    /**
     * Mark render data as dirty (forces processor to re-batch)
     */
    private markDirty(): void {
        // Find WebGPUProcessor and mark it dirty
        // This is a simple implementation - in practice you might use events
        const processor = ProcessorRegistry.get("webgpu") as WebGPUProcessor;
        if (processor) {
            processor.markDirty();
        }
    }

    /**
     * Get vertex layout hash for batching
     */
    private getVertexLayoutHash(): string {
        // This would be based on the mesh's vertex layout
        // For now, return a simple hash
        return this.mesh?.id.slice(-8) || 'default';
    }
}

// Extend String prototype for hash codes (used in getBatchKey)
declare global {
    interface String {
        hashCode(): number;
    }
}

if (!String.prototype.hashCode) {
    String.prototype.hashCode = function(): number {
        let hash = 0;
        for (let i = 0; i < this.length; i++) {
            const char = this.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    };
}