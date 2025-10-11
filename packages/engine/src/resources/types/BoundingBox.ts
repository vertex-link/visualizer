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
}
