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
