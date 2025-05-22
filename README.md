# Framework Architectural Overview & Decisions

This document outlines the architectural decisions for a modular and flexible application framework, suitable for game development or other interactive applications. The design prioritizes decoupling, testability, and a balance between ease of use for common scenarios and robustness for complex ones.

## 1. Core Philosophy

The framework is built around a loosely coupled architecture, moving away from a monolithic "Engine" class. Instead, it provides a set of core concepts and a structured way to manage cross-cutting concerns (Services). The primary goal is to allow developers to compose applications by combining Actors, Components, Systems, and Services with clear responsibilities and lifecycles.

## 2. Core Entities & Their Roles

The framework defines the following primary entity types:

### 2.1. Services

Services provide shared functionalities and manage resources across different parts of the application.

*   **`IService` (Contract - Interface):**
    *   A base interface that all service contracts can extend.
    *   Defines optional lifecycle methods: `initialize?(): Promise<void> | void`, `update?(deltaTime: number): void`, `dispose?(): Promise<void> | void`.
    *   Example:
        ```typescript
        // contracts/IService.ts
        export interface IService {
          initialize?(): Promise<void> | void;
          update?(deltaTime: number): void;
          dispose?(): Promise<void> | void;
        }
        ```

*   **Service Keys (`Symbol`):**
    *   Unique `Symbol` instances are used as keys for registering and resolving services. This ensures type safety and prevents naming collisions.
    *   Example:
        ```typescript
        // contracts/ILoggingService.ts
        export const ILoggingServiceKey = Symbol.for('ILoggingService');

        export interface ILoggingService extends IService { /* ... */ }
        ```

*   **`ServiceRegistry` (Class - Instance-based Management):**
    *   Manages a collection of service instances mapped by their `ServiceKey`.
    *   Responsible for the lifecycle of its registered services: `initializeAll()`, `updateAll()`, `disposeAll()`.
    *   Can be instantiated multiple times to create different service scopes (e.g., one for global services, one per canvas/rendering context).
    *   Example Snippet:
        ```typescript
        // core/ServiceRegistry.ts
        export class ServiceRegistry implements IServiceRegistry {
          private services: Map<ServiceKey, IService> = new Map();
          // ...
          public register<T extends IService>(key: ServiceKey, instance: T): void { /* ... */ }
          public resolve<T extends IService>(key: ServiceKey): T | undefined { /* ... */ }
          public async initializeAll(): Promise<void> { /* ... */ }
          // ...
        }
        ```

*   **`ServiceManager` (Static Facade):**
    *   Provides convenient static methods for interacting with a *default, internally managed* `ServiceRegistry` instance.
    *   Simplifies service access for common use cases.
    *   Methods include:
        *   `ServiceManager.register<T extends IService>(key: ServiceKey, instance: T): void`
        *   `ServiceManager.resolve<T extends IService>(key: ServiceKey): T | undefined`
        *   `ServiceManager.isRegistered(key: ServiceKey): boolean`
        *   `ServiceManager.initializeDefaultServices(): Promise<void>`
        *   `ServiceManager.updateDefaultServices(deltaTime: number): void`
        *   `ServiceManager.disposeDefaultServices(): Promise<void>`
        *   `ServiceManager.S_TEST_ONLY_setRegistry(newRegistry: IServiceRegistry): void` (for testing)
    *   Example Usage:
        ```typescript
        // main.ts
        import { ServiceManager } from './core/ServiceManager';
        import { ConsoleLoggingService } from './services/ConsoleLoggingService';
        import { ILoggingServiceKey } from './contracts/ILoggingService';

        ServiceManager.register(ILoggingServiceKey, new ConsoleLoggingService());
        await ServiceManager.initializeDefaultServices();
        const logger = ServiceManager.resolve(ILoggingServiceKey)?.getLogger('App');
        ```

*   **Registration & Resolution:**
    *   Services are explicitly registered using their key and an instance.
    *   Consumers resolve services by their key, relying on the interface contract.

### 2.2. Actors

*   Represent individual entities or objects within the application (e.g., player, enemy, UI element).
*   Act as containers for `Components`.
*   Possess their own lifecycle (e.g., `initializeActor`, `updateActor`, `disposeActor`), typically managed by the application or a world/scene manager.
*   Are provided with the necessary context (e.g., access to the `ServiceManager` or a specific `ServiceRegistry` instance) to allow their `Components` and scripts to access services.

### 2.3. Components

*   Hold data and/or simple, self-contained logic associated with an `Actor`.
*   Define the characteristics and state of an `Actor`.
*   Examples: `TransformComponent`, `RenderableComponent`, `HealthComponent`.
*   Their lifecycle is typically tied to their parent `Actor`.
*   Access services through the context provided by their `Actor` or via `ServiceManager`. Complex interactions with other Actors or global state are usually deferred to `Systems`.

### 2.4. Systems

*   Implement the core logic and behaviors of the application.
*   Operate on collections of `Actors` based on the `Components` they possess (e.g., a `RenderSystem` processes all Actors with `TransformComponent` and `RenderableComponent`).
*   Are generally stateless or manage state related to their specific function, not per-Actor state (which resides in Components).
*   Receive access to services (via `ServiceManager` or a passed-in `ServiceRegistry`) to perform their tasks.
*   Have their own lifecycle (e.g., `initializeSystem`, `updateSystem`, `disposeSystem`), managed by the application's main loop or a dedicated system orchestrator.

### 2.5. Resources

*   Represent shared data assets or configurations used by the application.
*   Examples: Textures, 3D models, audio files, level data, game settings.
*   Typically managed by a dedicated `ResourceManagerService` (which itself is an `IService`).
*   This service would handle loading, unloading, caching, and providing access to these resources.
*   Systems, Components, or other Services can request resources from the `ResourceManagerService`.

## 3. Architectural Overview Diagram (Conceptual)
```
+------------------------+     +-------------------------+     +--------------------+
|     ServiceManager     |---->| DefaultServiceRegistry |---->| RegisteredServices |
|    (Static Facade)     |     |  (Manages Lifecycles)  |     | (ILogging, IInput) |
+------------------------+     +-------------------------+     +--------------------+
            ^                            
            |                            
            | (resolve/register)         
            |                            
            v                            
+------------------------+     +------------------------+     +--------------------+
|        Systems         |<--->|         Actors         |<--->|    Components      |
| (e.g. RenderSystem,    |     | (Entities in the world)|     | (Data containers)  |
|    PhysicsSystem)      |     +------------------------+     +--------------------+
+------------------------+                
            ^                            
            |                            
            | (uses services like IResourceManager, IPhysicsService)
            |                            
+------------------------+               
|      Resources         |               
|  (Textures, Models)    |               
|  (via IResourceMgr)    |               
+------------------------+               
 ```
Note: Multiple `ServiceRegistry` instances can exist for different scopes, not just the default one managed by `ServiceManager`.*

## 4. Strengths of the Architecture

*   **Modularity and Decoupling:**
    *   Services are accessed via interfaces and unique keys, not concrete classes, reducing direct dependencies.
    *   Systems operate on Actors based on their Components, promoting separation of concerns.
    *   Actors are primarily data containers (via Components), with logic handled by Systems or specialized Actor Scripts/Components.
*   **Testability:**
    *   `ServiceManager.S_TEST_ONLY_setRegistry()` allows injecting mock/test registries.
    *   Individual services, systems, and components can be tested in isolation by providing mock dependencies.
*   **Flexibility in Scoping:**
    *   The `ServiceRegistry` can be instantiated multiple times, allowing for different scopes of services (e.g., global, per-scene, per-UI panel).
    *   The `ServiceManager` provides a convenient default for the most common "global" scope.
*   **Clear Lifecycles:**
    *   `IService` provides optional standard lifecycle methods (`initialize`, `update`, `dispose`).
    *   `ServiceRegistry` and `ServiceManager` manage the invocation of these lifecycle methods for registered services.
    *   Actors, Components, and Systems will also have their own defined lifecycles, to be managed by the application.
*   **Reduced Boilerplate for Common Cases:**
    *   `ServiceManager` offers a simple static API for registering and resolving services from the default registry.
*   **Scalability:**
    *   The architecture supports adding new services, systems, and component types without extensive modifications to existing core framework code.
*   **Adaptability:**
    *   The core is not tied to a specific rendering engine or platform. Platform-specific features are implemented as specific services (e.g., `WebGLRenderService`, `DOMInputService`).

## 5. Weaknesses & Considerations

*   **Initial Setup Complexity:** While `ServiceManager` simplifies default usage, understanding the roles of `ServiceKey`, `IService`, `ServiceRegistry`, and `ServiceManager` requires an initial learning curve.
*   **Service Discovery:**
    *   Relying on `Symbol` keys for service lookup is type-safe but requires careful management of these keys.
    *   Developers must ensure that the correct key is used for registration and resolution.
*   **Lifecycle Orchestration for Actors/Systems:**
    *   The framework defines *that* Actors, Components, and Systems have lifecycles, but it doesn't provide a built-in "world manager" or "system orchestrator." The application developer is responsible for creating and managing these higher-level orchestrators (e.g., a main game loop that updates systems, a scene graph that manages actors). This is a deliberate choice for flexibility but adds responsibility.
*   **Potential for Overuse of Default Registry:** The convenience of `ServiceManager` might lead developers to place too many services in the default global scope, potentially reducing modularity if not used judiciously. Clear guidelines on when to create separate `ServiceRegistry` instances are needed.
*   **Asynchronous Initialization:** Service `initialize` methods can be asynchronous. The application must correctly handle `async/await` when initializing services via `ServiceManager.initializeDefaultServices()` or `ServiceRegistry.initializeAll()` to ensure services are ready before use. Error handling during initialization is also crucial.
*   **Dependency Management Between Services:**
    *   The current model assumes services are largely independent or that their initialization order is manually managed by the order of registration if there are implicit dependencies.
    *   For complex inter-service dependencies during initialization, a more sophisticated dependency injection (DI) mechanism or explicit ordering logic might be needed, which is not currently part of the core proposal (to keep it lean). The current approach relies on the application architect to manage registration order.
*   **Resource Management Granularity:** The `IResourceManagerService` is a high-level concept. Detailed strategies for resource loading (e.g., streaming, pooling), unloading, and dependency tracking within this service will need careful design.

## 6. Future Considerations & Potential Enhancements

*   **Hierarchical Service Registries:** For more complex applications, allowing registries to have a parent registry to fall back to for service resolution could be beneficial.
*   **Event System Service:** A dedicated `IEventBusService` could facilitate communication between decoupled parts of the application (Actors, Systems, Services) without direct dependencies.
*   **Actor/Component Querying:** Formalizing how Systems query for Actors with specific sets of Components (e.g., helper functions, a dedicated `EntityManager`).
*   **Developer Tooling:** Tools for visualizing registered services, actor-component structures, or system dependencies could greatly aid development and debugging.

This architecture provides a solid foundation for building modular and maintainable applications. The emphasis on explicit contracts (interfaces) and controlled service management aims to balance flexibility with structure, making it adaptable to various application needs while guiding developers towards good design practices.

