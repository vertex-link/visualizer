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

### Decorators
- **Purpose**: Wiring things together with less boilerplate
- **Role**: Used for component dependencies, event subscriptions, and processor updates

## 3. Best Practices for Implementation 🤖
- **Extend Actors**: Create new classes extending Actor for unique entities
- **Favor Composition**: Encapsulate specific data and logic in Component classes
- **Leverage Event System**: Use EventBus and event decorators for communication
- **Use Services**: Create IService implementations for shared functionality
- **Utilize Processors**: Hook into update loops using decorators
- **Scene Management**: Use Scene for Actor collections and queries
- **Type Safety**: Adhere to TypeScript types
- **Modularity**: Keep classes focused on single responsibilities
- **Clarity and Readability**: Write understandable code with JSDoc comments
- **Efficiency**: Be mindful of performance
- **Dependency Injection**: Use component decorators to manage dependencies
- **Understand Lifecycles**: Use lifecycle methods correctly
- **TypeScript Configuration**: Enable experimentalDecorators and emitDecoratorMetadata
- **Follow File Structure**: Place elements in appropriate directories
- **Refer to Examples**: Check examples directory for implementation patterns

## 4. Core File Structure Overview 🌳
``` 
src/
├── core/
│   ├── Actor.ts                 # Actor class definition
│   ├── Service.ts               # IService, ServiceKey, ServiceRegistry
│   ├── component/
│   │   ├── Component.ts         # Component base class
│   │   ├── ComponentRegistry.ts # Maps Component classes to unique IDs
│   │   └── Decorators.ts        # @RequireComponent, @OptionalComponent
│   ├── events/
│   │   ├── CoreEvents.ts        # Built-in framework events
│   │   ├── Decorators.ts        # @OnEvent, @OnceEvent
│   │   ├── EmitToQuery.ts       # Utility to emit events to query results
│   │   ├── Event.ts             # Event base class, EventClass, EventHandler types
│   │   └── EventBus.ts          # IEventBus interface, EventBus class, global bus functions
│   ├── processor/
│   │   ├── Decorators.ts        # @Update factory, HOOKED_METHODS_METADATA_KEY
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
## 5. Detailed API Definitions 📖
### 5.1. Actor.ts
**Class: Actor**
- **Purpose**: Represents an entity that holds and manages Components
- **Key Properties**:
    - : Human-readable name `label: string (readonly)`
    - : Unique UUID `id: string (readonly)`

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
    - `onInitialize(): void`

### 5.2. Service.ts
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

### 5.3. Component
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

**Decorators**:
- `@RequireComponent(ComponentClass)`
- `@OptionalComponent(ComponentClass)`

### 5.4. Events
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

**Decorators**:
- `@OnEvent<T>(eventClass, once = false)`
- `@OnceEvent<T>(eventClass)`

### 5.5. Processors
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

**Decorators**:
- `@Update(processorName: string)`
- `@RenderUpdate()`
- `@FixedTickUpdate()`

### 5.6. Scene
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

## 6. Final Instructions
1. **Focus on Extension**: Create new classes that use the existing core library
2. **Identify Issues Separately**: Report bugs or flaws in the core library separately
3. **Follow Best Practices**: Adhere to the guidelines in Section 3
4. **Utilize Decorators**: Make full use of the decorator system
5. **Ensure Clarity**: Write well-commented and type-safe code

By following these guidelines, you can effectively extend the Vertex Link framework to implement new features.
