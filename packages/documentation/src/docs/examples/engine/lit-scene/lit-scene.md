---
title: Dynamic Lighting Scene
description: Demonstrates the dynamic lighting system with point lights and directional lights
entry: "demo.html"
complexity: "intermediate"
parameters:
  - key: 'pointEnabled'
    label: 'Point Light Enabled'
    type: 'toggle'
    defaultValue: true
    description: 'Enable/disable the point light'
  - key: 'pointX'
    label: 'Point Light X'
    type: 'slider'
    defaultValue: 3.0
    min: -10
    max: 10
    step: 0.5
    description: 'Point light X position'
  - key: 'pointY'
    label: 'Point Light Y'
    type: 'slider'
    defaultValue: 5.0
    min: 1
    max: 15
    step: 0.5
    description: 'Point light Y position (height)'
  - key: 'pointZ'
    label: 'Point Light Z'
    type: 'slider'
    defaultValue: 3.0
    min: -10
    max: 10
    step: 0.5
    description: 'Point light Z position'
  - key: 'pointIntensity'
    label: 'Point Light Intensity'
    type: 'slider'
    defaultValue: 10.0
    min: 0
    max: 50
    step: 1
    description: 'Point light intensity/brightness'
  - key: 'pointRadius'
    label: 'Point Light Radius'
    type: 'slider'
    defaultValue: 15.0
    min: 1
    max: 30
    step: 1
    description: 'Point light effective radius'
  - key: 'dirEnabled'
    label: 'Directional Light Enabled'
    type: 'toggle'
    defaultValue: true
    description: 'Enable/disable the directional light'
  - key: 'dirIntensity'
    label: 'Directional Light Intensity'
    type: 'slider'
    defaultValue: 0.5
    min: 0
    max: 2
    step: 0.1
    description: 'Directional light intensity'
---

# Dynamic Lighting Scene

A demonstration of the dynamic lighting system featuring:

- **Ground plane** - Horizontal surface to receive lighting and shadows
- **Red cube** - Test object positioned above the ground
- **Point light** - Omnidirectional light with customizable position, intensity, and radius
- **Directional light** - Parallel light rays simulating sunlight

## Features Demonstrated

### Point Light Component
- Customizable color, intensity, and radius
- Radius-based attenuation with smooth falloff
- Real-time position updates

### Directional Light Component
- Parallel light rays (simulates sun/moon)
- Global illumination contribution
- Configurable intensity

### Lighting System
- `LightProcessor` - Automatic light collection and GPU upload
- Forward rendering with dynamic lighting via `lit-forward.wgsl` shader
- Physically-based attenuation with inverse square falloff

## Interactive Controls

Use the parameter controls on the right to adjust:
- Light positions and intensities in real-time
- Enable/disable individual lights
- Experiment with different lighting configurations

## Shadow Mapping Status

Shadow mapping infrastructure is implemented but not yet active. The `ShadowPass` architecture is in place for future completion.
