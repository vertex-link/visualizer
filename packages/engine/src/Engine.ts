import { Context, EventBus, type Scene } from "@vertex-link/space";
import { WebGPUProcessor } from "./processors/WebGPUProcessor";
import { LightProcessor } from "./processors/LightProcessor";

type EngineConfig = {
  canvas: HTMLCanvasElement;
  context?: Context;
};

/**
 * The Engine is the active executor that brings a Context to life.
 * It runs the main loop and orchestrates the processors defined in the context.
 */
export class Engine {
  private context: Context;
  private mainLoopId: number | null = null;

  constructor(config: EngineConfig) {
    // Adopt the provided context or get the default one.
    this.context = config.context ?? Context.default();

    // Initialize the event bus if not already set
    if (!this.context.eventBus) {
      this.context.eventBus = new EventBus();
    }

    // Create light processor
    const lightProcessor = new LightProcessor("light");
    this.context.addProcessor(lightProcessor);

    // Create renderer with light processor reference
    const renderer = new WebGPUProcessor(
      config.canvas,
      "webgpu",
      this.context.eventBus,
      () => this.context,
      lightProcessor,
    );
    this.context.addProcessor(renderer);
  }

  public async initialize(): Promise<void> {
    // Initialize all processors
    for (const processor of this.context.processors) {
      await processor.initialize();
    }
  }

  public start(): void {
    if (this.mainLoopId !== null) return; // Already running

    // Start all processors
    for (const processor of this.context.processors) {
      processor.start();
    }
  }

  public stop(): void {
    // Stop all processors
    for (const processor of this.context.processors) {
      processor.stop();
    }
    this.mainLoopId = null;
  }

  /**
   * Switches the engine to render a new context at runtime.
   */
  public setContext(newContext: Context): void {
    this.stop();
    // Here you could add logic to tear down systems in the old context.
    this.context = newContext;
    // Here you would ensure the new context has the required services.
    this.start();
  }

  public getContext(): Context {
    return this.context;
  }

  /**
   * Set the scene to render
   */
  public setScene(scene: Scene): void {
    // Simply set scene on context - event system handles notifying processors
    this.context.setScene(scene);
  }

  public getScene(): Scene {
    return this.context.scene;
  }
}
