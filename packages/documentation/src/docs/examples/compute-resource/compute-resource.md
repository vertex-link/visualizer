---
title: Compute Resource Demo (Zig)
description: Demonstrates using a ComputeResource to run a Zig module.
entry: "demo.html"
parameters:
  - key: 'a'
    label: 'Operand A'
    type: 'number'
    defaultValue: 12
  - key: 'b'
    label: 'Operand B'
    type: 'number'
    defaultValue: 34
---

This demo shows how to use a `ComputeResource` to load and interact with a WebAssembly module compiled from Zig.
