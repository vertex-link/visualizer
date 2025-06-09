import { Resource } from "@vertex-link/acs";
import { BufferUsage } from "../rendering/interfaces/IBuffer";
import { WebGPUBuffer } from "./../webgpu/WebGPUBuffer";

/**
 * Vertex attribute definition for mesh data.
 */
export interface VertexAttribute {
  name: string;
  size: number; // Number of components (1, 2, 3, or 4)
  type: 'float32' | 'uint32' | 'sint32';
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
  primitiveTopology?: 'triangle-list' | 'triangle-strip' | 'line-list' | 'point-list';
}

/**
 * Simplified MeshResource - no service registry, no resource manager
 * Resources auto-load and auto-compile when used
 */
export class MeshResource extends Resource<MeshDescriptor> {
  private device: GPUDevice | null = null;
  private vertexBuffer: WebGPUBuffer | null = null;
  private indexBuffer: WebGPUBuffer | null = null;
  public isCompiled: boolean = false;

  constructor(name: string, meshData: MeshDescriptor) {
    super(name, meshData);
  }

  protected async loadInternal(): Promise<MeshDescriptor> {
    // Mesh data is provided in constructor, so just validate and return
    if (!this.payload.vertices || this.payload.vertices.length === 0) {
      throw new Error(`MeshResource "${this.name}": No vertex data provided`);
    }

    console.debug(`MeshResource "${this.name}" loaded with ${this.vertexCount} vertices`);
    return this.payload;
  }

  async compile(): Promise<void> {
    if (this.isCompiled || !this.isLoaded()) {
      return;
    }

    // Get device from global processor
    this.device = this.getDevice();
    if (!this.device) {
      throw new Error(`MeshResource "${this.name}": No GPU device available for compilation`);
    }

    try {
      // Create vertex buffer
      this.vertexBuffer = await this.createVertexBuffer();

      // Create index buffer if indices exist
      if (this.payload.indices) {
        this.indexBuffer = await this.createIndexBuffer();
      }

      this.isCompiled = true;
      console.debug(`MeshResource "${this.name}" compiled successfully`);

    } catch (error) {
      console.error(`Failed to compile MeshResource "${this.name}":`, error);
      throw error;
    }
  }

  /**
   * Get vertex count for rendering.
   */
  get vertexCount(): number {
    return this.payload ? this.payload.vertices.length / (this.payload.vertexStride / 4) : 0;
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
    return this.payload?.primitiveTopology || 'triangle-list';
  }

  /**
   * Check if mesh has indices.
   */
  get hasIndices(): boolean {
    return this.payload?.indices !== undefined;
  }

  /**
   * Get the vertex buffer (compiled).
   */
  getVertexBuffer(): GPUBuffer | null {
    return this.vertexBuffer?.getGPUBuffer() || null;
  }

  /**
   * Get the index buffer (compiled).
   */
  getIndexBuffer(): GPUBuffer | null {
    return this.indexBuffer?.getGPUBuffer() || null;
  }

  /**
   * Create mesh from raw vertex/index data.
   */
  static createFromArrays(
    name: string,
    vertices: Float32Array,
    indices?: Uint16Array,
    vertexAttributes?: VertexAttribute[]
  ): MeshResource {
    // Default attributes if not provided (position only)
    const defaultAttributes: VertexAttribute[] = vertexAttributes || [
      { name: 'position', size: 3, type: 'float32', offset: 0 }
    ];

    const vertexStride = defaultAttributes.reduce((sum, attr) => sum + attr.size * 4, 0);

    const descriptor: MeshDescriptor = {
      vertices,
      indices,
      vertexAttributes: defaultAttributes,
      vertexStride,
      primitiveTopology: 'triangle-list'
    };

    return new MeshResource(name, descriptor);
  }

  /**
   * Create vertex buffer from mesh data.
   */
  private async createVertexBuffer(): Promise<WebGPUBuffer> {
    if (!this.payload || !this.device) {
      throw new Error('No mesh data or device for vertex buffer creation');
    }

    const buffer = new WebGPUBuffer(this.device, {
      size: this.payload.vertices.byteLength,
      usage: BufferUsage.VERTEX,
      label: `${this.name}_vertices`
    }, false);

    // Upload vertex data
    buffer.setData(this.payload.vertices);
    return buffer;
  }

  /**
   * Create index buffer from mesh data.
   */
  private async createIndexBuffer(): Promise<WebGPUBuffer> {
    if (!this.payload?.indices || !this.device) {
      throw new Error('No index data or device for index buffer creation');
    }

    const buffer = new WebGPUBuffer(this.device, {
      size: this.payload.indices.byteLength,
      usage: BufferUsage.INDEX,
      label: `${this.name}_indices`
    }, false);

    // Upload index data
    buffer.setData(this.payload.indices);
    return buffer;
  }

  /**
   * Get GPU device - simplified approach
   */
  private getDevice(): GPUDevice | null {
    // TODO: Get device from global WebGPUProcessor or similar
    // This is a simplified approach for the refactor
    return (globalThis as any).__webgpu_device__ || null;
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
