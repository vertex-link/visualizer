// src/engine/rendering/camera/CameraComponent.ts

import Component from "../../../core/component/Component.ts";
import Actor from "../../../core/Actor.ts";
import { RequireComponent } from "../../../core/component/Decorators.ts";
import { TransformComponent, Mat4, Vec3, Quat } from "../components/TransformComponent.ts"; // Added Quat
import { Transform } from "../math/Transform.ts";

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
    private _transform!: TransformComponent; // Should be initialized by onDependenciesResolved

    private _viewMatrix: Mat4 = Transform.identity();
    private _projectionMatrix: Mat4 = Transform.identity();
    private _viewProjectionMatrix: Mat4 = Transform.identity();

    private _isViewDirty: boolean = true; // Start as true to force initial computation
    private _isProjectionDirty: boolean = true; // Start as true
    private _lastTransformVersion: number = -1;

    // Logging helpers (optional, can be removed after debugging)
    private _logCountView: number = 0;
    private _logCountProj: number = 0;


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

        // Initial dirty flags are set by onDependenciesResolved now.
    }

    protected onDependenciesResolved(): void {
        this._transform = this.actor.getComponent(TransformComponent)!;
        this.markViewDirty(); // Ensure matrices are computed on first use
        this.markProjectionDirty();
        this._lastTransformVersion = this._transform ? this._transform.version -1 : -1; // Ensure first checkDirty updates
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
        if (!this._transform) return; // Guard against missing transform

        const position = this._transform.position;
        const rotation = this._transform.rotation;

        const forward = Transform.transformQuat([0, 0, -1], rotation);
        const target = Transform.add(position, forward);
        const up = Transform.transformQuat([0, 1, 0], rotation);

        this._viewMatrix = Transform.lookAt(position, target, up);
        this._isViewDirty = false;
        this._lastTransformVersion = this._transform.version;

        this._logCountView++;
        if (this._logCountView % 60 === 1 && this.actor) {
            console.log(`[Camera:${this.actor.label}] View Matrix Updated:`, this._viewMatrix);
        }
    }

    private updateProjectionMatrix(): void {
        if (this.projectionType === ProjectionType.PERSPECTIVE) {
            const { fov, aspect, near, far } = this.perspectiveConfig;
            this._projectionMatrix = Transform.perspective(fov, aspect, near, far);
        } else {
            const { left, right, bottom, top, near, far } = this.orthographicConfig;
            this._projectionMatrix = Transform.orthographic(left, right, bottom, top, near, far);
        }
        this._isProjectionDirty = false;
        this._logCountProj++;
        if (this._logCountProj % 60 === 1 && this.actor) {
            console.log(`[Camera:${this.actor.label}] Projection Matrix Updated:`, this._projectionMatrix);
        }
    }

    /**
     * **REVISED checkDirty LOGIC**
     */
    private checkDirty(): void {
        if (!this._transform) { // Ensure transform component is available
            console.warn(`[CameraComponent] Transform not available for ${this.actor?.label}. Skipping matrix updates.`);
            return;
        }

        let needsVPRecompute = false;

        if (this._transform.version !== this._lastTransformVersion) {
            this.markViewDirty();
        }

        if (this._isViewDirty) {
            this.updateViewMatrix();
            needsVPRecompute = true;
        }
        if (this._isProjectionDirty) {
            this.updateProjectionMatrix();
            needsVPRecompute = true;
        }

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
        if (!this._transform) return [0,0,-1];
        return Transform.transformQuat([0, 0, -1], this._transform.rotation);
    }

    public getRightDirection(): Vec3 {
        if (!this._transform) return [1,0,0];
        return Transform.transformQuat([1, 0, 0], this._transform.rotation);
    }

    public getUpDirection(): Vec3 {
        if (!this._transform) return [0,1,0];
        return Transform.transformQuat([0, 1, 0], this._transform.rotation);
    }

    public screenToWorldRay(mouseX: number, mouseY: number, screenWidth: number, screenHeight: number): { origin: Vec3; direction: Vec3 } {
        console.warn("screenToWorldRay not implemented yet");
        return { origin: [0,0,0], direction: [0,0,-1]};
    }
}