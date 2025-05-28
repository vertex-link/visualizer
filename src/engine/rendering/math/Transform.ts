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
     * Create a view matrix looking at a target, outputting in column-major order.
     * @param eye Camera position
     * @param target Look-at target point in world space
     * @param up Up vector (usually [0, 1, 0])
     */
    static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
        const zAxis = Transform.normalize(Transform.subtract(eye, target)); // Points from target to eye (camera's +Z)
        const xAxis = Transform.normalize(Transform.cross(up, zAxis));
        const yAxis = Transform.cross(zAxis, xAxis);

        const tx = -Transform.dot(xAxis, eye);
        const ty = -Transform.dot(yAxis, eye);
        const tz = -Transform.dot(zAxis, eye);

        // Populate in column-major order for the Float32Array
        return new Float32Array([
            xAxis[0], xAxis[1], xAxis[2], 0,  // Column 0: X basis vector
            yAxis[0], yAxis[1], yAxis[2], 0,  // Column 1: Y basis vector
            zAxis[0], zAxis[1], zAxis[2], 0,  // Column 2: Z basis vector
            tx,       ty,       tz,       1   // Column 3: Translation
        ]);
    }

    /**
     * **REVISED**: Multiply two 4x4 matrices (a * b), assuming a, b, and result are column-major.
     */
    static multiply(a: Mat4, b: Mat4): Mat4 {
        const result = new Float32Array(16);

        const a00 = a[0],  a10 = a[1],  a20 = a[2],  a30 = a[3];  // First column of A
        const a01 = a[4],  a11 = a[5],  a21 = a[6],  a31 = a[7];  // Second column of A
        const a02 = a[8],  a12 = a[9],  a22 = a[10], a32 = a[11]; // Third column of A
        const a03 = a[12], a13 = a[13], a23 = a[14], a33 = a[15]; // Fourth column of A

        const b00 = b[0],  b10 = b[1],  b20 = b[2],  b30 = b[3];  // First column of B
        const b01 = b[4],  b11 = b[5],  b21 = b[6],  b31 = b[7];  // Second column of B
        const b02 = b[8],  b12 = b[9],  b22 = b[10], b32 = b[11]; // Third column of B
        const b03 = b[12], b13 = b[13], b23 = b[14], b33 = b[15]; // Fourth column of B

        result[0]  = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
        result[1]  = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
        result[2]  = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
        result[3]  = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;

        result[4]  = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
        result[5]  = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
        result[6]  = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
        result[7]  = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;

        result[8]  = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
        result[9]  = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
        result[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
        result[11] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;

        result[12] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
        result[13] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
        result[14] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
        result[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

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