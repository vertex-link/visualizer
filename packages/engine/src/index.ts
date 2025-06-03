// Services
export { ILoggingServiceKey, LogLevel, ConsoleLoggingService } from './services/LoggingService'; //
export type { ILoggingService } from './services/LoggingService'; //

// Resources
export { Resource, ResourceStatus } from './resources/Resource'; //
export { ShaderResource, ShaderStage } from './resources/ShaderResource'; //
export type { ShaderDescriptor, CompiledShader } from './resources/ShaderResource'; //
export { MeshResource } from './resources/MeshResource'; //
export type { VertexAttribute as MeshVertexAttribute, MeshDescriptor } from './resources/MeshResource'; //
export { MaterialResource } from './resources/MaterialResource'; //
export type { UniformValue, UniformDescriptor, MaterialDescriptor } from './resources/MaterialResource'; //
export { GeometryUtils } from './resources/GeometryUtils'; //
export {
    ResourceManager,
    IResourceManagerKey,
    ResourceHandle,
    ResourceComponent, // The one from ResourceManager.ts
    createShaderHandle,
    createMaterialHandle,
    createMeshHandle
} from './resources/ResourceManager'; //
export type { ResourceFactory } from './resources/ResourceManager'; //

// Rendering Interfaces
export { BufferUsage } from './rendering/interfaces/IBuffer'; //
export type { BufferDescriptor, IBuffer } from './rendering/interfaces/IBuffer'; //
export type { VertexAttribute as PipelineVertexAttribute, VertexLayout, PipelineDescriptor, IPipeline } from './rendering/interfaces/IPipeline'; //

// Rendering Components
export { TransformComponent } from './rendering/components/TransformComponent'; //
export type { Vec3, Quat, Mat4 } from './rendering/components/TransformComponent'; //
export { MeshRendererComponent } from './rendering/components/MeshRendererComponent'; //
// Types for MeshRendererComponent's mesh/material properties are simplified, actual resources should be used.

// Camera
export { CameraComponent, ProjectionType } from './rendering/camera/CameraComponent'; //
export type { PerspectiveConfig, OrthographicConfig, CameraConfig } from './rendering/camera/CameraComponent'; //
export { PerspectiveCamera } from './rendering/camera/PerspectiveCamera'; //

// Math Utilities
export { Transform } from './rendering/math/Transform'; //

// Rendering Pipeline & Processors
export { RenderGraph, RenderPass, ForwardPass, PostProcessPass } from './rendering/RenderGraph'; //
export type { RenderBatch, RenderPassContext } from './rendering/RenderGraph'; //
export { GPUResourcePool } from './rendering/GPUResourcePool'; //

export { WebGPUProcessor, WebGPUUpdate } from './processors/WebGPUProcessor'; //
export { RenderProcessor, RenderUpdate } from './processors/RenderProcessor'; //
export { FixedTickProcessor, FixedTickUpdate } from './processors/FixedTickProcessor'; //

// Potentially export WebGPU wrappers if they are part of the public engine API
// For now, assuming they are used internally by WebGPUProcessor or resources.
export { WebGPURenderer } from './webgpu/WebGPURenderer'; //
export { WebGPUPipeline } from './webgpu/WebGPUPipeline'; //
export { WebGPUBuffer } from './webgpu/WebGPUBuffer'; //