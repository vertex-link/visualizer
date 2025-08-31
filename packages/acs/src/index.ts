import { ComputeResource } from './resources/ComputeResource';

export { default as Actor } from './Actor'; //
export type { ServiceKey } from './Service'; //
export { type IService, ServiceRegistry } from './Service'; //

// Component System
export { default as Component } from './component/Component'; //
export type { ComponentClass, ComponentConstructorParameters } from './component/Component'; //
export { ComponentTypeRegistry } from './component/ComponentRegistry'; //
export { ResourceComponent } from './component/ResourceComponent'

// Event System

export {
  Event,
  EventBus,
  type IEventBus,
  getEventBus,
  initializeEventBus,
  emit,
  on,
  off
} from './events/Event'; //
export type { EventPayload, EventHandler, EventClass } from './events/Event'; //
export * from './events/CoreEvents'; //
export { emitToQuery } from './events/EmitToQuery'; //

// Processor System
export { Processor } from './processor/Processor'; //
export type { ProcessorTickCallback, IProcessable } from './processor/Processor'; //
export { ProcessorRegistry } from './processor/ProcessorRegistry'; //

// Scene System
export { Scene, SceneQueryBuilder } from './scene/Scene'; //
export { QueryBuilder } from './scene/QueryBuilder'; //
export type { QueryCondition, IQueryDataProvider } from './scene/QueryCondition'; //
export type { ComponentQueryCondition, TagQueryCondition, ExcludeTagQueryCondition } from './scene/QueryCondition'; //

// Utilities (if considered part of core)
export { generateUUID } from './utils/uuid'; //


export { Resource, ResourceStatus } from './resources/Resource';
export { ComputeResource } from './resources/ComputeResource';
// Resources
// export {Resource}
