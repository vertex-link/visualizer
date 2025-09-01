import type Actor from "../Actor";
import type Component from "../component/Component";
import type { Scene } from "../scene/Scene";
import { Event } from "./Event";

// ==================== Core Framework Events ====================

/**
 * Entity lifecycle events
 */
export class EntityCreatedEvent extends Event<{
  entity: Actor;
  scene?: Scene;
}> {
  static readonly eventType = "core.entity.created";
}

export class EntityDestroyedEvent extends Event<{
  entity: Actor;
  scene?: Scene;
}> {
  static readonly eventType = "core.entity.destroyed";
}

/**
 * Component lifecycle events
 */
export class ComponentAddedEvent extends Event<{
  actor: Actor;
  component: Component;
  componentType: string;
}> {
  static readonly eventType = "core.component.added";
}

export class ComponentRemovedEvent extends Event<{
  actor: Actor;
  component: Component;
  componentType: string;
}> {
  static readonly eventType = "core.component.removed";
}

export class ComponentInitializedEvent extends Event<{
  actor: Actor;
  component: Component;
}> {
  static readonly eventType = "core.component.initialized";
}

/**
 * Scene events
 */
export class SceneActivatedEvent extends Event<{
  scene: Scene;
}> {
  static readonly eventType = "core.scene.activated";
}

export class SceneDeactivatedEvent extends Event<{
  scene: Scene;
}> {
  static readonly eventType = "core.scene.deactivated";
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
  static readonly eventType = "game.entity.damaged";
}

export class EntityHealedEvent extends Event<{
  target: Actor;
  amount: number;
  source?: Actor;
}> {
  static readonly eventType = "game.entity.healed";
}

export class EntityDiedEvent extends Event<{
  target: Actor;
  killer?: Actor;
  damageType?: string;
}> {
  static readonly eventType = "game.entity.died";
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
  static readonly eventType = "game.collision.start";
}

export class CollisionEndEvent extends Event<{
  actorA: Actor;
  actorB: Actor;
}> {
  static readonly eventType = "game.collision.end";
}
