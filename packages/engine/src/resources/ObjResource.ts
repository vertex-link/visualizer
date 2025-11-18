import { MeshResource, type MeshDescriptor, type VertexAttribute } from "./MeshResource";
import type { Context } from "@vertex-link/space";
import ObjFileParser from "obj-file-parser";

export interface ObjResourceOptions {
  /** Generate normals if missing (default: true) */
  generateNormals?: boolean;
  /** Center model at origin (default: false) */
  centerModel?: boolean;
  /** Scale factor to apply (default: 1.0) */
  scale?: number;
  /** Which model to use if OBJ contains multiple models (default: 0) */
  modelIndex?: number;
}

/**
 * Resource for loading Wavefront OBJ files.
 * Extends MeshResource and converts OBJ format to MeshDescriptor.
 */
export class ObjResource extends MeshResource {
  private source: string; // URL or OBJ content
  private options: ObjResourceOptions;

  constructor(
    name: string,
    urlOrContent: string,
    options: ObjResourceOptions = {},
    context?: Context
  ) {
    // Create placeholder descriptor - will be populated in loadInternal
    const placeholder: MeshDescriptor = {
      vertices: new Float32Array(0),
      indices: new Uint16Array(0),
      vertexAttributes: [],
      vertexStride: 0,
      primitiveTopology: "triangle-list"
    };

    super(name, placeholder, context);
    this.source = urlOrContent;
    this.options = {
      generateNormals: options.generateNormals ?? true,
      centerModel: options.centerModel ?? false,
      scale: options.scale ?? 1.0,
      modelIndex: options.modelIndex ?? 0,
    };
  }

  protected async loadInternal(): Promise<MeshDescriptor> {
    // 1. Fetch if URL, otherwise use as content
    let objContent: string;
    if (this.isUrl(this.source)) {
      console.debug(`ObjResource "${this.name}": Fetching from ${this.source}`);
      const response = await fetch(this.source);
      if (!response.ok) {
        throw new Error(`Failed to fetch OBJ from ${this.source}: ${response.statusText}`);
      }
      objContent = await response.text();
    } else {
      objContent = this.source;
    }

    // 2. Parse with obj-file-parser
    console.debug(`ObjResource "${this.name}": Parsing OBJ content...`);
    const parser = new ObjFileParser(objContent);
    const parsed = parser.parse();

    if (!parsed.models || parsed.models.length === 0) {
      throw new Error(`ObjResource "${this.name}": No models found in OBJ file`);
    }

    const modelIndex = this.options.modelIndex!;
    if (modelIndex >= parsed.models.length) {
      throw new Error(
        `ObjResource "${this.name}": Model index ${modelIndex} out of range (file has ${parsed.models.length} models)`
      );
    }

    const model = parsed.models[modelIndex];
    console.debug(
      `ObjResource "${this.name}": Using model "${model.name}" (${model.vertices.length} vertices, ${model.faces.length} faces)`
    );

    // 3. Convert to MeshDescriptor
    const descriptor = this.convertToMeshDescriptor(model);

    console.debug(
      `ObjResource "${this.name}": Converted to MeshDescriptor (${this.getVertexCount(descriptor)} vertices)`
    );

    return descriptor;
  }

  private isUrl(str: string): boolean {
    return (
      str.startsWith("http://") ||
      str.startsWith("https://") ||
      str.startsWith("./") ||
      str.startsWith("../") ||
      str.startsWith("/")
    );
  }

  private convertToMeshDescriptor(model: ObjFileParser.ObjModel): MeshDescriptor {
    const hasNormals = model.vertexNormals.length > 0;
    const hasTexCoords = model.textureCoords.length > 0;

    // Determine what attributes we'll have
    const includeNormals = hasNormals || this.options.generateNormals;
    const includeUVs = hasTexCoords;

    // Build interleaved vertex data from faces
    const vertexData: number[] = [];
    const indices: number[] = [];
    const vertexMap = new Map<string, number>(); // Cache unique vertices

    for (const face of model.faces) {
      // Triangulate face if needed (supports triangles and quads)
      const triangles = this.triangulateFace(face);

      for (const triangle of triangles) {
        for (const faceVertex of triangle) {
          // Create unique key for this vertex combination
          const key = `${faceVertex.vertexIndex}_${faceVertex.textureCoordsIndex}_${faceVertex.vertexNormalIndex}`;

          let vertexIndex = vertexMap.get(key);

          if (vertexIndex === undefined) {
            // New unique vertex - add to vertex data
            vertexIndex = vertexMap.size;
            vertexMap.set(key, vertexIndex);

            // Position (indices are 1-based in OBJ)
            const pos = model.vertices[faceVertex.vertexIndex - 1];
            if (!pos) {
              throw new Error(`Invalid vertex index: ${faceVertex.vertexIndex}`);
            }
            vertexData.push(pos.x * this.options.scale!, pos.y * this.options.scale!, pos.z * this.options.scale!);

            // Normal
            if (includeNormals) {
              if (hasNormals && faceVertex.vertexNormalIndex > 0) {
                const normal = model.vertexNormals[faceVertex.vertexNormalIndex - 1];
                vertexData.push(normal.x, normal.y, normal.z);
              } else {
                // Will generate normals later if needed
                vertexData.push(0, 0, 0);
              }
            }

            // UV
            if (includeUVs) {
              if (faceVertex.textureCoordsIndex > 0) {
                const uv = model.textureCoords[faceVertex.textureCoordsIndex - 1];
                vertexData.push(uv.u, uv.v);
              } else {
                vertexData.push(0, 0);
              }
            }
          }

          indices.push(vertexIndex);
        }
      }
    }

    // Create vertex attributes
    const attributes: VertexAttribute[] = [];
    let offset = 0;

    // Position attribute
    attributes.push({
      name: "position",
      size: 3,
      type: "float32",
      offset: offset,
    });
    offset += 3 * 4; // 3 floats * 4 bytes

    // Normal attribute
    if (includeNormals) {
      attributes.push({
        name: "normal",
        size: 3,
        type: "float32",
        offset: offset,
      });
      offset += 3 * 4;
    }

    // UV attribute
    if (includeUVs) {
      attributes.push({
        name: "uv",
        size: 2,
        type: "float32",
        offset: offset,
      });
      offset += 2 * 4;
    }

    const vertexStride = offset;

    let vertices = new Float32Array(vertexData);

    // Generate normals if needed
    if (includeNormals && !hasNormals && this.options.generateNormals) {
      vertices = this.generateNormals(vertices, indices, vertexStride);
    }

    // Center model if requested
    if (this.options.centerModel) {
      vertices = this.centerVertices(vertices, vertexStride);
    }

    return {
      vertices,
      indices: indices.length > 0 ? new Uint16Array(indices) : undefined,
      vertexAttributes: attributes,
      vertexStride,
      primitiveTopology: "triangle-list",
    };
  }

  /**
   * Triangulate a face (supports triangles and quads)
   */
  private triangulateFace(face: ObjFileParser.Face): ObjFileParser.FaceVertex[][] {
    if (face.vertices.length === 3) {
      // Already a triangle
      return [face.vertices];
    } else if (face.vertices.length === 4) {
      // Quad - split into two triangles
      return [
        [face.vertices[0], face.vertices[1], face.vertices[2]],
        [face.vertices[0], face.vertices[2], face.vertices[3]],
      ];
    } else if (face.vertices.length > 4) {
      // N-gon - fan triangulation
      const triangles: ObjFileParser.FaceVertex[][] = [];
      for (let i = 1; i < face.vertices.length - 1; i++) {
        triangles.push([face.vertices[0], face.vertices[i], face.vertices[i + 1]]);
      }
      return triangles;
    }

    return [];
  }

  /**
   * Generate normals for vertices that don't have them
   */
  private generateNormals(vertices: Float32Array, indices: number[], vertexStride: number): Float32Array {
    const vertexCount = vertices.length / (vertexStride / 4);
    const floatsPerVertex = vertexStride / 4;
    const normalOffset = 3; // Position is first (3 floats), then normal

    // Initialize normals to zero
    for (let i = 0; i < vertexCount; i++) {
      const baseIndex = i * floatsPerVertex;
      vertices[baseIndex + normalOffset] = 0;
      vertices[baseIndex + normalOffset + 1] = 0;
      vertices[baseIndex + normalOffset + 2] = 0;
    }

    // Accumulate face normals
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const base0 = i0 * floatsPerVertex;
      const base1 = i1 * floatsPerVertex;
      const base2 = i2 * floatsPerVertex;

      // Get positions
      const v0x = vertices[base0];
      const v0y = vertices[base0 + 1];
      const v0z = vertices[base0 + 2];

      const v1x = vertices[base1];
      const v1y = vertices[base1 + 1];
      const v1z = vertices[base1 + 2];

      const v2x = vertices[base2];
      const v2y = vertices[base2 + 1];
      const v2z = vertices[base2 + 2];

      // Compute edges
      const e1x = v1x - v0x;
      const e1y = v1y - v0y;
      const e1z = v1z - v0z;

      const e2x = v2x - v0x;
      const e2y = v2y - v0y;
      const e2z = v2z - v0z;

      // Compute face normal (cross product)
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;

      // Accumulate to each vertex of the triangle
      for (const idx of [i0, i1, i2]) {
        const base = idx * floatsPerVertex;
        vertices[base + normalOffset] += nx;
        vertices[base + normalOffset + 1] += ny;
        vertices[base + normalOffset + 2] += nz;
      }
    }

    // Normalize accumulated normals
    for (let i = 0; i < vertexCount; i++) {
      const base = i * floatsPerVertex;
      let nx = vertices[base + normalOffset];
      let ny = vertices[base + normalOffset + 1];
      let nz = vertices[base + normalOffset + 2];

      const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (length > 0.0001) {
        nx /= length;
        ny /= length;
        nz /= length;
      } else {
        // Default up normal if zero-length
        nx = 0;
        ny = 1;
        nz = 0;
      }

      vertices[base + normalOffset] = nx;
      vertices[base + normalOffset + 1] = ny;
      vertices[base + normalOffset + 2] = nz;
    }

    return vertices;
  }

  /**
   * Center vertices around origin
   */
  private centerVertices(vertices: Float32Array, vertexStride: number): Float32Array {
    const vertexCount = vertices.length / (vertexStride / 4);
    const floatsPerVertex = vertexStride / 4;

    // Find bounding box
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (let i = 0; i < vertexCount; i++) {
      const base = i * floatsPerVertex;
      const x = vertices[base];
      const y = vertices[base + 1];
      const z = vertices[base + 2];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    // Calculate center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Translate vertices to center
    for (let i = 0; i < vertexCount; i++) {
      const base = i * floatsPerVertex;
      vertices[base] -= centerX;
      vertices[base + 1] -= centerY;
      vertices[base + 2] -= centerZ;
    }

    console.debug(
      `ObjResource "${this.name}": Centered model (offset: ${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)})`
    );

    return vertices;
  }

  private getVertexCount(descriptor: MeshDescriptor): number {
    return descriptor.vertices.length / (descriptor.vertexStride / 4);
  }
}
