import { EventBus, IEventBus, Scene, ProcessorRegistry } from '@vertex-link/acs';
import { WebGPUProcessor } from './processors/WebGPUProcessor';

export class EngineContext {
  public readonly eventBus: IEventBus;
  public readonly services: Map<any, any> = new Map();

  private processor: WebGPUProcessor | null = null;
  private scene: Scene | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.eventBus = new EventBus();

    // Create and register the WebGPU processor (compat with existing resources using ProcessorRegistry)
    this.processor = new WebGPUProcessor(canvas, "webgpu", this.eventBus);
    ProcessorRegistry.register(this.processor!);
    this.services.set(WebGPUProcessor, this.processor);
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
    this.processor?.start();
  }

  public stop(): void {
    this.processor?.stop();
  }

  public getScene(): Scene | null {
    return this.scene;
  }
}
