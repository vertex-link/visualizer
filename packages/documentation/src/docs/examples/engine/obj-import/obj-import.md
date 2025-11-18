# OBJ Import Example

This example demonstrates how to import and render 3D models from Wavefront OBJ files using the `ObjResource` class.

## Features

- Load OBJ files from strings or URLs
- Automatic normal generation if missing
- Model centering and scaling options
- Support for vertices, normals, and texture coordinates
- Automatic triangulation of quad and n-gon faces

## Usage

```typescript
import { ObjResource } from "@vertex-link/engine";

// Load from inline string
const objMesh = new ObjResource(
  "MyModel",
  objFileContent,
  {
    centerModel: true,
    scale: 1.0,
    generateNormals: true,
  }
);

// Or load from URL
const objMesh = new ObjResource(
  "MyModel",
  "./models/suzanne.obj",
  {
    centerModel: true,
    scale: 2.0,
  }
);
```

## Options

- `generateNormals` (default: true) - Generate normals if missing from OBJ file
- `centerModel` (default: false) - Center the model at the origin
- `scale` (default: 1.0) - Scale factor to apply to the model
- `modelIndex` (default: 0) - Which model to use if OBJ contains multiple models
