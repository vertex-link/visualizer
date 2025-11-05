export { LogLevel, ConsoleLoggingService } from "./services/LoggingService";
export type { ILoggingService } from "./services/LoggingService";

// Core
export { Engine } from "./Engine";

// Events
export * from "./events";

// Resources
export { ShaderResource, ShaderStage } from "./resources/ShaderResource";
export type { ShaderDescriptor, CompiledShader } from "./resources/ShaderResource";
export { MeshResource } from "./resources/MeshResource";
export type {
  VertexAttribute as MeshVertexAttribute,
  MeshDescriptor,
} from "./resources/MeshResource";
export { MaterialResource } from "./resources/MaterialResource";
export type {
  UniformValue,
  UniformDescriptor,
  MaterialDescriptor,
} from "./resources/MaterialResource";
export { GeometryUtils } from "./resources/GeometryUtils";

// Rendering Interfaces
export { BufferUsage } from "./rendering/interfaces/IBuffer";
export type { BufferDescriptor, IBuffer } from "./rendering/interfaces/IBuffer";
export type {
  VertexAttribute as PipelineVertexAttribute,
  VertexLayout,
  PipelineDescriptor,
  IPipeline,
} from "./rendering/interfaces/IPipeline";

// Rendering Components
export { TransformComponent } from "./rendering/components/TransformComponent";
export type { Vec3, Quat, Mat4 } from "./rendering/components/TransformComponent";
export { MeshRendererComponent } from "./rendering/components/MeshRendererComponent";

// Light Components
export {
  BaseLightComponent,
  PointLightComponent,
  DirectionalLightComponent,
} from "./rendering/components/lights";

// Camera
export { CameraComponent, ProjectionType } from "./rendering/camera/CameraComponent";
export type {
  PerspectiveConfig,
  OrthographicConfig,
  CameraConfig,
} from "./rendering/camera/CameraComponent";
export { PerspectiveCamera } from "./rendering/camera/PerspectiveCamera";

// Math Utilities
export { Transform } from "./rendering/math/Transform";

// Rendering Pipeline & Processors
export { RenderGraph, RenderPass, ForwardPass, PostProcessPass, ShadowPass } from "./rendering/RenderGraph";
export type { RenderBatch, RenderPassContext } from "./rendering/RenderGraph";
export { GPUResourcePool } from "./rendering/GPUResourcePool";

// Shadow Mapping
export { ShadowMapResource, ShadowMapType } from "./rendering/shadows/ShadowMapResource";
export type { ShadowMapDescriptor } from "./rendering/shadows/ShadowMapResource";

export { WebGPUProcessor } from "./processors/WebGPUProcessor";
export { LightProcessor } from "./processors/LightProcessor";
export { RenderProcessor } from "./processors/RenderProcessor";
export { FixedTickProcessor } from "./processors/FixedTickProcessor";

// WebGPU wrappers
export { WebGPURenderer } from "./webgpu/WebGPURenderer";
export { WebGPUPipeline } from "./webgpu/WebGPUPipeline";
export { WebGPUBuffer } from "./webgpu/WebGPUBuffer";
