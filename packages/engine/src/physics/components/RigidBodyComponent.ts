import { type Actor, Component } from "@vertex-link/space";
import type { Vec3 } from "../../rendering/components/TransformComponent.js";
import { PhysicsProcessor } from "../processors/PhysicsProcessor.js";

/**
 * Types of rigid bodies in physics simulation.
 */
export type RigidBodyType = "dynamic" | "kinematic" | "static";

/**
 * RigidBodyComponent represents a physics body in the simulation.
 *
 * - Dynamic: Fully simulated by physics (affected by forces, gravity, collisions)
 * - Kinematic: Moved by code, but affects dynamic bodies
 * - Static: Immovable (e.g., ground, walls)
 */
export class RigidBodyComponent extends Component {
  /** Type of rigid body */
  public type: RigidBodyType = "dynamic";

  /** Mass of the body (only for dynamic bodies) */
  public mass = 1.0;

  /** Linear velocity [x, y, z] in m/s */
  public linearVelocity: Vec3 = [0, 0, 0];

  /** Angular velocity [x, y, z] in rad/s */
  public angularVelocity: Vec3 = [0, 0, 0];

  /** Gravity scale multiplier (1.0 = normal gravity, 0.0 = no gravity) */
  public gravityScale = 1.0;

  /** Lock rotations on all axes (useful for characters) */
  public lockRotation = false;

  /** Internal Rapier handle (set by PhysicsProcessor) */
  public _handle: number | null = null;

  private physicsProcessor: PhysicsProcessor | null = null;

  constructor(
    actor: Actor,
    options?: Partial<{
      type: RigidBodyType;
      mass: number;
      linearVelocity: Vec3;
      angularVelocity: Vec3;
      gravityScale: number;
      lockRotation: boolean;
    }>,
  ) {
    super(actor);

    if (options) {
      if (options.type !== undefined) this.type = options.type;
      if (options.mass !== undefined) this.mass = options.mass;
      if (options.linearVelocity !== undefined)
        this.linearVelocity = options.linearVelocity;
      if (options.angularVelocity !== undefined)
        this.angularVelocity = options.angularVelocity;
      if (options.gravityScale !== undefined)
        this.gravityScale = options.gravityScale;
      if (options.lockRotation !== undefined)
        this.lockRotation = options.lockRotation;
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
        // Create the rigid body in the physics world
        this.physicsProcessor.createRigidBody(this);
      } else if (this.physicsProcessor) {
        // Wait for physics to initialize
        this.physicsProcessor.initialize().then(() => {
          this.physicsProcessor!.createRigidBody(this);
        });
      } else {
        console.warn(
          `PhysicsProcessor not found in context for actor ${this.actor.id}`,
        );
      }
    }
  }

  /**
   * Apply an impulse force to the body (one-time push).
   */
  applyImpulse(impulse: Vec3, wakeUp = true): void {
    if (!this.physicsProcessor || this._handle === null) return;

    const body = this.physicsProcessor.getRigidBody(this._handle);
    if (body) {
      body.applyImpulse({ x: impulse[0], y: impulse[1], z: impulse[2] }, wakeUp);
    }
  }

  /**
   * Apply a continuous force to the body (accumulated over time).
   */
  applyForce(force: Vec3, wakeUp = true): void {
    if (!this.physicsProcessor || this._handle === null) return;

    const body = this.physicsProcessor.getRigidBody(this._handle);
    if (body) {
      body.addForce({ x: force[0], y: force[1], z: force[2] }, wakeUp);
    }
  }

  /**
   * Apply torque to rotate the body.
   */
  applyTorque(torque: Vec3, wakeUp = true): void {
    if (!this.physicsProcessor || this._handle === null) return;

    const body = this.physicsProcessor.getRigidBody(this._handle);
    if (body) {
      body.addTorque({ x: torque[0], y: torque[1], z: torque[2] }, wakeUp);
    }
  }

  /**
   * Set linear velocity directly.
   */
  setLinearVelocity(velocity: Vec3): void {
    this.linearVelocity = velocity;

    if (!this.physicsProcessor || this._handle === null) return;

    const body = this.physicsProcessor.getRigidBody(this._handle);
    if (body) {
      body.setLinvel(
        { x: velocity[0], y: velocity[1], z: velocity[2] },
        true,
      );
    }
  }

  /**
   * Set angular velocity directly.
   */
  setAngularVelocity(velocity: Vec3): void {
    this.angularVelocity = velocity;

    if (!this.physicsProcessor || this._handle === null) return;

    const body = this.physicsProcessor.getRigidBody(this._handle);
    if (body) {
      body.setAngvel(
        { x: velocity[0], y: velocity[1], z: velocity[2] },
        true,
      );
    }
  }

  /**
   * Get the current linear velocity from the physics body.
   */
  getLinearVelocity(): Vec3 {
    if (!this.physicsProcessor || this._handle === null)
      return this.linearVelocity;

    const body = this.physicsProcessor.getRigidBody(this._handle);
    if (body) {
      const vel = body.linvel();
      return [vel.x, vel.y, vel.z];
    }

    return this.linearVelocity;
  }

  /**
   * Get the current angular velocity from the physics body.
   */
  getAngularVelocity(): Vec3 {
    if (!this.physicsProcessor || this._handle === null)
      return this.angularVelocity;

    const body = this.physicsProcessor.getRigidBody(this._handle);
    if (body) {
      const vel = body.angvel();
      return [vel.x, vel.y, vel.z];
    }

    return this.angularVelocity;
  }

  /**
   * Wake up the body (start simulating again).
   */
  wakeUp(): void {
    if (!this.physicsProcessor || this._handle === null) return;

    const body = this.physicsProcessor.getRigidBody(this._handle);
    if (body) {
      body.wakeUp();
    }
  }

  /**
   * Put the body to sleep (stop simulating until something wakes it).
   */
  sleep(): void {
    if (!this.physicsProcessor || this._handle === null) return;

    const body = this.physicsProcessor.getRigidBody(this._handle);
    if (body) {
      body.sleep();
    }
  }

  /**
   * Get a unique key for this body (used internally).
   */
  getBodyKey(): string {
    return `${this.actor.id}:rigidbody`;
  }

  /**
   * Clean up when component is removed.
   */
  onDestroy(): void {
    if (this.physicsProcessor) {
      this.physicsProcessor.removeRigidBody(this);
    }
  }
}
