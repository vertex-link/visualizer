import { ComputeResource } from "@vertex-link/space";

// Define the interface for the Zig module's exports
export interface ZTransformExports {
  // Vec2 operations
  vec2_create(x: number, y: number, out: number): void;
  vec2_add(a: number, b: number, out: number): void;
  vec2_sub(a: number, b: number, out: number): void;
  vec2_mul(a: number, scalar: number, out: number): void;
  vec2_dot(a: number, b: number): number;
  vec2_length(v: number): number;
  vec2_normalize(v: number, out: number): void;
  vec2_distance(a: number, b: number): number;
  vec2_lerp(a: number, b: number, t: number, out: number): void;

  // Vec3 operations
  vec3_create(x: number, y: number, z: number, out: number): void;
  vec3_add(a: number, b: number, out: number): void;
  vec3_sub(a: number, b: number, out: number): void;
  vec3_mul(a: number, scalar: number, out: number): void;
  vec3_dot(a: number, b: number): number;
  vec3_cross(a: number, b: number, out: number): void;
  vec3_length(v: number): number;
  vec3_normalize(v: number, out: number): void;
  vec3_distance(a: number, b: number): number;
  vec3_lerp(a: number, b: number, t: number, out: number): void;

  // Vec4 operations
  vec4_create(x: number, y: number, z: number, w: number, out: number): void;
  vec4_add(a: number, b: number, out: number): void;
  vec4_sub(a: number, b: number, out: number): void;
  vec4_mul(a: number, scalar: number, out: number): void;
  vec4_dot(a: number, b: number): number;
  vec4_length(v: number): number;
  vec4_normalize(v: number, out: number): void;

  // Mat4 operations
  mat4_identity(out: number): void;
  mat4_multiply(a: number, b: number, out: number): void;
  mat4_translate(mat: number, x: number, y: number, z: number, out: number): void;
  mat4_scale(mat: number, x: number, y: number, z: number, out: number): void;
  mat4_rotate_x(mat: number, angle: number, out: number): void;
  mat4_rotate_y(mat: number, angle: number, out: number): void;
  mat4_rotate_z(mat: number, angle: number, out: number): void;
  mat4_perspective(fovy: number, aspect: number, near: number, far: number, out: number): void;
  mat4_ortho(left: number, right: number, bottom: number, top: number, near: number, far: number, out: number): void;
  mat4_look_at(
    eye_x: number, eye_y: number, eye_z: number,
    center_x: number, center_y: number, center_z: number,
    up_x: number, up_y: number, up_z: number,
    out: number
  ): void;
  mat4_invert(mat: number, out: number): boolean;
  mat4_transpose(mat: number, out: number): void;

  // Quaternion operations
  quat_identity(out: number): void;
  quat_from_axis_angle(axis_x: number, axis_y: number, axis_z: number, angle: number, out: number): void;
  quat_multiply(a: number, b: number, out: number): void;
  quat_to_mat4(quat: number, out: number): void;
  quat_slerp(a: number, b: number, t: number, out: number): void;

  // Utility functions
  deg_to_rad(degrees: number): number;
  rad_to_deg(radians: number): number;
  clamp(value: number, min: number, max: number): number;
  lerp(a: number, b: number, t: number): number;
}

/**
 * High-level TypeScript wrapper for the ztransform WebAssembly module.
 *
 * This class provides convenient vector and matrix math operations backed by
 * optimized Zig/WebAssembly code. It manages memory allocation and provides
 * TypeScript-friendly interfaces for common 3D math operations.
 *
 * @example
 * ```typescript
 * import { TransformMath } from "@vertex-link/engine";
 *
 * const math = await TransformMath.create();
 *
 * // Create and manipulate vectors
 * const v1 = math.vec3(1, 2, 3);
 * const v2 = math.vec3(4, 5, 6);
 * const result = math.vec3Add(v1, v2);
 *
 * // Create transformation matrices
 * const mat = math.mat4Identity();
 * const translated = math.mat4Translate(mat, 10, 0, 0);
 * const rotated = math.mat4RotateY(translated, Math.PI / 4);
 * ```
 */
export class TransformMath {
  private constructor(
    private module: ZTransformExports & { memory: WebAssembly.Memory }
  ) {}

  /**
   * Create a new TransformMath instance by loading the WebAssembly module
   */
  static async create(): Promise<TransformMath> {
    const ztransformModule = await import("../resources/ztransform/src/main.zig");
    const module = await new ComputeResource<ZTransformExports & { memory: WebAssembly.Memory }>(
      ztransformModule
    ).whenReady();
    return new TransformMath(module);
  }

  // Helper methods to allocate memory for vectors and matrices
  private allocFloat32Array(length: number): Float32Array {
    const bytes = length * 4; // 4 bytes per f32
    const ptr = new Uint8Array(this.module.memory.buffer).length;
    return new Float32Array(this.module.memory.buffer, ptr - bytes, length);
  }

  // ============================================================================
  // Vec2 Methods
  // ============================================================================

  vec2(x: number, y: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 2);
    this.module.vec2_create(x, y, out.byteOffset);
    return out.slice();
  }

  vec2Add(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 2);
    const aPtr = this.writeFloat32Array(a, 8);
    const bPtr = this.writeFloat32Array(b, 16);
    this.module.vec2_add(aPtr, bPtr, out.byteOffset);
    return out.slice();
  }

  vec2Sub(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 2);
    const aPtr = this.writeFloat32Array(a, 8);
    const bPtr = this.writeFloat32Array(b, 16);
    this.module.vec2_sub(aPtr, bPtr, out.byteOffset);
    return out.slice();
  }

  vec2Mul(a: Float32Array, scalar: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 2);
    const aPtr = this.writeFloat32Array(a, 8);
    this.module.vec2_mul(aPtr, scalar, out.byteOffset);
    return out.slice();
  }

  vec2Dot(a: Float32Array, b: Float32Array): number {
    const aPtr = this.writeFloat32Array(a, 0);
    const bPtr = this.writeFloat32Array(b, 8);
    return this.module.vec2_dot(aPtr, bPtr);
  }

  vec2Length(v: Float32Array): number {
    const vPtr = this.writeFloat32Array(v, 0);
    return this.module.vec2_length(vPtr);
  }

  vec2Normalize(v: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 2);
    const vPtr = this.writeFloat32Array(v, 8);
    this.module.vec2_normalize(vPtr, out.byteOffset);
    return out.slice();
  }

  vec2Distance(a: Float32Array, b: Float32Array): number {
    const aPtr = this.writeFloat32Array(a, 0);
    const bPtr = this.writeFloat32Array(b, 8);
    return this.module.vec2_distance(aPtr, bPtr);
  }

  vec2Lerp(a: Float32Array, b: Float32Array, t: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 2);
    const aPtr = this.writeFloat32Array(a, 8);
    const bPtr = this.writeFloat32Array(b, 16);
    this.module.vec2_lerp(aPtr, bPtr, t, out.byteOffset);
    return out.slice();
  }

  // ============================================================================
  // Vec3 Methods
  // ============================================================================

  vec3(x: number, y: number, z: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 3);
    this.module.vec3_create(x, y, z, out.byteOffset);
    return out.slice();
  }

  vec3Add(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 3);
    const aPtr = this.writeFloat32Array(a, 12);
    const bPtr = this.writeFloat32Array(b, 24);
    this.module.vec3_add(aPtr, bPtr, out.byteOffset);
    return out.slice();
  }

  vec3Sub(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 3);
    const aPtr = this.writeFloat32Array(a, 12);
    const bPtr = this.writeFloat32Array(b, 24);
    this.module.vec3_sub(aPtr, bPtr, out.byteOffset);
    return out.slice();
  }

  vec3Mul(a: Float32Array, scalar: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 3);
    const aPtr = this.writeFloat32Array(a, 12);
    this.module.vec3_mul(aPtr, scalar, out.byteOffset);
    return out.slice();
  }

  vec3Dot(a: Float32Array, b: Float32Array): number {
    const aPtr = this.writeFloat32Array(a, 0);
    const bPtr = this.writeFloat32Array(b, 12);
    return this.module.vec3_dot(aPtr, bPtr);
  }

  vec3Cross(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 3);
    const aPtr = this.writeFloat32Array(a, 12);
    const bPtr = this.writeFloat32Array(b, 24);
    this.module.vec3_cross(aPtr, bPtr, out.byteOffset);
    return out.slice();
  }

  vec3Length(v: Float32Array): number {
    const vPtr = this.writeFloat32Array(v, 0);
    return this.module.vec3_length(vPtr);
  }

  vec3Normalize(v: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 3);
    const vPtr = this.writeFloat32Array(v, 12);
    this.module.vec3_normalize(vPtr, out.byteOffset);
    return out.slice();
  }

  vec3Distance(a: Float32Array, b: Float32Array): number {
    const aPtr = this.writeFloat32Array(a, 0);
    const bPtr = this.writeFloat32Array(b, 12);
    return this.module.vec3_distance(aPtr, bPtr);
  }

  vec3Lerp(a: Float32Array, b: Float32Array, t: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 3);
    const aPtr = this.writeFloat32Array(a, 12);
    const bPtr = this.writeFloat32Array(b, 24);
    this.module.vec3_lerp(aPtr, bPtr, t, out.byteOffset);
    return out.slice();
  }

  // ============================================================================
  // Vec4 Methods
  // ============================================================================

  vec4(x: number, y: number, z: number, w: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 4);
    this.module.vec4_create(x, y, z, w, out.byteOffset);
    return out.slice();
  }

  vec4Add(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 4);
    const aPtr = this.writeFloat32Array(a, 16);
    const bPtr = this.writeFloat32Array(b, 32);
    this.module.vec4_add(aPtr, bPtr, out.byteOffset);
    return out.slice();
  }

  vec4Sub(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 4);
    const aPtr = this.writeFloat32Array(a, 16);
    const bPtr = this.writeFloat32Array(b, 32);
    this.module.vec4_sub(aPtr, bPtr, out.byteOffset);
    return out.slice();
  }

  vec4Mul(a: Float32Array, scalar: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 4);
    const aPtr = this.writeFloat32Array(a, 16);
    this.module.vec4_mul(aPtr, scalar, out.byteOffset);
    return out.slice();
  }

  vec4Dot(a: Float32Array, b: Float32Array): number {
    const aPtr = this.writeFloat32Array(a, 0);
    const bPtr = this.writeFloat32Array(b, 16);
    return this.module.vec4_dot(aPtr, bPtr);
  }

  vec4Length(v: Float32Array): number {
    const vPtr = this.writeFloat32Array(v, 0);
    return this.module.vec4_length(vPtr);
  }

  vec4Normalize(v: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 4);
    const vPtr = this.writeFloat32Array(v, 16);
    this.module.vec4_normalize(vPtr, out.byteOffset);
    return out.slice();
  }

  // ============================================================================
  // Mat4 Methods
  // ============================================================================

  mat4Identity(): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    this.module.mat4_identity(out.byteOffset);
    return out.slice();
  }

  mat4Multiply(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    const aPtr = this.writeFloat32Array(a, 64);
    const bPtr = this.writeFloat32Array(b, 128);
    this.module.mat4_multiply(aPtr, bPtr, out.byteOffset);
    return out.slice();
  }

  mat4Translate(mat: Float32Array, x: number, y: number, z: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    const matPtr = this.writeFloat32Array(mat, 64);
    this.module.mat4_translate(matPtr, x, y, z, out.byteOffset);
    return out.slice();
  }

  mat4Scale(mat: Float32Array, x: number, y: number, z: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    const matPtr = this.writeFloat32Array(mat, 64);
    this.module.mat4_scale(matPtr, x, y, z, out.byteOffset);
    return out.slice();
  }

  mat4RotateX(mat: Float32Array, angle: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    const matPtr = this.writeFloat32Array(mat, 64);
    this.module.mat4_rotate_x(matPtr, angle, out.byteOffset);
    return out.slice();
  }

  mat4RotateY(mat: Float32Array, angle: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    const matPtr = this.writeFloat32Array(mat, 64);
    this.module.mat4_rotate_y(matPtr, angle, out.byteOffset);
    return out.slice();
  }

  mat4RotateZ(mat: Float32Array, angle: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    const matPtr = this.writeFloat32Array(mat, 64);
    this.module.mat4_rotate_z(matPtr, angle, out.byteOffset);
    return out.slice();
  }

  mat4Perspective(fovy: number, aspect: number, near: number, far: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    this.module.mat4_perspective(fovy, aspect, near, far, out.byteOffset);
    return out.slice();
  }

  mat4Ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    this.module.mat4_ortho(left, right, bottom, top, near, far, out.byteOffset);
    return out.slice();
  }

  mat4LookAt(
    eye: Float32Array,
    center: Float32Array,
    up: Float32Array
  ): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    this.module.mat4_look_at(
      eye[0], eye[1], eye[2],
      center[0], center[1], center[2],
      up[0], up[1], up[2],
      out.byteOffset
    );
    return out.slice();
  }

  mat4Invert(mat: Float32Array): Float32Array | null {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    const matPtr = this.writeFloat32Array(mat, 64);
    const success = this.module.mat4_invert(matPtr, out.byteOffset);
    return success ? out.slice() : null;
  }

  mat4Transpose(mat: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    const matPtr = this.writeFloat32Array(mat, 64);
    this.module.mat4_transpose(matPtr, out.byteOffset);
    return out.slice();
  }

  // ============================================================================
  // Quaternion Methods
  // ============================================================================

  quatIdentity(): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 4);
    this.module.quat_identity(out.byteOffset);
    return out.slice();
  }

  quatFromAxisAngle(axis: Float32Array, angle: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 4);
    this.module.quat_from_axis_angle(axis[0], axis[1], axis[2], angle, out.byteOffset);
    return out.slice();
  }

  quatMultiply(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 4);
    const aPtr = this.writeFloat32Array(a, 16);
    const bPtr = this.writeFloat32Array(b, 32);
    this.module.quat_multiply(aPtr, bPtr, out.byteOffset);
    return out.slice();
  }

  quatToMat4(quat: Float32Array): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 16);
    const quatPtr = this.writeFloat32Array(quat, 64);
    this.module.quat_to_mat4(quatPtr, out.byteOffset);
    return out.slice();
  }

  quatSlerp(a: Float32Array, b: Float32Array, t: number): Float32Array {
    const out = new Float32Array(this.module.memory.buffer, 0, 4);
    const aPtr = this.writeFloat32Array(a, 16);
    const bPtr = this.writeFloat32Array(b, 32);
    this.module.quat_slerp(aPtr, bPtr, t, out.byteOffset);
    return out.slice();
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  degToRad(degrees: number): number {
    return this.module.deg_to_rad(degrees);
  }

  radToDeg(radians: number): number {
    return this.module.rad_to_deg(radians);
  }

  clamp(value: number, min: number, max: number): number {
    return this.module.clamp(value, min, max);
  }

  lerp(a: number, b: number, t: number): number {
    return this.module.lerp(a, b, t);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private writeFloat32Array(data: Float32Array, offset: number): number {
    const view = new Float32Array(this.module.memory.buffer, offset, data.length);
    view.set(data);
    return offset;
  }
}
