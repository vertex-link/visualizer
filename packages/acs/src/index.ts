export { default as Actor } from "./Actor"; //
export type { ComponentClass, ComponentConstructorParameters } from "./component/Component"; //
// Component System
export { default as Component } from "./component/Component"; //
export { ComponentTypeRegistry } from "./component/ComponentRegistry"; //
export { ResourceComponent } from "./component/ResourceComponent";
export {
  deriveContext,
  getCurrentContext,
  runWithContext,
  useActor,
  useComponent,
  useEventBus,
  useProcessor,
  useScene,
  withContext,
} from "./composables/context";
export { useOnceEvent, useOnEvent } from "./composables/events";
export { useUpdate } from "./composables/processors";
export * from "./events/CoreEvents"; //
export { emitToQuery } from "./events/EmitToQuery"; //
export type { EventClass, EventHandler, EventPayload } from "./events/Event"; //
export {
  Event,
  EventBus,
  emit,
  getEventBus,
  type IEventBus,
  initializeEventBus,
  off,
  on,
} from "./events/Event"; //
export type { IProcessable, ProcessorTickCallback } from "./processor/Processor"; //
// Processor System
export { Processor } from "./processor/Processor"; //

export { Tickers } from "./processor/ProcessorTickers";
export { ComputeResource } from "./resources/ComputeResource";
export { Resource, ResourceStatus } from "./resources/Resource";
export { QueryBuilder } from "./scene/QueryBuilder"; //
export type {
  ComponentQueryCondition,
  ExcludeTagQueryCondition,
  IQueryDataProvider,
  QueryCondition,
  TagQueryCondition,
} from "./scene/QueryCondition"; //
// Scene System
export { Scene, SceneQueryBuilder } from "./scene/Scene"; //
// Utilities (if considered part of core)
export { generateUUID } from "./utils/uuid"; //
