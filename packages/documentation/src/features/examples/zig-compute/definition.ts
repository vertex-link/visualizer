import type { FeatureDefinition } from "@/types/features";

const definition: FeatureDefinition = {
  id: "zig-compute",
  title: "Zig Compute (WASM)",
  description: "Call Zig functions compiled to WebAssembly via ComputeResource",
  category: "examples",
  complexity: "basic",
  route: "/features/examples/zig-compute",

  parameters: [
    {
      key: "a",
      type: "slider",
      label: "A",
      description: "First operand",
      defaultValue: 2,
      min: 0,
      max: 10,
      step: 1,
    },
    {
      key: "b",
      type: "slider",
      label: "B",
      description: "Second operand",
      defaultValue: 3,
      min: 0,
      max: 10,
      step: 1,
    },
  ],

  tags: ["zig", "wasm", "compute"],
  relatedFeatures: [],

  component: () => import("./ZigComputeDemo.vue"),
  documentation: "/src/features/examples/zig-compute/docs.md",
};

export default definition;
