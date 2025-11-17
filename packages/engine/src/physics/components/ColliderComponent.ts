import { type Actor, Component } from "@vertex-link/space";
import type { Vec3 } from "../../rendering/components/TransformComponent.js";
import { PhysicsProcessor } from "../processors/PhysicsProcessor.js";

/**
 * Shapes supported by the physics collider.
 */
export type ColliderShape = "box" | "sphere" | "capsule";

/**
 * ColliderComponent defines the collision shape and properties.
 * Must be attached to an actor with a RigidBodyComponent.
 */
export class ColliderComponent extends Component {
  /** Shape of the collider */
  public shape: ColliderShape = "box";

  /**
   * Size of the collider (interpretation depends on shape):
   * - box: [halfExtentX, halfExtentY, halfExtentZ]
   * - sphere: [radius, unused, unused]
   * - capsule: [radius, height, unused]
   */
  public size: Vec3 = [0.5, 0.5, 0.5];

  /** Whether this is a trigger (no physical collision, only events) */
  public isTrigger = false;

  /** Friction coefficient (0 = ice, 1 = rubber) */
  public friction = 0.5;

  /** Restitution/bounciness (0 = no bounce, 1 = perfect bounce) */
  public restitution = 0.3;

  /** Internal Rapier handle (set by PhysicsProcessor) */
  public _handle: number | null = null;

  private physicsProcessor: PhysicsProcessor | null = null;

  constructor(
    actor: Actor,
    options?: Partial<{
      shape: ColliderShape;
      size: Vec3;
      isTrigger: boolean;
      friction: number;
      restitution: number;
    }>,
  ) {
    super(actor);

    if (options) {
      if (options.shape !== undefined) this.shape = options.shape;
      if (options.size !== undefined) this.size = options.size;
      if (options.isTrigger !== undefined) this.isTrigger = options.isTrigger;
      if (options.friction !== undefined) this.friction = options.friction;
      if (options.restitution !== undefined)
        this.restitution = options.restitution;
    }
  }

  /**
   * Called when component is added to an actor in a scene.
   */
  onInitialize(): void {
    // Get the PhysicsProcessor from the context
    const context = (this.actor as any).scene?.context;
    if (context) {
      this.physicsProcessor = context.getProcessor(PhysicsProcessor);

      if (this.physicsProcessor && this.physicsProcessor.isInitialized()) {
        // Create the collider in the physics world
        this.physicsProcessor.createCollider(this);
      } else if (this.physicsProcessor) {
        // Wait for physics to initialize
        this.physicsProcessor.initialize().then(() => {
          this.physicsProcessor!.createCollider(this);
        });
      } else {
        console.warn(
          `PhysicsProcessor not found in context for actor ${this.actor.id}`,
        );
      }
    }
  }

  /**
   * Create a box collider with the specified half-extents.
   */
  static createBox(actor: Actor, halfExtents: Vec3): ColliderComponent {
    return new ColliderComponent(actor, {
      shape: "box",
      size: halfExtents,
    });
  }

  /**
   * Create a sphere collider with the specified radius.
   */
  static createSphere(actor: Actor, radius: number): ColliderComponent {
    return new ColliderComponent(actor, {
      shape: "sphere",
      size: [radius, 0, 0],
    });
  }

  /**
   * Create a capsule collider with the specified radius and height.
   */
  static createCapsule(
    actor: Actor,
    radius: number,
    height: number,
  ): ColliderComponent {
    return new ColliderComponent(actor, {
      shape: "capsule",
      size: [radius, height, 0],
    });
  }

  /**
   * Get a unique key for this collider (used internally).
   */
  getColliderKey(): string {
    return `${this.actor.id}:collider`;
  }

  /**
   * Clean up when component is removed.
   */
  onDestroy(): void {
    if (this.physicsProcessor) {
      this.physicsProcessor.removeCollider(this);
    }
  }
}
