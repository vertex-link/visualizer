import type { ClusteringResource } from "../clustering/ClusteringResource";
import { RenderPass, type RenderPassContext } from "../RenderGraph";

/**
 * LightingPass - Clustered Forward+ Rendering Pass
 *
 * Renders scene geometry with clustered lighting support.
 * Falls back to simple lighting if clustering is not enabled.
 */
export class LightingPass extends RenderPass {
  private clusteringBindGroup: GPUBindGroup | null = null;
  private clusteringBindGroupLayout: GPUBindGroupLayout | null = null;
  private device: GPUDevice | null = null;

  constructor(priority = 10) {
    super("ClusteredForward", priority);
  }

  /**
   * Initialize bind group layout for clustering
   */
  initialize(device: GPUDevice): void {
    this.device = device;

    // Create bind group layout for clustering data
    // This matches @group(0) in clustered_forward.wgsl
    this.clusteringBindGroupLayout = device.createBindGroupLayout({
      label: "ClusteringBindGroupLayout",
      entries: [
        {
          // @binding(0) - Global uniforms
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          // @binding(1) - Cluster AABBs
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        {
          // @binding(2) - Lights
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        {
          // @binding(3) - Light indices
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        {
          // @binding(4) - Cluster grid (offset, count pairs)
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    console.log("✅ LightingPass initialized");
  }

  /**
   * Execute the clustered forward rendering pass
   */
  execute(context: RenderPassContext): void {
    const { renderer, batches, camera } = context;

    if (!renderer || !camera) {
      console.warn("⚠️ LightingPass: Missing renderer or camera");
      return;
    }

    if (batches.length === 0) {
      return;
    }

    // Begin frame rendering
    if (!renderer.beginFrame()) {
      console.error("❌ LightingPass: Failed to begin frame");
      return;
    }

    try {
      // Check if we have clustering data
      const clusteringResource = this.getClusteringResource(context);

      // Create/update clustering bind group if available
      if (clusteringResource) {
        this.updateClusteringBindGroup(clusteringResource, context.globalBindGroup);
        if (this.clusteringBindGroup) {
          renderer.setBindGroup(0, this.clusteringBindGroup);
        }
      } else if (context.globalBindGroup) {
        // Fallback to simple global bind group
        renderer.setBindGroup(0, context.globalBindGroup);
      } else {
        console.warn("⚠️ LightingPass: No bind group available");
        return;
      }

      // Render each instanced batch
      for (const batch of batches) {
        this.renderInstancedBatch(renderer, batch);
      }
    } catch (error) {
      console.error("❌ LightingPass: Rendering error:", error);
    } finally {
      renderer.endFrame();
    }
  }

  /**
   * Get clustering resource from renderer context
   */
  private getClusteringResource(context: RenderPassContext): ClusteringResource | null {
    // Access clustering resource through renderer metadata
    // (WebGPUProcessor stores this)
    return (context as any).clusteringResource || null;
  }

  /**
   * Create or update clustering bind group with all buffers
   */
  private updateClusteringBindGroup(
    clusteringResource: ClusteringResource,
    globalUniformBuffer: GPUBindGroup | null,
  ): void {
    if (!this.device || !this.clusteringBindGroupLayout) return;

    // Get clustering buffers
    const clusterAABBBuffer = clusteringResource.getClusterAABBBuffer();
    const lightBuffer = clusteringResource.getLightBuffer();
    const lightIndexBuffer = clusteringResource.getLightIndexBuffer();
    const clusterGridBuffer = clusteringResource.getClusterGridBuffer();

    if (!clusterAABBBuffer || !lightBuffer || !lightIndexBuffer || !clusterGridBuffer) {
      console.warn("⚠️ LightingPass: Missing clustering buffers");
      return;
    }

    // We need to get the actual uniform buffer from globalBindGroup
    // For now, we'll create a new bind group that includes all buffers
    // TODO: This needs refactoring to properly share the uniform buffer

    // For now, just use the global bind group and skip clustering
    // (proper implementation would require restructuring bind group management)
    this.clusteringBindGroup = null;
  }

  /**
   * Render an instanced batch
   */
  private renderInstancedBatch(renderer: any, batch: any): void {
    if (batch.instances.size === 0) return;

    const pipeline = batch.material.getPipeline();
    if (!pipeline) {
      console.error(`❌ LightingPass: No pipeline for material ${batch.material.name}`);
      return;
    }

    const mesh = batch.mesh;
    if (!mesh) {
      console.error(`❌ LightingPass: No mesh for batch`);
      return;
    }

    // Set pipeline
    renderer.setPipeline(pipeline);

    // Set vertex buffers
    const vertexBuffer = mesh.getVertexBuffer();
    if (vertexBuffer) {
      renderer.setVertexBuffer(0, vertexBuffer);
    } else {
      console.warn(`⚠️ LightingPass: No vertex buffer`);
      return;
    }

    // Set instance buffer
    if (batch.instanceBuffer) {
      renderer.setVertexBuffer(1, batch.instanceBuffer);
    } else {
      console.warn(`⚠️ LightingPass: No instance buffer`);
      return;
    }

    // Set index buffer
    const indexBuffer = mesh.getIndexBuffer();
    if (indexBuffer) {
      renderer.setIndexBuffer(indexBuffer);
    }

    // Draw
    if (mesh.indexCount > 0) {
      renderer.drawIndexed(mesh.indexCount, batch.instances.size);
    } else if (mesh.vertexCount > 0) {
      renderer.draw(mesh.vertexCount, batch.instances.size);
    }
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.clusteringBindGroup = null;
    this.clusteringBindGroupLayout = null;
    this.device = null;
  }
}
