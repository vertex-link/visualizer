// examples/phase3/RotatingComponent.ts

import Component from '../../src/core/component/Component.ts';
import { RenderUpdate } from '../../src/engine/processors/RenderProcessor.ts';
import { RequireComponent } from '../../src/core/component/Decorators.ts';
import { TransformComponent } from '../../src/engine/rendering/components/TransformComponent.ts';

@RequireComponent(TransformComponent)
export class RotatingComponent extends Component {
    private transform!: TransformComponent;
    public speed: number = 0.5; // Radians per second

    protected onDependenciesResolved(): void {
        this.transform = this.actor.getComponent(TransformComponent)!;
    }

    @RenderUpdate()
    update(deltaTime: number): void {
        if (!this.transform) return;

        const currentRotation = this.transform.rotation;
        const delta = this.speed * deltaTime;

        // Simple Y-axis rotation accumulation (more robust would use quaternion math)
        const [x, y, z] = this.transform.getEulerAngles(); // Assuming getEulerAngles exists or we use setRotationEuler
        this.transform.setRotationEuler(x, y + delta, z);
    }
}