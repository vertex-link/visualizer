import { ShaderStage } from "./ShaderResource";

/**
 * Binding descriptor extracted from WGSL shader
 */
export interface BindingDescriptor {
  name: string; // Variable name (e.g., "albedoTexture")
  group: number; // @group(0)
  binding: number; // @binding(1)
  type: BindingType;
  visibility: ShaderStage[]; // Which stages use this binding
}

/**
 * Types of bindings in WGSL
 */
export enum BindingType {
  UNIFORM_BUFFER = "uniform",
  TEXTURE_2D = "texture_2d",
  TEXTURE_CUBE = "texture_cube",
  TEXTURE_3D = "texture_3d",
  SAMPLER = "sampler",
  STORAGE_BUFFER = "storage",
}

/**
 * Parse WGSL shader source to extract binding information
 */
export function parseWGSLBindings(source: string): BindingDescriptor[] {
  const bindings: BindingDescriptor[] = [];
  const seenBindings = new Set<string>(); // Track unique bindings

  // Pattern 1: @group(0) @binding(1) var<uniform> name: Type;
  const uniformPattern = /@group\((\d+)\)\s+@binding\((\d+)\)\s+var<uniform>\s+(\w+)\s*:\s*(\w+)/g;

  // Pattern 2: @group(0) @binding(1) var name: texture_2d<f32>;
  const texturePattern = /@group\((\d+)\)\s+@binding\((\d+)\)\s+var\s+(\w+)\s*:\s*(texture_\w+)(?:<[^>]+>)?/g;

  // Pattern 3: @group(0) @binding(1) var name: sampler;
  const samplerPattern = /@group\((\d+)\)\s+@binding\((\d+)\)\s+var\s+(\w+)\s*:\s*sampler/g;

  // Pattern 4: @group(0) @binding(1) var<storage> name: Type;
  const storagePattern = /@group\((\d+)\)\s+@binding\((\d+)\)\s+var<storage[^>]*>\s+(\w+)\s*:\s*(\w+)/g;

  // Extract uniform bindings
  let match;
  while ((match = uniformPattern.exec(source)) !== null) {
    const [_, groupStr, bindingStr, name, typeStr] = match;
    const key = `${groupStr}_${bindingStr}`;

    if (!seenBindings.has(key)) {
      seenBindings.add(key);
      bindings.push({
        name,
        group: parseInt(groupStr),
        binding: parseInt(bindingStr),
        type: BindingType.UNIFORM_BUFFER,
        visibility: inferVisibility(source, name),
      });
    }
  }

  // Extract texture bindings
  while ((match = texturePattern.exec(source)) !== null) {
    const [_, groupStr, bindingStr, name, typeStr] = match;
    const key = `${groupStr}_${bindingStr}`;

    if (!seenBindings.has(key)) {
      seenBindings.add(key);
      bindings.push({
        name,
        group: parseInt(groupStr),
        binding: parseInt(bindingStr),
        type: inferTextureType(typeStr),
        visibility: inferVisibility(source, name),
      });
    }
  }

  // Extract sampler bindings
  while ((match = samplerPattern.exec(source)) !== null) {
    const [_, groupStr, bindingStr, name] = match;
    const key = `${groupStr}_${bindingStr}`;

    if (!seenBindings.has(key)) {
      seenBindings.add(key);
      bindings.push({
        name,
        group: parseInt(groupStr),
        binding: parseInt(bindingStr),
        type: BindingType.SAMPLER,
        visibility: inferVisibility(source, name),
      });
    }
  }

  // Extract storage bindings
  while ((match = storagePattern.exec(source)) !== null) {
    const [_, groupStr, bindingStr, name, typeStr] = match;
    const key = `${groupStr}_${bindingStr}`;

    if (!seenBindings.has(key)) {
      seenBindings.add(key);
      bindings.push({
        name,
        group: parseInt(groupStr),
        binding: parseInt(bindingStr),
        type: BindingType.STORAGE_BUFFER,
        visibility: inferVisibility(source, name),
      });
    }
  }

  // Sort by binding index
  return bindings.sort((a, b) => a.binding - b.binding);
}

/**
 * Infer texture type from WGSL type string
 */
function inferTextureType(typeStr: string): BindingType {
  if (typeStr.includes("texture_2d")) return BindingType.TEXTURE_2D;
  if (typeStr.includes("texture_cube")) return BindingType.TEXTURE_CUBE;
  if (typeStr.includes("texture_3d")) return BindingType.TEXTURE_3D;
  return BindingType.TEXTURE_2D; // Default
}

/**
 * Infer which shader stages use this variable
 */
function inferVisibility(source: string, varName: string): ShaderStage[] {
  const stages: ShaderStage[] = [];

  // Extract vertex shader region
  const vertexMatch = source.match(/@vertex[\s\S]*?fn\s+\w+[\s\S]*?\{[\s\S]*?\n\}/);
  if (vertexMatch && vertexMatch[0].includes(varName)) {
    stages.push(ShaderStage.VERTEX);
  }

  // Extract fragment shader region
  const fragmentMatch = source.match(/@fragment[\s\S]*?fn\s+\w+[\s\S]*?\{[\s\S]*?\n\}/);
  if (fragmentMatch && fragmentMatch[0].includes(varName)) {
    stages.push(ShaderStage.FRAGMENT);
  }

  // Extract compute shader region
  const computeMatch = source.match(/@compute[\s\S]*?fn\s+\w+[\s\S]*?\{[\s\S]*?\n\}/);
  if (computeMatch && computeMatch[0].includes(varName)) {
    stages.push(ShaderStage.COMPUTE);
  }

  // If not found in any specific stage, assume visible to all available stages
  if (stages.length === 0) {
    if (source.includes("@vertex")) stages.push(ShaderStage.VERTEX);
    if (source.includes("@fragment")) stages.push(ShaderStage.FRAGMENT);
    if (source.includes("@compute")) stages.push(ShaderStage.COMPUTE);
  }

  return stages;
}
