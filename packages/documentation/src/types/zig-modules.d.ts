declare module "*.zig" {
  // Vite plugin output is treated as a module object with an instantiate() helper.
  // We type it loosely to support both namespace and default imports.
  const mod: Record<string, any> & { instantiate?: (...args: any[]) => any };
  export default mod;
  export const instantiate: (...args: any[]) => any;
}
