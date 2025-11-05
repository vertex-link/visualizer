---
title: Dynamic Lighting Scene
description: Demonstrates the dynamic lighting system with point lights and directional lights
entry: "demo.html"
---

A demonstration of the dynamic lighting system featuring:

- **125 cubes** (5×5×5 grid) with diffuse materials
- **5 colored point lights** with radius-based attenuation (Red, Green, Blue, Yellow, Magenta)
- **1 directional light** providing ambient base illumination (simulating sunlight)

This example showcases:
- `PointLightComponent` - Omnidirectional lights with customizable color, intensity, and radius
- `DirectionalLightComponent` - Parallel light rays for sun/moon effects
- `LightProcessor` - Automatic light collection and GPU upload
- Forward rendering with dynamic lighting via `lit-forward.wgsl` shader

The lighting system uses physically-based attenuation with inverse square falloff and smooth cutoff at the light radius.
