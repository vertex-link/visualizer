# ACS Package - LLM Implementation Instructions

## Package Purpose
The `@vertex-link/acs` package provides the core Actor-Component-System architecture that the entire engine is built upon. This is the foundation layer and must remain engine-agnostic (no WebGPU or rendering code).

## Directory Structure
```
packages/acs/src/
├── Actor.ts                     # Core Actor implementation
├── index.ts                     # Package entry point
├── component/
│   ├── Component.ts            # Base component class
│   ├── ComponentRegistry.ts    # Component type tracking
│   └── ResourceComponent.ts    # Bridge to engine resources
├── composables/
│   ├── context.ts             # Context-aware DI functions (useActor, useScene, etc.)
│   ├── events.ts              # Event handling composable (useOnEvent)
│   └── processors.ts          # Processor task composable (useUpdate)
├── events/
│   ├── Event.ts               # Event system implementation
│   ├── EventBus.ts            # Global event bus
│   ├── CoreEvents.ts          # Framework event types
│   └── EmitToQuery.ts         # Query-based event emission
├── processor/
│   ├── Processor.ts           # Base processor class
│   └── ProcessorRegistry.ts   # DEPRECATED - do not use
├── scene/
│   ├── Scene.ts               # Scene container and queries
│   ├── QueryBuilder.ts        # Query construction
│   └── QueryCondition.ts      # Query conditions
├── resources/
│   ├── Resource.ts            # Base resource class
│   └── ComputeResource.ts     # Compute shader resources
└── utils/
    └── uuid.ts                # UUID generation
```

## Core Concepts

### Actor
```typescript
class Actor {
  readonly id: string;
  readonly name: string;
  private _components: Map<ComponentClass<any>, Component>;

  addComponent<T extends Component>(
    componentClass: ComponentClass<T>,
    ...args: ComponentConstructorParameters<T>
  ): T;

  getComponent<T extends Component>(componentClass: ComponentClass<T>): T | undefined;
  removeComponent<T extends Component>(componentClass: ComponentClass<T>): void;
}
```
- **Key Idea**: Actors are containers for components, identified by a unique ID. They manage the lifecycle of their components.

### Component
```typescript
abstract class Component {
  readonly actor: Actor;

  constructor(actor: Actor, ...args: any[]) {
    this.actor = actor;
  }

  dispose(): void;
}
```
- **Key Idea**: Components encapsulate data and behavior. They access other components via `this.actor.getComponent()`.

### Scene & Queries
```typescript
class Scene {
  private actors: Set<Actor>;

  query(): SceneQueryBuilder;
  addActor(actor: Actor): void;
  removeActor(actor: Actor): void;
}
```
- **Key Idea**: Scenes manage collections of actors and provide a powerful query system to find actors based on their components or tags.

### Event System
```typescript
interface IEventBus {
  emit<T extends Event>(event: T): void;
  on<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>, context?: any): void;
  off<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>): void;
}
```
- **Key Idea**: A global, type-safe event bus for decoupled communication. The `useOnEvent` composable is the preferred way to subscribe to events.

### Composables (The New Standard)
Composables are the primary mechanism for dependency injection and managing side effects (like event listeners or update loops). They rely on a `runWithContext` function to provide dependencies.

**Key Composables:**
- `useActor()`, `useScene()`, `useEventBus()`: Access core objects from the context.
- `useOnEvent(EventClass, handler, this)`: Subscribes to an event and automatically unsubscribes when the component is disposed (if managed correctly).
- `useUpdate(processorName, callback, this)`: Registers a function to be called every frame by a specific processor.

## Important Implementation Rules

### ✅ DO's
- Keep ACS engine-agnostic (no WebGPU references).
- **Use Composables (`useOnEvent`, `useUpdate`) for events and update loops.**
- Use explicit component dependencies (`this.actor.getComponent()`).
- Emit proper events for state changes.
- Handle cleanup properly in `dispose` methods.

### ❌ DON'Ts
- **Don't use decorators for dependencies.**
- **Don't use `ServiceRegistry`. It has been removed.**
- **Don't use `ProcessorRegistry` directly. Use `useUpdate` or `EngineContext`.**
- Don't create circular dependencies between components.
- Don't leak memory (composables help, but be mindful).

## Common Patterns

### Component Dependency Pattern
This pattern remains the same: components fetch dependencies from their actor.
```typescript
class MyComponent extends Component {
  private _otherComponent?: OtherComponent;

  get otherComponent(): OtherComponent {
    if (!this._otherComponent) {
      this._otherComponent = this.actor.getComponent(OtherComponent);
      if (!this._otherComponent) {
        throw new Error("MyComponent requires OtherComponent");
      }
    }
    return this._otherComponent;
  }
}
```

### Event Listener Pattern (with Composables)
The `useOnEvent` composable simplifies event handling and cleanup.
```typescript
import { useOnEvent } from "../composables/events";

class ReactiveComponent extends Component {
  private disposer: () => void;

  constructor(actor: Actor) {
    super(actor);
    // The disposer is stored to be called on cleanup.
    this.disposer = useOnEvent(ResourceReadyEvent, this.onResourceReady, this);
  }

  private onResourceReady = (event: ResourceReadyEvent) => {
    // Handle event
  };

  override dispose(): void {
    this.disposer(); // Unsubscribe from the event.
    super.dispose();
  }
}
```
*Note: The `EngineContext` often provides the context for these composables automatically.*

### Update Loop Pattern (with Composables)
The `useUpdate` composable registers a component's update method with a processor.
```typescript
import { useUpdate } from "../composables/processors";

class SpinningComponent extends Component {
  private disposer: () => void;

  constructor(actor: Actor) {
    super(actor);
    // Register this.update to be called by the 'gameLoop' processor.
    this.disposer = useUpdate("gameLoop", this.update, this);
  }

  update = (deltaTime: number) => {
    // Logic to run every frame...
  };

  override dispose(): void {
    this.disposer(); // Unregister the update task.
    super.dispose();
  }
}
```

## Current Issues & TODOs
1.  **ResourceComponent**: Needs full implementation with lazy loading and a descriptor-based API.
2.  **ProcessorRegistry**: Needs complete removal. The `useUpdate` composable still contains a fallback.
3.  **Actor Hierarchy**: Not yet implemented (Phase 4).
4.  **Documentation**: Examples need to be updated to reflect the new composable patterns.

## Build & Development
```bash
# Build the package
bun run build

# Watch mode for development
bun run dev

# Type checking
bun run typecheck

# Run tests
bun test
```
