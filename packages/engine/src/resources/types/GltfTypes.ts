/**
 * Type definitions for glTF resource data structures
 * These types define the parsed glTF data format used throughout the engine
 */

export interface GltfData {
  /** Array of mesh geometry data */
  meshes: MeshData[];
  /** Array of material definitions (basic support) */
  materials: MaterialData[];
  /** Scene hierarchy information */
  nodes: NodeData[];
  /** Scene definitions */
  scenes: SceneData[];
  /** File metadata and validation info */
  metadata: GltfMetadata;
}

export interface GltfMetadata {
  /** Original file name */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** glTF version */
  version: string;
  /** Total vertices across all meshes */
  vertexCount: number;
  /** Total triangles across all meshes */
  triangleCount: number;
  /** Backend used for parsing */
  parsedWith: 'javascript' | 'webassembly';
}

export interface MeshData {
  /** Vertex positions (x, y, z) */
  vertices: Float32Array;
  /** Vertex normals (x, y, z) */
  normals: Float32Array;
  /** Triangle indices */
  indices: Uint16Array | Uint32Array;
  /** Rendering primitive type */
  primitiveType: 'triangles' | 'points' | 'lines';
  /** Material index reference */
  materialIndex: number;
}

export interface MaterialData {
  /** Material name */
  name: string;
  /** Base color factor [r, g, b, a] */
  baseColorFactor: [number, number, number, number];
  /** Metallic factor */
  metallicFactor: number;
  /** Roughness factor */
  roughnessFactor: number;
}

export interface NodeData {
  /** Node name */
  name?: string;
  /** Child node indices */
  children: number[];
  /** Mesh index (if this node has a mesh) */
  meshIndex?: number;
  /** Local transform matrix */
  transform: number[]; // 4x4 matrix as flat array
}

export interface SceneData {
  /** Scene name */
  name?: string;
  /** Root node indices */
  nodes: number[];
}

export interface ValidationResult {
  /** Whether file is valid */
  isValid: boolean;
  /** Validation error messages */
  errors: string[];
  /** Non-critical warnings */
  warnings: string[];
  /** Detected file format */
  detectedFormat?: string;
}

export interface LoadingProgress {
  /** Current loading phase */
  phase: LoadingPhase;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Human-readable status message */
  message: string;
  /** Whether operation is complete */
  isComplete: boolean;
}

export enum LoadingPhase {
  VALIDATING = 'validating',
  PARSING = 'parsing',
  CONVERTING = 'converting',
  UPLOADING = 'uploading',
  COMPLETE = 'complete',
  ERROR = 'error'
}

export interface GltfResourceOptions {
  /** Force specific backend instead of auto-selection */
  forceBackend?: 'javascript' | 'webassembly';
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Whether to generate flat normals if missing */
  generateNormals?: boolean;
  /** Whether to center the model at origin */
  centerModel?: boolean;
  /** Performance threshold for auto-selecting WebAssembly backend */
  wasmThreshold?: number;
}