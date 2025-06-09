import { Event } from './Event';
import Actor from '../Actor';
import Component from '../component/Component';
import { Scene } from '../scene/Scene';

// ==================== Core Framework Events ====================

/**
 * Entity lifecycle events
 */
export class EntityCreatedEvent extends Event<{
  entity: Actor;
  scene?: Scene;
}> {
  static readonly eventType = 'core.entity.created';
}

export class EntityDestroyedEvent extends Event<{
  entity: Actor;
  scene?: Scene;
}> {
  static readonly eventType = 'core.entity.destroyed';
}

/**
 * Component lifecycle events
 */
export class ComponentAddedEvent extends Event<{
  actor: Actor;
  component: Component;
  componentType: string;
}> {
  static readonly eventType = 'core.component.added';
}

export class ComponentRemovedEvent extends Event<{
  actor: Actor;
  component: Component;
  componentType: string;
}> {
  static readonly eventType = 'core.component.removed';
}

export class ComponentInitializedEvent extends Event<{
  actor: Actor;
  component: Component;
}> {
  static readonly eventType = 'core.component.initialized';
}

/**
 * Scene events
 */
export class SceneActivatedEvent extends Event<{
  scene: Scene;
}> {
  static readonly eventType = 'core.scene.activated';
}

export class SceneDeactivatedEvent extends Event<{
  scene: Scene;
}> {
  static readonly eventType = 'core.scene.deactivated';
}

// ==================== Engine Events (Examples) ====================

/**
 * Resource events
 */
export class ResourceReadyEvent extends Event<{
  meshRenderer: any; // Using any to avoid circular import
}> {
  static readonly eventType = 'engine.resource.ready';
}

/**
 * Input events
 */
export class KeyDownEvent extends Event<{
  key: string;
  repeat: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}> {
  static readonly eventType = 'engine.input.keydown';
}

export class KeyUpEvent extends Event<{
  key: string;
}> {
  static readonly eventType = 'engine.input.keyup';
}

export class MouseClickEvent extends Event<{
  x: number;
  y: number;
  button: number;
  screenX: number;
  screenY: number;
}> {
  static readonly eventType = 'engine.input.mouseclick';
}

export class MouseMoveEvent extends Event<{
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
}> {
  static readonly eventType = 'engine.input.mousemove';
}

// ==================== Game Events (Examples) ====================

/**
 * Entity interaction events
 */
export class EntityDamagedEvent extends Event<{
  target: Actor;
  damage: number;
  source?: Actor;
  damageType: string;
}> {
  static readonly eventType = 'game.entity.damaged';
}

export class EntityHealedEvent extends Event<{
  target: Actor;
  amount: number;
  source?: Actor;
}> {
  static readonly eventType = 'game.entity.healed';
}

export class EntityDiedEvent extends Event<{
  target: Actor;
  killer?: Actor;
  damageType?: string;
}> {
  static readonly eventType = 'game.entity.died';
}

/**
 * Collision events
 */
export class CollisionStartEvent extends Event<{
  actorA: Actor;
  actorB: Actor;
  contactPoint: { x: number; y: number; z: number };
  normal: { x: number; y: number; z: number };
}> {
  static readonly eventType = 'game.collision.start';
}

export class CollisionEndEvent extends Event<{
  actorA: Actor;
  actorB: Actor;
}> {
  static readonly eventType = 'game.collision.end';
}
