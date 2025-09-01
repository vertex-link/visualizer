// Type declarations for WGSL shader files
declare module "*.wgsl?raw" {
  const content: string;
  export default content;
}

// Optional: Also support direct .wgsl imports (without ?raw)
declare module "*.wgsl" {
  const content: string;
  export default content;
}
