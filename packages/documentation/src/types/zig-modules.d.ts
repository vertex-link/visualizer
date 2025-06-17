declare module '*.zig' {
  export function instantiate(importObject?: any): Promise<{
    exports: any;
    instance: WebAssembly.Instance;
  }>;
  export const compiled: Promise<WebAssembly.Module>;
  export const module: WebAssembly.Module;
}
