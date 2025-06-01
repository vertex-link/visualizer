// examples/phase3/RotatingComponent.ts

import Component from '../../src/core/component/Component.ts';
import { Update } from '../../src/core/processor/Decorators.ts'; // Use generic Update
import { RequireComponent } from '../../src/core/component/Decorators.ts';
import { TransformComponent, Vec3 } from '../../src/engine/rendering/components/TransformComponent.ts';
import { Transform } from '../../src/engine/rendering/math/Transform.ts';

@RequireComponent(TransformComponent)
export class RotatingComponent extends Component {
    private transform!: TransformComponent;
    public speed: number = 0.5; // Radians per second

    protected onDependenciesResolved(): void {
        this.transform = this.actor.getComponent(TransformComponent)!;
    }

    @Update('webgpu') // Use 'webgpu' processor name, not 'render'
    update(deltaTime: number): void {
        if (!this.transform) return;

        const deltaAngle = this.speed * deltaTime;

        // Define the axis of rotation (e.g., world Y-axis)
        const rotationAxis: Vec3 = [0, 1, 0]; // Or [1,0,0] for X, [0,0,1] for Z

        // Create a quaternion for the incremental rotation
        const deltaRotation = Transform.fromAxisAngle(rotationAxis, deltaAngle);

        // Apply the rotation: newRotation = deltaRotation * currentRotation
        this.transform.rotation = Transform.multiplyQuat(deltaRotation, this.transform.rotation);

        // It's good practice to re-normalize the quaternion after repeated multiplications
        // to prevent floating-point drift.
        this.transform.rotation = Transform.normalizeQuat(this.transform.rotation);

        this.transform.markDirty(); // Important: signal that the world matrix needs recalculation
    }
}