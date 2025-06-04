import { Resource } from "./Resource";
import { ServiceRegistry } from "@vertex-link/acs";
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
 * Resource that holds 3D mesh geometry data.
 * Manages vertex and index buffers for rendering.
 */
export class MeshResource extends Resource {
  private meshDescriptor: MeshDescriptor | null = null;
  private vertexBuffer: WebGPUBuffer | null = null;
  private indexBuffer: WebGPUBuffer | null = null;

  // Direct device reference instead of going through service
  private device: GPUDevice | null = null;

  // Compiled state
  public isCompiled: boolean = false;
  public version: number = 1;

  constructor(name: string, serviceRegistry: ServiceRegistry, uuid?: string) {
    super(name, serviceRegistry, uuid);
  }

  /**
   * Set the GPU device for compilation (called by processor/manager)
   */
  setDevice(device: GPUDevice): void {
    this.device = device;
  }

  /**
   * Get vertex count for rendering.
   */
  get vertexCount(): number {
    return this.meshDescriptor ? this.meshDescriptor.vertices.length / (this.meshDescriptor.vertexStride / 4) : 0;
  }

  /**
   * Get index count for rendering.
   */
  get indexCount(): number {
    return this.meshDescriptor?.indices ? this.meshDescriptor.indices.length : 0;
  }

  /**
   * Get vertex stride in bytes.
   */
  get vertexStride(): number {
    return this.meshDescriptor?.vertexStride || 0;
  }

  /**
   * Get vertex attributes.
   */
  get vertexAttributes(): VertexAttribute[] {
    return this.meshDescriptor?.vertexAttributes || [];
  }

  /**
   * Get primitive topology.
   */
  get primitiveTopology(): string {
    return this.meshDescriptor?.primitiveTopology || 'triangle-list';
  }

  /**
   * Check if mesh has indices.
   */
  get hasIndices(): boolean {
    return this.meshDescriptor?.indices !== undefined;
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
   * Set mesh data from descriptor.
   */
  setMeshData(descriptor: MeshDescriptor): void {
    this.meshDescriptor = descriptor;
    this.isCompiled = false; // Need to recompile
    this.data = descriptor; // Store as resource data
  }

  /**
   * Create mesh from raw vertex/index data.
   */
  static createFromArrays(
    name: string,
    serviceRegistry: ServiceRegistry,
    vertices: Float32Array,
    indices?: Uint16Array,
    vertexAttributes?: VertexAttribute[]
  ): MeshResource {
    const mesh = new MeshResource(name, serviceRegistry);

    // Default attributes if not provided (position only)
    const defaultAttributes: VertexAttribute[] = vertexAttributes || [
      { name: 'position', size: 3, type: 'float32', offset: 0 }
    ];

    const vertexStride = defaultAttributes.reduce((sum, attr) => sum + attr.size * 4, 0);

    mesh.setMeshData({
      vertices,
      indices,
      vertexAttributes: defaultAttributes,
      vertexStride,
      primitiveTopology: 'triangle-list'
    });

    return mesh;
  }

  /**
   * Load mesh data (placeholder for file loading).
   */
  protected async performLoad(): Promise<void> {
    if (!this.meshDescriptor) {
      throw new Error(`MeshResource "${this.name}": No mesh data provided`);
    }

    this.data = this.meshDescriptor;
    console.debug(`MeshResource "${this.name}" loaded with ${this.vertexCount} vertices`);
  }

  /**
   * Compile mesh data into GPU buffers.
   * Requires device to be set first!
   */
  async compile(): Promise<void> {
    if (this.isCompiled || !this.isLoaded()) {
      return;
    }

    if (!this.device) {
      throw new Error(`MeshResource "${this.name}": No GPU device set for compilation. Call setDevice() first.`);
    }

    if (!this.meshDescriptor) {
      throw new Error(`MeshResource "${this.name}": Cannot compile without mesh data`);
    }

    try {
      // Create vertex buffer
      this.vertexBuffer = await this.createVertexBuffer();

      // Create index buffer if indices exist
      if (this.meshDescriptor.indices) {
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
   * Unload mesh data and free GPU resources.
   */
  protected async performUnload(): Promise<void> {
    // Destroy GPU buffers
    if (this.vertexBuffer) {
      this.vertexBuffer.destroy();
      this.vertexBuffer = null;
    }

    if (this.indexBuffer) {
      this.indexBuffer.destroy();
      this.indexBuffer = null;
    }

    this.isCompiled = false;
    this.meshDescriptor = null;
    this.device = null;
    console.debug(`MeshResource "${this.name}" unloaded`);
  }

  /**
   * Create vertex buffer from mesh data.
   */
  private async createVertexBuffer(): Promise<WebGPUBuffer> {
    if (!this.meshDescriptor || !this.device) {
      throw new Error('No mesh data or device for vertex buffer creation');
    }

    const buffer = new WebGPUBuffer(this.device, {
      size: this.meshDescriptor.vertices.byteLength,
      usage: BufferUsage.VERTEX,
      label: `${this.name}_vertices`
    }, false); // Not mapped at creation

    // Upload vertex data
    buffer.setData(this.meshDescriptor.vertices);

    return buffer;
  }

  /**
   * Create index buffer from mesh data.
   */
  private async createIndexBuffer(): Promise<WebGPUBuffer> {
    if (!this.meshDescriptor?.indices || !this.device) {
      throw new Error('No index data or device for index buffer creation');
    }

    const buffer = new WebGPUBuffer(this.device, {
      size: this.meshDescriptor.indices.byteLength,
      usage: BufferUsage.INDEX,
      label: `${this.name}_indices`
    }, false); // Not mapped at creation

    // Upload index data
    buffer.setData(this.meshDescriptor.indices);

    return buffer;
  }

  /**
   * Future streaming support - create delta for changed mesh data.
   */
  createDelta?(sinceVersion: number): unknown {
    // Placeholder for future streaming implementation
    if (sinceVersion < this.version) {
      return {
        type: 'mesh_delta',
        resourceId: this.uuid,
        fromVersion: sinceVersion,
        toVersion: this.version,
        // Would include vertex/index changes
      };
    }
    return null;
  }
}
