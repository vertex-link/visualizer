# Vertex Link - Modular TypeScript Game Engine/Framework
This document outlines the architecture of Vertex Link, a modular and flexible TypeScript framework designed for game development and interactive applications. It prioritizes decoupling, testability, and an event-driven, component-based structure.
## 1. Core Philosophy
Vertex Link moves away from a monolithic "Engine" class, offering instead a set of core concepts and a structured way to manage application logic and state. It leverages modern TypeScript features, including decorators for events and update loops, and promotes a loosely coupled architecture. Developers compose applications by combining:
- **Scenes**: Manage collections of Actors and provide querying capabilities.
- **Actors**: Represent individual entities within a scene.
- **Components**: Encapsulate data and behaviour, attached to Actors.
- **Services**: Provide shared, cross-cutting functionalities.
- **Processors**: Manage update loops (e.g., rendering, physics).
- **Events**: Facilitate communication between decoupled parts.

## 2. Core Entities & Their Roles
### 2.1. Actors (src/core/Actor.ts)
- Represent individual entities (player, enemy, UI element).
- Act as containers for Components.
- Have a lifecycle and manage their components.
- Can have methods decorated to run in Processor update loops.

### 2.2. Components (src/core/component/Component.ts)
- Hold data and implement specific functionalities for an Actor.
- Define an Actor's characteristics and state.
- Feature a dependency injection system using decorators (@RequireComponent, @OptionalComponent).
- Can have methods decorated to run in Processor update loops or handle events.
- Their lifecycle is tied to their parent Actor and dependency resolution.

### 2.3. Services (src/core/Service.ts)
- Provide shared functionalities across the application (e.g., Logging, Pokemon Data).
- Defined by an IService interface with optional lifecycle methods (initialize, update, dispose).
- Registered and resolved using unique ServiceKey symbols via a ServiceRegistry.
- The framework doesn't enforce a single global ServiceManager; instead, ServiceRegistry instances can be created and managed as needed (e.g., per-scene or globally by the application).

### 2.4. Scenes (src/core/scene/Scene.ts)
- Manage collections of Actors.
- Provide efficient querying capabilities for Actors based on their components or tags using a QueryBuilder.
- Can have their own EventBus or share one.
- Handle adding, removing, and indexing actors.

### 2.5. Events (src/core/events/Event.ts, src/core/events/Decorators.ts)
- A robust, type-safe event system based on an EventBus.
- Events extend a base Event class and define a static eventType.
- Classes (like Components or Actors) can listen to events using the @OnEvent decorator, which automatically registers and unregisters handlers.
- A global EventBus can be initialized and accessed, or specific instances can be used.

### 2.6. Processors (src/core/processor/Processor.ts, src/engine/processors/)
- Manage distinct update loops.
- The framework provides a RenderProcessor (using requestAnimationFrame) and a FixedTickProcessor (using setInterval).
- Methods within Actors or Components can be hooked into these loops using decorators like @RenderUpdate or @FixedTickUpdate.
- Processors are managed by a ProcessorRegistry, allowing custom processors and decorators to be added.

## 3. How It Works (Conceptual Flow)
### Initialization (examples/app.ts):
- An EventBus is initialized.
- A ServiceRegistry is created, and services (like PokemonService) are registered.
- Processors (like RenderProcessor, FixedTickProcessor) would typically be registered with the ProcessorRegistry and started here (though not explicitly shown in examples/app.ts).
- A main application/UI layer (like Vue.js in the example) is set up.

### Scene & Actors (examples/components/BattleScreen.ts):
- A Scene is created, often using the main EventBus.
- Actors are created and added to the Scene.
- Components (like PokemonStatsComponent) are added to Actors, providing data and behaviour. Components automatically attempt to resolve their dependencies (@RequireComponent) once added.

### Event Handling (examples/game/systems.ts, examples/components/ActionBar.ts):
- Actors or Components use @OnEvent to listen for specific events (e.g., BattleStartEvent, PlayerChoseMoveEvent).
- When an event is emitted (using emit(new MyEvent(...))), the corresponding decorated methods are automatically invoked.

### Update Loops:
- If an Actor or Component has a method decorated with @RenderUpdate or @FixedTickUpdate, the corresponding Processor will call it during its loop, passing the deltaTime.

### Data Flow:
- Components primarily hold state.
- Events communicate changes or requests between different parts.
- Services provide access to external data or shared logic.
- Vue components (in the example) react to changes in state and emit events based on user interaction.

## 4. Key Architectural Features
- **Modularity & Decoupling**: Services, Events, and the ECS-like (Actor-Component) structure promote low coupling.
- **Testability**: Decoupled parts are easier to test in isolation. Mock services and event buses can be injected.
- **Event-Driven**: Central EventBus and @OnEvent decorators simplify communication.
- **Decorator-Based**: Simplifies hooking into update loops (@RenderUpdate) and handling events (@OnEvent), and managing dependencies (@RequireComponent).
- **Flexible Scoping**: While a global EventBus is common, ServiceRegistry instances can be scoped.
- **Scene Management**: Scene provides a container for actors and querying.

## 5. Getting Started (Based on Example)
1. **Set up HTML (examples/index.html)**: Create a basic HTML file, include Vue.js (or your chosen view layer), and link your main application script.
2. **Define Services (examples/services/PokemonService.ts)**: Create interfaces and implementations for any shared services you need.
3. **Define Components (examples/game/components.ts)**: Create Component classes to hold data and logic for your actors.
4. **Define Events (examples/game/events.ts)**: Define the Event classes that will drive communication.
5. **Create Systems/Event Handlers (examples/game/systems.ts)**: Implement classes with @OnEvent methods to handle game logic.
6. **Build UI/Views (examples/components/*.ts)**: Create UI components that interact with the engine by:
    - Accessing services.
    - Creating Actors and adding Components.
    - Emitting events based on user input.
    - Listening to events to update the UI.

7. **Bootstrap (examples/app.ts)**: Initialize the EventBus, ServiceRegistry, register services, and mount your application.
8. **Run Dev Server (scripts/dev_server.ts)**: Use the Deno-based development server to transpile TypeScript and serve your application with live reload.

This architecture provides a powerful and flexible foundation for building games and interactive applications in TypeScript.
