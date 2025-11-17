import { Event } from "@vertex-link/space";
import type { Actor, Scene } from "@vertex-link/space";

// ==================== Editor State Events ====================

/**
 * Selection events
 */
export class SelectionChangedEvent extends Event<{
  actorId: string | null;
  previousActorId: string | null;
}> {
  static readonly eventType = "editor.selection.changed";
}

/**
 * Resource events
 */
export interface ResourceDescriptor {
  id: string;
  name: string;
  path: string;
  type: string;
  metadata: Record<string, any>;
}

export class ResourceImportRequestedEvent extends Event<{
  path: string;
  type: string;
}> {
  static readonly eventType = "editor.resource.import-requested";
}

export class ResourceRegisteredEvent extends Event<{
  descriptor: ResourceDescriptor;
}> {
  static readonly eventType = "editor.resource.registered";
}

/**
 * Property mutation events
 */
export class PropertyChangeRequestedEvent extends Event<{
  actorId: string;
  componentType: string;
  property: string;
  value: any;
}> {
  static readonly eventType = "editor.property.change-requested";
}

export class PropertyChangedEvent extends Event<{
  actorId: string;
  componentType: string;
  property: string;
  oldValue: any;
  newValue: any;
}> {
  static readonly eventType = "editor.property.changed";
}

/**
 * File system events
 */
export class SceneFileChangedEvent extends Event<{
  path: string;
  data: any;
}> {
  static readonly eventType = "editor.scene-file.changed";
}

/**
 * Undo/Redo events
 */
export class UndoRequestedEvent extends Event<void> {
  static readonly eventType = "editor.undo.requested";
}

export class RedoRequestedEvent extends Event<void> {
  static readonly eventType = "editor.redo.requested";
}

/**
 * Build system events
 */
export class BuildRequestedEvent extends Event<{
  target: string;
}> {
  static readonly eventType = "editor.build.requested";
}

export class BuildCompletedEvent extends Event<{
  success: boolean;
  output: string;
}> {
  static readonly eventType = "editor.build.completed";
}
