// Internal type transformation - user doesn't need to know about this
type AsyncifyMethods<T> = {
  [K in keyof T]: T[K] extends (...args: infer P) => infer R
  ? (...args: P) => Promise<R>
  : T[K];
};

export class ComputeResource<T = any> implements ProxyHandler<ComputeResource<T>> {
  private worker: Worker;
  private messageId: number = 0;
  private pendingCalls = new Map<number, { resolve: Function, reject: Function }>();

  constructor(zigModule: any) {
    this.worker = new Worker(
      new URL('./compute-worker?worker', import.meta.url),
      { type: 'module' }
    );

    this.setupWorker(zigModule);

    // Return properly typed proxy with async methods
    return new Proxy(this, this) as ComputeResource<T> & AsyncifyMethods<T>;
  }

  private async setupWorker(zigModule: any) {
    this.worker.postMessage({
      type: 'init',
      module: zigModule.module || zigModule
    });

    this.worker.onmessage = ({ data: { id, result, error } }) => {
      const pending = this.pendingCalls.get(id);
      if (pending) {
        this.pendingCalls.delete(id);
        error ? pending.reject(new Error(error)) : pending.resolve(result);
      }
    };
  }

  get(target: ComputeResource<T>, prop: string | symbol): any {
    if (prop in target || typeof prop !== 'string') {
      return target[prop];
    }

    return (...args: any[]) => {
      const id = target.messageId++;
      return new Promise((resolve, reject) => {
        target.pendingCalls.set(id, { resolve, reject });
        target.worker.postMessage({
          type: 'call',
          id,
          method: prop,
          args
        });
      });
    };
  }

  destroy() {
    this.worker.terminate();
    this.pendingCalls.clear();
  }
}
