import { Actor, Component } from "@vertex-link/acs";
import { TransformComponent } from "@vertex-link/engine";
import { WebGPUUpdate } from "@vertex-link/engine";

export class FloatingComponent extends Component {
  public amplitude: number = 1.0;
  public frequency: number = 1.0;

  private transform?: TransformComponent;
  private startTime: number = performance.now();
  private basePosition: [number, number, number] = [0, 0, 0];

  constructor(actor: Actor, config: { amplitude?: number; frequency?: number } = {}) {
    super(actor);
    this.amplitude = config.amplitude || 1.0;
    this.frequency = config.frequency || 1.0;
  }

  onInitialize(): void {
    this.transform = this.actor.getComponent(TransformComponent);
    if (this.transform) {
      this.basePosition = [...this.transform.position];
    }
  }

  @WebGPUUpdate()
  update(deltaTime: number): void {
    if (!this.transform) {
      this.transform = this.actor.getComponent(TransformComponent);
    }

    if (this.transform) {
      const elapsed = (performance.now() - this.startTime) / 1000;
      const offset = Math.sin(elapsed * this.frequency) * this.amplitude;

      this.transform.setPosition(
        this.basePosition[0],
        this.basePosition[1] + offset,
        this.basePosition[2]
      );
    }
  }
}
