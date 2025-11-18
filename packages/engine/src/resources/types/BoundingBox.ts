/**
 * BoundingBox utility class for 3D spatial calculations
 * Provides methods for calculating and manipulating 3D bounding boxes
 */

export interface BoundingBox {
  /** Minimum coordinates [x, y, z] */
  min: [number, number, number];
  /** Maximum coordinates [x, y, z] */
  max: [number, number, number];
  /** Calculated center point [x, y, z] */
  center: [number, number, number];
  /** Dimensions [width, height, depth] */
  size: [number, number, number];
}

/**
 * BoundingSphere for efficient frustum culling
 * Spheres are faster to test than AABBs but less precise
 */
export interface BoundingSphere {
  /** Center point [x, y, z] */
  center: [number, number, number];
  /** Radius of the sphere */
  radius: number;
}

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class BoundingBoxUtils {
  /**
   * Create a bounding box from minimum and maximum coordinates
   */
  static fromMinMax(min: [number, number, number], max: [number, number, number]): BoundingBox {
    const center: [number, number, number] = [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ];

    const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];

    return { min, max, center, size };
  }

  /**
   * Create a bounding box from an array of vertices
   */
  static fromVertices(vertices: Float32Array): BoundingBox {
    if (vertices.length === 0) {
      return BoundingBoxUtils.empty();
    }

    let minX = vertices[0],
      minY = vertices[1],
      minZ = vertices[2];
    let maxX = vertices[0],
      maxY = vertices[1],
      maxZ = vertices[2];

    for (let i = 3; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = vertices[i + 2];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);

      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    return BoundingBoxUtils.fromMinMax([minX, minY, minZ], [maxX, maxY, maxZ]);
  }

  /**
   * Create an empty bounding box
   */
  static empty(): BoundingBox {
    return {
      min: [0, 0, 0],
      max: [0, 0, 0],
      center: [0, 0, 0],
      size: [0, 0, 0],
    };
  }

  /**
   * Combine multiple bounding boxes into one
   */
  static combine(boxes: BoundingBox[]): BoundingBox {
    if (boxes.length === 0) {
      return BoundingBoxUtils.empty();
    }

    if (boxes.length === 1) {
      return boxes[0];
    }

    let minX = boxes[0].min[0],
      minY = boxes[0].min[1],
      minZ = boxes[0].min[2];
    let maxX = boxes[0].max[0],
      maxY = boxes[0].max[1],
      maxZ = boxes[0].max[2];

    for (let i = 1; i < boxes.length; i++) {
      const box = boxes[i];
      minX = Math.min(minX, box.min[0]);
      minY = Math.min(minY, box.min[1]);
      minZ = Math.min(minZ, box.min[2]);

      maxX = Math.max(maxX, box.max[0]);
      maxY = Math.max(maxY, box.max[1]);
      maxZ = Math.max(maxZ, box.max[2]);
    }

    return BoundingBoxUtils.fromMinMax([minX, minY, minZ], [maxX, maxY, maxZ]);
  }

  /**
   * Check if a point is inside the bounding box
   */
  static containsPoint(box: BoundingBox, point: [number, number, number]): boolean {
    return (
      point[0] >= box.min[0] &&
      point[0] <= box.max[0] &&
      point[1] >= box.min[1] &&
      point[1] <= box.max[1] &&
      point[2] >= box.min[2] &&
      point[2] <= box.max[2]
    );
  }

  /**
   * Check if two bounding boxes intersect
   */
  static intersects(boxA: BoundingBox, boxB: BoundingBox): boolean {
    return (
      boxA.min[0] <= boxB.max[0] &&
      boxA.max[0] >= boxB.min[0] &&
      boxA.min[1] <= boxB.max[1] &&
      boxA.max[1] >= boxB.min[1] &&
      boxA.min[2] <= boxB.max[2] &&
      boxA.max[2] >= boxB.min[2]
    );
  }

  /**
   * Get the volume of the bounding box
   */
  static getVolume(box: BoundingBox): number {
    return box.size[0] * box.size[1] * box.size[2];
  }

  /**
   * Get the surface area of the bounding box
   */
  static getSurfaceArea(box: BoundingBox): number {
    const [w, h, d] = box.size;
    return 2 * (w * h + w * d + h * d);
  }

  /**
   * Calculate a bounding sphere that encompasses the bounding box
   * Uses the box diagonal as diameter for a tight fit
   */
  static toBoundingSphere(box: BoundingBox): BoundingSphere {
    // Radius is half the diagonal distance from center to corner
    const halfSize: [number, number, number] = [
      box.size[0] / 2,
      box.size[1] / 2,
      box.size[2] / 2,
    ];

    const radius = Math.sqrt(
      halfSize[0] * halfSize[0] + halfSize[1] * halfSize[1] + halfSize[2] * halfSize[2],
    );

    return {
      center: [box.center[0], box.center[1], box.center[2]],
      radius,
    };
  }

  /**
   * Calculate a minimal bounding sphere from vertices (Ritter's algorithm)
   * More accurate than box-based sphere but more expensive to compute
   */
  static boundingSphereFromVertices(vertices: Float32Array): BoundingSphere {
    if (vertices.length === 0) {
      return { center: [0, 0, 0], radius: 0 };
    }

    // Find axis-aligned extremes
    let minX = vertices[0],
      maxX = vertices[0];
    let minY = vertices[1],
      maxY = vertices[1];
    let minZ = vertices[2],
      maxZ = vertices[2];

    for (let i = 3; i < vertices.length; i += 3) {
      minX = Math.min(minX, vertices[i]);
      maxX = Math.max(maxX, vertices[i]);
      minY = Math.min(minY, vertices[i + 1]);
      maxY = Math.max(maxY, vertices[i + 1]);
      minZ = Math.min(minZ, vertices[i + 2]);
      maxZ = Math.max(maxZ, vertices[i + 2]);
    }

    // Find the most separated pair along each axis
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    const spanZ = maxZ - minZ;

    let centerX: number, centerY: number, centerZ: number;

    if (spanX > spanY && spanX > spanZ) {
      centerX = (minX + maxX) / 2;
      centerY = (minY + maxY) / 2;
      centerZ = (minZ + maxZ) / 2;
    } else if (spanY > spanZ) {
      centerX = (minX + maxX) / 2;
      centerY = (minY + maxY) / 2;
      centerZ = (minZ + maxZ) / 2;
    } else {
      centerX = (minX + maxX) / 2;
      centerY = (minY + maxY) / 2;
      centerZ = (minZ + maxZ) / 2;
    }

    // Calculate initial radius
    let radiusSq = 0;
    for (let i = 0; i < vertices.length; i += 3) {
      const dx = vertices[i] - centerX;
      const dy = vertices[i + 1] - centerY;
      const dz = vertices[i + 2] - centerZ;
      const distSq = dx * dx + dy * dy + dz * dz;
      radiusSq = Math.max(radiusSq, distSq);
    }

    // Expand to include all points (iterative refinement)
    let radius = Math.sqrt(radiusSq);
    for (let i = 0; i < vertices.length; i += 3) {
      const dx = vertices[i] - centerX;
      const dy = vertices[i + 1] - centerY;
      const dz = vertices[i + 2] - centerZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > radius) {
        const oldRadius = radius;
        radius = (radius + dist) / 2;
        const ratio = (radius - oldRadius) / dist;

        centerX += dx * ratio;
        centerY += dy * ratio;
        centerZ += dz * ratio;
      }
    }

    return {
      center: [centerX, centerY, centerZ],
      radius,
    };
  }

  /**
   * Transform a bounding sphere by a scale factor and position offset
   */
  static transformSphere(
    sphere: BoundingSphere,
    position: [number, number, number],
    scale: [number, number, number],
  ): BoundingSphere {
    // Use maximum scale component for radius (conservative approach)
    const maxScale = Math.max(scale[0], scale[1], scale[2]);

    return {
      center: [
        sphere.center[0] * scale[0] + position[0],
        sphere.center[1] * scale[1] + position[1],
        sphere.center[2] * scale[2] + position[2],
      ],
      radius: sphere.radius * maxScale,
    };
  }
}
