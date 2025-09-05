import fm from "front-matter";
import type { Category, DocItemAttributes, Feature } from "@/types/features";

export function discoverFeatures(): Category[] {
  const rootDir = "/src/docs";
  const modules = import.meta.glob("/src/docs/**/*.{md,mdx}", {
    query: "?raw",
    eager: true,
    import: "default",
  });

  const features: Feature[] = [];
  const usedRoutes = new Set<string>();
  const usedIds = new Set<string>();

  for (const [fullPath, rawContent] of Object.entries(modules)) {
    try {
      const relativePath = fullPath.replace(rootDir, "").replace(/^\//, "");
      const pathParts = relativePath.split("/");
      const fileName = pathParts[pathParts.length - 1];
      const fileNameWithoutExt = fileName.replace(/\.mdx?$/, "");

      const { attributes, body } = fm(rawContent as string);
      const attrs = attributes as DocItemAttributes;
      console.log(attrs);

      // Determine item structure
      const parentFolder = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";
      const isComplex = parentFolder === fileNameWithoutExt;

      const categoryParts = isComplex
        ? pathParts.slice(0, -2) // exclude folder + file
        : pathParts.slice(0, -1); // exclude just the file

      const categoryId = categoryParts.length > 0 ? categoryParts.join("-").toLowerCase() : "root";

      // Generate route
      let routePath: string;
      if (isComplex) {
        // Complex: /features/category/folder-name
        routePath = `/features/${[...categoryParts, parentFolder].filter(Boolean).join("/")}`;
      } else {
        // Simple: /features/category/file-name
        routePath = `/features/${[...categoryParts, fileNameWithoutExt].filter(Boolean).join("/")}`;
      }

      // Skip route conflicts
      if (usedRoutes.has(routePath)) {
        continue;
      }

      // Generate unique ID
      let featureId = fileNameWithoutExt;
      let counter = 1;
      while (usedIds.has(featureId)) {
        featureId = `${fileNameWithoutExt}-${counter}`;
        counter++;
      }

      const feature: Feature = {
        id: featureId,
        title: attrs.title || (isComplex ? parentFolder : fileNameWithoutExt),
        category: categoryId,
        route: routePath,
        type: attrs.entry || attrs.interactive ? "complex" : "simple",
        content: body,
        description: attrs.description,
        complexity: attrs.complexity,
        parameters: attrs.parameters || [],
        path: "",
      };

      // Handle interactive features
      if (attrs.entry) {
        feature.entryUrl = fullPath.replace(/[^/]+$/, attrs.entry);
      } else if (isComplex && attrs.interactive !== false) {
        feature.entryUrl = fullPath.replace(/[^/]+$/, "demo.html");
        feature.type = "complex";
      }

      usedRoutes.add(routePath);
      usedIds.add(featureId);
      features.push(feature);
    } catch (error) {
      console.error(`Error processing ${fullPath}:`, error);
    }
  }

  // Group into categories
  const categoryMap: Record<string, Category> = {};

  for (const feature of features) {
    if (!categoryMap[feature.category]) {
      const categoryTitle =
        feature.category === "root"
          ? "Documentation"
          : feature.category
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" / ");

      categoryMap[feature.category] = {
        id: feature.category,
        title: categoryTitle,
        features: [],
      };
    }
    categoryMap[feature.category].features.push(feature);
  }

  return Object.values(categoryMap);
}
