import type { FeatureDefinition } from "@/types/features";

const definition: FeatureDefinition = {
  id: "actor-system",
  title: "Actor System",
  description: "Core entity management and lifecycle in the Actor-Component-System",
  category: "examples",
  complexity: "basic",
  route: "/features/examples/actor-system",

  parameters: [
    {
      key: "actorCount",
      type: "slider",
      label: "Actor Count",
      description: "Number of actors to spawn in the scene",
      defaultValue: 5,
      min: 1,
      max: 20,
      step: 1,
    },
    {
      key: "showHierarchy",
      type: "toggle",
      label: "Show Hierarchy",
      description: "Display parent-child relationships between actors",
      defaultValue: true,
    },
    {
      key: "spawnPattern",
      type: "select",
      label: "Spawn Pattern",
      description: "How actors are arranged in the scene",
      defaultValue: "grid",
      options: [
        { value: "grid", label: "Grid Layout" },
        { value: "circle", label: "Circle Pattern" },
        { value: "random", label: "Random Positions" },
      ],
    },
  ],

  tags: ["core", "entities", "lifecycle"],
  relatedFeatures: ["component-system", "scene-queries"],

  component: () => import("./ActorSystemDemo.vue"),
  documentation: "/src/features/examples/actor-system/docs.md",
};

export default definition;
