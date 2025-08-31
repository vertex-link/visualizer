
import { Processor } from "@vertex-link/acs";

/**
 * A Processor that uses `setInterval` for a fixed-step loop,
 * suitable for physics or fixed-rate game logic updates.
 */
export class FixedTickProcessor extends Processor {
  private intervalId?: number;
  private readonly intervalMs: number;
  private readonly deltaTimeSeconds: number;

  /**
   * @param name The name for this processor.
   * @param targetUpdatesPerSecond The desired number of updates per second.
   */
  constructor(name: string = "fixedTick", targetUpdatesPerSecond: number = 30) { // Default name
    super(name); // This name is used by @FixedTickUpdate
    if (targetUpdatesPerSecond <= 0) {
      throw new Error("FixedTickProcessor: targetUpdatesPerSecond must be positive.");
    }
    this.intervalMs = 1000 / targetUpdatesPerSecond;
    this.deltaTimeSeconds = 1 / targetUpdatesPerSecond;
  }

  public start(): void {
    if (this._isRunning) {
      return;
    }
    this._isRunning = true;
    this.intervalId = setInterval(() => {
      if (this._isRunning) {
        this.executeTasks(this.deltaTimeSeconds);
      }
    }, this.intervalMs) as any;
  }

  public stop(): void {
    if (!this._isRunning) {
      return;
    }
    this._isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId as any);
      this.intervalId = undefined;
    }
  }
}
