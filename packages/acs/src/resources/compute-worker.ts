// compute-worker.ts
let wasmExports: any = null;
self.onmessage = async ({ data: { type, id, method, args, module } }) => {
  try {
    if (type === 'init') {
      const instance = await WebAssembly.instantiate(module);
      wasmExports = instance.exports;

      // Send available exports back
      const exports = Object.keys(wasmExports).filter(key =>
        typeof wasmExports[key] === 'function'
      );
      self.postMessage({ type: 'ready', exports });

    } else if (type === 'call' && wasmExports) {
      const result = wasmExports[method](...args);
      self.postMessage({ id, result });
    }
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
