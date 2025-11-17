import { Processor, Tickers, type Context } from "@vertex-link/space";
import type RAPIER from "@dimforge/rapier3d";
import { TransformComponent } from "../../rendering/components/TransformComponent.js";
import { RigidBodyComponent } from "../components/RigidBodyComponent.js";
import { ColliderComponent } from "../components/ColliderComponent.js";

/**
 * PhysicsProcessor manages the Rapier physics simulation.
 * Runs at a fixed 60 FPS for deterministic physics.
 */
export class PhysicsProcessor extends Processor {
  private world: RAPIER.World | null = null;
  private RAPIER: typeof RAPIER | null = null;
  private rigidBodies = new Map<string, RAPIER.RigidBody>();
  private colliders = new Map<string, RAPIER.Collider>();
  private initialized = false;

  constructor(name = "PhysicsProcessor") {
    // Fixed 60 FPS ticker for deterministic physics
    super(name, Tickers.fixedFPS(60));
  }

  /**
   * Initialize the Rapier physics engine.
   * Must be called before the processor can be used.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Dynamically import Rapier (initialization happens automatically)
    this.RAPIER = await import("@dimforge/rapier3d");

    // Create physics world with gravity
    const gravity = { x: 0.0, y: -9.81, z: 0.0 };
    this.world = new this.RAPIER.World(gravity);

    this.initialized = true;
  }

  /**
   * Check if the processor is ready to use.
   */
  isInitialized(): boolean {
    return this.initialized && this.world !== null && this.RAPIER !== null;
  }

  /**
   * Get the Rapier world instance.
   */
  getWorld(): RAPIER.World | null {
    return this.world;
  }

  /**
   * Get the Rapier module.
   */
  getRAPIER(): typeof RAPIER | null {
    return this.RAPIER;
  }

  /**
   * Execute physics simulation step.
   */
  protected executeTasks(deltaTime: number): void {
    if (!this.isInitialized()) return;

    // 1. Run component update tasks (forces, inputs)
    super.executeTasks(deltaTime);

    // 2. Step physics simulation
    this.world!.step();

    // 3. Sync physics state back to TransformComponents
    this.syncPhysicsToTransforms();
  }

  /**
   * Synchronize physics body positions/rotations to TransformComponents.
   */
  private syncPhysicsToTransforms(): void {
    const context = this.getCurrentContext();
    if (!context) return;

    const actors = context.scene
      .query()
      .withComponent(RigidBodyComponent)
      .withComponent(TransformComponent)
      .execute();

    for (const actor of actors) {
      const rbComp = actor.getComponent(RigidBodyComponent)!;
      const transform = actor.getComponent(TransformComponent)!;

      const body = this.rigidBodies.get(rbComp.getBodyKey());
      if (!body) continue;

      // Only sync dynamic bodies (static/kinematic are controlled by transform)
      if (rbComp.type === "dynamic") {
        const translation = body.translation();
        const rotation = body.rotation();

        transform.position = [translation.x, translation.y, translation.z];
        transform.rotation = [rotation.x, rotation.y, rotation.z, rotation.w];
        transform.markDirty();
      }
    }
  }

  /**
   * Create a rigid body in the physics world.
   */
  createRigidBody(component: RigidBodyComponent): void {
    if (!this.isInitialized() || !this.RAPIER) return;

    const actor = component.actor;
    const transform = actor.getComponent(TransformComponent);

    if (!transform) {
      console.warn(
        `Cannot create rigid body for actor ${actor.id}: missing TransformComponent`,
      );
      return;
    }

    // Create rigid body description
    let rigidBodyDesc: RAPIER.RigidBodyDesc;

    switch (component.type) {
      case "dynamic":
        rigidBodyDesc = this.RAPIER.RigidBodyDesc.dynamic();
        break;
      case "kinematic":
        rigidBodyDesc = this.RAPIER.RigidBodyDesc.kinematicPositionBased();
        break;
      case "static":
        rigidBodyDesc = this.RAPIER.RigidBodyDesc.fixed();
        break;
    }

    // Set initial position and rotation
    const [x, y, z] = transform.position;
    const [rx, ry, rz, rw] = transform.rotation;
    rigidBodyDesc.setTranslation(x, y, z);
    rigidBodyDesc.setRotation({ x: rx, y: ry, z: rz, w: rw });

    // Create the rigid body
    const rigidBody = this.world!.createRigidBody(rigidBodyDesc);

    // Set additional properties
    if (component.type === "dynamic") {
      rigidBody.setLinvel(
        { x: component.linearVelocity[0], y: component.linearVelocity[1], z: component.linearVelocity[2] },
        true,
      );
      rigidBody.setAngvel(
        { x: component.angularVelocity[0], y: component.angularVelocity[1], z: component.angularVelocity[2] },
        true,
      );
      rigidBody.setGravityScale(component.gravityScale, true);

      if (component.lockRotation) {
        rigidBody.lockRotations(true, true);
      }
    }

    // Store the body
    this.rigidBodies.set(component.getBodyKey(), rigidBody);
    component._handle = rigidBody.handle;
  }

  /**
   * Create a collider and attach it to a rigid body.
   */
  createCollider(component: ColliderComponent): void {
    if (!this.isInitialized() || !this.RAPIER) return;

    const actor = component.actor;
    const rbComp = actor.getComponent(RigidBodyComponent);

    if (!rbComp) {
      console.warn(
        `Cannot create collider for actor ${actor.id}: missing RigidBodyComponent`,
      );
      return;
    }

    const rigidBody = this.rigidBodies.get(rbComp.getBodyKey());
    if (!rigidBody) {
      console.warn(
        `Cannot create collider for actor ${actor.id}: rigid body not found`,
      );
      return;
    }

    // Create collider description based on shape
    let colliderDesc: RAPIER.ColliderDesc;

    switch (component.shape) {
      case "box":
        const [hx, hy, hz] = component.size;
        colliderDesc = this.RAPIER.ColliderDesc.cuboid(hx, hy, hz);
        break;
      case "sphere":
        colliderDesc = this.RAPIER.ColliderDesc.ball(component.size[0]);
        break;
      case "capsule":
        const halfHeight = component.size[1] / 2;
        colliderDesc = this.RAPIER.ColliderDesc.capsule(
          halfHeight,
          component.size[0],
        );
        break;
      default:
        console.warn(`Unsupported collider shape: ${component.shape}`);
        return;
    }

    // Set collider properties
    colliderDesc.setFriction(component.friction);
    colliderDesc.setRestitution(component.restitution);
    colliderDesc.setSensor(component.isTrigger);

    // Create the collider
    const collider = this.world!.createCollider(colliderDesc, rigidBody);

    // Store the collider
    this.colliders.set(component.getColliderKey(), collider);
    component._handle = collider.handle;
  }

  /**
   * Get a rigid body by handle.
   */
  getRigidBody(handle: number): RAPIER.RigidBody | null {
    if (!this.isInitialized()) return null;
    return this.world!.getRigidBody(handle);
  }

  /**
   * Get a collider by handle.
   */
  getCollider(handle: number): RAPIER.Collider | null {
    if (!this.isInitialized()) return null;
    return this.world!.getCollider(handle);
  }

  /**
   * Remove a rigid body from the physics world.
   */
  removeRigidBody(component: RigidBodyComponent): void {
    if (!this.isInitialized()) return;

    const body = this.rigidBodies.get(component.getBodyKey());
    if (body) {
      this.world!.removeRigidBody(body);
      this.rigidBodies.delete(component.getBodyKey());
    }
  }

  /**
   * Remove a collider from the physics world.
   */
  removeCollider(component: ColliderComponent): void {
    if (!this.isInitialized()) return;

    const collider = this.colliders.get(component.getColliderKey());
    if (collider) {
      this.world!.removeCollider(collider, true);
      this.colliders.delete(component.getColliderKey());
    }
  }

  /**
   * Set gravity for the physics world.
   */
  setGravity(x: number, y: number, z: number): void {
    if (!this.isInitialized()) return;
    this.world!.gravity = { x, y, z };
  }

  /**
   * Get current context (helper method).
   */
  private getCurrentContext(): Context | null {
    try {
      // Access the current context from the Processor's scope
      return (this as any).context || null;
    } catch {
      return null;
    }
  }
}
