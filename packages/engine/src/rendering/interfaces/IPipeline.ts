/**
 * Vertex attribute description.
 */
export interface VertexAttribute {
  /** Shader location/binding */
  location: number;
  /** Data format (e.g., 'float32x3', 'uint32') */
  format: string;
  /** Byte offset within vertex */
  offset: number;
}

/**
 * Vertex buffer layout description.
 */
export interface VertexLayout {
  /** Stride between vertices in bytes */
  stride: number;
  /** Vertex attributes */
  attributes: VertexAttribute[];
}

/**
 * Pipeline creation descriptor.
 */
export interface PipelineDescriptor {
  /** Vertex shader source code */
  vertexShader: string;
  /** Fragment shader source code */
  fragmentShader: string;
  /** Vertex buffer layout */
  vertexLayout: VertexLayout;
  /** Optional label for debugging */
  label?: string;
  /** Optional shader entry points */
  entryPoints?: {
    /** Vertex shader entry point */
    vertex?: string;
    /** Fragment shader entry point */
    fragment?: string;
  };
}

/**
 * Abstract render pipeline interface.
 * Encapsulates compiled shaders and vertex layout.
 */
export interface IPipeline {
  /** Unique identifier for this pipeline */
  readonly id: string;

  /** Vertex layout used by this pipeline */
  readonly vertexLayout: VertexLayout;

  /**
   * Check if the pipeline is ready for use.
   */
  isReady(): boolean;

  /**
   * Destroy the pipeline and free its resources.
   */
  destroy(): void;
}
