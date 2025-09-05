import { Processor } from "@vertex-link/acs";

/**
 * A Processor that uses `requestAnimationFrame` for its loop, suitable for rendering tasks.
 */
export class RenderProcessor extends Processor {
  private lastTime = 0;
  private animationFrameId?: number;

  /**
   * @param name The name for this processor. Defaults to "render".
   * This name is used by the @RenderUpdate decorator to find this processor.
   */
  constructor(name = "render") {
    // Ensure this name matches the decorator's target
    super(name);
  }

  public start(): void {
    if (this._isRunning) {
      return;
    }
    this._isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    if (!this._isRunning) return;

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.executeTasks(deltaTime);

    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  public stop(): void {
    if (!this._isRunning) {
      return;
    }
    this._isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }
}
