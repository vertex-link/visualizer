// src/engine/rendering/components/TransformComponent.ts

import Component from "../../../core/component/Component.ts";
import Actor from "../../../core/Actor.ts";

// Type aliases for 3D math (simple arrays for now)
export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number]; // [x, y, z, w]
export type Mat4 = Float32Array; // 16 elements

/**
 * Transform component that holds position, rotation, and scale.
 * Provides world matrix computation for rendering.
 */
export class TransformComponent extends Component {
    /** Position in world space */
    public position: Vec3 = [0, 0, 0];

    /** Rotation as quaternion [x, y, z, w] */
    public rotation: Quat = [0, 0, 0, 1];

    /** Scale factors */
    public scale: Vec3 = [1, 1, 1];

    // Cached matrix (computed on-demand)
    private _worldMatrix: Mat4 | null = null;
    private _isDirty: boolean = true;

    // Version tracking for change detection
    public version: number = 0;

    constructor(actor: Actor, initialTransform?: Partial<{position: Vec3, rotation: Quat, scale: Vec3}>) {
        super(actor);

        if (initialTransform?.position) {
            this.position = [...initialTransform.position] as Vec3;
        }
        if (initialTransform?.rotation) {
            this.rotation = [...initialTransform.rotation] as Quat;
        }
        if (initialTransform?.scale) {
            this.scale = [...initialTransform.scale] as Vec3;
        }
    }

    /**
     * Set position and mark matrix as dirty.
     */
    setPosition(x: number, y: number, z: number): void {
        this.position[0] = x;
        this.position[1] = y;
        this.position[2] = z;
        this.markDirty();
    }

    /**
     * Set rotation from Euler angles (in radians) and mark matrix as dirty.
     */
    setRotationEuler(x: number, y: number, z: number): void {
        // Convert Euler to quaternion (simple implementation)
        const cx = Math.cos(x * 0.5);
        const sx = Math.sin(x * 0.5);
        const cy = Math.cos(y * 0.5);
        const sy = Math.sin(y * 0.5);
        const cz = Math.cos(z * 0.5);
        const sz = Math.sin(z * 0.5);

        this.rotation[3] = cx * cy * cz + sx * sy * sz; // w
        this.rotation[0] = sx * cy * cz - cx * sy * sz; // x
        this.rotation[1] = cx * sy * cz + sx * cy * sz; // y
        this.rotation[2] = cx * cy * sz - sx * sy * cz; // z
        this.markDirty();
    }

    /**
     * Set scale and mark matrix as dirty.
     */
    setScale(x: number, y: number, z: number): void {
        this.scale[0] = x;
        this.scale[1] = y;
        this.scale[2] = z;
        this.markDirty();
    }

    /**
     * Get the world transformation matrix.
     * Computed on-demand and cached until transform changes.
     */
    getWorldMatrix(): Mat4 {
        if (this._isDirty || !this._worldMatrix) {
            this._worldMatrix = this.computeWorldMatrix();
            this._isDirty = false;
        }
        return this._worldMatrix;
    }

    /**
     * Force recalculation of world matrix on next access.
     */
    markDirty(): void {
        this._isDirty = true;
        this.version++;
    }

    /**
     * Compute the world transformation matrix from position, rotation, and scale.
     */
    private computeWorldMatrix(): Mat4 {
        const matrix = new Float32Array(16);

        // Extract quaternion components
        const [qx, qy, qz, qw] = this.rotation;
        const [sx, sy, sz] = this.scale;
        const [tx, ty, tz] = this.position;

        // Compute rotation matrix from quaternion
        const xx = qx * qx;
        const yy = qy * qy;
        const zz = qz * qz;
        const xy = qx * qy;
        const xz = qx * qz;
        const yz = qy * qz;
        const wx = qw * qx;
        const wy = qw * qy;
        const wz = qw * qz;

        // Build TRS matrix (Translation * Rotation * Scale)
        matrix[0] = sx * (1 - 2 * (yy + zz));
        matrix[1] = sx * 2 * (xy + wz);
        matrix[2] = sx * 2 * (xz - wy);
        matrix[3] = 0;

        matrix[4] = sy * 2 * (xy - wz);
        matrix[5] = sy * (1 - 2 * (xx + zz));
        matrix[6] = sy * 2 * (yz + wx);
        matrix[7] = 0;

        matrix[8] = sz * 2 * (xz + wy);
        matrix[9] = sz * 2 * (yz - wx);
        matrix[10] = sz * (1 - 2 * (xx + yy));
        matrix[11] = 0;

        matrix[12] = tx;
        matrix[13] = ty;
        matrix[14] = tz;
        matrix[15] = 1;

        return matrix;
    }
}