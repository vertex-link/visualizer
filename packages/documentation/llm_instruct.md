# Documentation Package - LLM Implementation Instructions

## Package Purpose
The documentation package provides an interactive documentation site with live WebGPU examples, auto-discovery of content, and comprehensive API documentation for the Vertex Link framework.

## Directory Structure
```
packages/documentation/
├── src/
│   ├── main.ts                    # Vite entry point
│   ├── components/                # UI components
│   │   ├── Navigation.ts          # Auto-generated navigation
│   │   ├── DocViewer.ts          # Markdown/example renderer
│   │   └── ParameterControls.ts  # Interactive controls
│   ├── docs/                      # Documentation content
│   │   ├── getting-started/       # Getting started guides
│   │   ├── api/                   # API documentation
│   │   ├── examples/              # Interactive examples
│   │   └── contributing/          # Contribution guides
│   ├── examples/                  # Legacy examples (being migrated)
│   └── utils/
│       ├── discovery.ts           # Auto-discovery system
│       └── markdown.ts            # Markdown processing
├── index.html                     # HTML entry
├── vite.config.ts                # Vite configuration
└── tsconfig.json                 # TypeScript config
```

## Documentation System Architecture

### Auto-Discovery System
The documentation system automatically discovers and organizes content based on file structure - no manual registration needed.

### File Structure Patterns
```
docs/
├── simple-doc.md                    # Simple documentation
├── category/
│   ├── nested-doc.md               # Doc in category
│   └── complex-feature/            # Complex with demo
│       ├── complex-feature.md      # Main docs (name matches folder)
│       ├── demo.html              # Interactive demo entry
│       ├── script.ts              # Demo logic
│       └── assets/                # Demo resources
└── deeply/nested/content.md        # Deep nesting supported
```

### Document Types

#### 1. Simple Documents
Standalone `.md` files that render as documentation pages.

#### 2. Complex Documents
Folder + matching `.md` file that can include interactive demos.

#### 3. Interactive Examples
Complex documents with demos specified via frontmatter or conventional files.

### Frontmatter Schema
```yaml
---
title: "Human-readable title"
description: "Brief description"
entry: "demo.html"                  # Demo entry point
complexity: "beginner|intermediate|advanced"
parameters:                        # Interactive controls
  - name: "speed"
    type: "range"
    min: 0
    max: 100
    default: 50
  - name: "color"
    type: "color"
    default: "#ff0000"
  - name: "enabled"
    type: "boolean"
    default: true
  - name: "mode"
    type: "select"
    options: ["wireframe", "solid", "textured"]
    default: "solid"
---
```

## Key Implementation Components

### Navigation Generation
```typescript
// Auto-generated from file structure
interface NavItem {
  title: string;
  path: string;
  children?: NavItem[];
  isComplex?: boolean;
  hasDemo?: boolean;
}

function discoverDocumentation(docsPath: string): NavItem[] {
  // Scan directory structure
  // Parse frontmatter
  // Build navigation tree
  // Return hierarchical structure
}
```

### Route Handling
```typescript
// Route patterns
/features/simple-doc              // Simple document
/features/category/item           // Categorized document
/features/complex/example         // Complex with demo
/features/deeply/nested/content   // Deep nesting
```

### Demo Integration
```typescript
// Demo loading pattern
async function loadDemo(docPath: string, entry: string) {
  const module = await import(`${docPath}/${entry}`);
  const container = document.getElementById("demo-container");
  
  // Initialize WebGPU if needed
  if (module.requiresWebGPU) {
    await initializeWebGPU(container);
  }
  
  // Run demo
  module.default(container, parameters);
}
```

### Parameter Controls
```typescript
interface Parameter {
  name: string;
  type: "range" | "color" | "boolean" | "select";
  value: any;
  onChange: (value: any) => void;
}

class ParameterControls {
  render(parameters: Parameter[]): HTMLElement {
    // Generate UI controls
    // Bind change handlers
    // Update demo in real-time
  }
}
```

## Creating Documentation

### Simple Documentation Example
```markdown
---
title: "TransformComponent Guide"
description: "Learn how to use TransformComponent"
---

# TransformComponent Guide

The TransformComponent manages position, rotation, and scale...

## Basic Usage

\`\`\`typescript
const transform = actor.addComponent(TransformComponent);
transform.setPosition(0, 1, 0);
\`\`\`
```

### Interactive Example Structure
```
examples/rotating-cube/
├── rotating-cube.md          # Documentation
├── demo.html                # Entry point
├── script.ts                # Demo logic
└── shaders/
    ├── vertex.wgsl
    └── fragment.wgsl
```

**rotating-cube.md:**
```yaml
---
title: "Rotating Cube Example"
description: "Interactive WebGPU cube"
entry: "demo.html"
parameters:
  - name: "rotationSpeed"
    type: "range"
    min: 0
    max: 5
    default: 1
---

This example demonstrates basic WebGPU rendering...
```

**demo.html:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Rotating Cube</title>
</head>
<body>
    <canvas id="canvas"></canvas>
    <script type="module" src="./script.ts"></script>
</body>
</html>
```

**script.ts:**
```typescript
import { EngineContext, Scene, Actor } from "@vertex-link/engine";

export async function initDemo(canvas: HTMLCanvasElement, params: any) {
  const context = new EngineContext(canvas);
  await context.initialize();
  
  // Create scene and actors
  // Set up based on params
  // Start render loop
}

// Auto-called by documentation system
export default initDemo;
```

## Vite Configuration

### Path Aliases
```typescript
// vite.config.ts
resolve: {
  alias: {
    "@vertex-link/acs": path.resolve(__dirname, "../acs/src/index.ts"),
    "@vertex-link/engine": path.resolve(__dirname, "../engine/src/index.ts"),
  }
}
```

### WebGPU Support
```typescript
// Required for WebGPU types
optimizeDeps: {
  include: ["@webgpu/types"]
}
```

## Important Implementation Rules

### ✅ DO's
- Place all docs in `src/docs/` directory
- Use descriptive frontmatter
- Create self-contained examples
- Test demos in multiple browsers
- Use relative paths for assets
- Follow kebab-case naming

### ❌ DON'Ts
- Don't manually register pages
- Don't use absolute URLs
- Don't skip frontmatter
- Don't create docs outside `src/docs/`
- Don't use spaces in file names
- Don't commit broken examples

## Common Patterns

### WebGPU Example Pattern
```typescript
import { 
  EngineContext, 
  Scene, 
  Actor,
  TransformComponent,
  MeshRendererComponent 
} from "@vertex-link/engine";

export default async function(
  container: HTMLElement,
  parameters: Record<string, any>
) {
  // Create canvas
  const canvas = document.createElement("canvas");
  container.appendChild(canvas);
  
  // Initialize engine
  const context = new EngineContext(canvas);
  await context.initialize();
  
  // Create scene
  const scene = new Scene("DemoScene");
  context.setScene(scene);
  
  // Create content based on parameters
  setupDemo(scene, parameters);
  
  // Handle parameter changes
  window.addEventListener("parameter-change", (e: CustomEvent) => {
    updateDemo(scene, e.detail);
  });
  
  // Start rendering
  context.start();
  
  // Cleanup on unmount
  return () => {
    context.stop();
    context.dispose();
  };
}
```

### Documentation Categories

Recommended organization:
```
docs/
├── getting-started/           # Onboarding
│   ├── installation.md
│   ├── first-project.md
│   └── concepts.md
├── guides/                    # How-to guides
│   ├── actors-components.md
│   ├── scene-management.md
│   └── resource-loading.md
├── api/                       # API reference
│   ├── acs/
│   │   ├── actor.md
│   │   └── component.md
│   └── engine/
│       ├── renderer.md
│       └── resources.md
├── examples/                  # Interactive demos
│   ├── basic/
│   ├── intermediate/
│   └── advanced/
└── contributing/              # Contribution guides
    ├── setup.md
    └── creating-documentation.md
```

## Testing Documentation

### Local Development
```bash
# Start dev server
bun run dev

# Visit http://localhost:8000
# Changes hot-reload automatically
```

### Testing Checklist
- [ ] Navigation appears correctly
- [ ] Markdown renders properly
- [ ] Code syntax highlighting works
- [ ] Interactive demos load
- [ ] Parameters update demos
- [ ] WebGPU initializes (if used)
- [ ] No console errors
- [ ] Responsive design works

## Performance Considerations

### Demo Optimization
- Lazy load WebGPU demos
- Dispose resources on unmount
- Use requestAnimationFrame
- Limit polygon count in examples
- Cache compiled resources

### Build Optimization
- Tree-shake unused imports
- Split code by route
- Minimize bundle size
- Compress assets

## Current Issues & TODOs

1. **Search**: No search functionality yet
2. **Mobile**: Limited mobile responsiveness
3. **Offline**: No offline support
4. **API Docs**: Need automatic generation from TSDoc
5. **Versioning**: No version switching
6. **i18n**: English only currently

## Integration Requirements

### With Engine Package
- Import all engine exports
- Use latest API patterns
- Handle WebGPU initialization
- Proper resource cleanup

### With ACS Package
- Demonstrate core patterns
- Show query system usage
- Event system examples

## Build & Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Type checking
bun run typecheck
```

## Deployment

The built documentation can be deployed to:
- GitHub Pages
- Netlify/Vercel
- Custom hosting

Build outputs to `dist/` directory as static files.

## Adding New Examples

1. Create folder: `docs/examples/my-example/`
2. Add `my-example.md` with frontmatter
3. Create `demo.html` entry point
4. Implement `script.ts` with demo logic
5. Add any assets (shaders, textures)
6. Test thoroughly
7. Commit all files

The example will automatically appear in navigation!