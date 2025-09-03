import fm from "front-matter";
import type { Category, Feature } from "@/types/features";

export function discoverFeatures(): Category[] {
  const categories: Record<string, Category> = {};
  const modules = import.meta.glob("/src/features/**/*.{md,mdx}", {
    query: "?raw",
    eager: true,
    import: "default",
  });

  for (const [path, rawContent] of Object.entries(modules)) {
    const categoryName = path.split("/").slice(-2, -1)[0];
    const categoryId = categoryName.toLowerCase().replace(/\s+/g, "-");



    if (!categories[categoryId]) {
      categories[categoryId] = {
        id: categoryId,
        title: categoryName,
        features: [],
      };
    }

    // 1. Capture BOTH attributes and body
    const { attributes, body } = fm(rawContent as string);
    console.log(attributes, body);
    const featureId = path
      .split("/")
      .pop()
      ?.replace(/\.mdx?$/, "")
      .toLowerCase()
      .replace(/\s+/g, "-");

    if (featureId) {
      const feature: Feature = {
        id: featureId,
        title: (attributes as {title: string}).title || "Untitled",
        category: categoryId,
        route: `/features/${categoryId}/${featureId}`,
        complexity: (attributes as {complexity: string}).complexity,
        content: body,
      };

      categories[categoryId].features.push(feature);
    }
  }

  return Object.values(categories);
}
