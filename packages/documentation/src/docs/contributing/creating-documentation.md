---
title: "Creating Documentation"
description: "Complete guide to creating documentation and interactive examples for Vertex Link"
---

# Creating Documentation

This guide covers how to create documentation and interactive examples for the Vertex Link framework. The documentation system automatically discovers and organizes content based on file structure, making it easy to add new pages and examples.

## Quick Start

1. Create a `.md` file in `packages/documentation/src/docs/`
2. Add frontmatter with title and description
3. Write your content in Markdown
4. The page appears automatically in the navigation

## Documentation System Overview

The documentation system supports two main types of content:

### Simple Documents
Standalone `.md` files that render as documentation pages. Perfect for guides, API documentation, and explanations.

### Complex Documents
Folder + matching `.md` file combination that can include interactive demos, assets, and supporting files. Ideal for examples and tutorials with live code.

## File Structure Patterns

```
packages/documentation/src/docs/
├── simple-guide.md                     # Simple documentation page
├── getting-started/
│   ├── installation.md                 # Simple doc in category
│   ├── first-steps.md                  # Another simple doc
│   └── hello-world/                    # Complex example
│       ├── hello-world.md              # Main docs (matches folder)
│       ├── demo.html                   # Interactive demo
│       ├── script.ts                   # Demo logic
│       └── assets/                     # Demo assets
├── api/
│   ├── actors.md                       # API documentation
│   ├── components.md                   # More API docs
│   └── advanced/
│       └── custom-processors.md        # Nested documentation
└── examples/
    ├── basic-scene/                    # Interactive example
    │   ├── basic-scene.md
    │   ├── demo.html
    │   └── shaders/
    │       └── vertex.wgsl
    └── advanced-rendering/             # Another example
        ├── advanced-rendering.md
        ├── demo.html
        └── textures/
            └── sample.png
```

## Navigation Generation

The system automatically generates navigation based on your file structure:

- **Folders** become categories in the navigation tree
- **Files** become items within those categories
- **Complex items** (folder + matching file) appear as single navigation items
- **Nesting** is unlimited and mirrors the folder structure exactly
- **Category names** derive from folder names (converted to Title Case)
- **Item names** come from frontmatter title → folder name → file name

### Example Navigation Result:
```
Getting Started/
├── Installation
├── First Steps  
└── Hello World        # Complex item (interactive)
API/
├── Actors
├── Components
└── Advanced/
    └── Custom Processors
Examples/
├── Basic Scene        # Interactive example
└── Advanced Rendering # Interactive example
```

## Frontmatter Configuration

Every documentation file should include frontmatter with metadata:

### Basic Frontmatter
```yaml
---
title: "Human-readable title"
description: "Brief description of the content"
---
```

### Interactive Example Frontmatter
```yaml
---
title: "Interactive Demo Title"
description: "Description of what this example demonstrates"
entry: "demo.html"                      # Entry point for interactive demo
complexity: "beginner"                  # beginner|intermediate|advanced  
parameters:                            # For interactive parameter controls
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

### Advanced Frontmatter Options
```yaml
---
title: "Advanced Example"
description: "Complex example with many features"
entry: "index.html"                     # Custom entry point
interactive: true                       # Force interactive mode
complexity: "advanced"
parameters:
  - name: "lightIntensity"
    type: "range"
    min: 0.1
    max: 5.0
    step: 0.1
    default: 1.0
  - name: "shadowQuality"
    type: "select"
    options: ["low", "medium", "high", "ultra"]
    default: "medium"
  - name: "enablePostProcessing"
    type: "boolean"
    default: false
tags: ["rendering", "lighting", "shadows"]  # For future filtering
---
```

## Creating Simple Documentation

### Step 1: Choose Location
Decide where your documentation belongs in the structure:
- **Root level**: `docs/my-guide.md` (appears in main navigation)
- **Category**: `docs/category/my-guide.md` (appears under "Category")
- **Nested**: `docs/category/subcategory/my-guide.md` (nested navigation)

### Step 2: Create the File
```markdown
---
title: "My Feature Guide"
description: "Learn how to use this amazing feature"
---

# My Feature Guide

This guide explains how to use the feature...

## Basic Usage

```typescript
// Code example
const myFeature = new AwesomeFeature();
myFeature.doSomething();
```

## Advanced Concepts

More detailed information...

## See Also

- [Related Guide](../other-guide)
- [API Reference](../../api/my-feature)
```

### Step 3: Test
Run `bun run dev` and navigate to your page to ensure it appears correctly.

## Creating Interactive Examples

### Step 1: Create Folder Structure
```
docs/my-example/
├── my-example.md       # Must match folder name
├── demo.html          # Interactive entry point
├── script.ts          # Demo logic
├── style.css          # Demo styles
└── assets/            # Any additional assets
└── texture.png
```

### Step 2: Write the Main Documentation
```markdown
---
title: "My Interactive Example"
description: "Demonstrates interactive features with live code"
entry: "demo.html"
complexity: "intermediate"
parameters:
  - name: "rotationSpeed"
    type: "range"
    min: 0
    max: 10
    default: 2
  - name: "wireframe"
    type: "boolean"
    default: false
---

# My Interactive Example

This example shows how to create an interactive 3D scene.

## What You'll Learn

- Setting up a basic scene
- Adding interactive controls
- Handling user input

## Implementation Details

The demo creates a rotating cube that responds to the control parameters...

## Code Structure

```typescript
// Key concepts demonstrated:
class ExampleScene {
  constructor(parameters) {
    this.rotationSpeed = parameters.rotationSpeed;
    this.wireframe = parameters.wireframe;
  }
  
  update() {
    // Animation logic
  }
}
```

## Try It Out

Use the controls in the right panel to experiment with different settings.
The demo responds to parameter changes in real-time.
```

### Step 3: Create the Interactive Demo
```html
<!DOCTYPE html>
<html>
<head>
    <title>My Interactive Example</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <canvas id="canvas"></canvas>
    <script src="script.ts" type="module"></script>
</body>
</html>
```

### Step 4: Implement Demo Logic
```typescript
// script.ts
import { Actor, Scene, TransformComponent } from '@vertex-link/space';
import { Engine, MeshRendererComponent } from '@vertex-link/engine';

class DemoScene {
  private scene: Scene;
  private cube: Actor;
  
  constructor(canvas: HTMLCanvasElement) {
    // Initialize scene and cube
    this.setupScene(canvas);
  }
  
  updateParameters(params: any) {
    // Handle parameter updates from UI controls
    this.rotationSpeed = params.rotationSpeed;
    this.wireframe = params.wireframe;
  }
  
  private setupScene(canvas: HTMLCanvasElement) {
    // Scene setup logic
  }
}

// Initialize demo
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const demo = new DemoScene(canvas);

// Listen for parameter updates (provided by the documentation system)
window.addEventListener('parameterUpdate', (event: CustomEvent) => {
  demo.updateParameters(event.detail);
});
```

## Content Quality Guidelines

### Writing Style
- **Clear and concise**: Explain concepts without unnecessary complexity
- **Code examples**: Include working code that users can copy
- **Progressive complexity**: Start simple, build up to advanced topics
- **Cross-references**: Link to related documentation and concepts

### Technical Standards
- **Working code**: All code examples should compile and run
- **Error handling**: Show proper error handling in examples
- **Performance**: Demonstrate best practices for performance
- **TypeScript**: Use proper TypeScript types and interfaces

### Organization Tips
- **Logical grouping**: Group related content in folders
- **Consistent naming**: Use kebab-case for files and folders
- **Clear hierarchy**: Keep nesting reasonable (2-3 levels max)
- **Descriptive names**: File names should clearly indicate content

## Advanced Features

### Custom Parameter Types
The parameter system supports custom configurations:

```yaml
parameters:
  - name: "quality"
    type: "select"
    options: 
      - value: "low"
        label: "Low Quality"
      - value: "high" 
        label: "High Quality"
    default: "high"
```

### Multiple Entry Points
For complex examples with multiple demos:

```yaml
---
title: "Multi-Demo Example"
entry: "main.html"
alternativeEntries:
  - name: "Basic Version"
    file: "basic.html"
  - name: "Advanced Version"  
    file: "advanced.html"
---
```

### Asset Management
Keep assets organized and reference them relatively:

```
my-example/
├── my-example.md
├── demo.html
├── assets/
│   ├── textures/
│   │   └── diffuse.png
│   ├── models/
│   │   └── cube.obj
│   └── shaders/
│       ├── vertex.wgsl
│       └── fragment.wgsl
└── libs/
    └── custom-loader.ts
```

## Troubleshooting

### Common Issues

**Navigation not updating**: Clear browser cache and restart dev server

**Route conflicts**: Ensure no duplicate file names in same directory

**Interactive demo not loading**: Check browser console for errors and verify entry file exists

**Parameters not working**: Verify parameter schema in frontmatter matches expected types

### Best Practices

- **Test thoroughly**: Always test interactive examples in the documentation system
- **Keep it simple**: Focus on demonstrating one concept per example
- **Use relative paths**: Avoid absolute URLs or paths in documentation
- **Version control**: Commit working examples, not broken ones

## Contributing Guidelines

When contributing documentation:

1. **Follow existing patterns** in file structure and naming
2. **Test your examples** thoroughly before submitting
3. **Write clear descriptions** that explain the purpose and value
4. **Include code comments** to help readers understand implementation
5. **Link to related content** to help users discover more information

The documentation system is designed to be simple and intuitive. Focus on creating valuable content, and the system will handle the organization and presentation automatically.