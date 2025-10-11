import { EventBus, type IEventBus, type Processor, type Scene } from "@vertex-link/space";
import type { Context } from "@vertex-link/space/composables/context";
import { WebGPUProcessor } from "./processors/WebGPUProcessor";

export class EngineContext {
  public readonly eventBus: IEventBus;
  public readonly services: Map<any, any> = new Map();

  private processor: WebGPUProcessor | null = null;
  private processors: Map<string, Processor> = new Map();
  private scene: Scene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.eventBus = new EventBus();

    const contextProvider = () => this.getContext();

    // Create and register the WebGPU processor
    this.processor = new WebGPUProcessor(canvas, "webgpu", this.eventBus, contextProvider);
    this.processors.set("webgpu", this.processor);
    this.services.set(WebGPUProcessor, this.processor);
  }

  public getContext(): Context {
    return {
      processors: this.processors,
      scene: this.scene,
      eventBus: this.eventBus,
    };
  }

  public async initialize(): Promise<void> {
    await this.processor?.initialize();
  }

  public setScene(scene: Scene): void {
    this.scene = scene;
    this.processor?.setScene(scene);
  }

  public get<T>(serviceClass: new (...args: any[]) => T): T | undefined {
    return this.services.get(serviceClass);
  }

  public start(): void {
    for (const processor of this.processors.values()) {
      processor.start();
    }
  }

  public stop(): void {
    for (const processor of this.processors.values()) {
      processor.stop();
    }
  }

  public getScene(): Scene | null {
    return this.scene;
  }
}
