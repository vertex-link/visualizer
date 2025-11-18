# Gizmo Editor Example

This example demonstrates the 3D transform gizmo system with multi-scene overlay rendering.

## Features

- **Multi-Scene Rendering**: Content scene and overlay scene rendered separately
- **Transform Gizmo**: Visual handles for moving objects along X/Y/Z axes
- **Object Selection**: Click to select objects and manipulate with gizmo
- **Overlay Architecture**: Gizmos render on top without polluting content scene

## Architecture

### Content Scene
The main 3D scene containing user objects:
- Three colored cubes (red, green, blue)
- Camera with orbit controls
- SelectionManager for click handling

### Overlay Scene
Editor tools rendered on top:
- Transform gizmo with axis handles
- Always renders after content (priority 50)
- Independent actor management

### Rendering Flow
```
Frame:
  1. WebGPUProcessor queries both scenes
  2. ForwardPass (priority 10) renders content scene
  3. OverlayPass (priority 50) renders gizmo scene
  4. PostProcessPass (priority 100) optional effects
```

## Components Used

### GizmoComponent
- Manages gizmo state (mode, target, dragging)
- Listens for drag events
- Applies transforms to target actor

### HandleInteractionComponent
- Attached to each axis handle
- Converts mouse events to drag events
- Emits GizmoDragStarted/Dragged/Ended events

### SelectableComponent
- Tag component marking objects as selectable
- Used by SelectionManager for raycasting

### SelectionManagerComponent
- Handles click-to-select
- Emits ObjectSelectedEvent
- Gizmo listens and updates target

## Usage

```typescript
// Create content scene
const contentScene = new Scene("Content");
const cube = createCube(contentScene);
cube.addComponent(SelectableComponent);

// Create overlay scene
const overlayScene = new Scene("Overlay");
const gizmo = createGizmo(overlayScene, canvas, camera);

// Setup multi-scene rendering
processor.setContentScene(contentScene);
processor.addOverlayScene("gizmo", overlayScene);
```

## Future Enhancements

- Rotate and scale modes (currently translate-only)
- Local vs world space toggle
- Snap-to-grid functionality
- Multi-select support
- Undo/redo system
- Enhanced raycasting for accurate picking
