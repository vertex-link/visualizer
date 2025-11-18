import type { MeshDescriptor } from "../resources/MeshResource";
import type { Vec3 } from "../rendering/components/TransformComponent";

/**
 * Create an arrow mesh for gizmo handles
 * Arrow points along +Y axis by default
 */
export function createArrowGeometry(
  shaftLength = 0.8,
  shaftRadius = 0.02,
  coneLength = 0.2,
  coneRadius = 0.06,
  segments = 8,
): MeshDescriptor {
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  // Create shaft (cylinder)
  const shaftSegments = segments;
  for (let i = 0; i <= shaftSegments; i++) {
    const theta = (i / shaftSegments) * Math.PI * 2;
    const x = Math.cos(theta) * shaftRadius;
    const z = Math.sin(theta) * shaftRadius;

    // Bottom of shaft
    vertices.push(x, 0, z);
    normals.push(Math.cos(theta), 0, Math.sin(theta));

    // Top of shaft
    vertices.push(x, shaftLength, z);
    normals.push(Math.cos(theta), 0, Math.sin(theta));
  }

  // Create shaft indices
  const shaftVertexCount = (shaftSegments + 1) * 2;
  for (let i = 0; i < shaftSegments; i++) {
    const base = i * 2;
    indices.push(base, base + 1, base + 2);
    indices.push(base + 1, base + 3, base + 2);
  }

  // Create cone (arrowhead)
  const coneBaseY = shaftLength;
  const coneTipY = shaftLength + coneLength;
  const coneBaseIndex = vertices.length / 3;

  // Cone base vertices
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const x = Math.cos(theta) * coneRadius;
    const z = Math.sin(theta) * coneRadius;

    vertices.push(x, coneBaseY, z);
    normals.push(Math.cos(theta), 0.5, Math.sin(theta)); // Approximate normal
  }

  // Cone tip
  const coneTipIndex = vertices.length / 3;
  vertices.push(0, coneTipY, 0);
  normals.push(0, 1, 0);

  // Create cone indices
  for (let i = 0; i < segments; i++) {
    indices.push(coneBaseIndex + i, coneTipIndex, coneBaseIndex + i + 1);
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
  };
}

/**
 * Create a line mesh for gizmo axes
 */
export function createLineGeometry(length = 1.0): MeshDescriptor {
  const vertices = new Float32Array([
    0, 0, 0, // Start
    0, length, 0, // End (along +Y axis)
  ]);

  const normals = new Float32Array([
    0, 1, 0, // Normal for start
    0, 1, 0, // Normal for end
  ]);

  const indices = new Uint32Array([0, 1]);

  return {
    vertices,
    normals,
    indices,
  };
}

/**
 * Create a cube mesh for scale handles
 */
export function createCubeGeometry(size = 0.1): MeshDescriptor {
  const s = size / 2;

  const vertices = new Float32Array([
    // Front face
    -s,
    -s,
    s,
    s,
    -s,
    s,
    s,
    s,
    s,
    -s,
    s,
    s,

    // Back face
    -s,
    -s,
    -s,
    -s,
    s,
    -s,
    s,
    s,
    -s,
    s,
    -s,
    -s,

    // Top face
    -s,
    s,
    -s,
    -s,
    s,
    s,
    s,
    s,
    s,
    s,
    s,
    -s,

    // Bottom face
    -s,
    -s,
    -s,
    s,
    -s,
    -s,
    s,
    -s,
    s,
    -s,
    -s,
    s,

    // Right face
    s,
    -s,
    -s,
    s,
    s,
    -s,
    s,
    s,
    s,
    s,
    -s,
    s,

    // Left face
    -s,
    -s,
    -s,
    -s,
    -s,
    s,
    -s,
    s,
    s,
    -s,
    s,
    -s,
  ]);

  const normals = new Float32Array([
    // Front face
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

    // Back face
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

    // Top face
    0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

    // Bottom face
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,

    // Right face
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

    // Left face
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  ]);

  const indices = new Uint32Array([
    0,
    1,
    2,
    0,
    2,
    3, // Front
    4,
    5,
    6,
    4,
    6,
    7, // Back
    8,
    9,
    10,
    8,
    10,
    11, // Top
    12,
    13,
    14,
    12,
    14,
    15, // Bottom
    16,
    17,
    18,
    16,
    18,
    19, // Right
    20,
    21,
    22,
    20,
    22,
    23, // Left
  ]);

  return {
    vertices,
    normals,
    indices,
  };
}

/**
 * Create a sphere mesh for rotate handles
 */
export function createSphereGeometry(radius = 0.05, segments = 8): MeshDescriptor {
  const vertices: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Generate vertices and normals
  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= segments; lon++) {
      const phi = (lon * 2 * Math.PI) / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      vertices.push(radius * x, radius * y, radius * z);
      normals.push(x, y, z); // Sphere normals are just the normalized position
    }
  }

  // Generate indices
  for (let lat = 0; lat < segments; lat++) {
    for (let lon = 0; lon < segments; lon++) {
      const first = lat * (segments + 1) + lon;
      const second = first + segments + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint32Array(indices),
  };
}
