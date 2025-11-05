import { RenderPass, type RenderPassContext } from "../RenderGraph";
import type { DirectionalLightComponent } from "../components/lights/DirectionalLightComponent";
import type { PointLightComponent } from "../components/lights/PointLightComponent";
import { TransformComponent } from "../components/TransformComponent";
import { ShadowMapResource } from "../shadows/ShadowMapResource";
import { ResourceComponent } from "../components/ResourceComponent";
import shadowShaderSource from "../../webgpu/shaders/shadow.wgsl?raw";

/**
 * Shadow pass - renders scene from light perspective to generate shadow maps.
 * Follows SPACe architecture patterns and integrates with existing light system.
 */
export class ShadowPass extends RenderPass {
  private shadowPipeline: GPURenderPipeline | null = null;
  private shadowBindGroupLayout: GPUBindGroupLayout | null = null;
  private device: GPUDevice | null = null;

  constructor(priority = 5) {
    super("Shadow", priority); // Execute before forward pass (priority 10)
  }

  /**
   * Initialize shadow pass with GPU device
   */
  initialize(device: GPUDevice): void {
    this.device = device;
    this.createShadowPipeline(device);
    console.log("🌑 ShadowPass initialized");
  }

  /**
   * Create shadow mapping pipeline (depth-only rendering)
   */
  private createShadowPipeline(device: GPUDevice): void {
    // Bind group layout for shadow uniforms (light view-projection matrix)
    this.shadowBindGroupLayout = device.createBindGroupLayout({
      label: "ShadowBindGroupLayout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    const pipelineLayout = device.createPipelineLayout({
      label: "ShadowPipelineLayout",
      bindGroupLayouts: [this.shadowBindGroupLayout],
    });

    // Load shadow shader from external file
    const shaderModule = device.createShaderModule({
      label: "ShadowShader",
      code: shadowShaderSource,
    });

    this.shadowPipeline = device.createRenderPipeline({
      label: "ShadowPipeline",
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: "vs_main",
        buffers: [
          {
            // Vertex buffer
            arrayStride: 32, // 3 position + 3 normal + 2 uv = 8 floats = 32 bytes
            stepMode: "vertex",
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x3",
              },
            ],
          },
          {
            // Instance buffer
            arrayStride: 80, // 16 floats (model matrix) + 4 floats (color) = 80 bytes
            stepMode: "instance",
            attributes: [
              { shaderLocation: 1, offset: 0, format: "float32x4" },
              { shaderLocation: 2, offset: 16, format: "float32x4" },
              { shaderLocation: 3, offset: 32, format: "float32x4" },
              { shaderLocation: 4, offset: 48, format: "float32x4" },
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fs_main",
        targets: [], // No color targets, depth-only
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "back",
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });
  }

  /**
   * Execute shadow pass - render scene from light perspective
   */
  execute(context: RenderPassContext): void {
    if (!this.device || !this.shadowPipeline || !this.shadowBindGroupLayout) {
      console.warn("⚠️ ShadowPass not initialized");
      return;
    }

    const { renderer, batches } = context;

    // Get scene from renderer context (if available)
    // For now, we'll skip if no scene is available
    // In a full implementation, you'd query the scene for lights with shadow maps

    console.log("🌑 ShadowPass: Executing (placeholder - no shadow maps to render)");

    // TODO: Query scene for lights with ShadowMapResource
    // TODO: For each light with shadows enabled:
    //   1. Calculate light view-projection matrix
    //   2. Begin render pass with shadow map as depth attachment
    //   3. Render batches from light perspective
    //   4. End render pass

    // This is a placeholder implementation showing the structure
    // The actual implementation would need scene access to query lights
  }

  /**
   * Helper: Render batches from light perspective
   */
  private renderBatchesToShadowMap(
    shadowMap: ShadowMapResource,
    lightViewProj: Float32Array,
    batches: any[],
  ): void {
    if (!this.device || !this.shadowPipeline || !this.shadowBindGroupLayout) {
      return;
    }

    const view = shadowMap.getView();
    if (!view) {
      console.warn("⚠️ Shadow map view not available");
      return;
    }

    // Create uniform buffer for light view-projection
    const uniformBuffer = this.device.createBuffer({
      size: 64, // mat4x4 = 16 floats = 64 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "ShadowUniformBuffer",
    });
    this.device.queue.writeBuffer(uniformBuffer, 0, lightViewProj.buffer);

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.shadowBindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: uniformBuffer },
        },
      ],
    });

    // Create command encoder
    const encoder = this.device.createCommandEncoder({
      label: "ShadowPassEncoder",
    });

    // Begin render pass
    const renderPass = encoder.beginRenderPass({
      label: "ShadowRenderPass",
      colorAttachments: [],
      depthStencilAttachment: {
        view,
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    });

    renderPass.setPipeline(this.shadowPipeline);
    renderPass.setBindGroup(0, bindGroup);

    // Render each batch
    for (const batch of batches) {
      if (!batch.mesh || !batch.instanceBuffer) continue;

      const vertexBuffer = batch.mesh.getVertexBuffer();
      const indexBuffer = batch.mesh.getIndexBuffer();

      if (vertexBuffer) {
        renderPass.setVertexBuffer(0, vertexBuffer);
      }
      if (batch.instanceBuffer) {
        renderPass.setVertexBuffer(1, batch.instanceBuffer);
      }
      if (indexBuffer) {
        renderPass.setIndexBuffer(indexBuffer, "uint32");
      }

      // Draw
      if (batch.mesh.indexCount > 0) {
        renderPass.drawIndexed(batch.mesh.indexCount, batch.instances.size);
      } else if (batch.mesh.vertexCount > 0) {
        renderPass.draw(batch.mesh.vertexCount, batch.instances.size);
      }
    }

    renderPass.end();

    // Submit
    this.device.queue.submit([encoder.finish()]);

    // Cleanup temporary buffer
    uniformBuffer.destroy();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.shadowPipeline = null;
    this.shadowBindGroupLayout = null;
    this.device = null;
    console.log("🌑 ShadowPass disposed");
  }
}
