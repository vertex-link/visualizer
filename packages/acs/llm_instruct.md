# ACS Package - LLM Implementation Instructions

## Package Purpose
The `@vertex-link/acs` package provides the core Actor-Component-System architecture that the entire engine is built upon. This is the foundation layer and must remain engine-agnostic (no WebGPU or rendering code).

## Directory Structure
```
packages/acs/src/
├── Actor.ts                     # Core Actor implementation
├── Service.ts                   # Service registry system
├── component/
│   ├── Component.ts            # Base component class
│   ├── ComponentRegistry.ts    # Component type tracking
│   └── ResourceComponent.ts    # Bridge to engine resources
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

**Key Implementation Details:**
- Actors are containers for components
- Each actor has a unique ID (UUID)
- Components are stored in a Map by their constructor
- Only one component of each type per actor
- Lifecycle hooks: `onBeforeInitialize()`, `onInitialize()`, `onDestroy()`

### Component
```typescript
abstract class Component {
  readonly actor: Actor;
  
  constructor(actor: Actor, ...args: any[]) {
    this.actor = actor;
  }
  
  dispose(): void {
    // Cleanup and emit ComponentRemovedEvent
  }
}
```

**Key Implementation Details:**
- Components must have an Actor reference
- Components handle their own cleanup via `dispose()`
- No decorator-based dependencies - use explicit getters
- Access other components via `this.actor.getComponent()`

### ResourceComponent
```typescript
class ResourceComponent extends Component {
  private resources: Set<Resource<any>>;
  
  get<T extends Resource<any>>(type: new (...args: any[]) => T): T | undefined;
  getAll<T extends Resource<any>>(type: new (...args: any[]) => T): T[];
  add(resource: Resource<any>): void;
  remove(resource: Resource<any>): boolean;
}
```

**Status**: Partially implemented - being expanded in Phase 1

### Scene & Queries
```typescript
class Scene {
  private actors: Set<Actor>;
  private componentIndex: Map<bigint, Set<Actor>>;
  private tagIndex: Map<string, Set<Actor>>;
  
  query(): SceneQueryBuilder;
  addActor(actor: Actor): void;
  removeActor(actor: Actor): void;
}
```

**Query System:**
- Fast bitmasking for component queries
- Tag-based filtering (any/all/exclude)
- Chainable query builder pattern
- Cached indices for performance

### Event System
```typescript
interface IEventBus {
  emit<T extends Event>(event: T): void;
  on<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>): void;
  off<T extends Event>(eventClass: EventClass<T>, handler: EventHandler<T>): void;
}
```

**Key Events:**
- `ActorAddedEvent`, `ActorRemovedEvent`
- `ComponentAddedEvent`, `ComponentRemovedEvent`
- `SceneChangedEvent`
- Custom events extend base `Event` class

### Services
```typescript
class ServiceRegistry {
  private static services: Map<ServiceKey<any>, IService>;
  
  static register<T extends IService>(key: ServiceKey<T>, service: T): void;
  static get<T extends IService>(key: ServiceKey<T>): T | undefined;
}
```

**Usage Pattern:**
```typescript
const LoggingServiceKey = Symbol.for("LoggingService");
ServiceRegistry.register(LoggingServiceKey, new ConsoleLoggingService());
```

## Important Implementation Rules

### ✅ DO's
- Keep ACS engine-agnostic (no WebGPU references)
- Use explicit component dependencies
- Emit proper events for state changes
- Use TypeScript strict mode
- Handle cleanup properly in dispose methods
- Use ComponentTypeRegistry for consistent IDs

### ❌ DON'Ts
- Don't use decorators for dependencies
- Don't reference ProcessorRegistry (deprecated)
- Don't create circular dependencies
- Don't leak memory (cleanup event listeners)
- Don't assume component existence without checking
- Don't put rendering code in ACS

## Common Patterns

### Component Dependency Pattern
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
  
  override dispose(): void {
    this._otherComponent = undefined;
    super.dispose();
  }
}
```

### Event Listener Pattern
```typescript
class ReactiveComponent extends Component {
  private onResourceReady = (event: ResourceReadyEvent) => {
    // Handle event
  };
  
  constructor(actor: Actor) {
    super(actor);
    getEventBus().on(ResourceReadyEvent, this.onResourceReady);
  }
  
  override dispose(): void {
    getEventBus().off(ResourceReadyEvent, this.onResourceReady);
    super.dispose();
  }
}
```

## Testing Approach

Create tests in `packages/acs/tests/`:
```typescript
import { describe, it, expect } from "bun:test";
import { Actor, Scene } from "../src/index";

describe("Actor", () => {
  it("should add and retrieve components", () => {
    const actor = new Actor("test");
    const component = actor.addComponent(MyComponent);
    expect(actor.getComponent(MyComponent)).toBe(component);
  });
});
```

## Current Issues & TODOs

1. **ResourceComponent**: Needs full implementation with lazy loading
2. **ProcessorRegistry**: Needs complete removal/replacement
3. **Component Requirements**: Need pattern for declaring dependencies
4. **Actor Hierarchy**: Not yet implemented (Phase 4)
5. **Performance**: Component indices could be optimized further

## Integration Points

### With Engine Package
- ResourceComponent bridges to engine resources
- Components used by engine processors
- Events flow between packages

### With Documentation Package
- Examples use ACS for all demos
- Must maintain backward compatibility

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

## Export Structure
Main exports from `src/index.ts`:
- Core: `Actor`, `Component`, `Scene`
- Events: `Event`, `EventBus`, `getEventBus`, core event types
- Services: `ServiceRegistry`, `IService`
- Queries: `QueryBuilder`, `SceneQueryBuilder`
- Utils: `generateUUID`
- Resources: `Resource`, `ResourceStatus`, `ComputeResource`