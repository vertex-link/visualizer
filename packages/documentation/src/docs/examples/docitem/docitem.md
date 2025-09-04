---
title: Actor System Demo
entry: ./docitem.html
description: This is a test component
parameters:
  - key: 'speed'
    label: 'Rotation Speed'
    type: 'slider'
    defaultValue: 1.0
    min: 0
    max: 5
    step: 0.1
---

This is a demo of the actor system. It runs in a completely isolated iframe and uses the `@vertex-link/engine` package to render a simple scene.