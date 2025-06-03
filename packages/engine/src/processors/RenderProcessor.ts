import {Processor} from "../../core/processor/Processor";
import {createProcessorUpdateDecorator} from "../../core/processor/Decorators";

/**
 * Decorator to hook a method into the "render" Processor's update loop.
 * The decorated method will be called on each tick of the "render" processor.
 * Signature: `(deltaTime: number, ...args: any[]) => void`.
 *
 * This decorator is defined alongside the RenderProcessor for better modularity.
 */
export function RenderUpdate() {
    // The first argument "render" MUST match the name given to the RenderProcessor instance
    // when it's registered with the ProcessorRegistry.
    return createProcessorUpdateDecorator("render", "RenderUpdate");
}

/**
 * A Processor that uses `requestAnimationFrame` for its loop, suitable for rendering tasks.
 */
export class RenderProcessor extends Processor {
    private lastTime: number = 0;
    private animationFrameId?: number;

    /**
     * @param name The name for this processor. Defaults to "render".
     * This name is used by the @RenderUpdate decorator to find this processor.
     */
    constructor(name: string = "render") { // Ensure this name matches the decorator's target
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
