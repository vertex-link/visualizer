// src/engine/rendering/components/MeshRendererComponent.ts

import Component from "../../../core/component/Component.ts";
import Actor from "../../../core/Actor.ts";
import { RequireComponent } from "../../../core/component/Decorators.ts";
import { TransformComponent } from "./TransformComponent.ts";

// Forward declarations for resources (will be implemented in Phase 2)
export interface MeshResource {
    readonly id: string;
    readonly vertexCount: number;
    readonly indexCount?: number;
    isLoaded(): boolean;
}

export interface MaterialResource {
    readonly id: string;
    isLoaded(): boolean;
}

/**
 * Component that makes an Actor renderable by associating it with mesh and material resources.
 * Automatically requires a TransformComponent for positioning.
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

    @RequireComponent(TransformComponent)
    private transform: TransformComponent;

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

        if (config?.mesh) {
            this.mesh = config.mesh;
        }
        if (config?.material) {
            this.material = config.material;
        }
        if (config?.enabled !== undefined) {
            this.enabled = config.enabled;
        }
        if (config?.layer !== undefined) {
            this.layer = config.layer;
        }
    }

    /**
     * Set the mesh resource for this renderer.
     */
    setMesh(mesh: MeshResource): void {
        this.mesh = mesh;
    }

    /**
     * Set the material resource for this renderer.
     */
    setMaterial(material: MaterialResource): void {
        this.material = material;
    }

    /**
     * Check if this renderer is ready to be rendered.
     * Requires both mesh and material to be loaded.
     */
    isRenderable(): boolean {
        return this.enabled &&
            this.mesh !== null &&
            this.material !== null &&
            this.mesh.isLoaded() &&
            this.material.isLoaded();
    }

    /**
     * Get the transform component (guaranteed to exist due to @RequireComponent).
     */
    getTransform(): TransformComponent {
        return this.actor.getComponent(TransformComponent)!;
    }

    protected onDependenciesResolved(): void {
        // Transform component is now available
        // Any initialization that requires transform can go here
    }
}