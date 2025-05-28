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
     * Create a perspective projection matrix.
     * @param fov Field of view in radians
     * @param aspect Aspect ratio (width/height)
     * @param near Near clipping plane
     * @param far Far clipping plane
     */
    static perspective(fov: number, aspect: number, near: number, far: number): Mat4 {
        const f = 1.0 / Math.tan(fov * 0.5);
        const rangeInv = 1.0 / (near - far);

        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInv, -1,
            0, 0, near * far * rangeInv * 2, 0
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