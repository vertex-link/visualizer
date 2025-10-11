import { Processor, Tickers } from "@vertex-link/space";

/**
 * A Processor that uses a fixed-step loop.
 * Now implemented using the ticker function approach.
 */
export class FixedTickProcessor extends Processor {
  /**
   * @param name The name for this processor.
   * @param targetUpdatesPerSecond The desired number of updates per second.
   */
  constructor(name = "fixedTick", targetUpdatesPerSecond = 30) {
    super(name, Tickers.fixedFPS(targetUpdatesPerSecond));
  }

  /**
   * Updates the target FPS for this processor.
   * @param fps New target frames per second
   */
  public setTargetFPS(fps: number): void {
    this.setTicker(Tickers.fixedFPS(fps));
  }
}
