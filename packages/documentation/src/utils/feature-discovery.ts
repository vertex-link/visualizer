import fm from "front-matter";
import type { Category, Feature } from "@/types/features";

export function discoverFeatures(): Category[] {
  const categories: Record<string, Category> = {};
  const rootDir = "/src/docs";
  const modules = import.meta.glob("/src/docs/**/*.{md,mdx}", {
    query: "?raw",
    eager: true,
    import: "default",
  });

  for (const [path, rawContent] of Object.entries(modules)) {
    console.log(path);

    const pathParts = path.split("/");
    const categoryName = pathParts.slice(-3, -2)[0];
    const featureId = pathParts.slice(-2, -1)[0];
    const categoryId = categoryName.toLowerCase().replace(/\s+/g, "-");

    if (!categories[categoryId]) {
      categories[categoryId] = { id: categoryId, title: categoryName, features: [] };
    }

    const { attributes, body } = fm(rawContent as string);
    const typedAttributes = attributes as any; // Cast to any for simplicity here

    if (featureId) {
      let feature: Feature;
      console.log(categoryId, featureId);

      // Check if it's an interactive example or a standalone doc page
      if (typedAttributes.entry) {
        // It's an EXAMPLE
        feature = {
          type: "example",
          id: featureId,
          title: typedAttributes.title || "Untitled",
          category: categoryId,
          route: `/features/${categoryId}/${featureId}`,
          entryUrl: path.replace(/[^/]+$/, typedAttributes.entry),
          complexity: typedAttributes.complexity,
          content: body,
          description: typedAttributes.description || "",
          parameters: typedAttributes.parameters || [],
        };
      } else {
        // It's a STANDALONE DOC
        const markdownFileName = pathParts[pathParts.length - 1];
        const featureId = markdownFileName.replace(/\.mdx?$/, "");
        feature = {
          type: "doc",
          id: featureId,
          title: typedAttributes.title || "Untitled",
          category: categoryId,
          route: `/features/${categoryId}/${featureId}`,
          content: body,
        };
      }
      categories[categoryId].features.push(feature);
    }
  }

  return Object.values(categories);
}
