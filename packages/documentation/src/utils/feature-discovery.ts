import type { FeatureCategory, FeatureDefinition } from "@/types/features";

// Auto-import all feature definitions
const featureModules = (import.meta as any).glob("/src/features/**/definition.ts", { eager: true });

export function discoverFeatures(): FeatureCategory[] {
  const features: FeatureDefinition[] = [];

  for (const [path, module] of Object.entries(featureModules)) {
    const definition = (module as any).default as FeatureDefinition;
    if (definition) {
      features.push(definition);
    }
  }

  // Group by category
  const categories: FeatureCategory[] = [
    {
      id: "acs",
      title: "ACS Features",
      description: "Actor-Component-System core features",
      icon: "pi-sitemap",
      features: features.filter((f) => f.category === "acs"),
    },
    {
      id: "engine",
      title: "Engine Features",
      description: "Rendering and engine-specific features",
      icon: "pi-cog",
      features: features.filter((f) => f.category === "engine"),
    },
    {
      id: "examples",
      title: "Examples",
      description: "Complete application examples",
      icon: "pi-play",
      features: features.filter((f) => f.category === "examples"),
    },
  ];

  return categories;
}

export function getFeatureById(id: string): FeatureDefinition | undefined {
  const categories = discoverFeatures();
  return categories.flatMap((c) => c.features).find((f) => f.id === id);
}
