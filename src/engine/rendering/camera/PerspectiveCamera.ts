// src/engine/rendering/camera/PerspectiveCamera.ts

import Actor from "../../../core/Actor.ts";
import { TransformComponent } from "../components/TransformComponent.ts";
import { CameraComponent, ProjectionType } from "./CameraComponent.ts";
import { Transform } from "../math/Transform.ts";
import type { Vec3 } from "../components/TransformComponent.ts";

/**
 * Helper class for creating and managing perspective cameras.
 * Provides convenient methods for common camera operations.
 */
export class PerspectiveCamera extends Actor {
    private cameraComponent: CameraComponent;
    private transformComponent: TransformComponent;

    constructor(
        name: string = "PerspectiveCamera",
        fov: number = Math.PI / 4,  // 45 degrees
        aspect: number = 16 / 9,
        near: number = 0.1,
        far: number = 1000.0
    ) {
        super(name);

        // Add required components
        this.transformComponent = this.addComponent(TransformComponent);
        this.cameraComponent = this.addComponent(CameraComponent, {
            projectionType: ProjectionType.PERSPECTIVE,
            perspectiveConfig: { fov, aspect, near, far },
            isActive: true
        });

        // Set default position (camera looking down negative Z)
        this.transformComponent.setPosition(0, 0, 5);
    }

    /**
     * Get the camera component.
     */
    getCameraComponent(): CameraComponent {
        return this.cameraComponent;
    }

    /**
     * Get the transform component.
     */
    getTransformComponent(): TransformComponent {
        return this.transformComponent;
    }

    /**
     * Set camera position.
     */
    setPosition(x: number, y: number, z: number): void {
        this.transformComponent.setPosition(x, y, z);
    }

    /**
     * Set camera rotation from Euler angles (in radians).
     */
    setRotation(x: number, y: number, z: number): void {
        this.transformComponent.setRotationEuler(x, y, z);
    }

    /**
     * Look at a target position.
     */
    lookAt(target: Vec3, up: Vec3 = [0, 1, 0]): void {
        const position = this.transformComponent.position;

        // Calculate look-at rotation
        const forward = Transform.normalize(Transform.subtract(target, position));
        const right = Transform.normalize(Transform.cross(forward, up));
        const newUp = Transform.cross(right, forward);

        // Convert to quaternion (simplified - for a full implementation, you'd want proper matrix to quaternion conversion)
        // For now, we'll use Euler angles as approximation
        const yaw = Math.atan2(forward[0], forward[2]);
        const pitch = Math.asin(-forward[1]);

        this.transformComponent.setRotationEuler(pitch, yaw, 0);
    }

    /**
     * Set field of view in radians.
     */
    setFieldOfView(fov: number): void {
        this.cameraComponent.perspectiveConfig.fov = fov;
        this.cameraComponent.markProjectionDirty();
    }

    /**
     * Set field of view in degrees.
     */
    setFieldOfViewDegrees(degrees: number): void {
        this.setFieldOfView(Transform.toRadians(degrees));
    }

    /**
     * Set aspect ratio.
     */
    setAspectRatio(aspect: number): void {
        this.cameraComponent.setAspectRatio(aspect);
    }

    /**
     * Set near and far clipping planes.
     */
    setClippingPlanes(near: number, far: number): void {
        this.cameraComponent.perspectiveConfig.near = near;
        this.cameraComponent.perspectiveConfig.far = far;
        this.cameraComponent.markProjectionDirty();
    }

    /**
     * Move camera forward/backward.
     */
    moveForward(distance: number): void {
        const forward = this.cameraComponent.getForwardDirection();
        const position = this.transformComponent.position;

        this.transformComponent.setPosition(
            position[0] + forward[0] * distance,
            position[1] + forward[1] * distance,
            position[2] + forward[2] * distance
        );
    }

    /**
     * Move camera right/left.
     */
    moveRight(distance: number): void {
        const right = this.cameraComponent.getRightDirection();
        const position = this.transformComponent.position;

        this.transformComponent.setPosition(
            position[0] + right[0] * distance,
            position[1] + right[1] * distance,
            position[2] + right[2] * distance
        );
    }

    /**
     * Move camera up/down.
     */
    moveUp(distance: number): void {
        const up = this.cameraComponent.getUpDirection();
        const position = this.transformComponent.position;

        this.transformComponent.setPosition(
            position[0] + up[0] * distance,
            position[1] + up[1] * distance,
            position[2] + up[2] * distance
        );
    }

    /**
     * Orbit around a target point.
     */
    orbitAround(target: Vec3, deltaYaw: number, deltaPitch: number, distance?: number): void {
        const currentPos = this.transformComponent.position;

        // Calculate current distance if not provided
        if (distance === undefined) {
            distance = Transform.length(Transform.subtract(currentPos, target));
        }

        // Get current angles
        const offset = Transform.subtract(currentPos, target);
        const currentYaw = Math.atan2(offset[0], offset[2]);
        const currentPitch = Math.asin(offset[1] / distance);

        // Apply deltas
        const newYaw = currentYaw + deltaYaw;
        const newPitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, currentPitch + deltaPitch));

        // Calculate new position
        const newPos: Vec3 = [
            target[0] + Math.sin(newYaw) * Math.cos(newPitch) * distance,
            target[1] + Math.sin(newPitch) * distance,
            target[2] + Math.cos(newYaw) * Math.cos(newPitch) * distance
        ];

        this.setPosition(newPos[0], newPos[1], newPos[2]);
        this.lookAt(target);
    }

    /**
     * Get screen ray from mouse coordinates.
     */
    getScreenRay(mouseX: number, mouseY: number, screenWidth: number, screenHeight: number) {
        return this.cameraComponent.screenToWorldRay(mouseX, mouseY, screenWidth, screenHeight);
    }

    /**
     * Make this camera the active camera.
     */
    makeActive(): void {
        this.cameraComponent.isActive = true;
    }

    /**
     * Make this camera inactive.
     */
    makeInactive(): void {
        this.cameraComponent.isActive = false;
    }

    /**
     * Check if this camera is active.
     */
    isActive(): boolean {
        return this.cameraComponent.isActive;
    }

    /**
     * Create a default perspective camera positioned to view the origin.
     */
    static createDefault(name: string = "DefaultCamera"): PerspectiveCamera {
        const camera = new PerspectiveCamera(name);
        camera.setPosition(0, 2, 5);
        camera.lookAt([0, 0, 0]);
        return camera;
    }

    /**
     * Create a top-down orthographic-style camera (but still perspective).
     */
    static createTopDown(name: string = "TopDownCamera", height: number = 10): PerspectiveCamera {
        const camera = new PerspectiveCamera(name);
        camera.setPosition(0, height, 0);
        camera.lookAt([0, 0, 0]);
        return camera;
    }

    /**
     * Create a first-person style camera.
     */
    static createFirstPerson(name: string = "FirstPersonCamera"): PerspectiveCamera {
        const camera = new PerspectiveCamera(name);
        camera.setPosition(0, 1.8, 0); // Eye height
        return camera;
    }
}