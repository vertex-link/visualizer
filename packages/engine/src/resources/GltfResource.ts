import { Resource, type Context } from "@vertex-link/space";
import { Document, NodeIO } from "@gltf-transform/core";
import { WebGPUProcessor } from "../processors/WebGPUProcessor";
import { MeshResource, type MeshDescriptor } from "./MeshResource";
import { MaterialResource } from "./MaterialResource";
import { ShaderResource } from "./ShaderResource";
import type {
  GltfData,
  GltfMetadata,
  MeshData,
  MaterialData,
  NodeData,
  SceneData,
  GltfResourceOptions,
} from "./types/GltfTypes";

// Default GLTF shaders
const gltfVertexWGSL = `
struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) uv: vec2<f32>,
};

struct GlobalUniforms {
  viewProjection: mat4x4<f32>,
};

struct InstanceData {
  model: mat4x4<f32>,
  color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> globals: GlobalUniforms;
@group(1) @binding(0) var<storage, read> instances: array<InstanceData>;

@vertex
fn vs_main(
  input: VertexInput,
  @builtin(instance_index) instanceIdx: u32,
) -> VertexOutput {
  var output: VertexOutput;

  let instance = instances[instanceIdx];
  let worldPos = instance.model * vec4<f32>(input.position, 1.0);

  output.position = globals.viewProjection * worldPos;
  output.normal = (instance.model * vec4<f32>(input.normal, 0.0)).xyz;
  output.uv = input.uv;

  return output;
}
`;

const gltfFragmentWGSL = `
struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) normal: vec3<f32>,
  @location(1) uv: vec2<f32>,
};

struct InstanceData {
  model: mat4x4<f32>,
  color: vec4<f32>,
};

@group(1) @binding(0) var<storage, read> instances: array<InstanceData>;

@fragment
fn fs_main(
  input: VertexOutput,
  @builtin(instance_index) instanceIdx: u32,
) -> @location(0) vec4<f32> {
  let instance = instances[instanceIdx];

  // Simple lighting
  let lightDir = normalize(vec3<f32>(1.0, 1.0, 1.0));
  let normal = normalize(input.normal);
  let diffuse = max(dot(normal, lightDir), 0.2);

  return vec4<f32>(instance.color.rgb * diffuse, instance.color.a);
}
`;

/**
 * GLTF Resource descriptor
 */
export interface GltfResourceDescriptor {
  /** URL or path to GLTF file */
  url: string;
  /** Optional configuration */
  options?: GltfResourceOptions;
}

/**
 * GltfResource - Loads and manages GLTF models
 *
 * This resource follows the existing architecture pattern:
 * - Extends Resource<GltfData>
 * - Auto-loads in constructor via loadInternal()
 * - Creates child MeshResource and MaterialResource in compile()
 * - No manager/service pattern - just creates resources directly
 */
export class GltfResource extends Resource<GltfData> {
  private meshResources: MeshResource[] = [];
  private materialResources: MaterialResource[] = [];
  private shaderResource: ShaderResource | null = null;
  private descriptor: GltfResourceDescriptor;

  public isCompiled = false;

  constructor(
    name: string,
    descriptor: GltfResourceDescriptor,
    context?: Context,
  ) {
    // Create placeholder payload - will be populated in loadInternal
    const placeholderPayload: GltfData = {
      meshes: [],
      materials: [],
      nodes: [],
      scenes: [],
      metadata: {
        fileName: descriptor.url,
        fileSize: 0,
        version: "2.0",
        vertexCount: 0,
        triangleCount: 0,
        parsedWith: "javascript",
      },
    };

    super(name, placeholderPayload, context);
    this.descriptor = descriptor;
  }

  /**
   * Load and parse GLTF file
   */
  protected async loadInternal(): Promise<GltfData> {
    console.debug(`GltfResource "${this.name}": Loading from ${this.descriptor.url}`);

    try {
      // Parse GLTF using @gltf-transform/core
      const io = new NodeIO();
      const document = await io.read(this.descriptor.url);

      // Convert to our internal format
      const gltfData = this.convertDocument(document);

      console.debug(
        `GltfResource "${this.name}": Loaded ${gltfData.meshes.length} meshes, ${gltfData.materials.length} materials`,
      );

      return gltfData;
    } catch (error) {
      console.error(`Failed to load GLTF from ${this.descriptor.url}:`, error);
      throw error;
    }
  }

  /**
   * Compile GLTF data into child resources
   */
  async compile(context: Context): Promise<void> {
    if (this.isCompiled) {
      console.log(`GltfResource "${this.name}": Already compiled`);
      return;
    }

    console.log(`🔧 GltfResource "${this.name}": Starting compilation`);

    // Get WebGPU device (existing pattern)
    const webgpuProcessor = context.processors.find(
      (p) => p instanceof WebGPUProcessor,
    ) as WebGPUProcessor | undefined;

    if (!webgpuProcessor) {
      throw new Error(
        "Cannot compile GltfResource: WebGPUProcessor not found in context.",
      );
    }

    const device = webgpuProcessor.renderer.device;
    if (!device) {
      throw new Error("WebGPU device not available");
    }

    try {
      // Create shared shader for all GLTF materials
      this.shaderResource = new ShaderResource(
        `${this.name}_GltfShader`,
        {
          vertexSource: gltfVertexWGSL,
          fragmentSource: gltfFragmentWGSL,
          entryPoints: { vertex: "vs_main", fragment: "fs_main" },
        } as any,
        context,
      );
      await this.shaderResource.whenReady();
      console.log(`✅ GltfResource "${this.name}": Shader compiled`);

      // Create MaterialResources
      for (let i = 0; i < this.payload.materials.length; i++) {
        const matData = this.payload.materials[i];
        const material = MaterialResource.createBasic(
          `${this.name}_Material_${i}`,
          this.shaderResource,
          matData.baseColorFactor,
          context,
        );
        await material.whenReady();
        this.materialResources.push(material);
      }
      console.log(
        `✅ GltfResource "${this.name}": Created ${this.materialResources.length} materials`,
      );

      // Create MeshResources
      for (let i = 0; i < this.payload.meshes.length; i++) {
        const meshData = this.payload.meshes[i];
        const meshDescriptor = this.convertToMeshDescriptor(meshData);
        const meshResource = new MeshResource(
          `${this.name}_Mesh_${i}`,
          meshDescriptor,
          context,
        );
        await meshResource.whenReady();
        this.meshResources.push(meshResource);
      }
      console.log(
        `✅ GltfResource "${this.name}": Created ${this.meshResources.length} meshes`,
      );

      this.isCompiled = true;
      console.log(`✅ GltfResource "${this.name}": Compilation complete`);
    } catch (error) {
      console.error(`❌ Failed to compile GltfResource "${this.name}":`, error);
      throw error;
    }
  }

  /**
   * Get mesh resource by index
   */
  getMesh(index: number): MeshResource | undefined {
    return this.meshResources[index];
  }

  /**
   * Get material resource by index
   */
  getMaterial(index: number): MaterialResource | undefined {
    return this.materialResources[index];
  }

  /**
   * Get number of meshes
   */
  get meshCount(): number {
    return this.meshResources.length;
  }

  /**
   * Get number of materials
   */
  get materialCount(): number {
    return this.materialResources.length;
  }

  /**
   * Convert gltf-transform Document to our internal GltfData format
   */
  private convertDocument(document: Document): GltfData {
    const root = document.getRoot();

    // Extract meshes
    const meshes: MeshData[] = [];
    for (const mesh of root.listMeshes()) {
      for (const primitive of mesh.listPrimitives()) {
        const positions = primitive.getAttribute("POSITION");
        const normals = primitive.getAttribute("NORMAL");
        const indices = primitive.getIndices();

        if (!positions) continue;

        const positionArray = positions.getArray();
        const normalArray = normals?.getArray() || new Float32Array(positionArray.length);
        const indexArray = indices?.getArray();

        // Find material index
        const material = primitive.getMaterial();
        const materialIndex = material ? root.listMaterials().indexOf(material) : 0;

        meshes.push({
          vertices: new Float32Array(positionArray),
          normals: new Float32Array(normalArray),
          indices: indexArray
            ? indexArray instanceof Uint16Array
              ? indexArray
              : new Uint32Array(indexArray)
            : new Uint32Array(0),
          primitiveType: "triangles",
          materialIndex,
        });
      }
    }

    // Extract materials
    const materials: MaterialData[] = [];
    for (const material of root.listMaterials()) {
      const baseColorFactor = material.getBaseColorFactor();
      const metallicFactor = material.getMetallicFactor();
      const roughnessFactor = material.getRoughnessFactor();

      materials.push({
        name: material.getName() || "Material",
        baseColorFactor: [
          baseColorFactor[0],
          baseColorFactor[1],
          baseColorFactor[2],
          baseColorFactor[3],
        ],
        metallicFactor,
        roughnessFactor,
      });
    }

    // Extract nodes
    const nodes: NodeData[] = [];
    for (const node of root.listNodes()) {
      const transform = node.getMatrix();
      const mesh = node.getMesh();
      const meshIndex = mesh ? root.listMeshes().indexOf(mesh) : undefined;

      nodes.push({
        name: node.getName() || undefined,
        children: node.listChildren().map((child) => root.listNodes().indexOf(child)),
        meshIndex,
        transform: Array.from(transform),
      });
    }

    // Extract scenes
    const scenes: SceneData[] = [];
    for (const scene of root.listScenes()) {
      scenes.push({
        name: scene.getName() || undefined,
        nodes: scene.listChildren().map((node) => root.listNodes().indexOf(node)),
      });
    }

    // Calculate metadata
    let vertexCount = 0;
    let triangleCount = 0;
    for (const mesh of meshes) {
      vertexCount += mesh.vertices.length / 3;
      triangleCount += mesh.indices.length / 3;
    }

    const metadata: GltfMetadata = {
      fileName: this.descriptor.url,
      fileSize: 0, // Would need to fetch this separately
      version: root.getAsset().version || "2.0",
      vertexCount,
      triangleCount,
      parsedWith: "javascript",
    };

    return {
      meshes,
      materials,
      nodes,
      scenes,
      metadata,
    };
  }

  /**
   * Convert MeshData to MeshDescriptor for MeshResource
   */
  private convertToMeshDescriptor(meshData: MeshData): MeshDescriptor {
    // Interleave vertex data: position(3) + normal(3) + uv(2)
    const vertexCount = meshData.vertices.length / 3;
    const interleavedData = new Float32Array(vertexCount * 8);

    for (let i = 0; i < vertexCount; i++) {
      const offset = i * 8;
      const posOffset = i * 3;

      // Position
      interleavedData[offset + 0] = meshData.vertices[posOffset + 0];
      interleavedData[offset + 1] = meshData.vertices[posOffset + 1];
      interleavedData[offset + 2] = meshData.vertices[posOffset + 2];

      // Normal
      interleavedData[offset + 3] = meshData.normals[posOffset + 0];
      interleavedData[offset + 4] = meshData.normals[posOffset + 1];
      interleavedData[offset + 5] = meshData.normals[posOffset + 2];

      // UV (default to 0,0 if not present)
      interleavedData[offset + 6] = 0.0;
      interleavedData[offset + 7] = 0.0;
    }

    return {
      vertices: interleavedData,
      indices: meshData.indices,
      vertexAttributes: [
        { name: "position", size: 3, type: "float32", offset: 0 },
        { name: "normal", size: 3, type: "float32", offset: 12 },
        { name: "uv", size: 2, type: "float32", offset: 24 },
      ],
      vertexStride: 32, // 8 floats * 4 bytes
      primitiveTopology: "triangle-list",
    };
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    for (const mesh of this.meshResources) {
      mesh.dispose();
    }
    this.meshResources = [];
    this.materialResources = [];
    this.shaderResource = null;
    this.isCompiled = false;
  }
}
