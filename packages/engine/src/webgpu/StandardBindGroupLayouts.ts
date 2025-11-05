/**
 * Standard bind group layouts shared across all pipelines.
 * This ensures bind groups created with these layouts are compatible
 * with all pipelines that use them.
 */

/**
 * Create standard bind group layout for group 0 (global uniforms).
 * Contains: view-projection matrix
 */
export function createGlobalBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    label: "StandardBindGroupLayout_Group0_Globals",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
        },
      },
    ],
  });
}

/**
 * Create standard bind group layout for group 1 (lighting data).
 * Contains: point lights (storage), directional lights (storage), light counts (uniform)
 */
export function createLightBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    label: "StandardBindGroupLayout_Group1_Lights",
    entries: [
      {
        binding: 0, // Point lights
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "read-only-storage",
        },
      },
      {
        binding: 1, // Directional lights
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "read-only-storage",
        },
      },
      {
        binding: 2, // Light counts
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
        },
      },
    ],
  });
}

/**
 * Create standard bind group layout for group 2 (shadow mapping).
 * Contains: shadow map texture (depth 2D), comparison sampler, shadow data uniform
 */
export function createShadowBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
  return device.createBindGroupLayout({
    label: "StandardBindGroupLayout_Group2_Shadows",
    entries: [
      {
        binding: 0, // Shadow map texture
        visibility: GPUShaderStage.FRAGMENT,
        texture: {
          sampleType: "depth",
          viewDimension: "2d",
        },
      },
      {
        binding: 1, // Shadow sampler
        visibility: GPUShaderStage.FRAGMENT,
        sampler: {
          type: "comparison",
        },
      },
      {
        binding: 2, // Shadow data (light view-projection matrix)
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {
          type: "uniform",
        },
      },
    ],
  });
}
