import {Actor, Component, RequireComponent} from "@vertex-link/acs";
import {Mat4, TransformComponent, Vec3} from "../../rendering/components/TransformComponent";
import {Transform} from "../../rendering/math/Transform";

export enum ProjectionType {
    PERSPECTIVE,
    ORTHOGRAPHIC,
}

export interface PerspectiveConfig {
    fov: number; // Radians
    aspect: number;
    near: number;
    far: number;
}

export interface OrthographicConfig {
    left: number;
    right: number;
    bottom: number;
    top: number;
    near: number;
    far: number;
}

export interface CameraConfig {
    projectionType: ProjectionType;
    perspectiveConfig?: PerspectiveConfig;
    orthographicConfig?: OrthographicConfig;
    isActive?: boolean;
    layerMask?: number;
}

export class CameraComponent extends Component {
    
    public projectionType: ProjectionType;
    public perspectiveConfig: PerspectiveConfig;
    public orthographicConfig: OrthographicConfig;
    public isActive: boolean = true;
    public layerMask: number = 0xFFFFFFFF;

    @RequireComponent(TransformComponent)
    private transform!: TransformComponent;

    private _viewMatrix: Mat4 = Transform.identity();
    private _projectionMatrix: Mat4 = Transform.identity();
    private _viewProjectionMatrix: Mat4 = Transform.identity();

    private _isViewDirty: boolean = true;
    private _isProjectionDirty: boolean = true;
    private _lastTransformVersion: number = -1;

    constructor(actor: Actor, config: CameraConfig) {
        super(actor);
        this.projectionType = config.projectionType;

        this.perspectiveConfig = config.perspectiveConfig || {
            fov: Math.PI / 4,
            aspect: 16 / 9,
            near: 0.1,
            far: 1000.0,
        };

        this.orthographicConfig = config.orthographicConfig || {
            left: -1, right: 1, bottom: -1, top: 1, near: 0.1, far: 1000.0
        };

        if (config.isActive !== undefined) this.isActive = config.isActive;
        if (config.layerMask !== undefined) this.layerMask = config.layerMask;
    }

    protected onDependenciesResolved(): void {
        // Transform is now guaranteed to be available
        this.transform = this.actor.getComponent(TransformComponent)!;

        // Force initial matrix computation
        this.markViewDirty();
        this.markProjectionDirty();
        this._lastTransformVersion = -1; // Force update on first frame

        console.log(`📷 Camera ${this.actor.label} initialized with transform`);
    }

    /**
     * Get transform component (safe access)
     */
    private getTransform(): TransformComponent | null {
        // During initialization, use the injected transform
        if (this.transform) return this.transform;

        // Fallback to manual lookup (shouldn't happen with proper deps)
        return this.actor.getComponent(TransformComponent);
    }

    public markViewDirty(): void {
        this._isViewDirty = true;
    }

    public markProjectionDirty(): void {
        this._isProjectionDirty = true;
    }

    public setAspectRatio(aspect: number): void {
        if (this.projectionType === ProjectionType.PERSPECTIVE) {
            this.perspectiveConfig.aspect = aspect;
        } else {
            const width = this.orthographicConfig.right - this.orthographicConfig.left;
            const height = width / aspect;
            this.orthographicConfig.top = height / 2;
            this.orthographicConfig.bottom = -height / 2;
        }
        this.markProjectionDirty();
    }

    private updateViewMatrix(): void {
        const transform = this.getTransform();
        if (!transform) {
            console.warn(`Camera ${this.actor.label} has no transform`);
            return;
        }

        const position = transform.position;
        const rotation = transform.rotation;

        const forward = Transform.transformQuat([0, 0, -1], rotation);
        const target = Transform.add(position, forward);
        const up = Transform.transformQuat([0, 1, 0], rotation);

        this._viewMatrix = Transform.lookAt(position, target, up);
        this._isViewDirty = false;
        this._lastTransformVersion = transform.version;
    }

    private updateProjectionMatrix(): void {
        if (this.projectionType === ProjectionType.PERSPECTIVE) {
            const {fov, aspect, near, far} = this.perspectiveConfig;
            this._projectionMatrix = Transform.perspective(fov, aspect, near, far);
        } else {
            const {left, right, bottom, top, near, far} = this.orthographicConfig;
            this._projectionMatrix = Transform.orthographic(left, right, bottom, top, near, far);
        }
        this._isProjectionDirty = false;
    }

    private checkDirty(): void {
        const transform = this.getTransform();
        if (!transform) {
            console.warn(`Camera ${this.actor.label} has no transform for matrix computation`);
            return;
        }

        let needsVPRecompute = false;

        // Check if transform changed
        if (transform.version !== this._lastTransformVersion) {
            this.markViewDirty();
        }

        // Update matrices if needed
        if (this._isViewDirty) {
            this.updateViewMatrix();
            needsVPRecompute = true;
        }
        if (this._isProjectionDirty) {
            this.updateProjectionMatrix();
            needsVPRecompute = true;
        }

        // Recompute view-projection if needed
        if (needsVPRecompute) {
            this._viewProjectionMatrix = Transform.multiply(this._projectionMatrix, this._viewMatrix);
        }
    }

    public getViewMatrix(): Mat4 {
        this.checkDirty();
        return this._viewMatrix;
    }

    public getProjectionMatrix(): Mat4 {
        this.checkDirty();
        return this._projectionMatrix;
    }

    public getViewProjectionMatrix(): Mat4 {
        this.checkDirty();
        return this._viewProjectionMatrix;
    }

    public getForwardDirection(): Vec3 {
        const transform = this.getTransform();
        if (!transform) return [0, 0, -1];
        return Transform.transformQuat([0, 0, -1], transform.rotation);
    }

    public getRightDirection(): Vec3 {
        const transform = this.getTransform();
        if (!transform) return [1, 0, 0];
        return Transform.transformQuat([1, 0, 0], transform.rotation);
    }

    public getUpDirection(): Vec3 {
        const transform = this.getTransform();
        if (!transform) return [0, 1, 0];
        return Transform.transformQuat([0, 1, 0], transform.rotation);
    }

    public screenToWorldRay(mouseX: number, mouseY: number, screenWidth: number, screenHeight: number): {
        origin: Vec3;
        direction: Vec3
    } {
        const transform = this.getTransform();
        if (!transform) {
            return {origin: [0, 0, 0], direction: [0, 0, -1]};
        }

        // Convert screen coordinates to NDC
        const ndcX = (mouseX / screenWidth) * 2 - 1;
        const ndcY = 1 - (mouseY / screenHeight) * 2; // Flip Y

        // For perspective camera
        if (this.projectionType === ProjectionType.PERSPECTIVE) {
            const invProj = Transform.invert(this._projectionMatrix);
            const invView = Transform.invert(this._viewMatrix);

            // Unproject near and far points
            const nearPoint = Transform.unproject([ndcX, ndcY, -1], invProj, invView);
            const farPoint = Transform.unproject([ndcX, ndcY, 1], invProj, invView);

            const direction = Transform.normalize(Transform.subtract(farPoint, nearPoint));
            return {origin: transform.position, direction};
        }

        // For orthographic camera
        // TODO: Implement orthographic ray casting
        return {origin: transform.position, direction: [0, 0, -1]};
    }
}