import { Processor, Tickers } from "@vertex-link/space";

/**
 * A Processor that uses `requestAnimationFrame` for its loop, suitable for rendering tasks.
 * Now implemented using the ticker function approach.
 */
export class RenderProcessor extends Processor {
  /**
   * @param name The name for this processor. Defaults to "render".
   * This name is used by the @RenderUpdate decorator to find this processor.
   */
  constructor(name = "render") {
    super(name, Tickers.animationFrame());
  }

  /**
   * Updates the ticker to use a different animation strategy if needed.
   * For example, to throttle rendering or use a fixed frame rate.
   * @param ticker The new ticker function to use
   */
  public setAnimationTicker(ticker: Parameters<Processor["setTicker"]>[0]): void {
    this.setTicker(ticker);
  }

  /**
   * Convenience method to set a target FPS cap for rendering.
   * Useful for performance optimization or testing.
   * @param maxFPS Maximum frames per second (will throttle requestAnimationFrame)
   */
  public setMaxFPS(maxFPS: number): void {
    this.setTicker(Tickers.throttled(Tickers.animationFrame(), 1000 / maxFPS));
  }

  /**
   * Convenience method to only render when the page is visible.
   * Saves resources when user switches tabs.
   */
  public setVisibilityAware(): void {
    this.setTicker(Tickers.conditional(Tickers.animationFrame(), () => !document.hidden));
  }
}
