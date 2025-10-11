---
title:
entry: ./docitem.html
description: This is a test component for all supported parameter types.
parameters:
  - key: 'speed'
    label: 'Rotation Speed'
    type: 'slider'
    defaultValue: 1.0
    min: 0
    max: 5
    step: 0.1
    description: 'Controls the speed of the rotation.'
  - key: 'enabled'
    label: 'Enabled'
    type: 'toggle'
    defaultValue: true
    description: 'Toggles the rotation.'
  - key: 'direction'
    label: 'Direction'
    type: 'select'
    defaultValue: 'x'
    options:
      - label: 'X-Axis'
        value: 'x'
      - label: 'Y-Axis'
        value: 'y'
      - label: 'Z-Axis'
        value: 'z'
    description: 'The axis of rotation.'
  - key: 'color'
    label: 'Color'
    type: 'color'
    defaultValue: 'ff0000'
    description: 'The color of the object.'
  - key: 'title'
    label: 'Title'
    type: 'text'
    defaultValue: 'Hello World'
    description: 'A title for the scene.'
  - key: 'scale'
    label: 'Scale'
    type: 'number'
    defaultValue: 1
    description: 'The scale of the object.'
---

This is a demo of the actor system. It runs in a completely isolated iframe and uses the `@vertex-link/engine` package to render a simple scene.
