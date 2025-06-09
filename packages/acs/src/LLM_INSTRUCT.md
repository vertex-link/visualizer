# LLM Instructions for Implementing Features with Vertex Link Core Library
This document provides a comprehensive guide to understanding and using the Vertex Link Core Library for implementing new features, components, systems, or actors.

## 1. Introduction
The Vertex Link Core Library provides a modular and decoupled architecture for building applications. This document outlines the API structure and best practices for extending this framework without modifying the core files.

**IMPORTANT NOTE**: Do not modify core library files. Build on top of the existing framework and report any identified issues separately.

## 2. Core Concepts 🧠

### Actor (Actor.ts)
- **Purpose**: The fundamental entity in your application
- **Role**: Container for Components representing players, enemies, items, UI elements, etc.

### Component (Component.ts)
- **Purpose**: Defines specific data or behavior for an Actor
- **Role**: Holds data and implements behaviors through composition

### System-like Classes
- **Purpose**: Implement global or cross-cutting logic for groups of Actors
- **Role**: Manage game rules, AI, rendering, physics, etc.

### Service (Service.ts)
- **Purpose**: Provides shared functionalities and resource management
- **Role**: Offers reusable capabilities via ServiceRegistry

### Event (Event.ts & EventBus.ts)
- **Purpose**: Enables decoupled communication
- **Role**: Used for notifications between components

### Processor (Processor.ts)
- **Purpose**: Manages specific update loops
- **Role**: Executes tasks at regular intervals

### Scene (Scene.ts)
- **Purpose**: Container for Actors
- **Role**: Organizes and provides querying capabilities

## 3. Best Practices for Implementation 🤖

- **Extend Actors**: Create new classes extending Actor for unique entities
- **Favor Composition**: Encapsulate specific data and logic in Component classes
- **Leverage Event System**: Use EventBus for communication between components
- **Use Services**: Create IService implementations for shared functionality
- **Utilize Processors**: Hook into update loops by registering with ProcessorRegistry
- **Scene Management**: Use Scene for Actor collections and queries
- **Type Safety**: Adhere to TypeScript types
- **Modularity**: Keep classes focused on single responsibilities
- **Clarity and Readability**: Write understandable code with JSDoc comments
- **Efficiency**: Be mindful of performance
- **Explicit Dependencies**: Use getter methods with caching for component dependencies
- **Understand Lifecycles**: Use lifecycle methods correctly (`onBeforeInitialize`, `onInitialize`)
- **TypeScript Configuration**: Enable experimentalDecorators and emitDecoratorMetadata for core library compatibility
- **Follow File Structure**: Place elements in appropriate directories
- **Refer to Examples**: Check examples directory for implementation patterns

## 4. Component Dependency Pattern

Components should handle dependencies explicitly through cached getter methods:
```typescript
class MyComponent extends Component {
private _transform?: TransformComponent;
private _resources?: ResourceComponent;

constructor(actor: Actor) {
super(actor);
}

get transform(): TransformComponent {
if (this._transform) {
return this._transform;
}

    this._transform = this.actor.getComponent(TransformComponent);
    if (!this._transform) {
      throw new Error('TransformComponent not found');
    }
    return this._transform;
}

get resources(): ResourceComponent {
if (this._resources) {
return this._resources;
}

    this._resources = this.actor.getComponent(ResourceComponent);
    if (!this._resources) {
      throw new Error('ResourceComponent not found');
    }
    return this._resources;
}

private initializeWithDependencies(): void {
// Your component initialization logic that requires dependencies
const pos = this.transform.getPosition();
const resourceData = this.resources.getResource('myResource');
// ... use dependencies
}
}
```
## 5. Actor Lifecycle Pattern

Actors should use lifecycle hooks for proper component setup:
```typescript
class CustomActor extends Actor {
resources?: ResourceComponent;
transform?: TransformComponent;

constructor() {
super('customactor');
}

protected onBeforeInitialize(): void {
// Add components here - before dependency resolution
this.addComponent(ResourceComponent);
this.addComponent(TransformComponent);
this.addComponent(MyCustomComponent);
}

protected onInitialize(): void {
// Access components after they're all added and initialized
this.resources = this.getComponent(ResourceComponent);
this.transform = this.getComponent(TransformComponent);
}
}
```
## 6. Core File Structure Overview 🌳
```
src/
├── core/
│   ├── Actor.ts                 # Actor class definition
│   ├── Service.ts               # IService, ServiceKey, ServiceRegistry
│   ├── component/
│   │   ├── Component.ts         # Component base class
│   │   └── ComponentRegistry.ts # Maps Component classes to unique IDs
│   ├── events/
│   │   ├── CoreEvents.ts        # Built-in framework events
│   │   ├── EmitToQuery.ts       # Utility to emit events to query results
│   │   ├── Event.ts             # Event base class, EventClass, EventHandler types
│   │   └── EventBus.ts          # IEventBus interface, EventBus class, global bus functions
│   ├── processor/
│   │   ├── Processor.ts         # Processor base class, IProcessable
│   │   └── ProcessorRegistry.ts # Static registry for Processors
│   └── scene/
│       ├── QueryBuilder.ts      # Fluent API for building queries
│       ├── QueryCondition.ts    # Interfaces for query conditions & data provider
│       └── Scene.ts             # Scene class, manages Actors and Queries
├── engine/                      # More specialized, engine-level constructs
│   ├── processors/
│   │   ├── FixedTickProcessor.ts# Fixed-step update Processor
│   │   └── RenderProcessor.ts   # requestAnimationFrame-based Processor
│   ├── resources/
│   │   └── Resource.ts          # Base class for loadable resources
│   └── services/
│       └── LoggingService.ts    # Example service implementation
└── utils/
└── uuid.ts                  # UUID generation utility
```
## 7. Detailed API Definitions 📖

### 7.1. Actor.ts

**Class: Actor**
- **Purpose**: Represents an entity that holds and manages Components
- **Key Properties**:
    - `label: string (readonly)`: Human-readable name
    - `id: string (readonly)`: Unique UUID

- **Key Methods**:
    - `constructor(label: string)`
    - `addComponent<C>(...): InstanceType<C>`
    - `removeComponent(...): boolean`
    - `getComponent<C>(...): InstanceType<C> | undefined`
    - `hasComponent(...): boolean`
    - `getAllComponents(): Component[]`
    - `getInitializedComponents(): Component[]`
    - `resolveDependencies(): void`
    - `destroy(): void`

- **Protected Methods**:
    - `onBeforeInitialize(): void`
    - `onInitialize(): void`

### 7.2. Service.ts

**Type: ServiceKey = symbol**
- **Purpose**: Unique identifier for services

**Interface: IService**
- **Purpose**: Base contract for all services
- **Optional Methods**:
    - `initialize?(): Promise<void> | void`
    - `update?(deltaTime: number): void`
    - `dispose?(): Promise<void> | void`

**Class: ServiceRegistry**
- **Purpose**: Manages service instances
- **Key Methods**:
    - `register<T>(...): void`
    - `resolve<T>(...): T | undefined`
    - `isRegistered(...): boolean`
    - `unregister(...): boolean`
    - `clear(): void`

### 7.3. Component

**Abstract Class: Component**
- **Purpose**: Base class for all components
- **Key Properties**:
    - `id: string (readonly)`
    - `actor: Actor (readonly)`
    - `isInitialized: boolean (readonly)`

- **Key Methods**:
    - `constructor(actor: Actor)`
    - `checkAndResolveDependencies(): boolean`
    - `dispose(): void`

- **Protected Methods**:
    - `onDependenciesResolved(): void`

### 7.4. Events

**Abstract Class: Event<TPayload = void>**
- **Purpose**: Base class for all events
- **Key Properties**:
    - `timestamp: number (readonly)`
    - `payload: TPayload (readonly)`
    - `target?: Actor | Component`
    - `type: string (readonly, getter)`

- **Static Property**:
    - `static readonly eventType: string`

**Interface: IEventBus extends IService**
- **Purpose**: Contract for an event bus
- **Methods**:
    - `emit<T>(...): void`
    - `on<T>(...): void`
    - `off<T>(...): void`
    - `once<T>(...): void`
    - `clear(): void`
    - `cleanupContext(...): void`

### 7.5. Processors

**Abstract Class: Processor**
- **Purpose**: Manages update loops
- **Key Properties**:
    - `name: string (readonly)`
    - `isRunning: boolean (readonly, getter)`
    - `taskCount: number (readonly, getter)`

- **Key Methods**:
    - `addTask(...): void`
    - `removeTask(...): boolean`
    - `abstract start(): void`
    - `abstract stop(): void`

**Class: ProcessorRegistry**
- **Purpose**: Static registry for managing processors
- **Key Methods**:
    - `register(processor: Processor): void`
    - `unregister(processor: Processor): boolean`
    - `getProcessor(name: string): Processor | undefined`
    - `getAllProcessors(): Processor[]`

### 7.6. Scene

**Class: Scene implements IQueryDataProvider**
- **Purpose**: Manages Actor collections
- **Key Properties**:
    - `name: string (readonly)`
    - `eventBus: IEventBus (readonly)`

- **Key Methods**:
    - `addActor(...): void`
    - `removeActor(...): boolean`
    - `getActor(...): Actor | undefined`
    - `query<T>(): SceneQueryBuilder<T>`
    - `emit<E>(...): void`
    - `clear(): void`

## 8. Resource Management Pattern

Resources should be managed through handles with explicit compilation:

```typescript
// Create resource handles
const shaderHandle = createShaderHandle(
    resourceManager,
    "StandardShader",
    vertexShaderSource,
    fragmentShaderSource,
);

const meshHandle = createMeshHandle(
    resourceManager,
    "CubeMesh",
    meshDescriptor,
);

const materialHandle = createMaterialHandle(
    resourceManager,
    "CubeMaterial",
    shaderHandle,
    uniforms,
    vertexLayout,
);

// Helper function for resource initialization
async function initializeAndGetResource<TResource extends Resource>(
    handle: ResourceHandle<TResource> | null,
    device: GPUDevice,
    preferredFormat?: GPUTextureFormat,
): Promise<TResource> {
    if (!handle) {
        throw new Error('Invalid resource handle provided.');
    }

    const resource = await handle.get();
    if (!resource) {
        throw new Error('Failed to get resource from handle.');
    }

    if (resource.setDevice) {
        if (resource instanceof MaterialResource && preferredFormat) {
            resource.setDevice(device, preferredFormat);
        } else {
            resource.setDevice(device);
        }
    }
    
    if (resource.compile) {
        await resource.compile();
    }
    
    return resource;
}

// Usage
const shader = await initializeAndGetResource(shaderHandle, device);
const mesh = await initializeAndGetResource(meshHandle, device);
const material = await initializeAndGetResource(materialHandle, device, preferredFormat);
```


## 9. Event System Usage

Use the EventBus directly for communication:

```typescript
// Define custom events
class PlayerDeathEvent extends Event<{ playerId: string, cause: string }> {
    static readonly eventType = 'PlayerDeath';
}

// In a component or system
class GameLogicComponent extends Component {
    constructor(actor: Actor) {
        super(actor);
        
        // Subscribe to events
        this.actor.scene?.eventBus.on(PlayerDeathEvent, this.handlePlayerDeath.bind(this));
    }

    private handlePlayerDeath(event: PlayerDeathEvent): void {
        console.log(`Player ${event.payload.playerId} died from ${event.payload.cause}`);
    }

    private someGameAction(): void {
        // Emit events
        this.actor.scene?.emit(PlayerDeathEvent, { 
            playerId: 'player1', 
            cause: 'enemy_attack' 
        });
    }

    dispose(): void {
        // Clean up event subscriptions
        this.actor.scene?.eventBus.off(PlayerDeathEvent, this.handlePlayerDeath.bind(this));
        super.dispose();
    }
}
```


## 10. Final Instructions

1. **Focus on Extension**: Create new classes that use the existing core library
2. **Identify Issues Separately**: Report bugs or flaws in the core library separately
3. **Follow Best Practices**: Adhere to the guidelines in Section 3
4. **Use Explicit Dependencies**: Implement the component dependency pattern from Section 4
5. **Leverage Lifecycle Hooks**: Use `onBeforeInitialize` and `onInitialize` appropriately
6. **Ensure Clarity**: Write well-commented and type-safe code
7. **Handle Resources Properly**: Use the resource management pattern for efficient asset handling
8. **Use Events for Communication**: Leverage the EventBus for decoupled component interaction

By following these guidelines, you can effectively extend the Vertex Link framework to implement new features while maintaining code clarity and avoiding the complexity of decorator-based dependency injection.