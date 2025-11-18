import type { Vec3, Mat4 } from "../rendering/components/TransformComponent";
import type { CameraComponent } from "../rendering/camera/CameraComponent";

/**
 * Ray in 3D space
 */
export interface Ray {
  origin: Vec3;
  direction: Vec3;
}

/**
 * Ray hit result
 */
export interface RayHit {
  point: Vec3;
  distance: number;
  normal?: Vec3;
}

/**
 * Convert screen coordinates to world space ray
 */
export function screenToRay(
  screenX: number,
  screenY: number,
  canvas: HTMLCanvasElement,
  camera: CameraComponent,
): Ray {
  // Get canvas dimensions
  const rect = canvas.getBoundingClientRect();
  const canvasX = screenX - rect.left;
  const canvasY = screenY - rect.top;

  // Convert to normalized device coordinates (-1 to 1)
  const ndcX = (canvasX / canvas.width) * 2 - 1;
  const ndcY = -(canvasY / canvas.height) * 2 + 1; // Flip Y

  // Get camera matrices
  const viewMatrix = camera.getViewMatrix();
  const projectionMatrix = camera.getProjectionMatrix();

  // Compute inverse view-projection matrix
  const viewProjMatrix = multiplyMat4(projectionMatrix, viewMatrix);
  const invViewProjMatrix = invertMat4(viewProjMatrix);

  // Transform NDC coordinates to world space
  const nearPoint = transformPoint([ndcX, ndcY, -1], invViewProjMatrix);
  const farPoint = transformPoint([ndcX, ndcY, 1], invViewProjMatrix);

  // Compute ray direction
  const direction: Vec3 = [
    farPoint[0] - nearPoint[0],
    farPoint[1] - nearPoint[1],
    farPoint[2] - nearPoint[2],
  ];

  return {
    origin: nearPoint,
    direction: normalize(direction),
  };
}

/**
 * Test ray-sphere intersection
 */
export function raySphereIntersection(
  ray: Ray,
  center: Vec3,
  radius: number,
): RayHit | null {
  // Vector from ray origin to sphere center
  const oc: Vec3 = [
    ray.origin[0] - center[0],
    ray.origin[1] - center[1],
    ray.origin[2] - center[2],
  ];

  // Quadratic coefficients
  const a = dot(ray.direction, ray.direction);
  const b = 2.0 * dot(oc, ray.direction);
  const c = dot(oc, oc) - radius * radius;

  // Discriminant
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null; // No intersection
  }

  // Compute nearest intersection
  const t = (-b - Math.sqrt(discriminant)) / (2.0 * a);

  if (t < 0) {
    return null; // Intersection behind ray origin
  }

  // Compute hit point
  const point: Vec3 = [
    ray.origin[0] + ray.direction[0] * t,
    ray.origin[1] + ray.direction[1] * t,
    ray.origin[2] + ray.direction[2] * t,
  ];

  // Compute normal
  const normal: Vec3 = [
    (point[0] - center[0]) / radius,
    (point[1] - center[1]) / radius,
    (point[2] - center[2]) / radius,
  ];

  return {
    point,
    distance: t,
    normal,
  };
}

/**
 * Test ray-cylinder intersection (for arrow handles)
 */
export function rayCylinderIntersection(
  ray: Ray,
  start: Vec3,
  end: Vec3,
  radius: number,
): RayHit | null {
  // Simplified implementation - treat as capsule (sphere at each end)
  const startHit = raySphereIntersection(ray, start, radius);
  const endHit = raySphereIntersection(ray, end, radius);

  if (startHit && endHit) {
    return startHit.distance < endHit.distance ? startHit : endHit;
  }

  return startHit || endHit;
}

// ============================================================================
// Math Utilities
// ============================================================================

/**
 * Normalize a vector
 */
function normalize(v: Vec3): Vec3 {
  const length = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (length === 0) return [0, 0, 0];
  return [v[0] / length, v[1] / length, v[2] / length];
}

/**
 * Dot product of two vectors
 */
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Transform a point by a matrix
 */
function transformPoint(point: Vec3, matrix: Mat4): Vec3 {
  const x = point[0];
  const y = point[1];
  const z = point[2];
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];

  return [
    (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w,
    (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
    (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / w,
  ];
}

/**
 * Multiply two 4x4 matrices
 */
function multiplyMat4(a: Mat4, b: Mat4): Mat4 {
  const result: Mat4 = new Float32Array(16) as Mat4;

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
 * Invert a 4x4 matrix
 */
function invertMat4(m: Mat4): Mat4 {
  const inv = new Float32Array(16);

  inv[0] =
    m[5] * m[10] * m[15] -
    m[5] * m[11] * m[14] -
    m[9] * m[6] * m[15] +
    m[9] * m[7] * m[14] +
    m[13] * m[6] * m[11] -
    m[13] * m[7] * m[10];

  inv[4] =
    -m[4] * m[10] * m[15] +
    m[4] * m[11] * m[14] +
    m[8] * m[6] * m[15] -
    m[8] * m[7] * m[14] -
    m[12] * m[6] * m[11] +
    m[12] * m[7] * m[10];

  inv[8] =
    m[4] * m[9] * m[15] -
    m[4] * m[11] * m[13] -
    m[8] * m[5] * m[15] +
    m[8] * m[7] * m[13] +
    m[12] * m[5] * m[11] -
    m[12] * m[7] * m[9];

  inv[12] =
    -m[4] * m[9] * m[14] +
    m[4] * m[10] * m[13] +
    m[8] * m[5] * m[14] -
    m[8] * m[6] * m[13] -
    m[12] * m[5] * m[10] +
    m[12] * m[6] * m[9];

  inv[1] =
    -m[1] * m[10] * m[15] +
    m[1] * m[11] * m[14] +
    m[9] * m[2] * m[15] -
    m[9] * m[3] * m[14] -
    m[13] * m[2] * m[11] +
    m[13] * m[3] * m[10];

  inv[5] =
    m[0] * m[10] * m[15] -
    m[0] * m[11] * m[14] -
    m[8] * m[2] * m[15] +
    m[8] * m[3] * m[14] +
    m[12] * m[2] * m[11] -
    m[12] * m[3] * m[10];

  inv[9] =
    -m[0] * m[9] * m[15] +
    m[0] * m[11] * m[13] +
    m[8] * m[1] * m[15] -
    m[8] * m[3] * m[13] -
    m[12] * m[1] * m[11] +
    m[12] * m[3] * m[9];

  inv[13] =
    m[0] * m[9] * m[14] -
    m[0] * m[10] * m[13] -
    m[8] * m[1] * m[14] +
    m[8] * m[2] * m[13] +
    m[12] * m[1] * m[10] -
    m[12] * m[2] * m[9];

  inv[2] =
    m[1] * m[6] * m[15] -
    m[1] * m[7] * m[14] -
    m[5] * m[2] * m[15] +
    m[5] * m[3] * m[14] +
    m[13] * m[2] * m[7] -
    m[13] * m[3] * m[6];

  inv[6] =
    -m[0] * m[6] * m[15] +
    m[0] * m[7] * m[14] +
    m[4] * m[2] * m[15] -
    m[4] * m[3] * m[14] -
    m[12] * m[2] * m[7] +
    m[12] * m[3] * m[6];

  inv[10] =
    m[0] * m[5] * m[15] -
    m[0] * m[7] * m[13] -
    m[4] * m[1] * m[15] +
    m[4] * m[3] * m[13] +
    m[12] * m[1] * m[7] -
    m[12] * m[3] * m[5];

  inv[14] =
    -m[0] * m[5] * m[14] +
    m[0] * m[6] * m[13] +
    m[4] * m[1] * m[14] -
    m[4] * m[2] * m[13] -
    m[12] * m[1] * m[6] +
    m[12] * m[2] * m[5];

  inv[3] =
    -m[1] * m[6] * m[11] +
    m[1] * m[7] * m[10] +
    m[5] * m[2] * m[11] -
    m[5] * m[3] * m[10] -
    m[9] * m[2] * m[7] +
    m[9] * m[3] * m[6];

  inv[7] =
    m[0] * m[6] * m[11] -
    m[0] * m[7] * m[10] -
    m[4] * m[2] * m[11] +
    m[4] * m[3] * m[10] +
    m[8] * m[2] * m[7] -
    m[8] * m[3] * m[6];

  inv[11] =
    -m[0] * m[5] * m[11] +
    m[0] * m[7] * m[9] +
    m[4] * m[1] * m[11] -
    m[4] * m[3] * m[9] -
    m[8] * m[1] * m[7] +
    m[8] * m[3] * m[5];

  inv[15] =
    m[0] * m[5] * m[10] -
    m[0] * m[6] * m[9] -
    m[4] * m[1] * m[10] +
    m[4] * m[2] * m[9] +
    m[8] * m[1] * m[6] -
    m[8] * m[2] * m[5];

  const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

  if (det === 0) {
    // Return identity matrix if not invertible
    const identity = new Float32Array(16);
    identity[0] = identity[5] = identity[10] = identity[15] = 1;
    return identity as Mat4;
  }

  const invDet = 1.0 / det;
  for (let i = 0; i < 16; i++) {
    inv[i] *= invDet;
  }

  return inv as Mat4;
}
