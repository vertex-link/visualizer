# Actor System

The Actor is the fundamental entity in Vertex Link's architecture. Actors serve as containers for Components and represent anything in your application - players, enemies, UI elements, or abstract game objects.

## Core Concepts

### Actor Lifecycle
- **Creation**: Actors are created with a unique ID and name
- **Initialization**: Components are added and initialized
- **Updates**: Actors participate in the game loop through their components
- **Disposal**: Proper cleanup when removed from scenes

### Component Management
Actors manage their components through a simple API:
- `addComponent()` - Attach new functionality
- `getComponent()` - Access existing components  
- `removeComponent()` - Remove and cleanup components
- `hasComponent()` - Check for component existence

## Usage Example

```typescript
import { Actor, Scene } from '@vertex-link/acs'
import { TransformComponent } from '@vertex-link/engine'

// Create a new actor
const player = new Actor('player')

// Add components to define behavior
player.addComponent(new TransformComponent())

// Add to scene to make it active
const scene = new Scene()
scene.addActor(player)
```

## Best Practices

- Use descriptive names for actors to aid debugging
- Add components in `onBeforeInitialize()` lifecycle hook
- Access components in `onInitialize()` after all components are added
- Always dispose actors properly to prevent memory leaks
