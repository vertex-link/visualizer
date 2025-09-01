import type { Mat4, Quat, Vec3 } from "../components/TransformComponent";

/**
 * Math utilities for 3D transformations with complete implementation
 */
export class Transform {
  /**
   * Create an identity matrix.
   */
  static identity(): Mat4 {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  /**
   * Create a perspective projection matrix suitable for WebGPU (Z maps to [0, 1]).
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

    // Corrected for WebGPU Z NDC [0, 1]
    // where view space Z is negative for objects in front of the camera,
    // and w_clip = -z_view
    out[10] = far / (near - far); // Note the denominator: near - far
    out[11] = -1.0; // To make w_clip = -z_view

    out[12] = 0;
    out[13] = 0;
    out[14] = (near * far) / (near - far); // Note the denominator: near - far
    out[15] = 0.0;

    return out;
  }
  /**
   * Create an orthographic projection matrix
   */
  static orthographic(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number,
  ): Mat4 {
    const lr = 1 / (left - right);
    const bt = 1 / (bottom - top);
    const nf = 1 / (near - far);

    return new Float32Array([
      -2 * lr,
      0,
      0,
      0,
      0,
      -2 * bt,
      0,
      0,
      0,
      0,
      2 * nf,
      0,
      (left + right) * lr,
      (top + bottom) * bt,
      (far + near) * nf,
      1,
    ]);
  }

  /**
   * Create a view matrix looking at a target
   */
  static lookAt(eye: Vec3, target: Vec3, up: Vec3): Mat4 {
    const zAxis = Transform.normalize(Transform.subtract(eye, target));
    const xAxis = Transform.normalize(Transform.cross(up, zAxis));
    const yAxis = Transform.cross(zAxis, xAxis);

    const tx = -Transform.dot(xAxis, eye);
    const ty = -Transform.dot(yAxis, eye);
    const tz = -Transform.dot(zAxis, eye);

    return new Float32Array([
      xAxis[0],
      xAxis[1],
      xAxis[2],
      0,
      yAxis[0],
      yAxis[1],
      yAxis[2],
      0,
      zAxis[0],
      zAxis[1],
      zAxis[2],
      0,
      tx,
      ty,
      tz,
      1,
    ]);
  }

  /**
   * Multiply two 4x4 matrices (a * b)
   */
  static multiply(a: Mat4, b: Mat4): Mat4 {
    const result = new Float32Array(16);

    const a00 = a[0],
      a10 = a[1],
      a20 = a[2],
      a30 = a[3];
    const a01 = a[4],
      a11 = a[5],
      a21 = a[6],
      a31 = a[7];
    const a02 = a[8],
      a12 = a[9],
      a22 = a[10],
      a32 = a[11];
    const a03 = a[12],
      a13 = a[13],
      a23 = a[14],
      a33 = a[15];

    const b00 = b[0],
      b10 = b[1],
      b20 = b[2],
      b30 = b[3];
    const b01 = b[4],
      b11 = b[5],
      b21 = b[6],
      b31 = b[7];
    const b02 = b[8],
      b12 = b[9],
      b22 = b[10],
      b32 = b[11];
    const b03 = b[12],
      b13 = b[13],
      b23 = b[14],
      b33 = b[15];

    result[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    result[1] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
    result[2] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
    result[3] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;

    result[4] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    result[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
    result[6] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
    result[7] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;

    result[8] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    result[9] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
    result[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
    result[11] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;

    result[12] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    result[13] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
    result[14] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
    result[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

    return result;
  }

  /**
   * Invert a 4x4 matrix
   */
  static invert(m: Mat4): Mat4 {
    const out = new Float32Array(16);

    const a00 = m[0],
      a01 = m[1],
      a02 = m[2],
      a03 = m[3];
    const a10 = m[4],
      a11 = m[5],
      a12 = m[6],
      a13 = m[7];
    const a20 = m[8],
      a21 = m[9],
      a22 = m[10],
      a23 = m[11];
    const a30 = m[12],
      a31 = m[13],
      a32 = m[14],
      a33 = m[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) {
      return out; // Return identity if not invertible
    }
    det = 1.0 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    return out;
  }

  /**
   * Unproject a point from NDC to world space
   */
  static unproject(ndc: Vec3, invProj: Mat4, invView: Mat4): Vec3 {
    // Transform from NDC to clip space
    const clip: Vec3 = [ndc[0], ndc[1], ndc[2]];

    // Transform from clip to view space
    const view = Transform.transformPoint(clip, invProj);

    // Transform from view to world space
    return Transform.transformPoint(view, invView);
  }

  /**
   * Transform a point by a matrix
   */
  static transformPoint(point: Vec3, matrix: Mat4): Vec3 {
    const w = matrix[3] * point[0] + matrix[7] * point[1] + matrix[11] * point[2] + matrix[15];
    return [
      (matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12]) / w,
      (matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13]) / w,
      (matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14]) / w,
    ];
  }

  // Vector operations
  static add(a: Vec3, b: Vec3): Vec3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  static subtract(a: Vec3, b: Vec3): Vec3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  static scale(v: Vec3, s: number): Vec3 {
    return [v[0] * s, v[1] * s, v[2] * s];
  }

  static cross(a: Vec3, b: Vec3): Vec3 {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }

  static dot(a: Vec3, b: Vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  static length(v: Vec3): number {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }

  static normalize(v: Vec3): Vec3 {
    const len = Transform.length(v);
    if (len === 0) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  static lerp(a: Vec3, b: Vec3, t: number): Vec3 {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  // Quaternion operations
  static fromAxisAngle(axis: Vec3, angle: number): Quat {
    const halfAngle = angle * 0.5;
    const s = Math.sin(halfAngle);
    return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(halfAngle)];
  }

  static multiplyQuat(q1: Quat, q2: Quat): Quat {
    const q1x = q1[0],
      q1y = q1[1],
      q1z = q1[2],
      q1w = q1[3];
    const q2x = q2[0],
      q2y = q2[1],
      q2z = q2[2],
      q2w = q2[3];

    return [
      q1w * q2x + q1x * q2w + q1y * q2z - q1z * q2y,
      q1w * q2y - q1x * q2z + q1y * q2w + q1z * q2x,
      q1w * q2z + q1x * q2y - q1y * q2x + q1z * q2w,
      q1w * q2w - q1x * q2x - q1y * q2y - q1z * q2z,
    ];
  }

  static normalizeQuat(q: Quat): Quat {
    let len = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
    if (len === 0) {
      return [0, 0, 0, 1];
    }
    len = 1 / len;
    return [q[0] * len, q[1] * len, q[2] * len, q[3] * len];
  }

  static transformQuat(v: Vec3, q: Quat): Vec3 {
    const [qx, qy, qz, qw] = q;
    const [vx, vy, vz] = v;

    const qx2 = qx * 2,
      qy2 = qy * 2,
      qz2 = qz * 2;
    const wx2 = qw * qx2,
      wy2 = qw * qy2,
      wz2 = qw * qz2;
    const xx2 = qx * qx2,
      xy2 = qx * qy2,
      xz2 = qx * qz2;
    const yy2 = qy * qy2,
      yz2 = qy * qz2,
      zz2 = qz * qz2;

    return [
      vx * (1 - yy2 - zz2) + vy * (xy2 - wz2) + vz * (xz2 + wy2),
      vx * (xy2 + wz2) + vy * (1 - xx2 - zz2) + vz * (yz2 - wx2),
      vx * (xz2 - wy2) + vy * (yz2 + wx2) + vz * (1 - xx2 - yy2),
    ];
  }

  static slerpQuat(a: Quat, b: Quat, t: number): Quat {
    let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

    // If dot is negative, negate one quaternion
    if (dot < 0) {
      b = [-b[0], -b[1], -b[2], -b[3]];
      dot = -dot;
    }

    // If quaternions are close, use linear interpolation
    if (dot > 0.9995) {
      return Transform.normalizeQuat([
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        a[3] + (b[3] - a[3]) * t,
      ]);
    }

    // Use spherical interpolation
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;

    return [
      a[0] * wa + b[0] * wb,
      a[1] * wa + b[1] * wb,
      a[2] * wa + b[2] * wb,
      a[3] * wa + b[3] * wb,
    ];
  }

  // Angle conversions
  static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  static toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }
}
