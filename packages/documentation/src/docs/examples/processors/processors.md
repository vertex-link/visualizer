---
title: Processors Demo
description: Demonstrates a simple Processor with a fixed-rate ticker.
entry: "demo.html"
parameters:
  - key: 'fps'
    label: 'Updates per Second'
    type: 'slider'
    defaultValue: 10
    min: 1
    max: 60
    step: 1
---

This demo shows a Processor that updates a counter on the screen at a fixed rate (10 FPS).
