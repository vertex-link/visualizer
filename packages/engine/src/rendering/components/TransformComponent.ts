// Type aliases for 3D math (simple arrays for now)
import { type Actor, Component } from "@vertex-link/space";

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
  private _isDirty = true;

  // Version tracking for change detection
  public version = 0;

  constructor(
    actor: Actor,
    initialTransform?: Partial<{ position: Vec3; rotation: Quat; scale: Vec3 }>,
  ) {
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
  /**
   * Get Euler angles (in radians) from the current rotation quaternion.
   * Returns [roll, pitch, yaw] which typically correspond to [x, y, z] rotations.
   * Note: Euler angle conversion can have multiple solutions and gimbal lock issues,
   * but this is a common approach.
   * @returns A Vec3 representing [roll, pitch, yaw] in radians.
   */
  public getEulerAngles(): Vec3 {
    const [x, y, z, w] = this.rotation;

    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (y-axis rotation)
    const sinp = 2 * (w * y - z * x);
    let pitch;
    if (Math.abs(sinp) >= 1) {
      pitch = (Math.PI / 2) * Math.sign(sinp); // Use 90 degrees if out of range
    } else {
      pitch = Math.asin(sinp);
    }

    // Yaw (z-axis rotation)
    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return [roll, pitch, yaw];
  }

  public lookAt(target: Vec3, up: Vec3 = [0, 1, 0]): void {
    const direction = [target[0] - this.position[0], target[1] - this.position[1], target[2] - this.position[2]];
    const z = [direction[0] * -1, direction[1] * -1, direction[2] * -1];
    const n = Math.sqrt(z[0] * z[0] + z[1] * z[1] + z[2] * z[2]);
    z[0] /= n;
    z[1] /= n;
    z[2] /= n;

    const x = [up[1] * z[2] - up[2] * z[1], up[2] * z[0] - up[0] * z[2], up[0] * z[1] - up[1] * z[0]];
    const n2 = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
    x[0] /= n2;
    x[1] /= n2;
    x[2] /= n2;

    const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];

    const m00 = x[0];
    const m01 = x[1];
    const m02 = x[2];
    const m10 = y[0];
    const m11 = y[1];
    const m12 = y[2];
    const m20 = z[0];
    const m21 = z[1];
    const m22 = z[2];

    const trace = m00 + m11 + m22;
    let S = 0;

    if (trace > 0) {
      S = Math.sqrt(trace + 1.0) * 2;
      this.rotation[3] = 0.25 * S;
      this.rotation[0] = (m21 - m12) / S;
      this.rotation[1] = (m02 - m20) / S;
      this.rotation[2] = (m10 - m01) / S;
    } else if ((m00 > m11) && (m00 > m22)) {
      S = Math.sqrt(1.0 + m00 - m11 - m22) * 2;
      this.rotation[3] = (m21 - m12) / S;
      this.rotation[0] = 0.25 * S;
      this.rotation[1] = (m01 + m10) / S;
      this.rotation[2] = (m02 + m20) / S;
    } else if (m11 > m22) {
      S = Math.sqrt(1.0 + m11 - m00 - m22) * 2;
      this.rotation[3] = (m02 - m20) / S;
      this.rotation[0] = (m01 + m10) / S;
      this.rotation[1] = 0.25 * S;
      this.rotation[2] = (m12 + m21) / S;
    } else {
      S = Math.sqrt(1.0 + m22 - m00 - m11) * 2;
      this.rotation[3] = (m10 - m01) / S;
      this.rotation[0] = (m02 + m20) / S;
      this.rotation[1] = (m12 + m21) / S;
      this.rotation[2] = 0.25 * S;
    }

    this.markDirty();
  }
}
