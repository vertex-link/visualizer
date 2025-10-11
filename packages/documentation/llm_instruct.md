# Documentation Package - LLM Implementation Instructions

## Package Purpose
The documentation package is a **Vue 3 and Vite** application that provides an interactive documentation site for the Vertex Link framework. It features live WebGPU examples, auto-discovery of content, and a clean UI built with PrimeVue.

## Technology Stack
- **Framework**: Vue 3
- **Build Tool**: Vite
- **Routing**: Vue Router
- **UI Components**: PrimeVue
- **Markdown Parsing**: `marked`
- **Syntax Highlighting**: `prismjs`

## Directory Structure
```
packages/documentation/src/
├── App.vue                      # Root Vue component
├── main.ts                      # Vite entry point (initializes Vue)
├── components/
│   ├── navigation/Sidebar.vue   # The main navigation sidebar
│   └── showcase/                # Components for displaying docs/demos
│       ├── DocumentationPanel.vue # Renders the markdown and parameters
│       ├── FeatureContainer.vue   # Hosts the live demo iframe
│       └── ParameterPanel.vue     # UI for interactive parameters
├── composables/                 # Vue composables (e.g., for feature discovery)
├── docs/                        # All documentation and example content lives here
├── layouts/                     # Main application layouts (e.g., FeatureLayout.vue)
├── router/                      # Vue Router configuration
│   └── index.ts                 # Dynamically generates routes
├── styles/                      # CSS and theme variables
├── types/                       # TypeScript type definitions
└── utils/
    └── feature-discovery.ts     # The core content auto-discovery script
```

## Documentation System Architecture

### Auto-Discovery and Routing
The system's core is the `utils/feature-discovery.ts` script. On startup, it scans the `src/docs/` directory and automatically generates:
1.  A hierarchical **navigation tree** used by the `Sidebar.vue` component.
2.  A set of **routes** for Vue Router.

This means no manual registration of new documentation pages is needed. Just add files to the `docs` directory.

### Content Structure
-   **Simple Document**: A single `.md` file.
-   **Complex Feature/Example**: A folder containing a matching `.md` file (e.g., `my-feature/my-feature.md`), a `demo.html`, and a `script.ts`. The `demo.html` is loaded into an `<iframe>` in the `FeatureContainer.vue` component.

### Frontmatter
The system reads YAML frontmatter from markdown files to get the title, description, and interactive parameters for demos.
```yaml
---
title: "Rotating Cube"
description: "An interactive WebGPU cube."
complexity: "beginner"
parameters:
  - name: "rotationSpeed"
    type: "range"
    min: 0
    max: 5
    default: 1
---
```

## Creating New Documentation

The process is file-based. To add a new interactive example:

1.  **Create a folder**: `src/docs/examples/my-new-demo/`
2.  **Add Markdown**: Create `my-new-demo.md` inside the folder. Add a `title` and other frontmatter, including any `parameters`.
3.  **Add Demo Files**: Create `demo.html` and `script.ts` inside the folder.
4.  **Implement the Demo**: The `script.ts` should export a default function that initializes the demo in the given canvas. It will be loaded by the `demo.html` file.

```typescript
// my-new-demo/script.ts
import { EngineContext, Scene, ... } from "@vertex-link/engine";

// This function is called by the documentation host
export default async function(canvas: HTMLCanvasElement, params: Record<string, any>) {
  const context = new EngineContext(canvas);
  await context.initialize();

  const scene = new Scene();
  context.setScene(scene);

  // ... create your actors and components using params ...

  context.start();

  // Return a cleanup function
  return () => {
    context.stop();
  };
}
```

5.  Run `bun run dev` and the new demo will automatically appear in the navigation sidebar.

## Important Implementation Rules

### ✅ DO's
-   **Place all content in `src/docs/`.**
-   Use the folder-per-feature structure for anything with a demo.
-   Use descriptive frontmatter in all markdown files.
-   Write example scripts to be self-contained.
-   Use kebab-case for all file and folder names.

### ❌ DON'Ts
-   Don't manually edit the router or navigation files.
-   Don't use absolute paths in your content.
-   Don't create documentation outside the `src/docs/` directory.

## Current Issues & TODOs

1.  **Search**: No search functionality.
2.  **API Docs**: API reference is not automatically generated from TSDoc comments yet.
3.  **Mobile**: The layout is not fully optimized for mobile devices.

## Build & Development

```bash
# Install dependencies
bun install

# Start the Vite dev server with hot-reloading
bun run dev

# Build the static site for production (outputs to `dist/`)
bun run build

# Preview the production build locally
bun run preview
```
