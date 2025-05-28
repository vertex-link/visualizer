// src/engine/rendering/math/Transform.ts

import type { Vec3, Mat4 } from "../components/TransformComponent.ts";

/**
 * Math utilities for 3D transformations.
 * Simple implementations focused on clarity and correctness.
 */
export class Transform {
    /**
     * Create an identity matrix.
     */
    static identity(): Mat4 {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    /**
     * Create a perspective projection matrix suitable for WebGPU (Z maps to [0, 1]).
     * Assumes a right-handed view space where -Z is forward.
     * @param fovYRadians Field of view in the Y direction, in radians.
     * @param aspect Aspect ratio (width / height).
     * @param near Near clipping plane distance (must be positive).
     * @param far Far clipping plane distance (must be positive and > near).
     */
    static perspective(fovYRadians: number, aspect: number, near: number, far: number): Mat4 {
        const f = 1.0 / Math.tan(fovYRadians / 2);
        const out = new Float32Array(16);

        out[0] = f / aspect;
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;

        out[4] = 0;
        out[5] = f;
        out[6] = 0;
        out[7] = 0;

        out[8] = 0;
        out[9] = 0;

        // Column 2 (0-indexed) or Z-related column for column-major matrix
        out[10] = far / (far - near);
        out[11] = -1.0; // This makes w_clip = -z_view (if z_view is distance into screen along -Z view axis)

        // Column 3 (0-indexed) or Translation column
        out[12] = 0;
        out[13] = 0;
        out[14] = -(far * near) / (far - near);
        out[15] = 0.0;

        return out;
    }

    static orthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
        const lr = 1 / (left - right);
        const bt = 1 / (bottom - top);
        const nf = 1 / (near - far);

        return new Float32Array([
            -2 * lr, 0, 0, 0,
            0, -2 * bt, 0, 0,
            0, 0, 2 * nf, 0,
            (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1
        ]);
    }

    /**
     * Create a view matrix looking at a target.
     * @param eye Camera position
     * @param target Look-at target
     * @param up Up vector (usually [0, 1, 0])
     */
    static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
        const zAxis = Transform.normalize(Transform.subtract(eye, target));
        const xAxis = Transform.normalize(Transform.cross(up, zAxis));
        const yAxis = Transform.cross(zAxis, xAxis);

        return new Float32Array([
            xAxis[0], yAxis[0], zAxis[0], 0,
            xAxis[1], yAxis[1], zAxis[1], 0,
            xAxis[2], yAxis[2], zAxis[2], 0,
            -Transform.dot(xAxis, eye),
            -Transform.dot(yAxis, eye),
            -Transform.dot(zAxis, eye),
            1
        ]);
    }

    /**
     * Multiply two 4x4 matrices.
     */
    static multiply(a: Mat4, b: Mat4): Mat4 {
        const result = new Float32Array(16);

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                result[i * 4 + j] =
                    a[i * 4 + 0] * b[0 * 4 + j] +
                    a[i * 4 + 1] * b[1 * 4 + j] +
                    a[i * 4 + 2] * b[2 * 4 + j] +
                    a[i * 4 + 3] * b[3 * 4 + j];
            }
        }

        return result;
    }

    static add(a: Vec3, b: Vec3): Vec3 {
        return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    }

    /**
     * Vector subtraction.
     */
    static subtract(a: Vec3, b: Vec3): Vec3 {
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    }

    /**
     * Vector cross product.
     */
    static cross(a: Vec3, b: Vec3): Vec3 {
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];
    }

    /**
     * Vector dot product.
     */
    static dot(a: Vec3, b: Vec3): number {
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    }

    /**
     * Vector length.
     */
    static length(v: Vec3): number {
        return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    }

    /**
     * Normalize a vector.
     */
    static normalize(v: Vec3): Vec3 {
        const len = Transform.length(v);
        if (len === 0) return [0, 0, 0];
        return [v[0] / len, v[1] / len, v[2] / len];
    }

    /**
     * Creates a quaternion from an axis and an angle.
     * @param axis The axis of rotation (must be normalized).
     * @param angle The angle of rotation in radians.
     */
    static fromAxisAngle(axis: Vec3, angle: number): Quat {
        const halfAngle = angle * 0.5;
        const s = Math.sin(halfAngle);
        return [
            axis[0] * s,
            axis[1] * s,
            axis[2] * s,
            Math.cos(halfAngle)
        ];
    }

    /**
     * Multiplies two quaternions (q1 * q2).
     */
    static multiplyQuat(q1: Quat, q2: Quat): Quat {
        const q1x = q1[0], q1y = q1[1], q1z = q1[2], q1w = q1[3];
        const q2x = q2[0], q2y = q2[1], q2z = q2[2], q2w = q2[3];

        return [
            q1w * q2x + q1x * q2w + q1y * q2z - q1z * q2y, // x
            q1w * q2y - q1x * q2z + q1y * q2w + q1z * q2x, // y
            q1w * q2z + q1x * q2y - q1y * q2x + q1z * q2w, // z
            q1w * q2w - q1x * q2x - q1y * q2y - q1z * q2z  // w
        ];
    }

    /**
     * Normalizes a quaternion.
     */
    static normalizeQuat(q: Quat): Quat {
        let len = Math.sqrt(q[0]*q[0] + q[1]*q[1] + q[2]*q[2] + q[3]*q[3]);
        if (len === 0) {
            return [0, 0, 0, 1]; // Default to identity
        }
        len = 1 / len;
        return [q[0]*len, q[1]*len, q[2]*len, q[3]*len];
    }

    static transformQuat(v: Vec3, q: Quat): Vec3 {
        const [qx, qy, qz, qw] = q;
        const [vx, vy, vz] = v;

        const qx2 = qx * 2, qy2 = qy * 2, qz2 = qz * 2;
        const wx2 = qw * qx2, wy2 = qw * qy2, wz2 = qw * qz2;
        const xx2 = qx * qx2, xy2 = qx * qy2, xz2 = qx * qz2;
        const yy2 = qy * qy2, yz2 = qy * qz2, zz2 = qz * qz2;

        return [
            vx * (1 - yy2 - zz2) + vy * (xy2 - wz2) + vz * (xz2 + wy2),
            vx * (xy2 + wz2) + vy * (1 - xx2 - zz2) + vz * (yz2 - wx2),
            vx * (xz2 - wy2) + vy * (yz2 + wx2) + vz * (1 - xx2 - yy2)
        ];
    }

    /**
     * Convert degrees to radians.
     */
    static toRadians(degrees: number): number {
        return degrees * Math.PI / 180;
    }

    /**
     * Convert radians to degrees.
     */
    static toDegrees(radians: number): number {
        return radians * 180 / Math.PI;
    }
}