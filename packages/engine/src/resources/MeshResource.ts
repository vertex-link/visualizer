import { Resource, type Context } from "@vertex-link/space";
import { WebGPUProcessor } from "../processors/WebGPUProcessor";
import { BufferUsage } from "../rendering/interfaces/IBuffer";
import { WebGPUBuffer } from "./../webgpu/WebGPUBuffer";
import {
  BoundingBoxUtils,
  type BoundingBox,
  type BoundingSphere,
} from "./types/BoundingBox";


/**
 * Vertex attribute definition for mesh data.
 */
export interface VertexAttribute {
  name: string;
  size: number; // Number of components (1, 2, 3, or 4)
  type: "float32" | "uint32" | "sint32";
  offset: number; // Byte offset in vertex
}

/**
 * Mesh data descriptor for creating mesh resources.
 */
export interface MeshDescriptor {
  vertices: Float32Array;
  indices?: Uint16Array | Uint32Array;
  vertexAttributes: VertexAttribute[];
  vertexStride: number; // Bytes per vertex
  primitiveTopology?:
    | "triangle-list"
    | "triangle-strip"
    | "line-list"
    | "point-list";
}

/**
 * Simplified MeshResource - no service registry, no resource manager
 * Resources auto-load and auto-compile when used
 */
export class MeshResource extends Resource<MeshDescriptor> {
  private device: GPUDevice | null = null;
  private vertexBuffer: WebGPUBuffer | null = null;
  private indexBuffer: WebGPUBuffer | null = null;
  public isCompiled = false;

  // Bounding volumes for frustum culling
  private _boundingBox: BoundingBox | null = null;
  private _boundingSphere: BoundingSphere | null = null;

  constructor(name: string, meshData: MeshDescriptor, context?: Context) {
    super(name, meshData, context);
  }

  protected async loadInternal(): Promise<MeshDescriptor> {
    // Mesh data is provided in constructor, so just validate and return
    if (!this.payload.vertices || this.payload.vertices.length === 0) {
      throw new Error(`MeshResource "${this.name}": No vertex data provided`);
    }

    // Calculate bounding volumes for frustum culling
    this.calculateBoundingVolumes();

    console.debug(
      `MeshResource "${this.name}" loaded with ${this.vertexCount} vertices`,
    );
    return this.payload;
  }

  /**
   * Calculate bounding box and bounding sphere from vertex data
   * Extracts position data from vertex attributes
   */
  private calculateBoundingVolumes(): void {
    if (!this.payload || !this.payload.vertices) {
      return;
    }

    // Find position attribute
    const positionAttr = this.payload.vertexAttributes.find(
      (attr) => attr.name === "position",
    );

    if (!positionAttr || positionAttr.size < 3) {
      console.warn(
        `MeshResource "${this.name}": No valid position attribute for bounding volume calculation`,
      );
      return;
    }

    // Extract position data from interleaved vertex buffer
    const vertices = this.payload.vertices;
    const stride = this.payload.vertexStride / 4; // Convert bytes to float count
    const offset = positionAttr.offset / 4; // Convert bytes to float index
    const vertexCount = vertices.length / stride;

    // Create position-only array for bounding calculations
    const positions = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      positions[i * 3 + 0] = vertices[i * stride + offset + 0]; // x
      positions[i * 3 + 1] = vertices[i * stride + offset + 1]; // y
      positions[i * 3 + 2] = vertices[i * stride + offset + 2]; // z
    }

    // Calculate bounding box
    this._boundingBox = BoundingBoxUtils.fromVertices(positions);

    // Calculate bounding sphere (using box-based method for speed)
    this._boundingSphere = BoundingBoxUtils.toBoundingSphere(this._boundingBox);

    console.debug(
      `MeshResource "${this.name}": Bounding volumes calculated - Box center: [${this._boundingBox.center.join(", ")}], Sphere radius: ${this._boundingSphere.radius.toFixed(2)}`,
    );
  }

  async compile(context: Context): Promise<void> {
    console.log("compile meshdata", this);
    if (this.isCompiled) {
      console.log(
        `🔧 MeshResource "${this.name}": Skipping compile - already compiled`,
      );
      return;
    }

    const webgpuProcessor = context.processors.find(p => p instanceof WebGPUProcessor) as WebGPUProcessor | undefined;
    if (!webgpuProcessor) {
      throw new Error("Cannot compile MeshResource: WebGPUProcessor not found in context.");
    }
    this.device = webgpuProcessor.renderer.device;
    console.log(`🔧 MeshResource "${this.name}": Got device for compilation`);

    try {
      // Create vertex buffer
      console.log(`🔧 MeshResource "${this.name}": Creating vertex buffer...`);
      this.vertexBuffer = await this.createVertexBuffer();
      console.log(
        `🔧 MeshResource "${this.name}": Vertex buffer created, storing reference`,
      );

      // Create index buffer if indices exist
      if (this.payload.indices) {
        console.log(`🔧 MeshResource "${this.name}": Creating index buffer...`);
        this.indexBuffer = await this.createIndexBuffer();
        console.log(`🔧 MeshResource "${this.name}": Index buffer created`);
      }

      this.isCompiled = true;
      console.log(
        `✅ MeshResource "${this.name}" compiled successfully - vertexBuffer exists: ${!!this
          .vertexBuffer}, indexBuffer exists: ${!!this.indexBuffer}`,
      );
    } catch (error) {
      console.error(`❌ Failed to compile MeshResource "${this.name}":`, error);
      throw error;
    }
  }

  /**
   * Get vertex count for rendering.
   */
  get vertexCount(): number {
    return this.payload
      ? this.payload.vertices.length / (this.payload.vertexStride / 4)
      : 0;
  }

  /**
   * Get index count for rendering.
   */
  get indexCount(): number {
    return this.payload?.indices ? this.payload.indices.length : 0;
  }

  /**
   * Get vertex stride in bytes.
   */
  get vertexStride(): number {
    return this.payload?.vertexStride || 0;
  }

  /**
   * Get vertex attributes.
   */
  get vertexAttributes(): VertexAttribute[] {
    return this.payload?.vertexAttributes || [];
  }

  /**
   * Get primitive topology.
   */
  get primitiveTopology(): string {
    return this.payload?.primitiveTopology || "triangle-list";
  }

  /**
   * Check if mesh has indices.
   */
  get hasIndices(): boolean {
    return this.payload?.indices !== undefined;
  }

  /**
   * Get the bounding box for frustum culling.
   * Returns null if not yet calculated.
   */
  get boundingBox(): BoundingBox | null {
    return this._boundingBox;
  }

  /**
   * Get the bounding sphere for frustum culling.
   * Returns null if not yet calculated.
   */
  get boundingSphere(): BoundingSphere | null {
    return this._boundingSphere;
  }

  /**
   * Get the vertex buffer (compiled).
   */
  getVertexBuffer(): GPUBuffer | null {
    const buffer = this.vertexBuffer?.getGPUBuffer() || null;
    return buffer;
  }

  /**
   * Get the index buffer (compiled).
   */
  getIndexBuffer(): GPUBuffer | null {
    return this.indexBuffer?.getGPUBuffer() || null;
  }

  /**
   * Create vertex buffer from mesh data.
   */
  private async createVertexBuffer(): Promise<WebGPUBuffer> {
    if (!this.payload || !this.device) {
      throw new Error("No mesh data or device for vertex buffer creation");
    }

    console.log(
      `🔧 MeshResource "${this.name}": Creating vertex buffer - vertices size: ${this.payload.vertices.byteLength} bytes, vertex count: ${this.vertexCount}`,
    );

    const buffer = new WebGPUBuffer(
      this.device,
      {
        size: this.payload.vertices.byteLength,
        usage: BufferUsage.VERTEX,
        label: `${this.name}_vertices`,
      },
      false,
    );

    // Upload vertex data
    buffer.setData(this.payload.vertices);
    console.log(`✅ MeshResource "${this.name}": Vertex buffer created successfully`);
    return buffer;
  }

  /**
   * Create index buffer from mesh data.
   */
  private async createIndexBuffer(): Promise<WebGPUBuffer> {
    if (!this.payload?.indices || !this.device) {
      throw new Error("No index data or device for index buffer creation");
    }

    const buffer = new WebGPUBuffer(
      this.device,
      {
        size: this.payload.indices.byteLength,
        usage: BufferUsage.INDEX,
        label: `${this.name}_indices`,
      },
      false,
    );

    // Upload index data
    buffer.setData(this.payload.indices);
    return buffer;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.vertexBuffer) {
      this.vertexBuffer.destroy();
      this.vertexBuffer = null;
    }

    if (this.indexBuffer) {
      this.indexBuffer.destroy();
      this.indexBuffer = null;
    }

    this.isCompiled = false;
    this.device = null;
  }
}
